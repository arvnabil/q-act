<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Quotation {{ $quotation->id }} - {{ $quotation->customer?->name ?? 'Customer' }}</title>
    <style>
        *, html, body, div, table, tr, th, td {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            box-sizing: border-box;
        }
        @page {
            margin: 15mm 15mm 15mm 15mm;
            size: A4 portrait;
        }
        body {
            font-family: Arial, Helvetica, sans-serif;
            color: #111;
            margin: 0;
            padding: 0;
            font-size: 9px;
            line-height: 1.25;
            width: 100%;
            box-sizing: border-box;
            background: #ffffff;
        }
        .header-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 8px;
            table-layout: fixed;
        }
        .header-left {
            vertical-align: top;
            text-align: left;
            width: 50%;
            font-size: 9px;
        }
        .header-right {
            vertical-align: top;
            text-align: left;
            width: 50%;
            font-size: 8.5px;
            color: #333;
            line-height: 1.25;
        }
        .table-container {
            width: 100%;
            box-sizing: border-box;
        }
        .table-items {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 0px;
            table-layout: fixed;
        }
        .table-items thead {
            display: table-header-group;
        }
        .table-items tr {
            page-break-inside: avoid;
        }
        .table-items th, .table-items td {
            border: 1px solid #6b7280 !important;
            padding: 4px 5px;
            box-sizing: border-box;
        }
        .table-items th {
            background-color: #f1f5f9 !important;
            color: #000000 !important;
            padding: 4px 3px;
            font-size: 8.5px;
            font-weight: bold;
            text-transform: uppercase;
            text-align: center;
        }
        .terms {
            font-size: 8.5px;
            margin-top: 10px;
            line-height: 1.35;
            color: #222;
            page-break-inside: avoid;
        }
        .signature-table {
            width: 100%;
            border: none !important;
            margin-top: 15px;
            page-break-inside: avoid;
            border-collapse: collapse;
        }
    </style>
