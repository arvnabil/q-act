<?php

namespace Tests\Feature;

use App\Models\BusinessUnit;
use App\Models\BusinessUnitMember;
use App\Models\Customer;
use App\Models\Lead;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class LeadPipelineFilterTest extends TestCase
{
    use RefreshDatabase;

    private function actor(array $permissions = ['leads_view']): User
    {
        $user = User::factory()->create(['role' => 'Sales', 'is_active' => true]);
        foreach ($permissions as $permission) {
            $user->givePermissionTo(Permission::findOrCreate($permission, 'web'));
        }

        return $user;
    }

    private function lead(User $owner, array $attributes = []): Lead
    {
        return Lead::create(array_merge([
            'title' => 'Penawaran perangkat meeting',
            'sales_id' => $owner->id,
            'created_by' => $owner->id,
            'stage' => 'lead_masuk',
            'estimated_value' => 1000,
        ], $attributes));
    }

    public function test_search_filters_both_groups_and_stats_and_reset_restores_active_leads(): void
    {
        $user = $this->actor();
        $customer = Customer::create(['id' => 'C1', 'name' => 'Yayasan Purnomo', 'created_by' => $user->id]);
        $byTitle = $this->lead($user, ['title' => 'Penawaran Purnomo', 'estimated_value' => 1500]);
        $byCustomer = $this->lead($user, ['customer_id' => $customer->id, 'stage' => 'win', 'estimated_value' => 2500]);
        $this->lead($user, ['title' => 'Blackmores', 'estimated_value' => 7000]);
        $this->lead($user, ['title' => 'Purnomo arsip', 'is_archived' => true, 'estimated_value' => 99000]);

        $this->actingAs($user)->get(route('leads.index', ['search' => '  Purnomo  ']))
            ->assertOk()->assertInertia(fn (Assert $page) => $page
                ->component('Leads')
                ->where('filters.search', 'Purnomo')
                ->where('stats.total', 2)
                ->where('stats.totalEstimated', 4000)
                ->where('stats.dealsWon', 1)
                ->has('grouped.lead_masuk', 1)->where('grouped.lead_masuk.0.id', $byTitle->id)
                ->has('grouped.win', 1)->where('grouped.win.0.id', $byCustomer->id));

        $this->get(route('leads.index'))->assertOk()->assertInertia(fn (Assert $page) => $page
            ->where('filters', ['search' => '', 'stage' => '', 'sales_id' => ''])
            ->where('stats.total', 3)->where('stats.totalEstimated', 11000));
    }

    public function test_search_stage_and_owner_filters_are_combined_including_custom_stages(): void
    {
        $viewer = $this->actor(['leads_view', 'leads_view_all']);
        $owner = $this->actor();
        $other = $this->actor();
        $match = $this->lead($owner, ['title' => 'Purnomo', 'stage' => 'demo_produk', 'estimated_value' => 2400]);
        $this->lead($owner, ['title' => 'Purnomo', 'stage' => 'negotiation']);
        $this->lead($other, ['title' => 'Purnomo', 'stage' => 'demo_produk']);
        $this->lead($owner, ['title' => 'Blackmores', 'stage' => 'demo_produk']);

        $this->actingAs($viewer)->get(route('leads.index', [
            'search' => 'Purnomo', 'stage' => 'demo_produk', 'sales_id' => $owner->id,
        ]))->assertOk()->assertInertia(fn (Assert $page) => $page
            ->where('stats.total', 1)->where('stats.totalEstimated', 2400)
            ->has('grouped.demo_produk', 1)->where('grouped.demo_produk.0.id', $match->id)
            ->has('grouped.negotiation', 0)
            ->where('filterSalesUsers', fn ($users) => collect($users)->pluck('id')->sort()->values()->all()
                === collect([$viewer->id, $owner->id, $other->id])->sort()->values()->all()));
    }

    public function test_search_by_code_phone_or_customer_snapshot_and_empty_results(): void
    {
        $user = $this->actor();
        $lead = $this->lead($user, ['lead_code' => 'L2611.321', 'customer_phone' => '081298765432', 'customer_name' => 'CV Kencana']);
        foreach (['L2611.321', '98765432', 'Kencana'] as $term) {
            $this->actingAs($user)->get(route('leads.index', ['search' => $term]))
                ->assertOk()->assertInertia(fn (Assert $page) => $page
                    ->where('stats.total', 1)->where('grouped.lead_masuk.0.id', $lead->id));
        }

        $this->get(route('leads.index', ['search' => 'Tidak cocok']))
            ->assertOk()->assertInertia(fn (Assert $page) => $page
                ->where('stats.total', 0)->where('stats.totalEstimated', 0)->where('stats.dealsWon', 0)
                ->where('grouped', fn ($groups) => collect($groups)->flatten(1)->isEmpty()));
    }

    public function test_own_scope_cannot_be_bypassed_by_search_or_owner_filter(): void
    {
        $user = $this->actor();
        $other = $this->actor();
        $customer = Customer::create(['id' => 'C2', 'name' => 'Purnomo rahasia', 'created_by' => $other->id]);
        $this->lead($user);
        $this->lead($other, ['customer_id' => $customer->id]);

        foreach ([['search' => 'Purnomo'], ['sales_id' => $other->id], ['search' => 'Purnomo', 'sales_id' => $other->id]] as $filters) {
            $this->actingAs($user)->get(route('leads.index', $filters))
                ->assertOk()->assertInertia(fn (Assert $page) => $page
                    ->where('stats.total', 0)->where('stats.totalEstimated', 0)
                    ->where('grouped', fn ($groups) => collect($groups)->flatten(1)->isEmpty())
                    ->has('filterSalesUsers', 1)->where('filterSalesUsers.0.id', $user->id));
        }
    }

    public function test_bu_member_can_filter_teammates_but_not_people_outside_their_bu(): void
    {
        $user = $this->actor(['leads_view', 'leads_view_bu']);
        $teammate = $this->actor();
        $outside = $this->actor();
        $bu = BusinessUnit::create(['name' => 'BU Sales', 'code' => 'BUA']);
        foreach ([$user, $teammate] as $member) {
            BusinessUnitMember::create(['business_unit_id' => $bu->id, 'user_id' => $member->id]);
        }
        $this->lead($user);
        $match = $this->lead($teammate, ['estimated_value' => 2500]);
        $this->lead($outside, ['estimated_value' => 9500]);

        $this->actingAs($user)->get(route('leads.index', ['sales_id' => $teammate->id]))
            ->assertOk()->assertInertia(fn (Assert $page) => $page
                ->where('stats.total', 1)->where('stats.totalEstimated', 2500)
                ->where('grouped.lead_masuk.0.id', $match->id)
                ->where('filterSalesUsers', fn ($users) => collect($users)->pluck('id')->sort()->values()->all()
                    === collect([$user->id, $teammate->id])->sort()->values()->all()));

        $this->get(route('leads.index', ['sales_id' => $outside->id]))->assertOk()
            ->assertInertia(fn (Assert $page) => $page->where('stats.total', 0));
    }

    public function test_owner_filter_uses_creator_only_when_a_lead_has_no_sales_owner(): void
    {
        $viewer = $this->actor(['leads_view', 'leads_view_all']);
        $owner = $this->actor();
        $unassigned = $this->lead($owner, ['sales_id' => null]);
        $this->lead($viewer, ['created_by' => $owner->id, 'estimated_value' => 5000]);

        $this->actingAs($viewer)->get(route('leads.index', ['sales_id' => $owner->id]))
            ->assertOk()->assertInertia(fn (Assert $page) => $page
                ->where('stats.total', 1)->where('stats.totalEstimated', 1000)
                ->where('grouped.lead_masuk.0.id', $unassigned->id));
    }
}
