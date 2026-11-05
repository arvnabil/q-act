<?php

namespace Tests\Feature;

use App\Models\{User, BusinessUnitMember};
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Spatie\Permission\Models\{Role, Permission};
use Tests\TestCase;

class RoleSettingsTest extends TestCase
{
    use RefreshDatabase;

    private function editor(): User
    {
        $user = User::factory()->create();
        $user->givePermissionTo(Permission::findOrCreate('manage_roles', 'web'));
        return $user;
    }

    public function test_role_members_include_their_business_unit(): void
    {
        $this->withoutVite();
        $role = Role::findOrCreate('Sales', 'web');
        $member = User::factory()->create(['name' => 'Sales Example']);
        $member->assignRole($role);
        $bu = (string) Str::uuid();
        DB::table('business_units')->insert(['id' => $bu, 'name' => 'BU Example', 'code' => 'TEST']);
        BusinessUnitMember::create(['user_id' => $member->id, 'business_unit_id' => $bu]);
        $this->actingAs($this->editor())->get('/roles')->assertOk()->assertInertia(fn ($page) => $page
            ->component('Roles')->has('roleMembers.Sales', 1)
            ->where('roleMembers.Sales.0.name', 'Sales Example')
            ->where('roleMembers.Sales.0.business_unit', 'BU Example'));
    }

    public function test_saving_one_role_keeps_other_roles_and_custom_permissions(): void
    {
        $sales = Role::findOrCreate('Sales', 'web');
        $finance = Role::findOrCreate('Finance', 'web');
        $view = Permission::findOrCreate('quotations_view', 'web');
        $custom = Permission::findOrCreate('custom_feature', 'web');
        $sales->givePermissionTo([$view, $custom]);
        $finance->givePermissionTo($view);
        $this->actingAs($this->editor())->put('/roles', ['rolePermissions' => ['Sales' => [
            'quotations_view' => true, 'quotations_view_bu' => true, 'quotations_view_all' => false,
        ]]])->assertSessionHasNoErrors()->assertRedirect();
        $this->assertTrue($sales->fresh()->hasPermissionTo('custom_feature'));
        $this->assertTrue($sales->fresh()->hasPermissionTo('quotations_view_bu'));
        $this->assertTrue($finance->fresh()->hasPermissionTo('quotations_view'));
    }

    public function test_invalid_permissions_are_rejected_without_partial_changes(): void
    {
        $role = Role::findOrCreate('Sales', 'web');
        $this->actingAs($this->editor())->put('/roles', ['rolePermissions' => ['Sales' => [
            'quotations_view' => true, 'invented_permission' => true,
        ]]])->assertSessionHasErrors('rolePermissions');
        $this->assertCount(0, $role->fresh()->permissions);
    }

    public function test_administrator_cannot_lose_existing_role_management_access(): void
    {
        $role = Role::findOrCreate('Administrator', 'web');
        $role->givePermissionTo(Permission::findOrCreate('manage_roles', 'web'));
        $this->actingAs($this->editor())->put('/roles', ['rolePermissions' => ['Administrator' => [
            'manage_roles' => false,
        ]]])->assertSessionHasErrors('rolePermissions');
        $this->assertTrue($role->fresh()->hasPermissionTo('manage_roles'));
    }

    public function test_users_without_permission_cannot_read_or_update_roles(): void
    {
        $this->actingAs(User::factory()->create())->get('/roles')->assertForbidden();
        $this->put('/roles', ['rolePermissions' => ['Sales' => ['quotations_view' => true]]])->assertForbidden();
    }
}
