<?php

namespace Tests\Feature;

use App\Models\{User, Customer, Quotation, SalesOrder, BusinessUnitMember};
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class HeaderSearchTest extends TestCase
{
    use RefreshDatabase;

    private function grant(User $user, array $permissions): void
    {
        foreach ($permissions as $permission) {
            $user->givePermissionTo(Permission::findOrCreate($permission, 'web'));
        }
    }

    private function documents(User $user, string $suffix, ?string $bu = null): void
    {
        Customer::create(['id' => 'C'.$suffix, 'name' => 'Search customer '.$suffix, 'created_by' => $user->id, 'bu_id' => $bu]);
        Quotation::create(['id' => 'Q'.$suffix, 'customer_id' => 'C'.$suffix, 'sales_id' => $user->id, 'created_by' => $user->id,
            'date' => '2026-11-04', 'expired' => '2026-11-11', 'bu_id' => $bu]);
        SalesOrder::create(['id' => 'SO'.$suffix, 'quotation_id' => 'Q'.$suffix, 'customer_id' => 'C'.$suffix,
            'sales_id' => $user->id, 'date' => '2026-11-04', 'bu_id' => $bu]);
    }

    public function test_own_scope_does_not_leak_other_sales_and_direct_urls_are_denied(): void
    {
        $sales = User::factory()->create();
        $other = User::factory()->create();
        $this->grant($sales, ['quotations_view', 'sales_orders_view', 'customers_view']);
        $this->documents($sales, 'OWN');
        $this->documents($other, 'OTHER');
        $response = $this->actingAs($sales)->getJson('/header-search?q=Search');
        $response->assertOk()->assertJsonCount(3, 'results')->assertJsonMissing(['title' => 'QOTHER'])
            ->assertJsonMissing(['title' => 'SOOTHER'])->assertJsonMissing(['title' => 'Search customer OTHER']);
        foreach (['quotations/QOTHER', 'sales-orders/SOOTHER', 'customers/COTHER'] as $url) {
            $this->get('/'.$url)->assertNotFound();
        }
    }

    public function test_bu_scope_and_all_scope_require_explicit_permissions(): void
    {
        $sales = User::factory()->create();
        $mate = User::factory()->create();
        $other = User::factory()->create();
        $bu = (string) Str::uuid();
        DB::table('business_units')->insert(['id' => $bu, 'name' => 'Test BU', 'code' => 'TEST']);
        foreach ([$sales, $mate] as $user) BusinessUnitMember::create(['user_id' => $user->id, 'business_unit_id' => $bu]);
        $this->documents($mate, 'MATE', $bu);
        $this->documents($other, 'OTHER');
        $this->grant($sales, ['quotations_view']);
        $this->actingAs($sales)->getJson('/header-search?q=Search')->assertJsonCount(0, 'results');
        $this->grant($sales, ['quotations_view_bu']);
        $this->getJson('/header-search?q=Search')->assertJsonCount(1, 'results')->assertJsonPath('results.0.title', 'QMATE');
        $this->grant($sales, ['quotations_view_all']);
        $this->getJson('/header-search?q=Search')->assertJsonCount(2, 'results');
    }

    public function test_no_bu_falls_back_to_own_and_deleted_documents_are_excluded(): void
    {
        $sales = User::factory()->create();
        $this->grant($sales, ['quotations_view', 'quotations_view_bu']);
        $this->documents($sales, 'OWN');
        $this->documents(User::factory()->create(), 'OTHER');
        $this->actingAs($sales)->getJson('/header-search?q=Search')->assertJsonCount(1, 'results');
        Quotation::whereKey('QOWN')->update(['is_deleted' => true]);
        $this->getJson('/header-search?q=Search')->assertJsonCount(0, 'results');
    }

    public function test_module_permission_is_required_even_for_administrator_role_label(): void
    {
        $admin = User::factory()->create(['role' => 'Administrator']);
        $this->documents($admin, 'ADMIN');
        $this->grant($admin, ['quotations_view_all']);
        $this->actingAs($admin)->getJson('/header-search?q=Search')->assertJsonCount(0, 'results');
        $this->get('/quotations/QADMIN')->assertNotFound();
    }

    public function test_search_requires_login_and_validates_input(): void
    {
        $this->getJson('/header-search?q=Search')->assertUnauthorized();
        $user = User::factory()->create();
        $this->actingAs($user)->getJson('/header-search?q=A')->assertJsonCount(0, 'results');
        $this->getJson('/header-search?q='.str_repeat('a', 101))->assertUnprocessable();
    }

    public function test_admin_migration_and_permission_revocation_apply_to_list_search_and_detail(): void
    {
        $this->withoutVite();
        $admin = User::factory()->create(['role' => 'Administrator']);
        $role = \Spatie\Permission\Models\Role::findOrCreate('Administrator', 'web');
        $admin->assignRole($role);
        $migration = require database_path('migrations/2026_11_04_010000_restore_administrator_document_scope.php');
        $migration->up();
        $this->documents(User::factory()->create(), 'OTHER');
        $this->actingAs($admin->fresh());
        $this->getJson('/header-search?q=QOTHER')->assertJsonPath('results.0.title', 'QOTHER');
        $this->get('/quotations')->assertInertia(fn ($page) => $page->has('quotations', 1));
        $this->get('/sales-orders')->assertInertia(fn ($page) => $page->has('salesOrders', 1));
        $this->get('/customers')->assertInertia(fn ($page) => $page->has('customers', 1));
        $this->get('/quotations/QOTHER')->assertOk();

        $role->revokePermissionTo(['quotations_view_all', 'sales_orders_view_all', 'customers_view_all']);
        $this->actingAs($admin->fresh());
        $this->getJson('/header-search?q=Search')->assertJsonCount(0, 'results');
        $this->get('/quotations')->assertInertia(fn ($page) => $page->has('quotations', 0));
        $this->get('/sales-orders')->assertInertia(fn ($page) => $page->has('salesOrders', 0));
        $this->get('/customers')->assertInertia(fn ($page) => $page->has('customers', 0));
        $this->get('/quotations/QOTHER')->assertNotFound();
    }

    public function test_seeding_preserves_explicitly_revoked_admin_scope(): void
    {
        $role = \Spatie\Permission\Models\Role::findOrCreate('Administrator', 'web');
        $role->givePermissionTo(Permission::findOrCreate('quotations_view', 'web'));
        $this->seed(\Database\Seeders\RoleAndPermissionSeeder::class);
        $this->assertFalse($role->fresh()->permissions->contains('name', 'quotations_view_all'));
    }

    public function test_authorized_detail_pages_still_open(): void
    {
        $this->withoutVite();
        $user = User::factory()->create();
        $this->grant($user, ['quotations_view', 'sales_orders_view', 'customers_view']);
        $this->documents($user, 'OWN');
        foreach (['quotations/QOWN', 'sales-orders/SOOWN', 'customers/COWN'] as $url) {
            $this->actingAs($user)->get('/'.$url)->assertOk();
        }
    }

    public function test_wildcards_are_literal_and_results_have_safe_links(): void
    {
        $user = User::factory()->create();
        $this->grant($user, ['quotations_view']);
        $this->documents($user, 'OWN');
        $this->actingAs($user)->getJson('/header-search?q=%25_')->assertJsonCount(0, 'results');
        $this->getJson('/header-search?q=QOWN')->assertJsonPath('results.0.url', '/quotations/QOWN');
    }
}
