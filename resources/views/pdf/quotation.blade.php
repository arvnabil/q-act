<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Quotation {{ $quotation->id }}</title>
    <style>
        @page {
            margin: 15mm 15mm 15mm 15mm;
            size: a4 portrait;
        }
        body {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 9pt;
            color: #1e293b;
            line-height: 1.35;
            margin: 0;
            padding: 0;
        }
        .header-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 12px;
        }
        .header-table td {
            vertical-align: top;
        }
        .quotation-title {
            font-size: 18pt;
            font-weight: 800;
            letter-spacing: 0.5px;
            color: #0f172a;
            margin-bottom: 4px;
        }
        .meta-text {
            font-size: 8pt;
            color: #475569;
            line-height: 1.4;
        }
        .logo-img {
            max-width: 160px;
            max-height: 55px;
        }
        .company-info {
            font-size: 7.5pt;
            color: #64748b;
            line-height: 1.3;
            text-align: right;
        }
        .info-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 14px;
        }
        .info-table td {
            vertical-align: top;
            width: 50%;
            font-size: 8pt;
            line-height: 1.35;
        }
        .info-label {
            font-weight: bold;
            color: #0f172a;
            margin-bottom: 2px;
        }
        .info-box {
            padding: 6px 8px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 4px;
        }
        table.items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
        }
        table.items-table thead {
            display: table-header-group;
        }
        table.items-table tr {
            page-break-inside: avoid;
        }
        table.items-table th {
            background-color: #f1f5f9;
            color: #0f172a;
            font-size: 7.5pt;
            font-weight: 700;
            text-transform: uppercase;
            padding: 6px 5px;
            border: 1px solid #cbd5e1;
            text-align: center;
        }
        table.items-table td {
            padding: 5px;
            border: 1px solid #cbd5e1;
            font-size: 7.5pt;
            vertical-align: top;
        }
        .totals-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 4px;
            page-break-inside: avoid;
        }
        .totals-table td {
            padding: 4px 6px;
            font-size: 8pt;
        }
        .totals-label {
            text-align: right;
            font-weight: 700;
            width: 80%;
            border: 1px solid #cbd5e1;
            background: #f8fafc;
        }
        .totals-val {
            text-align: right;
            font-weight: 700;
            width: 20%;
            border: 1px solid #cbd5e1;
        }
        .grand-total {
            background: #e2e8f0;
            font-size: 8.5pt;
            font-weight: 800;
        }
        .terms-section {
            margin-top: 12px;
            font-size: 7.5pt;
            color: #334155;
            page-break-inside: avoid;
        }
        .terms-title {
            font-weight: 700;
            margin-bottom: 4px;
            color: #0f172a;
        }
        .signatures-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 16px;
            page-break-inside: avoid;
        }
        .signatures-table td {
            vertical-align: top;
            width: 50%;
        }
    </style>
