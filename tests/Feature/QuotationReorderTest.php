<?php

namespace Tests\Feature;

use App\Models\Quotation;
use App\Models\QuotationItem;
use App\Models\SalesOrder;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class QuotationReorderTest extends TestCase
{
    use RefreshDatabase;

    private function makeUser(): User
    {
        return User::factory()->create([
            'sales_code' => 'SLS-'.fake()->unique()->numberBetween(100, 999),
            'role' => 'Sales',
        ]);
    }

    private function makeQuotation(User $user, array $items = []): Quotation
    {
        $quotation = Quotation::create([
            'id' => 'BU.'.now()->format('my').'.'.str_pad((string) fake()->unique()->numberBetween(1, 999), 3, '0', STR_PAD_LEFT),
            'sales_id' => $user->id,
            'created_by' => $user->id,
            'status' => 'created',
            'date' => now()->toDateString(),
            'expired' => now()->addDays(7)->toDateString(),
            'calc_tax' => true,
            'show_tax' => true,
            'ppn_rate' => 0.11,
            'calc_pph' => false,
            'show_pph' => false,
            'subtotal' => 0,
            'tax_amount' => 0,
            'grand_total' => 0,
        ]);

        foreach ($items as $order => $name) {
            QuotationItem::create([
                'quotation_id' => $quotation->id,
                'name' => $name,
                'qty' => 1,
                'price' => 1000,
                'hpp' => 500,
                'sort_order' => $order,
            ]);
        }

        return $quotation;
    }

    public function test_reorder_persists_new_order(): void
    {
        $user = $this->makeUser();
        $quotation = $this->makeQuotation($user, ['Poly Voyager', 'Jabra', 'Logitech']);

        $ids = $quotation->items->pluck('id')->map(fn ($id) => (int) $id)->all();
        $newOrder = [$ids[2], $ids[0], $ids[1]]; // Logitech, Poly Voyager, Jabra

        $response = $this->actingAs($user)
            ->postJson(route('quotations.reorder-items', $quotation->id), ['items' => $newOrder]);

        $response->assertOk()->assertJson(['success' => true]);

        $ordered = $quotation->items()->orderBy('sort_order')->pluck('id')->map(fn ($id) => (int) $id)->all();
        $this->assertSame($newOrder, $ordered);

        $this->assertSame([1, 2, 3], $quotation->items()->pluck('sort_order')->map(fn ($v) => (int) $v)->sort()->values()->all());
    }

    public function test_reorder_rejects_incomplete_or_unknown_ids(): void
    {
        $user = $this->makeUser();
        $quotation = $this->makeQuotation($user, ['A', 'B', 'C']);
        $ids = $quotation->items->pluck('id')->map(fn ($id) => (int) $id)->all();
        $original = $quotation->items->pluck('sort_order', 'id')->toArray();

        // Missing one item
        $this->actingAs($user)
            ->postJson(route('quotations.reorder-items', $quotation->id), ['items' => [$ids[1], $ids[2]]])
            ->assertStatus(422);

        // Unknown extra id
        $this->actingAs($user)
            ->postJson(route('quotations.reorder-items', $quotation->id), ['items' => [$ids[0], $ids[1], $ids[2] + 9999]])
            ->assertStatus(422);

        $this->assertSame(
            $original,
            $quotation->items()->pluck('sort_order', 'id')->toArray()
        );
    }

    public function test_legacy_items_without_sort_order_get_deterministic_fallback(): void
    {
        $user = $this->makeUser();
        $quotation = $this->makeQuotation($user, ['First', 'Second', 'Third']);

        QuotationItem::where('quotation_id', $quotation->id)->update(['sort_order' => 0]);

        $quotation->unsetRelation('items');
        $ordered = $quotation->items->pluck('name')->all();

        $this->assertSame(['First', 'Second', 'Third'], $ordered);
    }

    public function test_approving_quotation_generates_sales_order_in_quotation_order(): void
    {
        $user = $this->makeUser();
        $quotation = $this->makeQuotation($user, ['Poly Voyager', 'Jabra', 'Logitech']);

        $ids = $quotation->items->pluck('id')->map(fn ($id) => (int) $id)->all();
        $this->actingAs($user)
            ->postJson(route('quotations.reorder-items', $quotation->id), ['items' => [$ids[2], $ids[0], $ids[1]]]);

        $this->actingAs($user)
            ->put(route('quotations.update', $quotation->id), ['status' => 'approved']);

        $so = SalesOrder::where('quotation_id', $quotation->id)->firstOrFail();
        $soItems = $so->items()->orderBy('sort_order')->get();

        $this->assertSame(['Logitech', 'Poly Voyager', 'Jabra'], $soItems->pluck('item_name')->all());
        $this->assertSame([0, 1, 2], $soItems->pluck('sort_order')->map(fn ($v) => (int) $v)->all());
    }
}
