<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Customer Purchase Order {{ $poNumber }}</title>
    <style>
        @page { margin: 15mm; size: a4 portrait; }
        body { font-family: Arial, sans-serif; font-size: 9pt; color: #0f172a; line-height: 1.4; }
        .po-title { font-size: 18pt; font-weight: bold; color: #1e3a8a; border-bottom: 2px solid #1e3a8a; padding-bottom: 4px; margin-bottom: 12px; }
        .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        .meta-table td { vertical-align: top; width: 50%; font-size: 8.5pt; }
        .items-table { width: 100%; border-collapse: collapse; margin: 16px 0; }
        .items-table th { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 6px; font-size: 8pt; text-align: left; }
        .items-table td { border: 1px solid #cbd5e1; padding: 6px; font-size: 8pt; }
        .totals-table { width: 100%; border-collapse: collapse; }
        .totals-table td { padding: 4px; font-size: 8.5pt; text-align: right; }
    </style>
</head>
<body>
    <div class="po-title">PURCHASE ORDER (PO)</div>
    <table class="meta-table">
        <tr>
            <td>
                <strong>DARI (PELANGGAN):</strong><br>
                <span style="font-size: 11pt; font-weight: bold;">{{ $customerName }}</span><br>
                {{ $customerAddress ?? 'Alamat Kantor Pelanggan' }}
            </td>
            <td style="text-align: right;">
                <strong>NOMOR PO:</strong> <span style="font-size: 11pt; font-weight: bold;">{{ $poNumber }}</span><br>
                <strong>Tanggal PO:</strong> {{ $poDate }}<br>
                <strong>Ref Quotation:</strong> {{ $quotationId }}
            </td>
        </tr>
    </table>

    <table class="items-table">
        <thead>
            <tr>
                <th style="width: 5%;">No</th>
                <th style="width: 55%;">Deskripsi Barang / Jasa</th>
                <th style="width: 10%; text-align: center;">Qty</th>
                <th style="width: 15%; text-align: right;">Harga Satuan</th>
                <th style="width: 15%; text-align: right;">Total Harga</th>
            </tr>
        </thead>
        <tbody>
            @foreach($items as $i => $item)
            <tr>
                <td style="text-align: center;">{{ $i + 1 }}</td>
                <td>{{ $item['name'] }}</td>
                <td style="text-align: center;">{{ $item['qty'] }}</td>
                <td style="text-align: right;">Rp {{ number_format($item['price'], 0, ',', '.') }}</td>
                <td style="text-align: right;">Rp {{ number_format($item['qty'] * $item['price'], 0, ',', '.') }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>

    <table class="totals-table">
        <tr>
            <td style="width: 80%; font-weight: bold;">TOTAL NILAI PO (INCL. PPN):</td>
            <td style="width: 20%; font-weight: bold; font-size: 10pt; color: #1e3a8a;">Rp {{ number_format($grandTotal, 0, ',', '.') }}</td>
        </tr>
    </table>

    <div style="margin-top: 40px; font-size: 8pt;">
        <div>Disetujui dan diterbitkan oleh:</div>
        <div style="margin-top: 40px; font-weight: bold;">Authorized Signature & Company Stamp</div>
        <div style="color: #64748b;">{{ $customerName }}</div>
    </div>
</body>
</html>
