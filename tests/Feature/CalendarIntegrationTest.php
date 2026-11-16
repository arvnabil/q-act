<?php

namespace Tests\Feature;

use App\Models\LeadVisit;
use App\Models\SystemSetting;
use App\Services\GoogleCalendarService;
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
}
