<?php
namespace Tests\Feature;

use App\Models\{User, Customer, Quotation, QuotationItem, QuotationPurchaseOrder, Lead, LeadActivity, BusinessUnitMember};
use App\Services\{DashboardPurchaseOrders, PersonalDashboard};
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Permission;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class DashboardDataTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void { parent::setUp(); $this->travelTo(now()->setDate(2026, 11, 4)->startOfDay()); }

    private function grant($user, $names = ['dashboard', 'dashboard_view']): void {
        foreach ($names as $name) $user->givePermissionTo(Permission::findOrCreate($name, 'web'));
    }
    private function quote($user, $id, $date = '2026-11-01'): Quotation {
        Customer::firstOrCreate(['id' => 'CTEST'], ['name' => 'Test Customer', 'created_by' => $user->id]);
        return Quotation::create(['id' => $id, 'customer_id' => 'CTEST', 'sales_id' => $user->id, 'created_by' => $user->id,
            'date' => $date, 'expired' => '2026-12-01', 'status' => 'approved', 'calc_tax' => false]);
    }
    private function item($q, $price): QuotationItem {
        return QuotationItem::create(['quotation_id' => $q->id, 'name' => 'Item', 'qty' => 1, 'hpp' => 10, 'price' => $price]);
    }
    private function po($q, $items, $date, $status = 'Diterima'): void {
        QuotationPurchaseOrder::create(['id' => (string) Str::uuid(), 'quotation_id' => $q->id, 'status' => $status,
            'po_number' => (string) Str::uuid(), 'po_date' => $date, 'quotation_item_ids' => $items]);
    }

    public function test_one_lead_with_many_quotes_is_one_lead_and_po_dates_drive_value(): void {
        $user = User::factory()->create();
        $lead = Lead::create(['title' => 'One opportunity', 'sales_id' => $user->id, 'stage' => 'win']);
        LeadActivity::create(['lead_id' => $lead->id, 'type' => 'stage_change', 'metadata' => ['from' => 'negotiation', 'to' => 'win']]);
        foreach (['Q1', 'Q2', 'Q3'] as $id) { $q = $this->quote($user, $id); $q->lead_id = $lead->id; $q->save(); }
        $q = Quotation::find('Q1');
        $a = $this->item($q, 100); $b = $this->item($q, 250); $c = $this->item($q, 999);
        $this->po($q, [$a->id], '2026-10-10'); $this->po($q, [$b->id], '2026-11-03');
        $data = app(DashboardPurchaseOrders::class)->rows(Quotation::with('items')->get());
        $this->assertCount(2, $data['rows']); $this->assertSame(2, $data['missingDate']);
        $stats = app(PersonalDashboard::class)->build($user, $data['rows']);
        $this->assertSame(1, $stats['allTime']['totalLeads']);
        $this->assertSame(1, $stats['allTime']['dealsWon']);
        $this->assertEquals(250, $stats['revenueThisMonth']);
        $this->assertEquals(350, $stats['allTime']['totalRevenue']);
    }

    public function test_overlapping_po_allocations_cancelled_and_superseded_do_not_inflate_value(): void {
        $user = User::factory()->create(); $q = $this->quote($user, 'Q1'); $item = $this->item($q, 100);
        $this->po($q, [$item->id], '2026-11-01'); $this->po($q, [$item->id], '2026-11-02');
        $old = $this->quote($user, 'QOLD'); $old->update(['status' => 'superseded']);
        $this->po($old, [$this->item($old, 500)->id], '2026-11-01');
        $cancel = $this->quote($user, 'QCANCEL'); $this->po($cancel, [$this->item($cancel, 800)->id], '2026-11-01', 'Dibatalkan');
        $data = app(DashboardPurchaseOrders::class)->rows(Quotation::with('items')->get());
        $this->assertCount(0, $data['rows']); $this->assertSame(2, $data['invalidAllocation']);
    }

    public function test_scope_restricts_dropdown_metrics_and_spoofed_sales_id(): void {
        $own = User::factory()->create(['is_active' => true]); $other = User::factory()->create(['is_active' => true]);
        $this->grant($own); $this->quote($own, 'QOWN'); $this->quote($other, 'QOTHER');
        $this->actingAs($own)->get('/dashboard?basis=quotation')->assertOk()->assertInertia(fn (Assert $p) =>
            $p->has('tableQuotations', 1)->where('tableQuotations.0.id', 'QOWN')->has('salesUsers', 1));
        $this->get('/dashboard?personal_sales_id='.$other->id)->assertForbidden();
        $this->get('/dashboard?sales_filter='.$other->id)->assertForbidden();
        $bu = (string) Str::uuid(); DB::table('business_units')->insert(['id' => $bu, 'name' => 'BU', 'code' => 'BU']);
        foreach ([$own, $other] as $u) BusinessUnitMember::create(['business_unit_id' => $bu, 'user_id' => $u->id]);
        $this->grant($own, ['dashboard_view_bu']);
        $this->get('/dashboard?basis=quotation')->assertOk()->assertInertia(fn (Assert $p) => $p->has('tableQuotations', 2)->has('salesUsers', 2));
        $this->get('/dashboard?personal_sales_id='.$other->id)->assertOk();
    }

    public function test_quotation_uses_business_date_and_revoked_dashboard_view_denies_admin(): void {
        $user = User::factory()->create(['role' => 'Administrator']); $this->grant($user);
        $this->quote($user, 'QOLD', '2026-01-01'); $this->quote($user, 'QNOW');
        $this->actingAs($user)->get('/dashboard?basis=quotation&period=1m')->assertInertia(fn (Assert $p) =>
            $p->has('tableQuotations', 1)->where('tableQuotations.0.id', 'QNOW'));
        $user->revokePermissionTo('dashboard_view');
        $this->get('/dashboard')->assertForbidden();
    }

    public function test_weekly_review_uses_unfinished_scheduled_activities_not_quotation_expiry(): void {
        $user = User::factory()->create(); $lead = Lead::create(['title' => 'Open', 'sales_id' => $user->id, 'stage' => 'follow_up']);
        LeadActivity::create(['lead_id' => $lead->id, 'type' => 'follow_up', 'scheduled_at' => now(), 'title' => 'Call']);
        LeadActivity::create(['lead_id' => $lead->id, 'type' => 'follow_up', 'scheduled_at' => now(), 'completed_at' => now()]);
        $data = app(PersonalDashboard::class)->build($user, collect());
        $this->assertSame(1, $data['pipelineReview']['todayAgenda']);
        $this->assertSame(1, $data['pipelineReview']['needsFollowUp']);
        $this->assertCount(1, $data['upcomingTasks']);
    }

    public function test_root_and_sub_report_remaining_items_without_double_counting(): void {
        $user = User::factory()->create(['is_active' => true]); $this->grant($user);
        $root = $this->quote($user, 'QROOT'); $item = $this->item($root, 100);
        $root->update(['subtotal' => 100, 'grand_total' => 100]);
        $sub = $this->quote($user, 'QSUB'); $sub->update(['parent_quotation_id' => $root->id, 'relation_type' => 'split']);
        $copy = $this->item($sub, 100); $copy->update(['source_quotation_item_id' => $item->id]);
        $sub->update(['subtotal' => 100, 'grand_total' => 100]);
        $this->actingAs($user)->get('/dashboard?basis=quotation&period=1m')->assertInertia(fn (Assert $p) =>
            $p->where('stats.totalAllValue', 100)->has('tableQuotations', 2));
    }

    public function test_po_dashboard_counts_documents_and_distinct_quotations_separately(): void {
        $user = User::factory()->create(['is_active' => true]); $this->grant($user);
        $q = $this->quote($user, 'Q1', '2026-01-01');
        $a = $this->item($q, 100); $b = $this->item($q, 250);
        $this->po($q, [$a->id], '2026-11-01'); $this->po($q, [$b->id], '2026-11-02');
        $this->actingAs($user)->get('/dashboard?basis=po&period=1m')->assertInertia(fn (Assert $p) =>
            $p->where('stats.totalQ', 2)->where('stats.quotationPoCount', 1)->where('stats.totalAllValue', 350)
                ->has('tableSalesOrders', 2)->has('tableQuotations', 0));
    }

    public function test_sales_selector_only_lists_active_sales_and_presales(): void {
        $admin = User::factory()->create(['role' => 'Administrator', 'is_active' => true]);
        $this->grant($admin, ['dashboard', 'dashboard_view', 'dashboard_view_all']);
        $sales = User::factory()->create(['role' => 'Sales', 'is_active' => true, 'name' => 'A Sales']);
        User::factory()->create(['role' => 'Presales', 'is_active' => true]);
        User::factory()->create(['role' => 'Finance', 'is_active' => true]);
        User::factory()->create(['role' => 'Sales', 'is_active' => false]);
        $this->actingAs($admin)->get('/dashboard')->assertInertia(fn (Assert $p) =>
            $p->has('salesUsers', 2)->where('salesUsers.0.role', 'Sales')
                ->where('personalStats.targetUser.id', $sales->id)->where('filters.personalSalesId', $sales->id));
    }
}
