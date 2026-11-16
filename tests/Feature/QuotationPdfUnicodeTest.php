<?php

namespace Tests\Feature;

use App\Models\Quotation;
use App\Models\QuotationItem;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class QuotationPdfUnicodeTest extends TestCase
{
    use RefreshDatabase;

    public function test_downloaded_quotation_pdf_uses_unicode_font_and_does_not_change_quotation_values(): void
    {
        $user = User::factory()->create();
        $user->givePermissionTo(Permission::findOrCreate('quotations_view', 'web'));

        $quotation = Quotation::create([
            'id' => 'BU.'.now()->format('my').'.'.str_pad((string) fake()->unique()->numberBetween(1, 999), 3, '0', STR_PAD_LEFT),
            'sales_id' => $user->id,
            'created_by' => $user->id,
            'status' => 'sent',
            'date' => now()->toDateString(),
            'expired' => now()->addDays(7)->toDateString(),
            'subtotal' => 1000,
            'tax_amount' => 110,
            'grand_total' => 1110,
        ]);

        $description = 'MAXHUB XBoard V7 Series 86” Interactive Collaboration Display – V8650. '
            .'86-inch 4K UHD Interactive Collaboration Display (3840 × 2160) featuring an integrated '
            .'triple-camera system (3 × 50MP) with 5× hybrid zoom, 99° ultra-wide field of view, '
            .'AI auto-framing, speaker tracking, multiple-speaker tracking, and privacy shutter. '
            .'Equipped with a 16-microphone array, 2 × 10W + 20W speakers, 9H glass, and '
            .'registered® and trademark™ symbols.';
        QuotationItem::create([
            'quotation_id' => $quotation->id,
            'name' => 'MAXHUB XBoard V7',
            'description' => $description,
            'qty' => 1,
            'price' => 1000,
            'sort_order' => 1,
        ]);
        $itemRow = '<tr><td>1</td><td>MAXHUB</td><td>'.$description.'</td><td>1</td><td>Rp 1.000</td><td>Rp 1.000</td></tr>';
        $rows = str_repeat($itemRow, 18);
        $html = '<!DOCTYPE html><html lang="id"><head><meta charset="utf-8"><style>'
            .'@page{size:A4 portrait;margin:15mm}body{font-family:"DejaVu Sans",sans-serif;font-size:9px;color:#111}'
            .'table{width:100%;border-collapse:collapse}th,td{border:1px solid #6b7280;padding:5px}'
            .'th{background:#f1f5f9}thead{display:table-header-group}tr{page-break-inside:avoid}'
            .'</style></head><body><header><strong>ACTiV</strong><h1>QUOTATION</h1></header>'
            .'<table><thead><tr><th>NO</th><th>BRAND</th><th>PRODUCT DESCRIPTION</th><th>QTY</th><th>PRICE</th><th>TOTAL</th></tr></thead><tbody>'
            .$rows
            .'<tr><td colspan="4"></td><td>GRAND TOTAL</td><td>Rp 1.110</td></tr></tbody></table>'
            .'<section><h2>Syarat &amp; Ketentuan</h2><p>Harga dalam IDR</p></section></body></html>';
        $response = $this->actingAs($user)->post(route('quotations.download-pdf', $quotation), [
            'html' => $html,
            'filename' => 'unicode-quotation.pdf',
        ]);

        $response->assertOk();
        $response->assertHeader('Content-Type', 'application/pdf');
        $this->assertStringStartsWith('%PDF-', $response->getContent());
        $this->assertStringContainsString('DejaVuSans', $response->getContent());
        $this->assertStringContainsString('ToUnicode', $response->getContent());
        preg_match_all('/\/Type\s*\/Page\b/', $response->getContent(), $pageObjects);
        $this->assertGreaterThanOrEqual(2, count($pageObjects[0]));

        $quotation->refresh();
        $this->assertSame('sent', $quotation->status);
        $this->assertSame(1000.0, $quotation->subtotal);
        $this->assertSame(1110.0, $quotation->grand_total);
        $this->assertSame($description, $quotation->items()->orderBy('sort_order')->first()->description);
    }

    public function test_quotation_pdf_download_is_not_available_without_quotation_visibility_permission(): void
    {
        $owner = User::factory()->create();
        $quotation = Quotation::create([
            'id' => 'BU.'.now()->format('my').'.'.str_pad((string) fake()->unique()->numberBetween(1, 999), 3, '0', STR_PAD_LEFT),
            'sales_id' => $owner->id,
            'created_by' => $owner->id,
            'status' => 'sent',
            'date' => now()->toDateString(),
            'expired' => now()->addDays(7)->toDateString(),
            'subtotal' => 1000,
            'tax_amount' => 110,
            'grand_total' => 1110,
        ]);

        $unauthorizedUser = User::factory()->create();

        $this->actingAs($unauthorizedUser)
            ->post(route('quotations.download-pdf', $quotation), [
                'html' => '<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>Quotation</body></html>',
            ])
            ->assertNotFound();
    }
}
