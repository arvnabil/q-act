<?php

namespace App\Services;

use App\Models\Quotation;
use App\Models\SystemSetting;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Storage;

class QuotationPdfService
{
    /**
     * Generate vector PDF for a Quotation model.
     *
     * @param Quotation $quotation
     * @return \Barryvdh\DomPDF\PDF
     */
    public function makePdf(Quotation $quotation)
    {
        $quotation->loadMissing([
            'customer.pics',
            'pic',
            'sales',
            'businessUnit',
            'items.product.brand',
            'bankAccount',
            'purchaseOrders',
        ]);

        $companyInfo = SystemSetting::find('company_info')?->value ?? [
            'name'    => 'PT ALFA CIPTA TEKNOLOGI VIRTUAL',
            'address' => 'Ruko Grand Puri Niaga Blok K6/3C, Kembangan, Jakarta Barat 11610',
            'phone'   => '+62 21 5835 5508',
            'email'   => 'info@activ.co.id',
            'website' => 'www.activ.co.id',
        ];

        // Convert logo to base64 for instant Dompdf loading
        $logoBase64 = null;
        $logoPath = public_path('logo_quot.png');
        if (!file_exists($logoPath)) {
            $logoPath = public_path('logo.png');
        }
        if (file_exists($logoPath)) {
            $ext = pathinfo($logoPath, PATHINFO_EXTENSION);
            $mime = in_array(strtolower($ext), ['jpg', 'jpeg']) ? 'image/jpeg' : 'image/png';
            $logoBase64 = 'data:' . $mime . ';base64,' . base64_encode(file_get_contents($logoPath));
        }

        $html = view('pdf.quotation', [
            'quotation'   => $quotation,
            'companyInfo' => $companyInfo,
            'logoBase64'  => $logoBase64,
        ])->render();

        $pdf = Pdf::loadHTML($html);
        $pdf->setPaper('a4', 'portrait');

        return $pdf;
    }

    /**
     * Generate and save PDF to a file path.
     *
     * @param Quotation $quotation
     * @param string $destinationPath Full local file path
     * @return string Destination file path
     */
    public function saveToFile(Quotation $quotation, string $destinationPath): string
    {
        $dir = dirname($destinationPath);
        if (!is_dir($dir)) {
            @mkdir($dir, 0755, true);
        }

        $pdf = $this->makePdf($quotation);
        $pdf->save($destinationPath);

        return $destinationPath;
    }

    /**
     * Generate sample Customer PO PDF if none exists.
     */
    public function generateSamplePoPdf(Quotation $quotation, $po, string $destinationPath): string
    {
        $dir = dirname($destinationPath);
        if (!is_dir($dir)) {
            @mkdir($dir, 0755, true);
        }

        $items = [];
        foreach ($quotation->items as $it) {
            $items[] = [
                'name'  => $it->item_name ?: ($it->product?->name ?? 'Produk IT'),
                'qty'   => $it->qty,
                'price' => $it->price,
            ];
        }

        if (empty($items)) {
            $items[] = [
                'name'  => 'Hardware / Software Integration Service',
                'qty'   => 1,
                'price' => (float) ($quotation->subtotal ?: 10000000),
            ];
        }

        $html = view('pdf.sample_po', [
            'poNumber'        => $po->po_number ?: ($quotation->po_number ?: 'PO-' . date('Ymd')),
            'poDate'          => $po->po_date ? $po->po_date->format('d/m/Y') : date('d/m/Y'),
            'quotationId'     => $quotation->id,
            'customerName'    => $quotation->customer?->name ?? 'PT Pelanggan Demo Indonesia',
            'customerAddress' => $quotation->customer?->address,
            'items'           => $items,
            'grandTotal'      => (float) $quotation->grand_total,
        ])->render();

        $pdf = Pdf::loadHTML($html);
        $pdf->setPaper('a4', 'portrait');
        $pdf->save($destinationPath);

        return $destinationPath;
    }
}
