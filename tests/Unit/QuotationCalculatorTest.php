<?php

namespace Tests\Unit;

use App\Models\Quotation;
use App\Services\QuotationCalculator;
use PHPUnit\Framework\TestCase;

class QuotationCalculatorTest extends TestCase
{
    public function test_money_totals_keep_two_decimals_and_add_pph(): void
    {
        $quotation = new Quotation([
            'calc_tax' => true,
            'show_tax' => true,
            'ppn_rate' => 0.11,
            'calc_pph' => true,
            'pph_rate' => 0.02,
        ]);

        $totals = (new QuotationCalculator())->calculateTotals($quotation, [
            ['qty' => 94, 'price' => 3325501.02, 'hpp' => 2573000.00, 'is_pph_applied' => true],
            ['qty' => 57, 'price' => 6159995.07, 'hpp' => 4825980.00, 'is_pph_applied' => true],
        ]);

        $this->assertSame(663716814.87, $totals['subtotal']);
        $this->assertSame(73008849.64, $totals['ppn_amount']);
        $this->assertSame(13274336.30, $totals['pph_amount']);
        $this->assertSame(750000000.81, $totals['grand_total']);
    }
}
