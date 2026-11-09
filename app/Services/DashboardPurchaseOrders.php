<?php
namespace App\Services;

use App\Models\{Quotation, QuotationPurchaseOrder};
use Illuminate\Support\Collection;
use Carbon\Carbon;

class DashboardPurchaseOrders
{
    // Return one reporting row per real PO; never substitute created_at for po_date.
    public function rows(Collection $quotations): array
    {
        $records = QuotationPurchaseOrder::whereIn('quotation_id', $quotations->pluck('id'))->get();
        $quotes = $quotations->keyBy('id');
        $rows = collect();
        $missingDate = 0;
        $invalidAllocation = 0;
        $eligible = $records->filter(fn ($po) => in_array($po->status, ['Diterima', 'Sebagian'])
            && !in_array($quotes[$po->quotation_id]->status, ['cancelled', 'superseded', 'rejected']));
        $usage = [];
        // Canonical item IDs also identify copied items in sub quotations.
        foreach ($eligible as $po) {
            $q = $quotes[$po->quotation_id];
            foreach ($q->items->whereIn('id', $po->quotation_item_ids ?? []) as $item) {
                $key = $item->source_quotation_item_id ?: $item->id;
                $usage[$key] = ($usage[$key] ?? 0) + 1;
            }
        }
        foreach ($eligible as $po) {
            if (!$po->po_date) { $missingDate++; continue; }
            $q = $quotes[$po->quotation_id];
            $ids = array_unique($po->quotation_item_ids ?? []);
            // If quotation_item_ids is empty/null, use all items from the quotation
            if (!$ids) {
                $items = $q->items;
            } else {
                $items = $q->items->whereIn('id', $ids);
                // Skip if specific IDs were listed but items don't match
                if ($items->count() !== count($ids)) {
                    $invalidAllocation++; continue;
                }
                // Skip if items are over-allocated (used in multiple eligible POs)
                if ($items->contains(fn ($item) =>
                    ($usage[$item->source_quotation_item_id ?: $item->id] ?? 0) > 1)) {
                    $invalidAllocation++; continue;
                }
            }
            $row = clone $q;
            $row->setRelation('items', $items);
            $row->subtotal = 0;
            $row->po_record_id = $po->id;
            $row->po_date = $po->po_date;
            $row->po_number = $po->po_number;
            $row->po_status = $po->status;
            $row->status = 'approved';
            $row->grand_total = app(QuotationCalculator::class)->calculateTotals($q, $items)['grand_total'];
            $rows->push($row);
        }

        // Handle quotations that don't have a QuotationPurchaseOrder record
        // (e.g. PO entered via Sales Order or legacy quotation PO fields)
        $processedQuotIds = $records->pluck('quotation_id')->unique()->all();
        $otherQuotations = $quotations->whereNotIn('id', $processedQuotIds)
            ->filter(fn ($q) => !in_array($q->status, ['cancelled', 'superseded', 'rejected']));

        foreach ($otherQuotations as $q) {
            // Find PO date and number from Quotation or associated Sales Orders
            $soWithPo = $q->salesOrders?->first(fn ($so) => !empty($so->po_date));
            $soFallback = $q->salesOrders?->first(fn ($so) => !empty($so->po_number));
            
            $poDate = $q->po_date ?: $soWithPo?->po_date;
            $poNumber = $q->po_number ?: ($soWithPo?->po_number ?: $soFallback?->po_number);
            $poStatus = $q->po_status ?: ($soWithPo?->po_status ?: ($q->status === 'approved' ? 'Diterima' : null));

            // Must have either approved status, or valid PO number/status
            $hasPo = !empty($poNumber) || in_array($poStatus, ['Diterima', 'Sebagian']) || $q->status === 'approved';

            if ($hasPo) {
                if (!$poDate) {
                    $missingDate++;
                } else {
                    $row = clone $q;
                    $row->po_record_id = 'quot_' . $q->id;
                    $row->po_date = $poDate instanceof Carbon ? $poDate : Carbon::parse($poDate);
                    $row->po_number = $poNumber;
                    $row->po_status = $poStatus ?: 'Diterima';
                    $row->status = 'approved';
                    $rows->push($row);
                }
            }
        }

        $missingRecord = 0;
        return compact('rows', 'missingDate', 'invalidAllocation', 'missingRecord');
    }
}
