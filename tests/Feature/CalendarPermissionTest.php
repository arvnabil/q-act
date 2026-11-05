<?php

namespace Tests\Feature;

use App\Models\BusinessUnit;
use App\Models\BusinessUnitMember;
use App\Models\Customer;
use App\Models\Lead;
use App\Models\LeadVisit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class CalendarPermissionTest extends TestCase
{
    use RefreshDatabase;

    private function makeUser(array $permissions = []): User
    {
        $user = User::factory()->create(['role' => 'Sales', 'is_active' => true]);
        foreach ($permissions as $permission) {
            $user->givePermissionTo(Permission::findOrCreate($permission, 'web'));
        }
        return $user;
    }

    public function test_user_without_calendar_access_is_forbidden(): void
    {
        $user = $this->makeUser([]);
        $this->actingAs($user)->get('/team-calendar')->assertForbidden();
    }

    public function test_user_with_own_scope_only_sees_their_own_visits(): void
    {
        $user1 = $this->makeUser(['calendar_view']);
        $user2 = $this->makeUser(['calendar_view']);

        $customer = Customer::create(['id' => 'CUST001', 'name' => 'PT ABC', 'created_by' => $user1->id]);
        $lead = Lead::create(['title' => 'Project A', 'customer_id' => $customer->id, 'created_by' => $user1->id, 'stage' => 'lead_masuk', 'status' => 'active']);

        $visit1 = LeadVisit::create([
            'lead_id' => $lead->id,
            'user_id' => $user1->id,
            'customer_id' => $customer->id,
            'subject' => 'Meeting A',
            'scheduled_at' => now()->addDay(),
            'visit_type' => 'meeting',
            'status' => 'scheduled',
        ]);

        $visit2 = LeadVisit::create([
            'lead_id' => $lead->id,
            'user_id' => $user2->id,
            'customer_id' => $customer->id,
            'subject' => 'Meeting B',
            'scheduled_at' => now()->addDay(),
            'visit_type' => 'meeting',
            'status' => 'scheduled',
        ]);

        $this->actingAs($user1)->get('/team-calendar')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('TeamCalendar')
                ->where('calendarScope', 'own')
                ->has('visits', 1)
                ->where('visits.0.id', $visit1->id)
            );
    }

    public function test_user_with_bu_scope_sees_visits_from_same_business_unit(): void
    {
        $user1 = $this->makeUser(['calendar_view', 'calendar_view_bu']);
        $user2 = $this->makeUser(['calendar_view']); // Same BU
        $user3 = $this->makeUser(['calendar_view']); // Other BU

        $bu1 = (string) \Illuminate\Support\Str::uuid();
        $bu2 = (string) \Illuminate\Support\Str::uuid();
        \Illuminate\Support\Facades\DB::table('business_units')->insert([
            ['id' => $bu1, 'name' => 'BU Alpha', 'code' => 'ALPHA'],
            ['id' => $bu2, 'name' => 'BU Beta', 'code' => 'BETA'],
        ]);

        BusinessUnitMember::create(['user_id' => $user1->id, 'business_unit_id' => $bu1]);
        BusinessUnitMember::create(['user_id' => $user2->id, 'business_unit_id' => $bu1]);
        BusinessUnitMember::create(['user_id' => $user3->id, 'business_unit_id' => $bu2]);

        $customer = Customer::create(['id' => 'CUST002', 'name' => 'PT XYZ', 'created_by' => $user1->id]);
        $lead = Lead::create(['title' => 'Project B', 'customer_id' => $customer->id, 'created_by' => $user1->id, 'stage' => 'lead_masuk', 'status' => 'active']);

        $v1 = LeadVisit::create(['lead_id' => $lead->id, 'user_id' => $user1->id, 'customer_id' => $customer->id, 'subject' => 'Visit 1', 'scheduled_at' => now()->addDay(), 'visit_type' => 'meeting', 'status' => 'scheduled']);
        $v2 = LeadVisit::create(['lead_id' => $lead->id, 'user_id' => $user2->id, 'customer_id' => $customer->id, 'subject' => 'Visit 2', 'scheduled_at' => now()->addDay(), 'visit_type' => 'meeting', 'status' => 'scheduled']);
        $v3 = LeadVisit::create(['lead_id' => $lead->id, 'user_id' => $user3->id, 'customer_id' => $customer->id, 'subject' => 'Visit 3', 'scheduled_at' => now()->addDay(), 'visit_type' => 'meeting', 'status' => 'scheduled']);

        $this->actingAs($user1)->get('/team-calendar')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('TeamCalendar')
                ->where('calendarScope', 'bu')
                ->has('visits', 2)
                ->where('visits.0.id', $v1->id)
                ->where('visits.1.id', $v2->id)
            );
    }

    public function test_user_with_all_scope_sees_all_company_visits(): void
    {
        $userAdmin = $this->makeUser(['calendar_view', 'calendar_view_all']);
        $user1 = $this->makeUser(['calendar_view']);
        $user2 = $this->makeUser(['calendar_view']);

        $customer = Customer::create(['id' => 'CUST003', 'name' => 'PT Global', 'created_by' => $userAdmin->id]);
        $lead = Lead::create(['title' => 'Project C', 'customer_id' => $customer->id, 'created_by' => $userAdmin->id, 'stage' => 'lead_masuk', 'status' => 'active']);

        $v1 = LeadVisit::create(['lead_id' => $lead->id, 'user_id' => $user1->id, 'customer_id' => $customer->id, 'subject' => 'Visit Admin 1', 'scheduled_at' => now()->addDay(), 'visit_type' => 'meeting', 'status' => 'scheduled']);
        $v2 = LeadVisit::create(['lead_id' => $lead->id, 'user_id' => $user2->id, 'customer_id' => $customer->id, 'subject' => 'Visit Admin 2', 'scheduled_at' => now()->addDay(), 'visit_type' => 'meeting', 'status' => 'scheduled']);

        $this->actingAs($userAdmin)->get('/team-calendar')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('TeamCalendar')
                ->where('calendarScope', 'all')
                ->has('visits', 2)
            );
    }

    public function test_calendar_permissions_can_be_configured_in_role_settings(): void
    {
        $editor = $this->makeUser(['manage_roles']);
        $salesRole = Role::findOrCreate('Sales', 'web');

        $this->actingAs($editor)->put('/roles', [
            'rolePermissions' => [
                'Sales' => [
                    'calendar_view' => true,
                    'calendar_view_bu' => true,
                    'calendar_view_all' => false,
                ],
            ],
        ])->assertSessionHasNoErrors()->assertRedirect();

        $this->assertTrue($salesRole->fresh()->hasPermissionTo('calendar_view'));
        $this->assertTrue($salesRole->fresh()->hasPermissionTo('calendar_view_bu'));
        $this->assertFalse($salesRole->fresh()->hasPermissionTo('calendar_view_all'));
    }
}
