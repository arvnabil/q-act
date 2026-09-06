<?php

namespace App\Services;

use App\Models\Quotation;

class QuotationCalculator
{
    /**
     * Calculate price from HPP and Margin Percentage.
     * margin_sales = (price - modal) / price
     * price = modal / (1 - margin_sales)
     * 
     * @param float $hpp Modal / HPP
     * @param float $marginPercentage Margin in percentage (e.g., 20 for 20%)
     * @return float Calculated price
     */
    public function calculatePriceFromMargin(float $hpp, float $marginPercentage): float
    {
        if ($marginPercentage >= 100) {
            throw new \InvalidArgumentException("Margin percentage cannot be 100 or greater.");
        }
        
        if ($hpp == 0) {
            return 0;
        }

        $marginDecimal = $marginPercentage / 100;
        return $hpp / (1 - $marginDecimal);
    }

    /**
     * Calculate margin percentage from Price and HPP.
     * 
     * @param float $price Sell price
     * @param float $hpp Modal / HPP
     * @return float Margin percentage
     */
    public function calculateMarginFromPrice(float $price, float $hpp): float
    {
        if ($price == 0) {
            return 0;
        }

        return (($price - $hpp) / $price) * 100;
    }

    /**
     * Calculate the entire quotation totals
     * 
     * @param Quotation $quotation
     * @param array $items Array of items (either Eloquent models or array)
     * @return array Total breakdown
     */
    public function calculateTotals(Quotation $quotation, iterable $items): array
    {
        $subtotal = 0;
        $totalHpp = 0;
        $pphBase = 0;

        foreach ($items as $item) {
            // Support both object and array access
            $qty = is_array($item) ? $item['qty'] : $item->qty;
            $price = is_array($item) ? $item['price'] : $item->price;
            $hpp = is_array($item) ? $item['hpp'] : $item->hpp;
            $isPphApplied = is_array($item) ? ($item['is_pph_applied'] ?? false) : $item->is_pph_applied;
            
            $itemTotal = $qty * $price;
            $subtotal += $itemTotal;
            $totalHpp += ($qty * $hpp);

            if ($isPphApplied) {
                $pphBase += $itemTotal;
            }
        }

        $ppnAmount = 0;
        if ($quotation->calc_tax) {
            $ppnAmount = $subtotal * $quotation->ppn_rate;
        }

        $pphAmount = 0;
        if ($quotation->calc_pph) {
            $pphAmount = $pphBase * $quotation->pph_rate;
        }

        $grandTotal = $subtotal + $ppnAmount - $pphAmount;
        $totalMarginAmount = $subtotal - $totalHpp;
        $overallMarginPercentage = $subtotal > 0 ? ($totalMarginAmount / $subtotal) * 100 : 0;

        return [
            'subtotal' => round($subtotal, 2),
            'total_hpp' => round($totalHpp, 2),
            'ppn_amount' => round($ppnAmount, 2),
            'pph_amount' => round($pphAmount, 2),
            'grand_total' => round($grandTotal, 2),
            'total_margin_amount' => round($totalMarginAmount, 2),
            'overall_margin_percentage' => round($overallMarginPercentage, 2),
        ];
    }
}
