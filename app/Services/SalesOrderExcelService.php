<?php

namespace App\Services;

use App\Models\SalesOrder;
use Carbon\Carbon;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\NumberFormat;

class SalesOrderExcelService
{
    protected string $templatePath;

    public function __construct()
    {
        $this->templatePath = resource_path('js/templates/SO_Analysis_Template.xlsx');
    }

    /**
     * Generate an Excel spreadsheet binary content for a given Sales Order.
     */
    public function generate(SalesOrder $so): string
    {
        $so->loadMissing(['customer', 'sales', 'quotation', 'items.product', 'costs.category']);

        $customerName = $so->customer?->name ?: ($so->quotation?->customer_name ?: '-');
        $salesName = $so->sales?->name ?: ($so->quotation?->sales_name ?: 'Sales');
        $quotationId = $so->quotation_id ?: ($so->id ?: 'SO-EXPORT');
        $soDateFormatted = $so->date ? Carbon::parse($so->date)->isoFormat('dddd, D MMMM Y') : Carbon::now()->isoFormat('dddd, D MMMM Y');
        $notes = $customerName;

        // Auto-detect PPN & PPh
        $showPpn = $so->quotation ? ($so->quotation->calc_tax !== false) : true;
        $calcPph = $so->quotation ? ($so->quotation->calc_pph === true) : false;
        $pphRate = $so->quotation ? ($so->quotation->pph_rate ?: 0.02) : 0.02;
        $pphRatePct = (int) round($pphRate * 100);

        $items = $so->items ?: collect();
        $costs = $so->costs ?: collect();

        // Load template or create new
        if (file_exists($this->templatePath)) {
            $spreadsheet = IOFactory::load($this->templatePath);
        } else {
            $spreadsheet = new Spreadsheet();
        }

        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle(substr($so->id, 0, 31));

        // Fill Header Info
        $sheet->setCellValue('C4', $customerName);
        $sheet->setCellValue('C5', $quotationId);
        $sheet->setCellValue('H4', $soDateFormatted);
        $sheet->setCellValue('H5', $salesName);
        $sheet->setCellValue('C7', $notes);

        // Define row pointers matching template layout
        // Template standard:
        // Row 9: REVENUE Header
        // Row 10: Table Columns Header (NO, ITEM, QTY, SATUAN, HARGA SATUAN, TOTAL, TOTAL+PPN)
        // Row 11: First item data template
        
        $currentRow = 11;
        $totalRevenue = 0;
        $totalRevenuePpn = 0;
        $pphBasisRevenue = 0;

        if ($items->count() > 0) {
            $extraItemCount = $items->count() - 1;
            if ($extraItemCount > 0) {
                $sheet->insertNewRowBefore($currentRow + 1, $extraItemCount);
            }

            foreach ($items as $idx => $item) {
                $qty = (float) ($item->qty ?: 1);
                $price = (float) ($item->price ?: 0);
                $total = $qty * $price;
                $totalPpn = round($total * 1.11);

                $totalRevenue += $total;
                $totalRevenuePpn += $totalPpn;
                if ($calcPph && $item->is_pph_applied) {
                    $pphBasisRevenue += $total;
                }

                $brandStr = $item->brand_name ?: '';
                $itemLabel = ($item->product_name ?: ($item->sku ?: '-')) . ($brandStr ? " ($brandStr)" : '');
                if ($calcPph && $item->is_pph_applied) {
                    $itemLabel .= " [PPh {$pphRatePct}%]";
                }

                $r = $currentRow + $idx;
                $sheet->setCellValue("A{$r}", $idx + 1);
                $sheet->setCellValue("B{$r}", $itemLabel);
                $sheet->setCellValue("D{$r}", $qty);
                $sheet->setCellValue("E{$r}", 'UNIT');
                $sheet->setCellValue("F{$r}", $price);
                $sheet->setCellValue("G{$r}", $total);
                $sheet->setCellValue("H{$r}", $totalPpn);

                // Formatting
                $sheet->getStyle("A{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle("D{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle("E{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle("F{$r}:H{$r}")->getNumberFormat()->setFormatCode('#,##0');
            }
            $currentRow += $items->count();
        } else {
            $currentRow++;
        }

        // Summary Revenue Row
        $revenueTotalRow = $currentRow;
        $sheet->setCellValue("G{$revenueTotalRow}", $totalRevenue);
        $sheet->setCellValue("H{$revenueTotalRow}", $totalRevenuePpn);
        $sheet->getStyle("G{$revenueTotalRow}:H{$revenueTotalRow}")->getNumberFormat()->setFormatCode('#,##0');

        // Next Section: COGS (HPP)
        // Find or skip down to COGS table
        $currentRow += 4; // Skip subtotal/spacing rows
        $cogsStartRow = $currentRow;
        $totalCogs = 0;
        $totalCogsPpn = 0;

        if ($items->count() > 0) {
            $extraCogsCount = $items->count() - 1;
            if ($extraCogsCount > 0) {
                $sheet->insertNewRowBefore($cogsStartRow + 1, $extraCogsCount);
            }

            foreach ($items as $idx => $item) {
                $qty = (float) ($item->qty ?: 1);
                $hpp = (float) ($item->hpp ?: ($item->modal ?: 0));
                $total = $qty * $hpp;
                $totalPpn = round($total * 1.11);

                $totalCogs += $total;
                $totalCogsPpn += $totalPpn;

                $brandStr = $item->brand_name ?: '';
                $itemLabel = ($item->product_name ?: ($item->sku ?: '-')) . ($brandStr ? " ($brandStr)" : '');

                $r = $cogsStartRow + $idx;
                $sheet->setCellValue("A{$r}", $idx + 1);
                $sheet->setCellValue("B{$r}", $itemLabel);
                $sheet->setCellValue("D{$r}", $qty);
                $sheet->setCellValue("E{$r}", 'UNIT');
                $sheet->setCellValue("F{$r}", $hpp);
                $sheet->setCellValue("G{$r}", $total);
                $sheet->setCellValue("H{$r}", $totalPpn);

                $sheet->getStyle("A{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle("D{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle("E{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle("F{$r}:H{$r}")->getNumberFormat()->setFormatCode('#,##0');
            }
            $currentRow += $items->count();
        } else {
            $currentRow++;
        }

        // Output to string in memory
        $writer = IOFactory::createWriter($spreadsheet, 'Xlsx');
        ob_start();
        $writer->save('php://output');
        $excelData = ob_get_clean();

        return $excelData;
    }
}