</head>
<body>
    @php
        $calcTax = $quotation->calc_tax !== false;
        $showTax = $quotation->show_tax !== false;
        $ppnRate = $quotation->ppn_rate ?: 0.11;
        $bakeTaxIntoItems = $calcTax && !$showTax;
        $taxMultiplier = $bakeTaxIntoItems ? (1 + $ppnRate) : 1;

        $items = $quotation->items ?? [];
        $baseSubtotal = 0;
        foreach ($items as $it) {
            $baseSubtotal += ($it->qty ?? 0) * ($it->price ?? 0);
        }
        $subtotal = round($bakeTaxIntoItems ? $baseSubtotal * $taxMultiplier : $baseSubtotal);
        $ppn = ($calcTax && $showTax) ? round($subtotal * $ppnRate) : 0;

        $calcPph = $quotation->calc_pph === true;
        $showPph = $quotation->show_pph === true;
        $pphRate = $quotation->pph_rate ?: 0.02;
        $pphBasis = 0;
        foreach ($items as $it) {
            if (!empty($it->is_pph_applied)) {
                $pphBasis += ($it->qty ?? 0) * ($it->price ?? 0);
            }
        }
        $pphAmount = $calcPph ? round($pphBasis * $pphRate) : 0;
        $grandTotal = round($subtotal + $ppn + $pphAmount);

        $picObj = $quotation->pic ?? $quotation->customer?->pics?->firstWhere('is_primary', true) ?? $quotation->customer?->pics?->first();
        $creatorObj = $quotation->sales ?? $quotation->creator ?? null;

        $bankName = $bankAccount?->bank_name ?: ($companyInfo['bank_name'] ?? 'BCA');
        $bankNum = $bankAccount?->account_number ?: ($companyInfo['bank_account_number'] ?? '6044447899');
        $bankHolder = $bankAccount?->account_name ?: ($companyInfo['bank_account_name'] ?? 'PT ALFA CIPTA TEKNOLOGI VIRTUAL');
        $branchText = $bankAccount?->branch ?: ($companyInfo['branch_office'] ?? 'Kantor Cabang Utama Alam Sutera ( Tangerang Selatan )');

        $formatMoney = function($num) {
            return number_format($num, 0, ',', '.');
        };

        // Format Expired
        $expiredText = '-';
        if ($quotation->expired) {
            $daysId = ['Sunday' => 'Minggu', 'Monday' => 'Senin', 'Tuesday' => 'Selasa', 'Wednesday' => 'Rabu', 'Thursday' => 'Kamis', 'Friday' => 'Jumat', 'Saturday' => 'Sabtu'];
            $monthsId = [1 => 'Januari', 2 => 'Februari', 3 => 'Maret', 4 => 'April', 5 => 'Mei', 6 => 'Juni', 7 => 'Juli', 8 => 'Agustus', 9 => 'September', 10 => 'Oktober', 11 => 'November', 12 => 'Desember'];
            $dateObj = \Carbon\Carbon::parse($quotation->expired);
            $dayName = $daysId[$dateObj->format('l')] ?? $dateObj->format('l');
            $monthName = $monthsId[(int)$dateObj->format('n')] ?? $dateObj->format('F');
            $expiredText = 'Expired ' . $dayName . ', ' . $dateObj->format('d') . ' ' . $monthName . ' ' . $dateObj->format('Y');
        }
    @endphp

    <div style="width: 100%; box-sizing: border-box; overflow: hidden;">
        <table class="header-table">
            <tr>
                <td class="header-left">
                    <h1 style="font-size: 20px; font-weight: bold; margin: 0 0 8px 0; color: #000; letter-spacing: 0.5px;">QUOTATION</h1>
                    <div style="font-size: 8.5px; line-height: 1.35; margin-bottom: 10px;">
                        <div style="font-weight: bold;">QUOTATION NO {{ $quotation->id }}</div>
                        <div>{{ $quotation->date ? \Carbon\Carbon::parse($quotation->date)->format('d/m/Y') : date('d/m/Y') }}</div>
                        <div style="color: #ef4444; font-weight: bold;">{{ $expiredText }}</div>
                    </div>
                    <div style="font-size: 8.5px; line-height: 1.35; margin-bottom: 10px;">
                        <div style="font-weight: bold; margin-bottom: 2px;">Kepada :</div>
                        @if($picObj?->name)
                            <div style="font-weight: bold;">{{ $picObj->name }}</div>
                        @endif
                        <div style="font-weight: bold; text-transform: uppercase;">{{ $quotation->customer?->name ?? '—' }}</div>
                        @if($quotation->customer?->address)
                            <div>{{ $quotation->customer->address }}</div>
                        @endif
                        @if($picObj?->phone)
                            <div>Mobile : {{ $picObj->phone }}</div>
                        @endif
                        @if($picObj?->email)
                            <div><a href="mailto:{{ $picObj->email }}" style="color: #2563eb; text-decoration: underline;">{{ $picObj->email }}</a></div>
                        @endif
                    </div>
                    <div style="font-size: 8.5px; line-height: 1.35;">
                        <div style="font-weight: bold; margin-bottom: 2px;">Pengirim :</div>
                        <div style="font-weight: bold;">{{ $creatorObj?->name ?? 'Sales' }}</div>
                        <div style="font-weight: bold; text-transform: uppercase;">{{ $companyInfo['name'] ?? 'PT. ALFA CIPTA TEKNOLOGI VIRTUAL' }} ({{ $companyInfo['brand'] ?? 'ACTIV' }})</div>
                        <div>Mobile : {{ $creatorObj?->mobile ?: '-' }}</div>
                        <div>Office : {{ $companyInfo['phone'] ?? '(021) 50110987' }}</div>
                        <div><a href="mailto:{{ $creatorObj?->email ?: ($companyInfo['email'] ?? 'sales@activ.co.id') }}" style="color: #2563eb; text-decoration: underline;">{{ $creatorObj?->email ?: ($companyInfo['email'] ?? 'sales@activ.co.id') }}</a></div>
                    </div>
                </td>
                <td class="header-right">
                    <div style="width: 250px; margin-left: auto; text-align: left;">
                        @if(!empty($logoBase64))
                            <img src="{{ $logoBase64 }}" alt="{{ $companyInfo['brand'] ?? 'ACTIV' }}" style="max-height: 50px; max-width: 180px; display: block; margin-bottom: 4px; object-fit: contain;" />
                        @endif
                        <div style="font-weight: bold; font-size: 8.5px; margin-bottom: 2px;">{{ $companyInfo['name'] ?? 'PT. ALFA CIPTA TEKNOLOGI VIRTUAL' }}</div>
                        <div style="font-size: 7.5px; line-height: 1.25; color: #333;">{{ $companyInfo['address'] ?? 'Infinity Office, Bellezza BSA 1st Floor Unit 106, Jl. Letjen Soepeno, Kebayoran Lama, Jakarta Selatan 12210' }}</div>
                        @if(!empty($companyInfo['branch']))
                            <div style="font-size: 7.5px; line-height: 1.25; color: #333;">{{ $companyInfo['branch'] }}</div>
                        @endif
                        @if(!empty($companyInfo['branch2']))
                            <div style="font-size: 7.5px; line-height: 1.25; color: #333;">{{ $companyInfo['branch2'] }}</div>
                        @endif
                        <div style="font-size: 7.5px; margin-top: 3px; color: #333;">T : {{ $companyInfo['phone'] ?? '(021) 50110987' }} | E: {{ $creatorObj?->email ?: ($companyInfo['email'] ?? 'sales@activ.co.id') }} | W: {{ $companyInfo['website'] ?? 'www.activ.co.id' }}</div>
                    </div>
                </td>
            </tr>
        </table>

        <div style="font-size: 8px; color: #4b5563; margin-bottom: 3px;">Harga dalam IDR</div>

        <div class="table-container">
            <table class="table-items">
                <thead>
                    <tr>
                        <th style="width: 4%;">NO</th>
                        <th style="width: 11%;">SKU</th>
                        <th style="width: 10%;">NAMA BRAND</th>
                        <th style="width: 47%;">DESKRIPSI PRODUK</th>
                        <th style="width: 4%;">JML</th>
                        <th style="width: 12%;">HARGA</th>
                        <th style="width: 12%;">TOTAL HARGA</th>
                    </tr>
                </thead>
                <tbody>
                    @forelse($items as $idx => $item)
                        @php
                            $prod = $item->product;
                            $productName = $prod?->name ?: ($item->name ?: ($item->product_name ?: '-'));
                            $sku = $prod?->sku ?: ($item->sku ?: '-');
                            $brandName = $item->brand ?: ($prod?->brand?->name ?: ($prod?->brands?->name ?: 'ACTIV'));
                            $desc = $item->description ?: ($prod?->description ?: '');
                            $price = ($item->price ?: 0) * $taxMultiplier;
                            $qty = $item->qty ?: 1;
                            $itemTotal = round($qty * $price);
                        @endphp
                        <tr>
                            <td style="text-align: center; font-size: 9.5px; vertical-align: top;">{{ $idx + 1 }}</td>
                            <td style="text-align: center; font-size: 8.5px; vertical-align: top; word-break: break-all;">{{ $sku }}</td>
                            <td style="text-align: center; font-size: 8.5px; font-style: italic; vertical-align: top;">{{ $brandName }}</td>
                            <td style="font-size: 8.5px; vertical-align: top; text-align: left; line-height: 1.25;">
                                <strong style="font-size: 9.5px; display: block; margin-bottom: 1.5px;">{{ $productName }}</strong>
                                @if($desc)
                                    <div style="color: #333; font-size: 8px; line-height: 1.25; white-space: pre-wrap;">{{ $desc }}</div>
                                @endif
                            </td>
                            <td style="text-align: center; font-size: 9.5px; vertical-align: top;">{{ $qty }}</td>
                            <td style="font-size: 8.5px; vertical-align: top; padding: 4px 5px;">
                                <table style="width: 100%; border: none !important; border-collapse: collapse; margin: 0; padding: 0; background: transparent !important;">
                                    <tr>
                                        <td style="border: none !important; padding: 0; text-align: left; width: 20px;">Rp</td>
                                        <td style="border: none !important; padding: 0; text-align: right;">{{ $formatMoney($price) }}</td>
                                    </tr>
                                </table>
                            </td>
                            <td style="font-size: 8.5px; vertical-align: top; padding: 4px 5px;">
                                <table style="width: 100%; border: none !important; border-collapse: collapse; margin: 0; padding: 0; background: transparent !important;">
                                    <tr>
                                        <td style="border: none !important; padding: 0; text-align: left; width: 20px;">Rp</td>
                                        <td style="border: none !important; padding: 0; text-align: right;">{{ $formatMoney($itemTotal) }}</td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    @empty
                        <tr>
                            <td colspan="7" style="text-align: center; padding: 10px;">Belum ada item produk.</td>
                        </tr>
                    @endforelse
                    <tr style="font-weight: bold;">
                        <td colspan="4" style="border: none !important; background: transparent !important;"></td>
                        <td colspan="2" style="text-align: right; font-size: 8.5px; padding-right: 8px; border-left: 1px solid #6b7280 !important; border-top: 1px solid #6b7280 !important;">TOTAL</td>
                        <td style="font-size: 8.5px; vertical-align: middle; border-top: 1px solid #6b7280 !important; padding: 4px 5px;">
                            <table style="width: 100%; border: none !important; border-collapse: collapse; margin: 0; padding: 0; background: transparent !important;">
                                <tr>
                                    <td style="border: none !important; padding: 0; text-align: left; width: 20px;">Rp</td>
                                    <td style="border: none !important; padding: 0; text-align: right;">{{ $formatMoney($subtotal) }}</td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    @if($calcTax && $showTax)
                        <tr style="font-weight: bold;">
                            <td colspan="4" style="border: none !important; background: transparent !important;"></td>
                            <td colspan="2" style="text-align: right; font-size: 8.5px; padding-right: 8px; border-left: 1px solid #6b7280 !important;">PPN (VAT) 11%</td>
                            <td style="font-size: 8.5px; vertical-align: middle; padding: 4px 5px;">
                                <table style="width: 100%; border: none !important; border-collapse: collapse; margin: 0; padding: 0; background: transparent !important;">
                                    <tr>
                                        <td style="border: none !important; padding: 0; text-align: left; width: 20px;">Rp</td>
                                        <td style="border: none !important; padding: 0; text-align: right;">{{ $formatMoney($ppn) }}</td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    @endif
                    @if($calcPph && $showPph)
                        <tr style="font-weight: bold;">
                            <td colspan="4" style="border: none !important; background: transparent !important;"></td>
                            <td colspan="2" style="text-align: right; font-size: 8.5px; padding-right: 8px; border-left: 1px solid #6b7280 !important;">PPh Pasal 23 {{ number_format($pphRate * 100, 0) }}%</td>
                            <td style="font-size: 8.5px; vertical-align: middle; padding: 4px 5px;">
                                <table style="width: 100%; border: none !important; border-collapse: collapse; margin: 0; padding: 0; background: transparent !important;">
                                    <tr>
                                        <td style="border: none !important; padding: 0; text-align: left; width: 20px;">Rp</td>
                                        <td style="border: none !important; padding: 0; text-align: right;">{{ $formatMoney($pphAmount) }}</td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    @endif
                    <tr style="font-weight: bold;">
                        <td colspan="4" style="border: none !important; background: transparent !important;"></td>
                        <td colspan="2" style="text-align: right; font-size: 8.5px; padding-right: 8px; border-left: 1px solid #6b7280 !important;">GRAND TOTAL</td>
                        <td style="font-size: 8.5px; vertical-align: middle; padding: 4px 5px;">
                            <table style="width: 100%; border: none !important; border-collapse: collapse; margin: 0; padding: 0; background: transparent !important;">
                                <tr>
                                    <td style="border: none !important; padding: 0; text-align: left; width: 20px;">Rp</td>
                                    <td style="border: none !important; padding: 0; text-align: right;">{{ $formatMoney($grandTotal) }}</td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        @php
            $termsList = is_array($quotation->terms) ? $quotation->terms : [];
        @endphp
        <div class="terms" style="margin-top: 10px; page-break-inside: avoid;">
            <div style="font-weight: bold; margin-bottom: 3px;">Syarat & Ketentuan</div>
            <table style="width: 100%; border: none !important; font-size: 8.5px; line-height: 1.35; color: #222; border-collapse: collapse;">
                @foreach($termsList as $tIdx => $term)
                    <tr>
                        <td style="width: 18px; vertical-align: top; font-weight: bold; border: none !important; padding: 1.5px 0;">{{ $tIdx + 1 }}.</td>
                        <td style="vertical-align: top; border: none !important; padding: 1.5px 0;">{{ $term }}</td>
                    </tr>
                @endforeach
                <tr>
                    <td style="width: 18px; vertical-align: top; font-weight: bold; border: none !important; padding: 1.5px 0;">{{ count($termsList) + 1 }}.</td>
                    <td style="vertical-align: top; border: none !important; padding: 1.5px 0;">
                        Nomor Rekening :<br/>
                        <strong>{{ $bankName }} : {{ $bankNum }} - {{ $bankHolder }}<br/>{{ $branchText }}</strong>
                    </td>
                </tr>
            </table>
        </div>

        <table class="signature-table" style="width: 100%; border: none !important; margin-top: 15px; page-break-inside: avoid; border-collapse: collapse;">
            <tr>
                <td style="width: 60%; border: none !important; background: transparent !important;"></td>
                <td style="width: 40%; border: none !important; background: transparent !important; text-align: right; font-size: 8.5px; line-height: 1.25;">
                    <strong>Disetujui oleh :</strong>
                    <div style="height: 35px;"></div>
                    <div style="font-weight: bold;">[ .................... ]</div>
                    <div style="font-size: 7px; color: #666; font-style: italic; margin-top: 2px;">Tanda Tangan & Cap Pelanggan</div>
                </td>
            </tr>
        </table>
    </div>
</body>
</html>
