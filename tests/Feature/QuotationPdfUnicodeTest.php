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

        $description = 'MAXHUB XBoard V7 Series 86” – 4K UHD (3840 × 2160), 99° field of view, 9H glass';
        QuotationItem::create([
            'quotation_id' => $quotation->id,
            'name' => 'MAXHUB XBoard V7',
            'description' => $description,
            'qty' => 1,
            'price' => 1000,
            'sort_order' => 1,
        ]);

        $response = $this->actingAs($user)->post(route('quotations.download-pdf', $quotation), [
            'html' => '<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family: DejaVu Sans">'.$description.'</body></html>',
            'filename' => 'unicode-quotation.pdf',
        ]);

        $response->assertOk();
        $response->assertHeader('Content-Type', 'application/pdf');
        $this->assertStringStartsWith('%PDF-', $response->getContent());
        $this->assertStringContainsString('DejaVuSans', $response->getContent());
        $this->assertStringContainsString('ToUnicode', $response->getContent());

        $quotation->refresh();
        $this->assertSame('sent', $quotation->status);
        $this->assertSame(1000.0, $quotation->subtotal);
        $this->assertSame(1110.0, $quotation->grand_total);
        $this->assertSame($description, $quotation->items()->first()->description);
    }
}
