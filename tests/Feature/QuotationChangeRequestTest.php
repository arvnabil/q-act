<?php

namespace Tests\Feature;

use App\Models\ChangeRequest;
use App\Models\Quotation;
use App\Models\QuotationItem;
use App\Models\SalesOrder;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class QuotationChangeRequestTest extends TestCase
{
    use RefreshDatabase;

    private function setupDocuments(): array
    {
        $sales = User::factory()->create(['role' => 'Sales']);
        $manager = User::factory()->create(['role' => 'Manager']);
        $permission = Permission::firstOrCreate(['name' => 'manager_view', 'guard_name' => 'web']);
        $role = Role::firstOrCreate(['name' => 'Manager', 'guard_name' => 'web']);
        $role->givePermissionTo($permission);
        $manager->assignRole($role);

        $quotation = Quotation::create([
            'id' => 'QTEST.1026.001', 'status' => 'approved', 'date' => now(), 'expired' => now()->addDays(30),
            'sales_id' => $sales->id, 'created_by' => $sales->id, 'calc_tax' => true, 'show_tax' => true,
            'ppn_rate' => .11, 'subtotal' => 100000, 'tax_amount' => 11000, 'grand_total' => 111000,
        ]);
        QuotationItem::create(['quotation_id' => $quotation->id, 'name' => 'Produk Test', 'qty' => 1, 'price' => 100000, 'hpp' => 50000, 'sort_order' => 0]);
        $so = SalesOrder::create([
            'id' => 'SO.QTEST.1026.001', 'quotation_id' => $quotation->id, 'sales_id' => $sales->id,
            'date' => now(), 'status' => 'Dibuat Sales', 'grand_total' => 111000,
        ]);

        return [$sales, $manager, $quotation, $so];
    }

    public function test_manager_can_approve_cancellation_and_sales_can_create_new_offer(): void
    {
        [$sales, $manager, $quotation, $so] = $this->setupDocuments();

        $this->actingAs($sales)->post(route('quotations.change-requests.store', $quotation), [
            'type' => 'cancellation', 'reason' => 'Customer membatalkan PO dan meminta penawaran baru.',
        ])->assertSessionHas('message');

        $request = ChangeRequest::firstOrFail();
        $this->actingAs($manager)->post(route('change-requests.approve', $request))->assertSessionHas('message');

        $this->assertDatabaseHas('quotations', ['id' => $quotation->id, 'status' => 'cancelled']);
        $this->assertDatabaseHas('sales_orders', ['id' => $so->id, 'status' => 'Cancelled']);

        $this->actingAs($sales)->post(route('quotations.new-from-cancelled', $quotation))->assertRedirect();
        $new = Quotation::where('parent_quotation_id', $quotation->id)->firstOrFail();
        $this->assertSame('revision_draft', $new->status);
        $this->assertDatabaseHas('quotation_items', ['quotation_id' => $new->id, 'name' => 'Produk Test']);
    }

    public function test_manager_approval_of_revision_creates_a_new_draft_and_supersedes_old_documents(): void
    {
        [$sales, $manager, $quotation, $so] = $this->setupDocuments();

        $this->actingAs($sales)->post(route('quotations.change-requests.store', $quotation), [
            'type' => 'revision', 'reason' => 'Customer mengurangi satu item dari PO.',
        ]);
        $request = ChangeRequest::firstOrFail();
        $this->actingAs($manager)->post(route('change-requests.approve', $request))->assertSessionHas('message');

        $this->assertDatabaseHas('quotations', ['id' => $quotation->id, 'status' => 'superseded']);
        $this->assertDatabaseHas('sales_orders', ['id' => $so->id, 'status' => 'Revised']);
        $new = Quotation::where('parent_quotation_id', $quotation->id)->firstOrFail();
        $this->assertSame('revision_draft', $new->status);
        $this->assertSame($new->id, $request->fresh()->resulting_quotation_id);
    }
}
