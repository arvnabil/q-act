<?php
namespace App\Services;

use App\Models\{Quotation, QuotationPurchaseOrder};
use Illuminate\Support\Collection;

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
            $items = $q->items->whereIn('id', $ids);
            if (!$ids || $items->count() !== count($ids) || $items->contains(fn ($item) =>
                ($usage[$item->source_quotation_item_id ?: $item->id] ?? 0) > 1)) {
                $invalidAllocation++; continue;
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
        $legacy = $quotations->where('status', 'approved')->whereNotIn('id', $records->pluck('quotation_id'));
        $missingDate += $legacy->whereNull('po_date')->count();
        $missingRecord = $legacy->whereNotNull('po_date')->count();
        return compact('rows', 'missingDate', 'invalidAllocation', 'missingRecord');
    }
}
