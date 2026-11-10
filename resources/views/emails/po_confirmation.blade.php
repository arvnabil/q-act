<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Notifikasi PO Baru</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; background-color: #f8fafc; margin: 0; padding: 24px; }
        .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
        .header { background: #0f172a; color: #ffffff; padding: 24px; text-align: left; }
        .header h1 { margin: 0 0 6px 0; font-size: 20px; font-weight: 600; color: #38bdf8; }
        .header p { margin: 0; font-size: 13px; color: #94a3b8; }
        .body { padding: 24px; font-size: 14px; line-height: 1.6; }
        .table { width: 100%; border-collapse: collapse; margin: 16px 0; }
        .table td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
        .table td.label { font-weight: 600; color: #64748b; width: 35%; }
        .table td.value { color: #0f172a; }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
        .badge-success { background: #dcfce7; color: #166534; }
        .badge-warning { background: #fef3c7; color: #92400e; }
        .btn-group { margin: 24px 0 12px 0; display: block; }
        .btn { display: inline-block; padding: 10px 18px; border-radius: 6px; font-size: 13px; font-weight: 600; text-decoration: none; margin-right: 8px; margin-bottom: 8px; }
        .btn-primary { background: #0284c7; color: #ffffff !important; }
        .btn-secondary { background: #f1f5f9; color: #334155 !important; border: 1px solid #cbd5e1; }
        .footer { padding: 16px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; text-align: center; }
    </style>
</head>
<body>
    <div class="card">
        <div class="header">
            <h1>Purchase Order Diterima</h1>
            <p>QSales Notification System — PT ALFA CIPTA TEKNOLOGI VIRTUAL</p>
        </div>
        <div class="body">
            <p>Halo Tim Finance & Manajemen,</p>
            <p>Purchase Order (PO) pelanggan baru telah berhasil dicatat ke dalam sistem QSales:</p>

            <table class="table">
                <tr>
                    <td class="label">Pelanggan</td>
                    <td class="value"><strong>{{ $customerName }}</strong></td>
                </tr>
                <tr>
                    <td class="label">No. PO Pelanggan</td>
                    <td class="value"><strong>{{ $poNumber }}</strong></td>
                </tr>
                <tr>
                    <td class="label">Tanggal PO</td>
                    <td class="value">{{ $poDate }}</td>
                </tr>
                <tr>
                    <td class="label">No. Quotation</td>
                    <td class="value">{{ $quotationId }}</td>
                </tr>
                <tr>
                    <td class="label">Sales Representative</td>
                    <td class="value">{{ $salesName }}</td>
                </tr>
                @if(!empty($leadCode))
                <tr>
                    <td class="label">Lead Terkait</td>
                    <td class="value">{{ $leadCode }}</td>
                </tr>
                @endif
                <tr>
                    <td class="label">Total Nilai</td>
                    <td class="value" style="color: #0369a1; font-weight: 700; font-size: 15px;">Rp {{ number_format($grandTotal, 0, ',', '.') }}</td>
                </tr>
                <tr>
                    <td class="label">Status SharePoint</td>
                    <td class="value">
                        @if($sharePointUrl)
                            <span class="badge badge-success">✓ Tersinkronisasi ke SharePoint</span>
                        @else
                            <span class="badge badge-warning">⚠ Belum Tersinkronisasi / Akses Lokal</span>
                        @endif
                    </td>
                </tr>
            </table>

            <div class="btn-group">
                @if($sharePointUrl)
                    <a href="{{ $sharePointUrl }}" class="btn btn-primary" target="_blank">Buka Dokumen di SharePoint &rarr;</a>
                @endif
                <a href="{{ $qsalesUrl }}" class="btn btn-secondary" target="_blank">Lihat Detail Quotation di QSales</a>
            </div>

            @if(!$sharePointUrl)
            <p style="font-size: 12px; color: #94a3b8; margin-top: 16px;">
                <em>Catatan: Dokumen PO dapat diunduh langsung melalui tautan sistem QSales di atas.</em>
            </p>
            @endif
        </div>
        <div class="footer">
            Email ini dikirim secara otomatis oleh QSales CRM. Harap tidak membalas langsung ke alamat ini.
        </div>
    </div>
</body>
</html>
