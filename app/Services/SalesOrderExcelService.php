<?php

namespace App\Services;

use App\Models\SalesOrder;
use Carbon\Carbon;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
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
        $so->loadMissing(['customer', 'sales', 'quotation.salesNotes', 'items.product', 'costs.category']);

        $customerName = $so->customer?->name ?: ($so->quotation?->customer_name ?: '-');
        $salesName = $so->sales?->name ?: ($so->quotation?->sales_name ?: 'Sales');
        $quotationId = $so->quotation_id ?: ($so->id ?: 'SO-EXPORT');
        $soDateFormatted = $so->date ? Carbon::parse($so->date)->isoFormat('dddd, D MMMM Y') : Carbon::now()->isoFormat('dddd, D MMMM Y');

        // Auto-detect PPN & PPh
        $showPpn = $so->quotation ? ($so->quotation->calc_tax !== false) : true;
        $calcPph = $so->quotation ? ($so->quotation->calc_pph === true) : false;
        $pphRate = $so->quotation ? ($so->quotation->pph_rate ?: 0.02) : 0.02;
        $pphRatePct = (int) round($pphRate * 100);

        $items = $so->items ?: collect();

        // Load template or create new
        if (file_exists($this->templatePath)) {
            $spreadsheet = IOFactory::load($this->templatePath);
        } else {
            $spreadsheet = new Spreadsheet();
        }

        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle(substr(preg_replace('/[^A-Za-z0-9_\-]/', '_', $so->id), 0, 31));

        // 1. Fill Header Info (Row 3-6, Col B)
        $sheet->setCellValue('B3', $customerName);
        $sheet->setCellValue('B4', $salesName);
        $sheet->setCellValue('B5', $quotationId);
        $sheet->setCellValue('B6', $soDateFormatted);

        // 2. Prepare items data
        $revenueRows = [];
        $cogsRows = [];
        $totalRevenue = 0;
        $totalRevenuePpn = 0;
        $totalCogs = 0;
        $totalCogsPpn = 0;

        foreach ($items as $idx => $item) {
            $qty = (float) ($item->qty ?: 1);
            $price = (float) ($item->price ?: 0);
            $hpp = (float) ($item->hpp ?: ($item->modal ?: 0));

            $revTotal = $qty * $price;
            $revTotalPpn = (float) round($revTotal * 1.11);
            $cogsTotal = $qty * $hpp;
            $cogsTotalPpn = (float) round($cogsTotal * 1.11);

            $totalRevenue += $revTotal;
            $totalRevenuePpn += $revTotalPpn;
            $totalCogs += $cogsTotal;
            $totalCogsPpn += $cogsTotalPpn;

            $brandStr = $item->brand_name ?: '';
            $desc = ($item->product_name ?: ($item->sku ?: '-')) . ($brandStr ? " ({$brandStr})" : '');
            if ($calcPph && $item->is_pph_applied) {
                $desc .= " [PPh {$pphRatePct}%]";
            }

            $revenueRows[] = [
                'no' => $idx + 1,
                'desc' => $desc,
                'qty' => $qty,
                'unit' => 'UNIT',
                'price' => $price,
                'total' => $revTotal,
                'total_ppn' => $revTotalPpn,
            ];

            $cogsRows[] = [
                'no' => $idx + 1,
                'desc' => $desc,
                'qty' => $qty,
                'unit' => 'UNIT',
                'price' => $hpp,
                'total' => $cogsTotal,
                'total_ppn' => $cogsTotalPpn,
            ];
        }

        // 3. Prepare Other COGS data (from SO Costs or Quotation SalesNote adjustments)
        $otherCogsRows = [];
        $totalOtherCogs = 0;

        if ($so->costs && $so->costs->count() > 0) {
            foreach ($so->costs as $cost) {
                $amt = (float) ($cost->amount ?: 0);
                $cat = $cost->category?->name ?: 'Transport & Accommodation';
                $lbl = $cost->description ?: '';

                // If label is empty but category has "Transport & Accommodation (Ongkir)"
                if (!$lbl && preg_match('/^(.*?)\s*\((.*?)\)$/', $cat, $m)) {
                    $cat = trim($m[1]);
                    $lbl = trim($m[2]);
                }

                $otherCogsRows[] = [
                    'category' => $cat,
                    'label' => $lbl,
                    'amount' => $amt,
                ];
                $totalOtherCogs += $amt;
            }
        } elseif ($so->quotation && $so->quotation->salesNotes && $so->quotation->salesNotes->count() > 0) {
            $latestNote = $so->quotation->salesNotes->sortByDesc('created_at')->first();
            $adjs = $latestNote?->adjustments;
            if (is_array($adjs)) {
                foreach ($adjs as $adj) {
                    $amt = (float) ($adj['amount'] ?? 0);
                    $cat = $adj['category'] ?? 'Transport & Accommodation';
                    $lbl = $adj['label'] ?? '';

                    if (!$lbl && preg_match('/^(.*?)\s*\((.*?)\)$/', $cat, $m)) {
                        $cat = trim($m[1]);
                        $lbl = trim($m[2]);
                    }

                    if ($amt > 0 || !empty($lbl) || !empty($cat)) {
                        $otherCogsRows[] = [
                            'category' => $cat,
                            'label' => $lbl,
                            'amount' => $amt,
                        ];
                        $totalOtherCogs += $amt;
                    }
                }
            }
        }

        // Margin calculations
        $grossProfitRp = $totalRevenue - $totalCogs - $totalOtherCogs;
        $grossProfitPct = $totalRevenue > 0 ? ($grossProfitRp / $totalRevenue) * 100 : 0;
        $grossProfitPpnRp = $totalRevenuePpn - $totalCogsPpn - $totalOtherCogs;
        $grossProfitPpnPct = $totalRevenuePpn > 0 ? ($grossProfitPpnRp / $totalRevenuePpn) * 100 : 0;

        // 4. Fill Zones using row growth
        $this->populateZone($sheet, 'REVENUE', 'Total Revenue', $revenueRows, true, $showPpn);
        $this->populateZone($sheet, 'COGS', 'Total COGS', $cogsRows, true, $showPpn);
        $this->populateZone($sheet, 'OTHER COGS', 'Total Other COGS', $otherCogsRows, false, $showPpn);

        // 5. Fill Totals
        $rRevTot = $this->findRowWithText($sheet, 'Total Revenue');
        if ($rRevTot) {
            $sheet->setCellValue("F{$rRevTot}", $totalRevenue);
            $sheet->setCellValue("G{$rRevTot}", $showPpn ? $totalRevenuePpn : null);
        }

        $rCogsTot = $this->findRowWithText($sheet, 'Total COGS');
        if ($rCogsTot) {
            $sheet->setCellValue("F{$rCogsTot}", $totalCogs);
            $sheet->setCellValue("G{$rCogsTot}", $showPpn ? $totalCogsPpn : null);
        }

        $rOthTot = $this->findRowWithText($sheet, 'Total Other COGS');
        if ($rOthTot) {
            $sheet->setCellValue("F{$rOthTot}", -$totalOtherCogs);
            $sheet->setCellValue("G{$rOthTot}", $showPpn ? -$totalOtherCogs : null);
        }

        $rGrossRp = $this->findRowWithText($sheet, 'GROSS MARGIN (RP)');
        if ($rGrossRp) {
            $sheet->setCellValue("F{$rGrossRp}", $grossProfitRp);
            $sheet->setCellValue("G{$rGrossRp}", $showPpn ? $grossProfitPpnRp : null);
        }

        $rGrossPct = $this->findRowWithText($sheet, 'GROSS MARGIN (%)');
        if ($rGrossPct) {
            $sheet->setCellValue("F{$rGrossPct}", $grossProfitPct);
            $sheet->setCellValue("G{$rGrossPct}", $showPpn ? $grossProfitPpnPct : null);
        }

        // Output to string in memory
        $writer = IOFactory::createWriter($spreadsheet, 'Xlsx');
        ob_start();
        $writer->save('php://output');
        $excelData = ob_get_clean();

        return $excelData;
    }

    /**
     * Populate a section table zone between $startLabel and $totalLabel.
     */
    protected function populateZone($sheet, string $startLabel, string $totalLabel, array $rows, bool $isItemTable, bool $showPpn): void
    {
        $startRow = $this->findRowWithText($sheet, $startLabel);
        $totalRow = $this->findRowWithText($sheet, $totalLabel);

        if (!$startRow || !$totalRow) {
            return;
        }

        $capacity = $totalRow - $startRow - 1;
        $needed = count($rows);

        // Grow rows if needed
        if ($needed > $capacity) {
            $extra = $needed - $capacity;
            $sheet->insertNewRowBefore($totalRow, $extra);
            $totalRow += $extra;
            $capacity = $needed;
        }

        for ($slot = 0; $slot < $capacity; $slot++) {
            $r = $startRow + 1 + $slot;

            if ($slot < $needed) {
                $item = $rows[$slot];
                if ($isItemTable) {
                    $sheet->setCellValue("A{$r}", $item['no']);
                    $sheet->setCellValue("B{$r}", $item['desc']);
                    $sheet->setCellValue("C{$r}", $item['qty']);
                    $sheet->setCellValue("D{$r}", $item['unit']);
                    $sheet->setCellValue("E{$r}", $item['price']);
                    $sheet->setCellValue("F{$r}", $item['total']);
                    $sheet->setCellValue("G{$r}", $showPpn ? $item['total_ppn'] : null);

                    $sheet->getStyle("A{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                    $sheet->getStyle("C{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                    $sheet->getStyle("D{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                    $sheet->getStyle("E{$r}:G{$r}")->getNumberFormat()->setFormatCode('#,##0');
                } else {
                    // Other COGS: Column B = Category, Column C = Label (separated cells!)
                    $sheet->setCellValue("A{$r}", null);
                    $sheet->setCellValue("B{$r}", $item['category'] ?? '');
                    $sheet->setCellValue("C{$r}", $item['label'] ?? '');
                    $sheet->setCellValue("D{$r}", null);
                    $sheet->setCellValue("E{$r}", null);
                    $sheet->setCellValue("F{$r}", -$item['amount']);
                    $sheet->setCellValue("G{$r}", $showPpn ? -$item['amount'] : null);

                    $sheet->getStyle("B{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_LEFT);
                    $sheet->getStyle("C{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_LEFT);
                    $sheet->getStyle("F{$r}:G{$r}")->getNumberFormat()->setFormatCode('#,##0');
                }
            } else {
                // Clear unused template slot
                $sheet->setCellValue("A{$r}", null);
                $sheet->setCellValue("B{$r}", null);
                $sheet->setCellValue("C{$r}", null);
                $sheet->setCellValue("D{$r}", null);
                $sheet->setCellValue("E{$r}", null);
                $sheet->setCellValue("F{$r}", null);
                $sheet->setCellValue("G{$r}", null);
            }
        }
    }

    protected function findRowWithText($sheet, string $text): ?int
    {
        $highestRow = $sheet->getHighestRow();
        for ($r = 1; $r <= $highestRow; $r++) {
            $val = trim((string)$sheet->getCell("A{$r}")->getValue());
            if (strcasecmp($val, $text) === 0) {
                return $r;
            }
        }
        return null;
    }
}
