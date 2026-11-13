<?php

namespace Tests\Feature;

use App\Models\BusinessUnitMember;
use App\Models\Customer;
use App\Models\CustomerPic;
use App\Models\Lead;
use App\Models\LeadActivity;
use App\Models\LeadVisit;
use App\Models\Quotation;
use App\Models\QuotationItem;
use App\Models\User;
use App\Services\GoogleCalendarService;
use App\Services\PersonalDashboard;
use App\Services\ZoomService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class WorkflowTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo(now()->setDate(2026, 11, 5)->setTime(10, 0));
        Http::preventStrayRequests();
    }

    private function actor(array $permissions = ['quotations_view', 'quotations_edit', 'quotations_create', 'customers_view']): User
    {
        $u = User::factory()->create(['role' => 'Sales', 'is_active' => true]);
        foreach ($permissions as $p) {
            $u->givePermissionTo(Permission::findOrCreate($p, 'web'));
        }

        return $u;
    }

    private function quote($u, $id = 'Q1', $customer = 'C1', array $extra = []): Quotation
    {
        Customer::firstOrCreate(['id' => $customer], ['name' => 'Customer '.$customer, 'address' => 'Jakarta', 'created_by' => $u->id]);

        return Quotation::create(array_merge(['id' => $id, 'customer_id' => $customer, 'sales_id' => $u->id, 'created_by' => $u->id,
            'status' => 'created', 'date' => '2026-11-05', 'expired' => '2026-12-01', 'grand_total' => 1000], $extra));
    }

    public function test_manual_customer_lead_is_suggested_and_reused_with_access_scope(): void
    {
        $u = $this->actor();
        $this->quote($u);
        $this->quote($u, 'Q2');
        $lead = Lead::create(['title' => 'Existing manual', 'customer_name' => ' customer c1 ', 'sales_id' => $u->id]);
        $other = $this->actor();
        Lead::create(['title' => 'Private lead', 'customer_name' => 'Customer C1', 'sales_id' => $other->id]);
        $this->actingAs($u)->getJson('/workflow/quotations/Q1')->assertOk()->assertJsonCount(1, 'candidates')->assertJsonPath('candidates.0.id', $lead->id);
        $this->postJson('/workflow/quotations/Q1/lead', ['lead_id' => $lead->id])->assertOk();
        $this->postJson('/workflow/quotations/Q2/lead', ['lead_id' => $lead->id])->assertOk();
        $this->assertEquals(2, Quotation::where('lead_id', $lead->id)->count());
        $this->assertEquals('C1', $lead->fresh()->customer_id);
        $this->assertDatabaseCount('leads', 2);
    }

    public function test_lead_customer_and_pic_selection_validates_relationship(): void
    {
        $u = $this->actor(['leads_view', 'leads_manage', 'customers_view', 'customers_create']);
        $this->quote($u);
        $this->quote($u, 'Q2', 'C2');
        $pic = CustomerPic::create(['customer_id' => 'C1', 'name' => 'Sari', 'email' => 'sari@example.test']);
        $data = ['title' => 'Project', 'customer_mode' => 'existing', 'customer_id' => 'C2', 'pic_id' => $pic->id];
        $this->actingAs($u)->postJson('/leads', $data)->assertUnprocessable()->assertJsonValidationErrors('pic_id');
        $this->assertDatabaseCount('leads', 0);
        $data['customer_id'] = 'C1';
        $this->postJson('/leads', $data)->assertRedirect();
        $this->assertDatabaseHas('leads', ['title' => 'Project', 'pic_name' => 'Sari', 'customer_email' => 'sari@example.test']);
        $this->assertDatabaseHas('lead_pics', ['customer_pic_id' => $pic->id]);
        $new = ['title' => 'New project', 'customer_mode' => 'new', 'customer_name' => 'PT Baru', 'pic_mode' => 'new', 'pic_name' => 'Budi'];
        $this->postJson('/leads', $new)->assertRedirect();
        $this->assertDatabaseHas('customers', ['name' => 'PT Baru']);
        $this->assertDatabaseHas('customer_pics', ['name' => 'Budi']);
        $this->postJson('/leads', $new)->assertUnprocessable()->assertJsonValidationErrors('customer_name');
        $this->assertDatabaseCount('leads', 2);
    }

    private function agenda(array $extra = []): array
    {
        return array_merge(['subject' => 'Telepon customer', 'visit_type' => 'follow_up', 'scheduled_at' => '2026-11-06T09:00',
            'sync_calendar' => false, 'create_zoom' => false], $extra);
    }

    public function test_minimal_lead_reuses_customer_pic_and_document_family_without_duplicates(): void
    {
        $u = $this->actor();
        $q = $this->quote($u);
        $pic = CustomerPic::create(['customer_id' => 'C1', 'name' => 'Ibu Sari', 'phone' => '08123', 'email' => 'pic@example.test', 'is_primary' => true]);
        $q->update(['pic_id' => $pic->id]);
        $sub = $this->quote($u, 'Q1-1', 'C1', ['parent_quotation_id' => 'Q1', 'relation_type' => 'split']);
        $unrelated = $this->quote($u, 'Q2', 'C1', ['pic_id' => $pic->id]);
        $first = $this->actingAs($u)->postJson('/workflow/quotations/Q1/lead', ['title' => 'Pengadaan ruang meeting'])->assertOk()->json('lead.id');
        $this->postJson('/workflow/quotations/Q1/lead', ['title' => 'Retry'])->assertOk()->assertJsonPath('lead.id', $first);
        $this->assertDatabaseCount('leads', 1);
        $this->assertEquals($first, $sub->fresh()->lead_id);
        $this->assertNull($unrelated->fresh()->lead_id);
        $lead = Lead::findOrFail($first);
        $this->assertSame('Pengadaan ruang meeting', $lead->title);
        $this->assertMatchesRegularExpression('/^L2611\.\d+$/', $lead->lead_code);
        $this->assertSame('Ibu Sari', $lead->pic_name);
        $this->assertSame('Jakarta', $lead->customer_address);
        $this->assertSame($u->id, $lead->sales_id);
        $this->assertEquals(0, $lead->estimated_value);
        $this->assertDatabaseCount('lead_pics', 1);
        $revision = $this->quote($u, 'Q1-R1', 'C1', ['parent_quotation_id' => 'Q1', 'relation_type' => 'revision']);
        $this->assertEquals($first, $revision->lead_id);
        $this->getJson('/workflow/quotations/Q1')->assertOk()->assertJsonCount(1, 'otherQuotations');
        $this->get('/leads/'.$first)->assertOk();
    }

    public function test_explicit_bulk_grouping_preserves_manual_lead_fields_and_does_not_sum_quotes(): void
    {
        $u = $this->actor();
        $q = $this->quote($u);
        $this->quote($u, 'Q2');
        $lead = Lead::create(['title' => 'Existing project', 'customer_id' => 'C1', 'customer_address' => 'Bandung', 'sales_id' => $u->id, 'estimated_value' => 1500]);
        $this->actingAs($u)->postJson('/workflow/quotations/Q1/lead', ['lead_id' => $lead->id, 'quotation_ids' => ['Q2']])->assertOk();
        $this->assertEquals(2, Quotation::where('lead_id', $lead->id)->count());
        $this->assertSame('Bandung', $lead->fresh()->customer_address);
        $this->assertEquals(1500, $lead->fresh()->estimated_value);
        $this->assertDatabaseCount('leads', 1);
    }

    public function test_sent_quotation_becomes_the_primary_estimate_and_rejected_marks_review(): void
    {
        $u = $this->actor();
        $q = $this->quote($u, 'Q-SENT', 'C1', ['grand_total' => 2450]);
        QuotationItem::create(['quotation_id' => $q->id, 'name' => 'Item', 'qty' => 1, 'price' => 2450, 'hpp' => 0]);

        $this->actingAs($u)->putJson('/quotations/Q-SENT', ['status' => 'sent'])->assertRedirect();
        $q->refresh();
        $lead = Lead::whereKey($q->lead_id)->firstOrFail();
        $this->assertSame($q->id, $lead->quotation_id);
        $this->assertEquals($q->grand_total, $lead->estimated_value);
        $this->assertSame('primary_quotation', $lead->estimation_source);
        $this->assertDatabaseHas('lead_activities', ['lead_id' => $lead->id, 'type' => 'primary_quotation_changed']);

        $this->putJson('/quotations/Q-SENT', ['status' => 'rejected'])->assertRedirect();
        $this->assertTrue($lead->fresh()->quotation_needs_review);
        $this->assertEquals($q->grand_total, $lead->fresh()->estimated_value);
        $this->assertDatabaseHas('lead_activities', ['lead_id' => $lead->id, 'type' => 'quotation_needs_review']);
    }

    public function test_sent_quotation_link_replaces_existing_manual_estimate_and_drafts_do_not(): void
    {
        $u = $this->actor();
        $draft = $this->quote($u, 'Q-DRAFT', 'C1', ['grand_total' => 1200]);
        $lead = Lead::create(['title' => 'Manual Kanban lead', 'customer_id' => 'C1', 'sales_id' => $u->id, 'estimated_value' => 900]);
        $this->actingAs($u)->postJson('/workflow/quotations/Q-DRAFT/lead', ['lead_id' => $lead->id])->assertOk();
        $this->assertEquals(900, $lead->fresh()->estimated_value);
        $this->assertSame('manual', $lead->fresh()->estimation_source);

        $sent = $this->quote($u, 'Q-SENT-LINK', 'C1', ['status' => 'sent', 'grand_total' => 3700]);
        $this->postJson('/workflow/quotations/Q-SENT-LINK/lead', ['lead_id' => $lead->id])->assertOk();
        $this->assertEquals(3700, $lead->fresh()->estimated_value);
        $this->assertSame($sent->id, $lead->fresh()->quotation_id);
        $this->assertSame('primary_quotation', $lead->fresh()->estimation_source);
        $this->assertSame($lead->id, $draft->fresh()->lead_id);
    }

    public function test_kanban_manual_estimate_switches_to_linked_quotation_when_it_is_sent(): void
    {
        $u = $this->actor();
        $draft = $this->quote($u, 'Q-KANBAN', 'C1');
        $lead = Lead::create(['title' => 'Kanban lead', 'customer_id' => 'C1', 'sales_id' => $u->id, 'estimated_value' => 900]);
        $draft->update(['lead_id' => $lead->id]);
        QuotationItem::create(['quotation_id' => $draft->id, 'name' => 'Item', 'qty' => 1, 'price' => 2000, 'hpp' => 0]);

        $this->actingAs($u)->putJson('/quotations/Q-KANBAN', ['status' => 'sent'])->assertRedirect();

        $this->assertEquals($draft->fresh()->grand_total, $lead->fresh()->estimated_value);
        $this->assertSame('primary_quotation', $lead->fresh()->estimation_source);
        $this->assertSame($draft->id, $lead->fresh()->quotation_id);
    }

    public function test_linking_rejects_other_customer_existing_project_and_outside_scope(): void
    {
        $u = $this->actor();
        $q = $this->quote($u);
        $this->quote($u, 'QC2', 'C2');
        $other = $this->actor();
        $foreign = $this->quote($other, 'QFOREIGN');
        $lead = Lead::create(['title' => 'Wrong customer', 'sales_id' => $u->id, 'customer_id' => 'C2']);
        $this->actingAs($u)->postJson('/workflow/quotations/Q1/lead', ['lead_id' => $lead->id])->assertUnprocessable();
        $this->postJson('/workflow/quotations/Q1/lead', ['quotation_ids' => ['QC2']])->assertUnprocessable();
        $this->postJson('/workflow/quotations/Q1/lead', ['quotation_ids' => ['QFOREIGN']])->assertNotFound();
        $this->getJson('/workflow/quotations/QFOREIGN')->assertNotFound();
        $existing = $this->postJson('/workflow/quotations/Q1/lead', [])->assertOk()->json('lead.id');
        $this->postJson('/workflow/quotations/Q1/lead', ['lead_id' => $lead->id])->assertUnprocessable();
        $this->assertSame($existing, $q->fresh()->lead_id);
        $this->assertNull($foreign->fresh()->lead_id);
    }

    public function test_quotation_agenda_is_shared_and_survives_linking_rescheduling_and_completion(): void
    {
        $u = $this->actor();
        $q = $this->quote($u);
        $payload = $this->agenda(['quotation_id' => 'Q1']);
        $id = $this->actingAs($u)->postJson('/leads/visits', $payload)->assertOk()->json('visit.id');
        $this->postJson('/leads/visits', $payload)->assertOk()->assertJsonPath('visit.id', $id);
        $this->assertDatabaseCount('lead_visits', 1);
        $this->assertDatabaseCount('leads', 0);
        $this->assertNull(LeadVisit::find($id)->lead_id);
        $stats = app(PersonalDashboard::class)->build($u, collect());
        $this->assertSame(1, $stats['pipelineReview']['needsFollowUp']);
        $this->assertSame('/quotations/Q1', $stats['upcomingTasks'][0]['url']);
        $this->get('/team-calendar')->assertOk()->assertInertia(fn (Assert $p) => $p->has('visits', 1)->where('visits.0.id', $id));
        $leadId = $this->postJson('/workflow/quotations/Q1/lead', [])->assertOk()->json('lead.id');
        $this->assertSame($leadId, LeadVisit::find($id)->lead_id);
        $this->getJson('/workflow/leads/'.$leadId)->assertOk()->assertJsonPath('visits.0.id', $id);
        $this->putJson('/leads/visits/'.$id, $this->agenda(['scheduled_at' => '2026-11-07T14:00']))->assertOk();
        $this->assertDatabaseCount('lead_visits', 1);
        $this->postJson('/leads/visits/'.$id.'/check-in')->assertOk();
        $this->postJson('/leads/visits/'.$id.'/check-in')->assertOk();
        $this->assertNotNull(LeadVisit::find($id)->checked_in_at);
        $this->assertSame(0, app(PersonalDashboard::class)->build($u, collect())['pipelineReview']['needsFollowUp']);
        Http::assertNothingSent();
    }

    public function test_scheduled_progress_creates_one_actionable_agenda_not_duplicate_dashboard_tasks(): void
    {
        $u = $this->actor();
        $lead = Lead::create(['title' => 'Project', 'sales_id' => $u->id, 'stage' => 'follow_up']);
        $res = $this->actingAs($u)->postJson('/leads/'.$lead->id.'/activities', [
            'type' => 'whatsapp', 'title' => 'Minta penawaran', 'description' => 'Kirim rincian', 'scheduled_at' => now()->addDay()->toDateTimeString(),
        ])->assertOk();
        $visitId = $res->json('activity.visit.id');
        $activityId = $res->json('activity.id');
        $this->assertNotNull($visitId);
        $stats = app(PersonalDashboard::class)->build($u, collect());
        $this->assertCount(1, $stats['upcomingTasks']);
        $this->patchJson('/leads/'.$lead->id.'/activities/'.$activityId, ['title' => 'Changed'])->assertUnprocessable();
        $this->postJson('/leads/visits/'.$visitId.'/check-in')->assertOk();
        $this->assertNotNull(LeadActivity::find($activityId)->completed_at);
        $this->assertSame(0, app(PersonalDashboard::class)->build($u, collect())['pipelineReview']['needsFollowUp']);
    }

    public function test_cancellation_keeps_history_and_cannot_be_completed_or_modified(): void
    {
        $u = $this->actor();
        $this->quote($u);
        $id = $this->actingAs($u)->postJson('/leads/visits', $this->agenda(['quotation_id' => 'Q1']))->assertOk()->json('visit.id');
        $this->postJson('/workflow/visits/'.$id.'/cancel')->assertOk();
        $this->postJson('/workflow/visits/'.$id.'/cancel')->assertOk();
        $this->postJson('/leads/visits/'.$id.'/check-in')->assertUnprocessable();
        $this->putJson('/leads/visits/'.$id, $this->agenda())->assertUnprocessable();
        $this->assertDatabaseCount('lead_visits', 1);
        $this->getJson('/workflow/quotations/Q1')->assertJsonCount(1, 'visits');
        $this->get('/team-calendar')->assertInertia(fn (Assert $p) => $p->has('visits', 0));
    }

    public function test_permission_and_bu_scope_control_linking_and_agenda_access(): void
    {
        $u = $this->actor();
        $other = $this->actor();
        $third = $this->actor();
        $this->quote($other, 'QTEAM');
        $this->quote($third, 'QOUT');
        $visit = LeadVisit::create($this->agenda(['quotation_id' => 'QTEAM', 'user_id' => $other->id]));
        $this->actingAs($u)->getJson('/workflow/quotations/QTEAM')->assertNotFound();
        $this->postJson('/leads/visits/'.$visit->id.'/check-in')->assertForbidden();
        $bu = (string) Str::uuid();
        DB::table('business_units')->insert(['id' => $bu, 'name' => 'Test BU', 'code' => 'TBU']);
        foreach ([$u, $other] as $member) {
            BusinessUnitMember::create(['business_unit_id' => $bu, 'user_id' => $member->id]);
        }
        $u->givePermissionTo(Permission::findOrCreate('quotations_view_bu', 'web'));
        $this->getJson('/workflow/quotations/QTEAM')->assertOk()->assertJsonCount(1, 'visits');
        $this->postJson('/workflow/quotations/QTEAM/lead', [])->assertOk();
        $this->getJson('/workflow/quotations/QOUT')->assertNotFound();
        $u->revokePermissionTo('quotations_edit');
        $this->postJson('/workflow/quotations/QTEAM/lead', [])->assertForbidden();
        $this->postJson('/leads/visits', $this->agenda(['quotation_id' => 'QTEAM']))->assertForbidden();
    }

    public function test_quote_created_from_lead_reuses_link_and_rejects_forged_customer(): void
    {
        $u = $this->actor();
        $this->quote($u);
        $this->quote($u, 'Q2', 'C2');
        $lead = Lead::create(['title' => 'Original', 'sales_id' => $u->id, 'customer_id' => 'C1']);
        $this->actingAs($u)->post('/quotations', ['customer_id' => 'C1', 'lead_id' => $lead->id])->assertRedirect();
        $this->assertSame(1, Quotation::where('lead_id', $lead->id)->count());
        $this->postJson('/quotations', ['customer_id' => 'C2', 'lead_id' => $lead->id])->assertUnprocessable();
    }

    public function test_reschedule_reports_external_failures_without_losing_internal_agenda(): void
    {
        $u = $this->actor();
        $q = $this->quote($u);
        $visit = LeadVisit::create($this->agenda(['quotation_id' => 'Q1', 'user_id' => $u->id, 'gc_event_id' => 'g1', 'zoom_meeting_id' => 'z1']));
        $this->mock(GoogleCalendarService::class, function ($m) {
            $m->shouldReceive('isConfigured')->once()->andReturn(true);
            $m->shouldReceive('updateEvent')->once()->andReturn(false);
        });
        $this->mock(ZoomService::class, function ($m) {
            $m->shouldReceive('updateMeeting')->once()->andReturn(false);
        });
        $this->actingAs($u)->putJson('/leads/visits/'.$visit->id, $this->agenda(['scheduled_at' => '2026-11-08T11:00']))
            ->assertOk()->assertJsonCount(2, 'warnings');
        $this->assertSame('2026-11-08 11:00', $visit->fresh()->scheduled_at->format('Y-m-d H:i'));
        $this->assertSame('g1', $visit->fresh()->gc_event_id);
        Http::assertNothingSent();
    }

    public function test_timezone_is_preserved_across_quotation_and_activity_entry_points(): void
    {
        $u = $this->actor();
        $this->quote($u);
        $res = $this->actingAs($u)->postJson('/leads/visits', $this->agenda(['quotation_id' => 'Q1', 'scheduled_at' => '2026-11-06T09:00:00+07:00']))->assertOk();
        $visit = LeadVisit::findOrFail($res->json('visit.id'));
        $this->assertSame('2026-11-06 09:00', $visit->scheduled_at->setTimezone('Asia/Jakarta')->format('Y-m-d H:i'));
        $lead = Lead::create(['title' => 'Meeting', 'sales_id' => $u->id]);
        $a = $this->postJson('/leads/'.$lead->id.'/activities', ['type' => 'note', 'title' => 'Call', 'scheduled_at' => '2026-11-06T09:00:00+07:00'])->assertOk();
        $this->assertSame('2026-11-06 09:00', LeadVisit::find($a->json('activity.visit.id'))->scheduled_at->setTimezone('Asia/Jakarta')->format('Y-m-d H:i'));
    }

    public function test_legacy_scheduled_activity_migration_preserves_completed_status_without_creating_external_events(): void
    {
        // Simulate the schema before the migration in the isolated test database.
        $migration = require database_path('migrations/2026_11_05_000000_connect_workflow_agendas.php');
        $migration->down();
        $u = $this->actor();
        $lead = Lead::create(['title' => 'Legacy', 'sales_id' => $u->id]);
        $a = LeadActivity::create(['lead_id' => $lead->id, 'user_id' => $u->id, 'type' => 'note', 'title' => str_repeat('A', 255),
            'scheduled_at' => now()->subDay(), 'completed_at' => now()]);
        $migration->up();
        $this->assertDatabaseCount('lead_visits', 1);
        $visit = LeadVisit::where('lead_activity_id', $a->id)->firstOrFail();
        $this->assertNotNull($visit->checked_in_at);
        $this->assertSame(255, mb_strlen($visit->subject));
        $this->assertSame($a->scheduled_at->toDateTimeString(), $visit->scheduled_at->toDateTimeString());
        Http::assertNothingSent();
    }

    public function test_lead_without_customer_is_completed_when_a_quotation_creates_the_customer(): void
    {
        $u = $this->actor();
        $lead = Lead::create(['title' => 'Old prospect', 'sales_id' => $u->id, 'pic_name' => 'Existing PIC']);
        $this->actingAs($u)->post('/quotations', ['lead_id' => $lead->id, 'new_customer_name' => 'PT Baru', 'new_customer_address' => 'Surabaya',
            'new_pics' => [['name' => 'Contact A', 'phone' => '08123']]])->assertRedirect();
        $q = Quotation::where('lead_id',$lead->id)->firstOrFail();
        $this->assertSame($q->customer_id,$lead->fresh()->customer_id);
        $this->assertSame('Surabaya',$lead->fresh()->customer_address);
        $this->assertSame('Existing PIC',$lead->fresh()->pic_name);
        $this->assertDatabaseCount('lead_pics',1);
    }
    public function test_agenda_on_a_shared_bu_lead_belongs_to_the_user_doing_the_follow_up(): void
    {
        $u=$this->actor(); $owner=$this->actor();
        $bu=(string) Str::uuid(); DB::table('business_units')->insert(['id'=>$bu,'name'=>'BU','code'=>'TEAM']);
        foreach ([$u,$owner] as $member) BusinessUnitMember::create(['business_unit_id'=>$bu,'user_id'=>$member->id]);
        $u->givePermissionTo(Permission::findOrCreate('quotations_view_bu','web'));
        $lead=Lead::create(['title'=>'Shared lead','sales_id'=>$owner->id,'stage'=>'follow_up']);
        $this->actingAs($u)->postJson('/leads/visits',$this->agenda(['lead_id'=>$lead->id]))->assertOk();
        $stats=app(PersonalDashboard::class)->build($u,collect());
        $this->assertSame(1,$stats['pipelineReview']['needsFollowUp']);
        $this->assertSame('/leads/'.$lead->id,$stats['upcomingTasks'][0]['url']);
        $this->assertSame(0,app(PersonalDashboard::class)->build($owner,collect())['pipelineReview']['needsFollowUp']);
    }


    public function test_agenda_types_without_zoom_and_zoom_license_validation(): void
    {
        $u = $this->actor();
        $u->update(['has_zoom_license' => false]);
        foreach (['demo', 'presentation', 'installation', 'maintenance', 'leave'] as $type) {
            $this->actingAs($u)->postJson('/leads/visits', $this->agenda([
                'visit_type' => $type, 'subject' => $type,
            ]))->assertOk();
            $this->assertDatabaseHas('lead_visits', ['visit_type' => $type, 'user_id' => $u->id]);
        }
        $this->assertDatabaseCount('lead_visits', 5);
        $this->postJson('/leads/visits', $this->agenda(['create_zoom' => true]))
            ->assertUnprocessable()->assertJsonValidationErrors('create_zoom');
        $this->assertDatabaseCount('lead_visits', 5);
    }

    public function test_duplicate_customer_from_quotation_is_a_validation_error(): void
    {
        $u = $this->actor();
        Customer::create(['id' => 'CABC', 'name' => 'PT ABC', 'address' => 'Alamat lama', 'created_by' => $u->id]);
        $this->actingAs($u)->postJson('/quotations', [
            'new_customer_name' => '  PT ABC  ', 'new_customer_address' => 'Jl merah putih',
            'new_pics' => [['name' => 'PIC baru']],
        ])->assertUnprocessable()->assertJsonValidationErrors('new_customer_name');
        $this->assertDatabaseCount('customers', 1);
        $this->assertDatabaseCount('quotations', 0);
        $this->assertDatabaseCount('customer_pics', 0);
        $this->assertDatabaseHas('customers', ['id' => 'CABC', 'address' => 'Alamat lama']);
        $this->post('/quotations', ['customer_id' => 'CABC'])->assertRedirect();
        $this->assertDatabaseCount('quotations', 1);
    }
}
