<?php

namespace Tests\Feature;

use App\Models\LeadVisit;
use App\Models\SystemSetting;
use App\Models\User;
use App\Services\GoogleCalendarService;
use App\Services\LeadVisitCalendarSyncService;
use App\Services\MicrosoftGraphTokenService;
use App\Services\OutlookCalendarService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class CalendarIntegrationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Http::preventStrayRequests();
    }

    public function test_google_calendar_oauth_is_bound_to_the_shared_account_and_encrypts_refresh_token(): void
    {
        config([
            'services.google_calendar.client_id' => 'google-client',
            'services.google_calendar.client_secret' => 'google-secret',
            'services.google_calendar.redirect_uri' => 'https://qsales.test/settings/integrations/google-calendar/callback',
            'services.google_calendar.account_email' => 'aktif.official0101@gmail.com',
            'services.google_calendar.calendar_id' => 'primary',
        ]);
        Http::fake([
            'https://oauth2.googleapis.com/token' => Http::response(['access_token' => 'access-token', 'refresh_token' => 'refresh-token'], 200),
            'https://www.googleapis.com/oauth2/v2/userinfo' => Http::response(['email' => 'aktif.official0101@gmail.com'], 200),
        ]);

        $service = app(GoogleCalendarService::class);
        parse_str((string) parse_url($service->authorizationUrl('oauth-state'), PHP_URL_QUERY), $query);
        $this->assertSame('aktif.official0101@gmail.com', $query['login_hint']);
        $this->assertSame('https://www.googleapis.com/auth/calendar.events.owned', last(explode(' ', $query['scope'])));
        $this->assertSame('oauth-state', $query['state']);

        $this->assertSame('aktif.official0101@gmail.com', $service->connectWithAuthorizationCode('auth-code'));
        $this->assertSame('refresh-token', Crypt::decryptString(SystemSetting::find('google_calendar_oauth')->value['refresh_token']));
        $this->assertTrue($service->isConfigured());
    }

    public function test_google_event_not_found_is_not_reported_as_a_successful_deletion(): void
    {
        config([
            'services.google_calendar.client_id' => 'google-delete-client',
            'services.google_calendar.client_secret' => 'google-secret',
            'services.google_calendar.redirect_uri' => 'https://qsales.test/settings/integrations/google-calendar/callback',
            'services.google_calendar.calendar_id' => 'primary',
        ]);
        SystemSetting::create([
            'key' => 'google_calendar_oauth',
            'value' => [
                'account_email' => 'aktif.official0101@gmail.com',
                'refresh_token' => Crypt::encryptString('refresh-token'),
            ],
        ]);
        Http::fake([
            'https://oauth2.googleapis.com/token' => Http::response(['access_token' => 'access-token'], 200),
            'https://www.googleapis.com/calendar/v3/calendars/*/events/google-event-404*' => Http::response([], 404),
        ]);

        $deleted = app(GoogleCalendarService::class)->deleteEvent('google-event-404');

        $this->assertFalse($deleted);
        Http::assertSent(fn ($request) => $request->method() === 'DELETE'
            && str_contains($request->url(), '/events/google-event-404?sendUpdates=all'));
    }

    public function test_google_event_update_places_id_before_send_updates_query(): void
    {
        config([
            'services.google_calendar.client_id' => 'google-update-client',
            'services.google_calendar.client_secret' => 'google-secret',
            'services.google_calendar.redirect_uri' => 'https://qsales.test/settings/integrations/google-calendar/callback',
            'services.google_calendar.calendar_id' => 'primary',
        ]);
        SystemSetting::create([
            'key' => 'google_calendar_oauth',
            'value' => [
                'account_email' => 'aktif.official0101@gmail.com',
                'refresh_token' => Crypt::encryptString('refresh-token'),
            ],
        ]);
        Http::fake([
            'https://oauth2.googleapis.com/token' => Http::response(['access_token' => 'access-token'], 200),
            'https://www.googleapis.com/calendar/v3/calendars/*/events/google-event-update?sendUpdates=all' => Http::response(['id' => 'google-event-update'], 200),
        ]);

        $updated = app(GoogleCalendarService::class)->updateEvent('google-event-update', ['summary' => 'Updated']);

        $this->assertTrue($updated);
        Http::assertSent(fn ($request) => $request->method() === 'PATCH'
            && str_contains($request->url(), '/events/google-event-update?sendUpdates=all'));
    }

    public function test_outlook_event_is_created_by_shared_mailbox_with_the_selected_attendees(): void
    {
        config([
            'services.outlook_calendar.mailbox' => 'noreply@activ.co.id',
            'mail.mailers.microsoft-graph.tenant_id' => 'tenant',
            'mail.mailers.microsoft-graph.client_id' => 'client',
            'mail.mailers.microsoft-graph.client_secret' => 'secret',
        ]);
        $this->mock(MicrosoftGraphTokenService::class, function ($mock) {
            $mock->shouldReceive('getAuthorizedHeaders')->once()->andReturn(['Authorization' => 'Bearer test-token']);
        });
        Http::fake(['graph.microsoft.com/v1.0/users/*/calendar/events' => Http::response(['id' => 'outlook-event-1'], 201)]);

        $visit = new LeadVisit([
            'subject' => 'Customer meeting',
            'scheduled_at' => '2026-11-20 10:00:00',
            'end_at' => '2026-11-20 11:00:00',
            'is_all_day' => false,
            'location' => 'Jakarta',
            'notes' => 'Demo agenda',
        ]);
        $eventId = app(OutlookCalendarService::class)->createEvent($visit, ['sales@activ.co.id', 'guest@example.test'], 'Demo agenda');

        $this->assertSame('outlook-event-1', $eventId);
        Http::assertSent(fn ($request) => str_contains($request->url(), '/users/noreply%40activ.co.id/calendar/events')
            && $request['attendees'][0]['emailAddress']['address'] === 'sales@activ.co.id'
            && $request['attendees'][1]['emailAddress']['address'] === 'guest@example.test'
            && $request['transactionId'] !== '');
    }

    public function test_outlook_single_day_all_day_event_ends_at_midnight_of_the_next_date(): void
    {
        config([
            'services.outlook_calendar.mailbox' => 'noreply@activ.co.id',
            'mail.mailers.microsoft-graph.tenant_id' => 'tenant',
            'mail.mailers.microsoft-graph.client_id' => 'client',
            'mail.mailers.microsoft-graph.client_secret' => 'secret',
        ]);
        $this->mock(MicrosoftGraphTokenService::class, function ($mock) {
            $mock->shouldReceive('getAuthorizedHeaders')->once()->andReturn(['Authorization' => 'Bearer test-token']);
        });
        Http::fake(['graph.microsoft.com/v1.0/users/*/calendar/events' => Http::response(['id' => 'outlook-all-day-event'], 201)]);

        $visit = new LeadVisit([
            'subject' => 'Single-day test',
            'scheduled_at' => '2026-11-30 00:00:00',
            'end_at' => '2026-11-30 23:59:59',
            'is_all_day' => true,
        ]);
        app(OutlookCalendarService::class)->createEvent($visit, ['sales@activ.co.id'], 'Single-day test');

        Http::assertSent(fn ($request) => str_contains($request->url(), '/users/noreply%40activ.co.id/calendar/events')
            && $request['start']['dateTime'] === '2026-11-30T00:00:00'
            && $request['end']['dateTime'] === '2026-12-01T00:00:00'
            && $request['start']['timeZone'] === $request['end']['timeZone']
            && $request['isAllDay'] === true);
    }

    public function test_deleting_a_visit_cancels_both_calendar_events_and_keeps_failed_event_id_for_retry(): void
    {
        $user = User::factory()->create();
        $visit = LeadVisit::create([
            'user_id' => $user->id,
            'subject' => 'Calendar cancellation test',
            'visit_type' => 'follow_up',
            'scheduled_at' => '2026-11-30 09:00:00',
            'end_at' => '2026-11-30 10:00:00',
            'sync_google_calendar' => true,
            'gc_event_id' => 'google-event-1',
            'sync_outlook_calendar' => true,
            'outlook_event_id' => 'outlook-event-1',
        ]);
        $this->mock(GoogleCalendarService::class, function ($mock) {
            $mock->shouldReceive('deleteEvent')->once()->with('google-event-1')->andReturn(true);
        });
        $this->mock(OutlookCalendarService::class, function ($mock) {
            $mock->shouldReceive('deleteEvent')->once()->with('outlook-event-1')->andReturn(false);
        });

        $warnings = app(LeadVisitCalendarSyncService::class)->deleteProviderEvents($visit);

        $this->assertSame(['Event Outlook Calendar belum berhasil dibatalkan.'], $warnings);
        $this->assertDatabaseHas('lead_visits', [
            'id' => $visit->id,
            'gc_event_id' => null,
            'sync_google_calendar' => false,
            'google_sync_status' => 'cancelled',
            'outlook_event_id' => 'outlook-event-1',
            'sync_outlook_calendar' => true,
            'outlook_sync_status' => 'failed',
        ]);
    }

    public function test_google_event_not_found_keeps_visit_and_provider_id_retryable(): void
    {
        $user = User::factory()->create();
        $visit = LeadVisit::create([
            'user_id' => $user->id,
            'subject' => 'Google event not found cancellation test',
            'visit_type' => 'follow_up',
            'scheduled_at' => '2026-11-30 09:00:00',
            'end_at' => '2026-11-30 10:00:00',
            'sync_google_calendar' => true,
            'gc_event_id' => 'google-event-404',
            'sync_outlook_calendar' => false,
        ]);
        $this->mock(GoogleCalendarService::class, function ($mock) {
            $mock->shouldReceive('deleteEvent')->once()->with('google-event-404')->andReturn(false);
        });
        $this->mock(OutlookCalendarService::class, function ($mock) {});

        $warnings = app(LeadVisitCalendarSyncService::class)->deleteProviderEvents($visit);

        $this->assertSame(['Event Google Calendar belum berhasil dibatalkan.'], $warnings);
        $this->assertDatabaseHas('lead_visits', [
            'id' => $visit->id,
            'gc_event_id' => 'google-event-404',
            'sync_google_calendar' => true,
            'google_sync_status' => 'failed',
        ]);
    }
}