</head>
<body>
    {{-- Header --}}
    <table class="header-table">
        <tr>
            <td style="width: 55%;">
                <div class="quotation-title">QUOTATION</div>
                <div class="meta-text">
                    <strong>No:</strong> {{ $quotation->id }}<br>
                    <strong>Tanggal:</strong> {{ $quotation->date ? $quotation->date->format('d/m/Y') : date('d/m/Y') }}<br>
                    <strong>Masa Berlaku:</strong> {{ $quotation->expired ? $quotation->expired->format('d/m/Y') : '-' }}
                </div>
            </td>
            <td style="width: 45%; text-align: right;">
                @if(!empty($logoBase64))
                    <img src="{{ $logoBase64 }}" class="logo-img" alt="Logo"><br>
                @endif
                <div class="company-info">
                    <strong>{{ $companyInfo['name'] ?? 'PT ALFA CIPTA TEKNOLOGI VIRTUAL' }}</strong><br>
                    {{ $companyInfo['address'] ?? 'Ruko Grand Puri Niaga Blok K6/3C, Jakarta Barat' }}<br>
                    Telp: {{ $companyInfo['phone'] ?? '+62 21 5835 5508' }} | Email: {{ $companyInfo['email'] ?? 'info@activ.co.id' }}
                </div>
            </td>
        </tr>
    </table>

    {{-- Customer & Sales Information --}}
    <table class="info-table">
        <tr>
            <td style="padding-right: 6px;">
                <div class="info-box">
                    <div class="info-label">KEPADA:</div>
                    <strong>{{ $quotation->customer?->name ?? '-' }}</strong><br>
                    @if($quotation->pic)
                        Attn: {{ $quotation->pic->name }} ({{ $quotation->pic->phone ?? '-' }})<br>
                    @endif
                    {{ $quotation->customer?->address ?? '-' }}
                </div>
            </td>
            <td style="padding-left: 6px;">
                <div class="info-box">
                    <div class="info-label">PENGIRIM:</div>
                    <strong>{{ $quotation->sales?->name ?? 'Sales Team' }}</strong><br>
                    PT ALFA CIPTA TEKNOLOGI VIRTUAL<br>
                    Email: {{ $quotation->sales?->email ?? 'info@activ.co.id' }}<br>
                    Telp: {{ $quotation->sales?->mobile ?? '-' }}
                </div>
            </td>
        </tr>
    </table>

    {{-- Items Table --}}
    <table class="items-table">
        <thead>
            <tr>
                <th style="width: 4%;">No</th>
                <th style="width: 14%;">SKU</th>
                <th style="width: 12%;">Brand</th>
                <th style="width: 42%; text-align: left;">Deskripsi Produk</th>
                <th style="width: 6%;">Jml</th>
                <th style="width: 11%; text-align: right;">Harga</th>
                <th style="width: 11%; text-align: right;">Total</th>
            </tr>
        </thead>
        <tbody>
            @foreach($quotation->items as $idx => $item)
                <tr>
                    <td style="text-align: center;">{{ $idx + 1 }}</td>
                    <td>{{ $item->sku ?: ($item->product?->sku ?? '-') }}</td>
                    <td>{{ $item->product?->brand?->name ?? ($item->brand ?? '-') }}</td>
                    <td>
                        <strong>{{ $item->item_name ?: ($item->product?->name ?? '-') }}</strong>
                        @if($item->description)
                            <br><span style="color: #64748b; font-size: 7pt;">{{ $item->description }}</span>
                        @endif
                    </td>
                    <td style="text-align: center;">{{ $item->qty }}</td>
                    <td style="text-align: right;">Rp {{ number_format($item->price, 0, ',', '.') }}</td>
                    <td style="text-align: right;">Rp {{ number_format($item->qty * $item->price, 0, ',', '.') }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    {{-- Totals --}}
    <table class="totals-table">
        <tr>
            <td class="totals-label">SUBTOTAL</td>
            <td class="totals-val">Rp {{ number_format($quotation->subtotal, 0, ',', '.') }}</td>
        </tr>
        @if($quotation->calc_tax)
        <tr>
            <td class="totals-label">PPN (11%)</td>
            <td class="totals-val">Rp {{ number_format($quotation->tax_amount, 0, ',', '.') }}</td>
        </tr>
        @endif
        <tr class="grand-total">
            <td class="totals-label grand-total">GRAND TOTAL</td>
            <td class="totals-val grand-total">Rp {{ number_format($quotation->grand_total, 0, ',', '.') }}</td>
        </tr>
    </table>

    {{-- Terms & Conditions --}}
    @if(!empty($quotation->terms) && is_array($quotation->terms))
    <div class="terms-section">
        <div class="terms-title">Syarat & Ketentuan:</div>
        <ol style="margin: 0; padding-left: 18px;">
            @foreach($quotation->terms as $term)
                <li>{{ $term }}</li>
            @endforeach
        </ol>
    </div>
    @endif

    {{-- Signatures --}}
    <table class="signatures-table">
        <tr>
            <td style="text-align: left;">
                <div style="font-size: 8pt; font-weight: bold; margin-bottom: 45px;">Diterbitkan oleh:</div>
                <div style="font-size: 8pt; font-weight: bold;">{{ $quotation->sales?->name ?? 'Sales Representative' }}</div>
                <div style="font-size: 7pt; color: #64748b;">PT ALFA CIPTA TEKNOLOGI VIRTUAL</div>
            </td>
            <td style="text-align: right;">
                <div style="font-size: 8pt; font-weight: bold; margin-bottom: 45px;">Disetujui oleh:</div>
                <div style="font-size: 8pt; font-weight: bold;">[ ........................................ ]</div>
                <div style="font-size: 7pt; color: #64748b;">Tanda Tangan & Cap Pelanggan</div>
            </td>
        </tr>
    </table>
</body>
</html>
