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
        $quotes = $quotations->keyBy('id');
        $rows = collect();
        $missingDate = 0;
        $invalidAllocation = 0;

        // 1. Ambil data dari QuotationPurchaseOrder
        $records = QuotationPurchaseOrder::whereIn('quotation_id', $quotations->pluck('id'))->get();
        $eligibleQpo = $records->filter(function ($po) use ($quotes) {
            $q = $quotes[$po->quotation_id] ?? null;
            if (!$q || in_array($q->status, ['cancelled', 'superseded', 'rejected'])) {
                return false;
            }
            return in_array($po->status, ['Diterima', 'Sebagian']);
        });

        // Catat quotation ID yang sudah berhasil terhitung lewat QPO
        $handledQuotationIds = [];

        foreach ($eligibleQpo as $po) {
            if (!$po->po_date) { 
                $missingDate++; 
                continue; 
            }
            $q = $quotes[$po->quotation_id];
            $ids = array_unique($po->quotation_item_ids ?? []);
            
            if (!$ids) {
                $items = $q->items;
            } else {
                $items = $q->items->whereIn('id', $ids);
                if ($items->isEmpty()) {
                    $items = $q->items;
                }
            }

            $row = clone $q;
            $row->setRelation('items', $items);
            $row->subtotal = 0;
            $row->po_record_id = $po->id;
            $row->po_date = $po->po_date instanceof Carbon ? $po->po_date : Carbon::parse($po->po_date);
            $row->po_number = $po->po_number;
            $row->po_status = $po->status;
            $row->status = 'approved';
            $row->grand_total = app(QuotationCalculator::class)->calculateTotals($q, $items)['grand_total'];
            
            // Sync sales_id dari SO jika di Quotation belum ada
            $so = $q->salesOrders?->first();
            if ($so && $so->sales_id && !$row->sales_id) {
                $row->sales_id = $so->sales_id;
            }

            $rows->push($row);
            $handledQuotationIds[$q->id] = true;
        }

        // 2. Untuk setiap Quotation yang BELUM masuk lewat QPO di atas:
        // Cek apakah ada tanggal PO dari Sales Order atau dari Quotation itu sendiri!
        foreach ($quotations as $q) {
            if (isset($handledQuotationIds[$q->id])) {
                continue; // Sudah terhitung di atas
            }
            if (in_array($q->status, ['cancelled', 'superseded', 'rejected'])) {
                continue;
            }

            // Cari SO yang terkait (utamakan yang bukan cancelled/revised)
            $activeSos = $q->salesOrders ? $q->salesOrders->filter(fn($s) => !in_array(strtoupper($s->status ?? ''), ['REVISED', 'CANCELLED', 'BATAL'])) : collect();
            $so = $activeSos->first(fn($s) => !empty($s->po_date)) ?: $activeSos->first();

            // Tanggal PO bisa berasal dari SO atau Quotation
            $poDate = $so?->po_date ?: $q->po_date;
            $poNumber = $so?->po_number ?: $q->po_number;
            $poStatus = $so?->po_status ?: ($q->po_status ?: ($q->status === 'approved' ? 'Diterima' : null));

            // Jika ada tanda-tanda PO (nomor PO, status PO Diterima/Sebagian, status approved, atau ada Sales Order)
            $hasPo = !empty($poNumber) 
                || in_array($poStatus, ['Diterima', 'Sebagian']) 
                || $q->status === 'approved' 
                || $so !== null;

            if ($hasPo) {
                if (!$poDate) {
                    $missingDate++;
                } else {
                    $row = clone $q;
                    $row->po_record_id = 'so_' . ($so?->id ?: $q->id);
                    $row->po_date = $poDate instanceof Carbon ? $poDate : Carbon::parse($poDate);
                    $row->po_number = $poNumber;
                    $row->po_status = $poStatus ?: 'Diterima';
                    $row->status = 'approved';
                    $row->grand_total = $so?->grand_total ?? $q->grand_total;

                    // Sync sales_id dari SO
                    if ($so && $so->sales_id) {
                        $row->sales_id = $so->sales_id;
                    }

                    $rows->push($row);
                    $handledQuotationIds[$q->id] = true;
                }
            }
        }

        $missingRecord = 0;
        return compact('rows', 'missingDate', 'invalidAllocation', 'missingRecord');
    }
}
