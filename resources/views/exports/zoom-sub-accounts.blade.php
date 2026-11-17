<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <style>
        @page { size: A3 landscape; margin: 22px 24px; }
        body { font-family: DejaVu Sans, sans-serif; color: #0f172a; font-size: 8px; }
        h1 { margin: 0 0 4px; font-size: 18px; }
        .muted { color: #64748b; }
        .summary { margin: 12px 0; padding: 9px 11px; background: #f1f5f9; border: 1px solid #cbd5e1; }
        .summary strong { margin-right: 20px; }
        table { width: 100%; border-collapse: collapse; table-layout: fixed; }
        th { padding: 6px 4px; background: #0f766e; color: #fff; text-align: left; font-size: 7px; }
        td { padding: 5px 4px; border-bottom: 1px solid #e2e8f0; vertical-align: top; overflow-wrap: anywhere; }
        tbody tr:nth-child(even) { background: #f8fafc; }
        thead { display: table-header-group; }
        tr { page-break-inside: avoid; }
        .number { text-align: right; }
        .footer { margin-top: 10px; text-align: right; color: #64748b; font-size: 7px; }
    </style>
</head>
<body>
    <h1>Laporan Zoom Sub Account</h1>
    <div class="muted">Dibuat {{ $report['generated_at'] }} · Filter: {{ $report['filter_label'] }}</div>
    <div class="summary">
        <strong>Total akun: {{ number_format($report['total'], 0, ',', '.') }}</strong>
        <strong>Total license: {{ number_format($report['total_seats'], 0, ',', '.') }}</strong>
        <strong>Customer terkait: {{ number_format($report['matched'], 0, ',', '.') }}</strong>
        <strong>Belum ditautkan: {{ number_format($report['unmatched'], 0, ',', '.') }}</strong>
    </div>
    <table>
        <thead>
        <tr>
            <th style="width: 2%">No.</th>
            <th style="width: 10%">Nama Akun</th>
            <th style="width: 6%">ZAN</th>
            <th style="width: 10%">Zoom Account ID</th>
            <th style="width: 6%">Tipe</th>
            <th style="width: 3%">Seats</th>
            <th style="width: 10%">Account Owner</th>
            <th style="width: 7%">Creation Time</th>
            <th style="width: 7%">Service Effective</th>
            <th style="width: 7%">Subscription End</th>
            <th style="width: 7%">Who Will Pay</th>
            <th style="width: 4%">Auto Renew</th>
            <th style="width: 9%">Customer QSales</th>
            <th style="width: 8%">Sales PIC Renewal</th>
            <th style="width: 4%">Status Sync</th>
        </tr>
        </thead>
        <tbody>
        @forelse ($rows as $index => $row)
            <tr>
                <td>{{ $index + 1 }}</td>
                @foreach ($row as $value)
                    <td>{{ $value }}</td>
                @endforeach
            </tr>
        @empty
            <tr><td colspan="15" style="text-align:center;padding:20px">Tidak ada akun yang sesuai dengan filter.</td></tr>
        @endforelse
        </tbody>
    </table>
    <div class="footer">QSales · Laporan sinkronisasi sub-account Zoom</div>
</body>
</html>
