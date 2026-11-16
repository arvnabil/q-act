<?php

namespace Tests\Feature;

use App\Models\ActivityLog;
use App\Models\BusinessUnit;
use App\Models\BusinessUnitMember;
use App\Models\Notification;
use App\Models\Quotation;
use App\Models\QuotationItem;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class QuotationDelegationTest extends TestCase
{
    use RefreshDatabase;

    private function user(string $role, string $code): User
    {
        return User::factory()->create(['role' => $role, 'sales_code' => $code]);
    }

    private function quotation(User $creator, string $status = 'created'): Quotation
    {
        return Quotation::create([
            'id' => 'MGR.'.now()->format('my').'.001',
            'sales_id' => $creator->id,
            'created_by' => $creator->id,
            'status' => $status,
            'date' => now()->toDateString(),
            'expired' => now()->addMonth()->toDateString(),
            'calc_tax' => true,
            'show_tax' => true,
            'ppn_rate' => 0.11,
            'calc_pph' => false,
            'show_pph' => false,
            'pph_rate' => 0.02,
            'subtotal' => 1000,
            'tax_amount' => 110,
            'grand_total' => 1110,
        ]);
    }

    private function attachToBusinessUnit(User $manager, User $sales): BusinessUnit
    {
        $unit = BusinessUnit::create(['name' => 'Unit uji', 'code' => 'UT'.substr($manager->id, 0, 4)]);
        BusinessUnitMember::create(['business_unit_id' => $unit->id, 'user_id' => $manager->id, 'role_in_bu' => 'manager']);
        BusinessUnitMember::create(['business_unit_id' => $unit->id, 'user_id' => $sales->id, 'role_in_bu' => 'member']);

        return $unit;
    }

    private function makeSplit(Quotation $parent, User $owner, QuotationItem $sourceItem): Quotation
    {
        $split = Quotation::create([
            'id' => $parent->id.'-1',
            'parent_quotation_id' => $parent->id,
            'relation_type' => 'split',
            'revision_no' => 1,
            'sales_id' => $owner->id,
            'created_by' => $owner->id,
            'status' => 'created',
            'date' => now()->toDateString(),
            'expired' => now()->addMonth()->toDateString(),
            'calc_tax' => true,
            'show_tax' => true,
            'ppn_rate' => 0.11,
            'calc_pph' => false,
            'show_pph' => false,
            'pph_rate' => 0.02,
            'subtotal' => 1000,
            'tax_amount' => 110,
            'grand_total' => 1110,
        ]);
        QuotationItem::create([
            'quotation_id' => $split->id,
            'source_quotation_item_id' => $sourceItem->id,
            'name' => $sourceItem->name,
            'qty' => $sourceItem->qty,
            'hpp' => $sourceItem->hpp,
            'price' => $sourceItem->price,
            'margin' => $sourceItem->margin,
            'is_pph_applied' => false,
            'sort_order' => 1,
        ]);

        return $split;
    }

    public function test_manager_delegates_draft_to_sales_with_new_number_and_keeps_auditable_original(): void
    {
        $manager = $this->user('Manager', 'MGR');
        $sales = $this->user('Sales', 'SLS');
        $manager->givePermissionTo(Permission::firstOrCreate(['name' => 'quotations_delegate', 'guard_name' => 'web']));
        $manager->givePermissionTo(Permission::firstOrCreate(['name' => 'quotations_view', 'guard_name' => 'web']));
        $unit = $this->attachToBusinessUnit($manager, $sales);
        $source = $this->quotation($manager);
        $source->update(['bu_id' => $unit->id]);
        QuotationItem::create(['quotation_id' => $source->id, 'name' => 'Produk uji', 'qty' => 2, 'hpp' => 300, 'price' => 500, 'margin' => 40, 'is_pph_applied' => false, 'sort_order' => 1]);

        $response = $this->actingAs($manager)
            ->post(route('quotations.delegate', $source->id), ['sales_id' => $sales->id]);

        $new = Quotation::where('sales_id', $sales->id)->firstOrFail();
        $response->assertRedirect(route('quotations.show', $new->id));
        $this->assertSame('SLS.'.now()->format('my').'.001', $new->id);
        $this->assertSame('created', $new->status);
        $this->assertSame('delegation', $new->relation_type);
        $this->assertSame($source->id, $new->parent_quotation_id);
        $this->assertSame(1110, (int) $new->grand_total);
        $this->assertSame(1, $new->items()->count());
        $this->assertSame('superseded', $source->fresh()->status);
        $this->assertDatabaseHas('activity_logs', ['action' => 'QUOTATION_DELEGATED', 'entity_id' => $source->id]);
        $this->assertDatabaseHas('notifications', ['user_id' => $sales->id, 'link' => '/quotations/'.$new->id]);
    }

    public function test_user_without_delegation_permission_cannot_delegate(): void
    {
        $sales = $this->user('Sales', 'SLS');
        $target = $this->user('Sales', 'TGT');
        $source = $this->quotation($sales);

        $this->actingAs($sales)
            ->post(route('quotations.delegate', $source->id), ['sales_id' => $target->id])
            ->assertForbidden();

        $this->assertSame(1, Quotation::count());
        $this->assertSame('created', $source->fresh()->status);
        $this->assertSame(0, ActivityLog::count());
        $this->assertSame(0, Notification::count());
    }

    public function test_any_role_with_dedicated_permission_can_delegate_within_its_business_unit(): void
    {
        $actor = $this->user('Sales', 'SRC');
        $target = $this->user('Sales', 'TGT');
        $actor->givePermissionTo(Permission::firstOrCreate(['name' => 'quotations_delegate', 'guard_name' => 'web']));
        $actor->givePermissionTo(Permission::firstOrCreate(['name' => 'quotations_view', 'guard_name' => 'web']));
        $unit = $this->attachToBusinessUnit($actor, $target);
        $source = $this->quotation($actor);
        $source->update(['bu_id' => $unit->id]);

        $this->actingAs($actor)
            ->post(route('quotations.delegate', $source->id), ['sales_id' => $target->id])
            ->assertRedirect();

        $this->assertSame('superseded', $source->fresh()->status);
        $this->assertSame(2, Quotation::count());
    }

    public function test_sent_quotation_cannot_be_delegated(): void
    {
        $manager = $this->user('Manager', 'MGR');
        $sales = $this->user('Sales', 'SLS');
        $manager->givePermissionTo(Permission::firstOrCreate(['name' => 'quotations_delegate', 'guard_name' => 'web']));
        $manager->givePermissionTo(Permission::firstOrCreate(['name' => 'quotations_view', 'guard_name' => 'web']));
        $unit = $this->attachToBusinessUnit($manager, $sales);
        $source = $this->quotation($manager, 'sent');
        $source->update(['bu_id' => $unit->id]);

        $this->actingAs($manager)
            ->post(route('quotations.delegate', $source->id), ['sales_id' => $sales->id])
            ->assertStatus(422);

        $this->assertSame(1, Quotation::count());
        $this->assertSame('sent', $source->fresh()->status);
    }

    public function test_delegated_original_is_read_only_and_cannot_be_converted_to_po(): void
    {
        $manager = $this->user('Manager', 'MGR');
        $manager->givePermissionTo(Permission::firstOrCreate(['name' => 'quotations_delegate', 'guard_name' => 'web']));
        $source = $this->quotation($manager, 'superseded');

        $this->actingAs($manager)
            ->get(route('quotations.edit', $source->id))
            ->assertRedirect(route('quotations.show', $source->id));

        $this->actingAs($manager)
            ->put(route('quotations.update', $source->id), ['status' => 'created'])
            ->assertSessionHasErrors('quotation');

        $this->actingAs($manager)
            ->post(route('quotations.bulk-purchase-orders.store', $source->id))
            ->assertSessionHasErrors('entries');

        $this->assertSame('superseded', $source->fresh()->status);
        $this->assertSame(1, Quotation::count());
    }

    public function test_sub_quotations_can_be_optionally_copied_with_new_parent_and_item_links(): void
    {
        $manager = $this->user('Manager', 'MGR');
        $sales = $this->user('Sales', 'SLS');
        $manager->givePermissionTo(Permission::firstOrCreate(['name' => 'quotations_delegate', 'guard_name' => 'web']));
        $manager->givePermissionTo(Permission::firstOrCreate(['name' => 'quotations_view', 'guard_name' => 'web']));
        $unit = $this->attachToBusinessUnit($manager, $sales);
        $source = $this->quotation($manager);
        $source->update(['bu_id' => $unit->id]);
        $sourceItem = QuotationItem::create(['quotation_id' => $source->id, 'name' => 'Produk family', 'qty' => 1, 'hpp' => 300, 'price' => 1000, 'margin' => 70, 'is_pph_applied' => false, 'sort_order' => 1]);
        $oldSplit = $this->makeSplit($source, $manager, $sourceItem);

        $this->actingAs($manager)->post(route('quotations.delegate', $source->id), [
            'sales_id' => $sales->id,
            'include_sub_quotations' => true,
        ])->assertRedirect();

        $new = Quotation::where('sales_id', $sales->id)->where('relation_type', 'delegation')->firstOrFail();
        $newSplit = $new->revisions()->where('relation_type', 'split')->firstOrFail();
        $this->assertSame($new->id.'-1', $newSplit->id);
        $this->assertSame($new->id, $newSplit->parent_quotation_id);
        $this->assertSame($sales->id, $newSplit->sales_id);
        $this->assertSame($new->items()->first()->id, $newSplit->items()->first()->source_quotation_item_id);
        $this->assertSame('superseded', $source->fresh()->status);
        $this->assertSame('superseded', $oldSplit->fresh()->status);
    }

    public function test_sub_quotations_are_archived_and_items_remain_on_new_main_when_not_copied(): void
    {
        $manager = $this->user('Manager', 'MGR');
        $sales = $this->user('Sales', 'SLS');
        $manager->givePermissionTo(Permission::firstOrCreate(['name' => 'quotations_delegate', 'guard_name' => 'web']));
        $manager->givePermissionTo(Permission::firstOrCreate(['name' => 'quotations_view', 'guard_name' => 'web']));
        $unit = $this->attachToBusinessUnit($manager, $sales);
        $source = $this->quotation($manager);
        $source->update(['bu_id' => $unit->id]);
        $sourceItem = QuotationItem::create(['quotation_id' => $source->id, 'name' => 'Produk family', 'qty' => 1, 'hpp' => 300, 'price' => 1000, 'margin' => 70, 'is_pph_applied' => false, 'sort_order' => 1]);
        $oldSplit = $this->makeSplit($source, $manager, $sourceItem);

        $this->actingAs($manager)->post(route('quotations.delegate', $source->id), [
            'sales_id' => $sales->id,
            'include_sub_quotations' => false,
        ])->assertRedirect();

        $new = Quotation::where('sales_id', $sales->id)->where('relation_type', 'delegation')->firstOrFail();
        $this->assertSame(1, $new->items()->count());
        $this->assertSame(0, $new->revisions()->where('relation_type', 'split')->count());
        $this->assertSame('superseded', $oldSplit->fresh()->status);
        $this->assertSame('superseded', $source->fresh()->status);
    }
}
