<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\Quotation;
use App\Models\QuotationItem;
use App\Models\QuotationSalesNote;
use App\Models\SalesOrder;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class QuotationDuplicateTest extends TestCase
{
    use RefreshDatabase;

    private function makeUser(string $role = 'Sales', string $salesCode = 'Q099'): User
    {
        return User::factory()->create([
            'sales_code' => $salesCode,
            'role' => $role,
        ]);
    }

    private function prefix(): string
    {
        return 'Q099.'.now()->format('my');
    }

    private function makeQuotation(User $user, array $overrides = []): Quotation
    {
        return Quotation::create(array_merge([
            'id' => $this->prefix().'.005',
            'sales_id' => $user->id,
            'created_by' => $user->id,
            'status' => 'created',
            'date' => '2026-09-01',
            'expired' => '2026-10-01',
            'calc_tax' => true,
            'show_tax' => true,
            'ppn_rate' => 0.11,
            'calc_pph' => false,
            'show_pph' => false,
            'pph_rate' => 0.02,
            'notes' => null,
            'terms' => null,
            'subtotal' => 0,
            'tax_amount' => 0,
            'grand_total' => 0,
        ], $overrides));
    }

    private function makeItem(Quotation $quotation, array $attrs = [], int $sortOrder = 1): QuotationItem
    {
        return QuotationItem::create(array_merge([
            'quotation_id' => $quotation->id,
            'name' => 'Item '.$sortOrder,
            'qty' => 1,
            'hpp' => 500,
            'price' => 1000,
            'margin' => 50,
            'is_pph_applied' => false,
            'sort_order' => $sortOrder,
        ], $attrs));
    }

    private function makeProduct(string $sku): Product
    {
        return Product::create([
            'sku' => $sku,
            'name' => 'Product '.$sku,
            'price' => 1000,
            'modal' => 500,
        ]);
    }

    public function test_duplicate_creates_new_quotation_with_new_id_and_number(): void
    {
        $user = $this->makeUser();
        $original = $this->makeQuotation($user, [
            'notes' => 'Penawaran awal',
            'terms' => ['Term 1', 'Term 2'],
            'subtotal' => 3000,
            'tax_amount' => 330,
            'grand_total' => 3330,
        ]);
        $this->makeItem($original, ['name' => 'Logitech'], 1);
        $this->makeItem($original, ['name' => 'Jabra'], 2);

        $response = $this->actingAs($user)
            ->post(route('quotations.duplicate', $original->id));

        $duplicate = Quotation::where('id', $this->prefix().'.006')->first();
        $this->assertNotNull($duplicate);
        $this->assertNotSame($original->id, $duplicate->id);
        $this->assertSame($this->prefix().'.006', $duplicate->id);
        $this->assertSame(2, Quotation::count());

        $response->assertRedirect(route('quotations.edit', $duplicate->id));

        // Original is completely untouched.
        $original->refresh();
        $this->assertSame('created', $original->status);
        $this->assertSame(3000, (int) $original->subtotal);
        $this->assertSame(2, $original->items()->count());
    }

    public function test_duplicate_copies_quotation_information_but_resets_identity_fields(): void
    {
        $user = $this->makeUser();
        $original = $this->makeQuotation($user, [
            'customer_id' => null,
            'pic_id' => null,
            'status' => 'approved',
            'date' => '2026-09-01',
            'expired' => '2026-10-01',
            'calc_tax' => true,
            'show_tax' => false,
            'ppn_rate' => 0.11,
            'calc_pph' => true,
            'show_pph' => true,
            'pph_rate' => 0.02,
            'notes' => 'Catatan internal sales',
            'terms' => ['Pembayaran CBO', 'Garansi 1 tahun'],
            'subtotal' => 100000,
            'tax_amount' => 11000,
            'grand_total' => 112000,
        ]);

        $this->actingAs($user)->post(route('quotations.duplicate', $original->id));

        $dup = Quotation::where('id', $this->prefix().'.006')->firstOrFail();

        // Copied business information
        $this->assertSame($original->sales_id, $dup->sales_id);
        $this->assertSame($original->customer_id, $dup->customer_id);
        $this->assertSame($original->pic_id, $dup->pic_id);
        $this->assertSame($original->bu_id, $dup->bu_id);
        $this->assertSame($original->bank_account_id, $dup->bank_account_id);
        // Business date is stamped as the duplication date, never copied.
        $this->assertSame(now()->toDateString(), $dup->date->toDateString());
        $this->assertNotSame($original->date->toDateString(), $dup->date->toDateString());
        $this->assertSame($original->expired->toDateString(), $dup->expired->toDateString());
        $this->assertSame((bool) $original->calc_tax, (bool) $dup->calc_tax);
        $this->assertSame((bool) $original->show_tax, (bool) $dup->show_tax);
        $this->assertSame((float) $original->ppn_rate, (float) $dup->ppn_rate);
        $this->assertSame((bool) $original->calc_pph, (bool) $dup->calc_pph);
        $this->assertSame((bool) $original->show_pph, (bool) $dup->show_pph);
        $this->assertSame((float) $original->pph_rate, (float) $dup->pph_rate);
        $this->assertSame($original->notes, $dup->notes);
        $this->assertSame($original->terms, $dup->terms);
        $this->assertSame((int) $original->subtotal, (int) $dup->subtotal);
        $this->assertSame((int) $original->tax_amount, (int) $dup->tax_amount);
        $this->assertSame((int) $original->grand_total, (int) $dup->grand_total);

        // Identity / workflow fields must be reset or regenerated.
        $this->assertNotSame($original->id, $dup->id);
        $this->assertSame('created', $dup->status);
        $this->assertFalse((bool) $dup->is_deleted);
        $this->assertNull($dup->deleted_at);
        $this->assertSame($user->id, $dup->created_by);
        $this->assertNotNull($dup->created_at);

        // No Sales Order may be auto-generated from an approved original.
        $this->assertSame(0, SalesOrder::where('quotation_id', $dup->id)->count());
    }

    public function test_duplicate_stamps_fresh_business_date_and_timestamps_and_leaves_original_unchanged(): void
    {
        $user = $this->makeUser();
        $originalDate = now()->subDays(2)->toDateString();
        $original = $this->makeQuotation($user, ['date' => $originalDate]);
        $this->makeItem($original, ['name' => 'Logitech'], 1);

        // Simulate a real-world original that was created well before the
        // duplication runs (older business date and older timestamps).
        $originalStamp = now()->subHours(2);
        Quotation::where('id', $original->id)->update([
            'date' => $originalDate,
            'created_at' => $originalStamp,
            'updated_at' => $originalStamp,
        ]);
        $original->refresh();

        $before = now()->subMinute();
        $this->actingAs($user)->post(route('quotations.duplicate', $original->id));
        $after = now()->addMinute();

        $dup = Quotation::where('id', $this->prefix().'.006')->firstOrFail();

        // Business date is the duplication date, not copied from the original.
        $this->assertSame(now()->toDateString(), $dup->date->toDateString());
        $this->assertNotSame($original->date->toDateString(), $dup->date->toDateString());

        // Duplicate got a brand-new timestamp at the moment of duplication.
        $this->assertTrue(
            $dup->created_at->greaterThan($original->created_at),
            'Duplicate created_at must be newer than the original created_at.'
        );
        $this->assertTrue($dup->created_at->between($before, $after));

        // Laravel handled updated_at normally on insert.
        $this->assertNotNull($dup->updated_at);
        $this->assertGreaterThanOrEqual($dup->created_at, $dup->updated_at);

        // Original quotation keeps its original business date and created_at untouched.
        $original->refresh();
        $this->assertSame($originalDate, $original->date->toDateString());
        $this->assertSame(
            $originalStamp->format('Y-m-d H:i:s'),
            $original->created_at->format('Y-m-d H:i:s')
        );
    }

    public function test_duplicate_clones_all_items_with_new_ids_and_same_order(): void
    {
        $user = $this->makeUser();
        $product = $this->makeProduct('DUP-SKU-1');
        $original = $this->makeQuotation($user);

        $items = [
            $this->makeItem($original, [
                'name' => 'Logitech', 'product_id' => $product->sku, 'sku' => $product->sku,
                'qty' => 2, 'hpp' => 700, 'price' => 1500, 'margin' => 53.33,
                'is_pph_applied' => true, 'sort_order' => 1,
            ]),
            $this->makeItem($original, [
                'name' => 'Poly', 'qty' => 1, 'hpp' => 300, 'price' => 900,
                'margin' => 66.67, 'is_pph_applied' => false, 'sort_order' => 2,
            ]),
            $this->makeItem($original, [
                'name' => 'Jabra', 'qty' => 3, 'hpp' => 400, 'price' => 1200,
                'margin' => 66.67, 'is_pph_applied' => false, 'sort_order' => 3,
            ]),
        ];

        $this->actingAs($user)->post(route('quotations.duplicate', $original->id));

        $dup = Quotation::where('id', $this->prefix().'.006')->firstOrFail();
        $dupItems = $dup->items()->get();

        $this->assertCount(3, $dupItems);

        $origIds = collect($items)->pluck('id')->map(fn ($id) => (int) $id)->all();
        $dupIds = $dupItems->pluck('id')->map(fn ($id) => (int) $id)->all();
        foreach ($dupIds as $dupId) {
            $this->assertNotContains($dupId, $origIds);
        }

        // Same count of rows overall, all pointing at the new quotation.
        $this->assertSame(6, QuotationItem::count());
        $this->assertTrue($dupItems->every(fn ($i) => $i->quotation_id === $dup->id));

        // Values and ordering preserved exactly.
        foreach ($items as $idx => $src) {
            $cloned = $dupItems->get($idx);
            $this->assertSame($src->name, $cloned->name);
            $this->assertSame($src->product_id, $cloned->product_id);
            $this->assertSame($src->sku, $cloned->sku);
            $this->assertSame((int) $src->qty, (int) $cloned->qty);
            $this->assertSame((int) $src->hpp, (int) $cloned->hpp);
            $this->assertSame((int) $src->price, (int) $cloned->price);
            $this->assertSame((float) $src->margin, (float) $cloned->margin);
            $this->assertSame((bool) $src->is_pph_applied, (bool) $cloned->is_pph_applied);
            $this->assertSame((int) $src->sort_order, (int) $cloned->sort_order);
        }
        $this->assertSame(['Logitech', 'Poly', 'Jabra'], $dupItems->pluck('name')->all());

        // Editing an item in the duplicate must never touch the original's item.
        $firstDup = $dupItems->first();
        $firstDup->update(['price' => 999999]);

        $original->refresh();
        $this->assertSame(1500, (int) $original->items()->first()->price);
    }

    public function test_duplicate_clones_sales_note_adjustments_with_new_id(): void
    {
        $user = $this->makeUser();
        $original = $this->makeQuotation($user);

        $adjustments = [
            ['id' => 'adj_1', 'label' => 'Ongkir', 'amount' => 50000],
            ['id' => 'adj_2', 'label' => 'Komisi', 'amount' => -25000],
        ];
        QuotationSalesNote::create([
            'quotation_id' => $original->id,
            'adjustments' => $adjustments,
        ]);

        $this->actingAs($user)->post(route('quotations.duplicate', $original->id));

        $dup = Quotation::where('id', $this->prefix().'.006')->firstOrFail();

        $this->assertSame(2, QuotationSalesNote::count());

        $dupNote = QuotationSalesNote::where('quotation_id', $dup->id)->firstOrFail();
        $this->assertSame($adjustments, $dupNote->adjustments);
        $this->assertSame($dup->id, $dupNote->quotation_id);

        // The original note keeps its own identity and data.
        $origNote = QuotationSalesNote::where('quotation_id', $original->id)->firstOrFail();
        $this->assertSame($adjustments, $origNote->adjustments);
        $this->assertNotSame($origNote->id, $dupNote->id);
    }

    public function test_duplicate_starts_in_created_status_and_does_not_inherit_workflow(): void
    {
        $user = $this->makeUser();
        $original = $this->makeQuotation($user, ['status' => 'approved']);

        $this->actingAs($user)->post(route('quotations.duplicate', $original->id));

        $dup = Quotation::where('id', $this->prefix().'.006')->firstOrFail();
        $this->assertSame('created', $dup->status);
        $this->assertSame('approved', $original->fresh()->status);
        $this->assertSame(0, SalesOrder::count());
    }

    public function test_duplicate_rolls_back_everything_when_child_insert_fails(): void
    {
        $user = $this->makeUser();
        $original = $this->makeQuotation($user);
        $this->makeItem($original, ['name' => 'A'], 1);
        $this->makeItem($original, ['name' => 'B'], 2);

        QuotationSalesNote::create([
            'quotation_id' => $original->id,
            'adjustments' => [['id' => 'adj_1', 'label' => 'Ongkir', 'amount' => 1000]],
        ]);

        $calls = 0;
        QuotationItem::creating(function () use (&$calls) {
            $calls++;
            if ($calls === 2) {
                throw new \RuntimeException('forced item clone failure');
            }
        });

        try {
            $this->actingAs($user)
                ->post(route('quotations.duplicate', $original->id))
                ->assertSessionHas('error');
        } finally {
            QuotationItem::flushEventListeners();
        }

        // No partial duplicate may remain.
        $this->assertSame(1, Quotation::count());
        $this->assertSame(2, QuotationItem::count());
        $this->assertSame(1, QuotationSalesNote::count());
    }

    public function test_unauthorized_user_cannot_duplicate(): void
    {
        $finance = $this->makeUser('Finance', 'FIN');
        $sales = $this->makeUser('Sales', 'Q099');
        $original = $this->makeQuotation($sales);
        $this->makeItem($original, ['name' => 'A'], 1);

        $this->actingAs($finance)
            ->post(route('quotations.duplicate', $original->id))
            ->assertSessionHas('error');

        $this->assertSame(1, Quotation::count());
        $this->assertSame(1, QuotationItem::count());
    }

    public function test_duplicate_twice_yields_unique_quotation_numbers(): void
    {
        $user = $this->makeUser();
        $original = $this->makeQuotation($user);
        $this->makeItem($original, ['name' => 'Satu'], 1);

        $this->actingAs($user)->post(route('quotations.duplicate', $original->id));
        $this->actingAs($user)->post(route('quotations.duplicate', $original->id));

        $ids = Quotation::orderBy('id')->pluck('id')->all();

        $this->assertCount(3, $ids);
        $this->assertSame($this->prefix().'.005', $ids[0]);
        $this->assertSame($this->prefix().'.006', $ids[1]);
        $this->assertSame($this->prefix().'.007', $ids[2]);
        $this->assertSame(3, count(array_unique($ids)));
    }

    public function test_duplicated_quotation_supports_edit_reorder_and_sales_order_conversion(): void
    {
        $user = $this->makeUser();
        $original = $this->makeQuotation($user);
        $this->makeItem($original, ['name' => 'Logitech'], 1);
        $this->makeItem($original, ['name' => 'Poly'], 2);
        $this->makeItem($original, ['name' => 'Jabra'], 3);

        $this->actingAs($user)->post(route('quotations.duplicate', $original->id));
        $dup = Quotation::where('id', $this->prefix().'.006')->firstOrFail();
        $dupItems = $dup->items()->get();

        // Detail/edit pages render fine for the duplicate.
        $this->actingAs($user)->get(route('quotations.show', $dup->id))->assertOk();
        $this->actingAs($user)->get(route('quotations.edit', $dup->id))->assertOk();
        $this->actingAs($user)->get(route('quotations.sales-notes.show', $dup->id))->assertOk();

        // Edit (PUT) the duplicate with its own item ids.
        $payloadItems = $dupItems->map(fn ($i, $idx) => [
            'id' => $i->id,
            'product_id' => null,
            'sku' => null,
            'name' => $i->name,
            'brand' => null,
            'description' => null,
            'image_url' => null,
            'qty' => $idx + 1,
            'price' => 2000,
            'hpp' => 900,
            'margin' => 55,
            'is_pph_applied' => false,
            'sort_order' => $idx + 1,
        ])->values()->all();

        $this->actingAs($user)->put(route('quotations.update', $dup->id), [
            'status' => 'sent',
            'expired' => '2026-12-01',
            'items' => $payloadItems,
        ])->assertRedirect();

        $dup->refresh();
        $this->assertSame('sent', $dup->status);

        // Reorder the duplicate items independently.
        $reorderedIds = QuotationItem::where('quotation_id', $dup->id)
            ->orderByDesc('sort_order')
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->all();
        $this->actingAs($user)->postJson(route('quotations.reorder-items', $dup->id), [
            'items' => $reorderedIds,
        ])->assertOk()->assertJson(['success' => true]);

        $this->assertSame(['Jabra', 'Poly', 'Logitech'], $dup->fresh()->items()->pluck('name')->all());

        // Convert to Sales Order; the SO follows the duplicate item order.
        $this->actingAs($user)->put(route('quotations.update', $dup->id), ['status' => 'approved']);

        $so = SalesOrder::where('quotation_id', $dup->id)->firstOrFail();
        $this->assertSame('SO.'.$dup->id, $so->id);
        $this->assertSame('Dibuat Sales', $so->status);
        $this->assertSame(['Jabra', 'Poly', 'Logitech'], $so->items()->orderBy('sort_order')->pluck('item_name')->all());
        $this->assertSame([0, 1, 2], $so->items()->orderBy('sort_order')->pluck('sort_order')->map(fn ($v) => (int) $v)->all());

        // Original quotation is still untouched and not converted.
        $this->assertSame(1, SalesOrder::count());
        $this->assertSame(['Logitech', 'Poly', 'Jabra'], $original->fresh()->items()->pluck('name')->all());
    }
}
