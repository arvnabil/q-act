<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: Arial, sans-serif; color: #333; line-height: 1.6; margin: 0; padding: 0; background: #f5f5f5; }
        .container { max-width: 600px; margin: 30px auto; background: #fff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
        .header { background: linear-gradient(135deg, #b91c1c, #dc2626); color: #fff; padding: 28px 32px; }
        .header h1 { margin: 0 0 4px; font-size: 20px; }
        .header p { margin: 0; font-size: 13px; opacity: 0.9; }
        .body { padding: 28px 32px; }
        .greeting { font-size: 15px; margin-bottom: 16px; }
        .alert-box { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 18px 20px; margin-bottom: 20px; }
        .info-row { display: flex; margin-bottom: 10px; gap: 8px; }
        .info-row:last-child { margin-bottom: 0; }
        .info-label { font-weight: 600; min-width: 170px; color: #555; font-size: 13px; flex-shrink: 0; }
        .info-value { color: #111; font-size: 13px; }
        .badge-red { display: inline-block; background: #fee2e2; color: #991b1b; border-radius: 4px; padding: 2px 10px; font-size: 12px; font-weight: 700; border: 1px solid #f87171; }
        .badge-yellow { display: inline-block; background: #fef3c7; color: #92400e; border-radius: 4px; padding: 2px 10px; font-size: 12px; font-weight: 700; border: 1px solid #fcd34d; }
        .btn { display: inline-block; background: #b91c1c; color: #fff !important; padding: 11px 26px; border-radius: 7px; text-decoration: none; font-weight: 700; font-size: 14px; margin-top: 4px; }
        .footer { background: #f9fafb; padding: 16px 32px; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb; text-align: center; }
    </style>
</head>
<body>
<div class="container">
    <div class="header">
        <h1>⚠️ Koreksi / Pembatalan Konfirmasi Terbayar</h1>
        <p>Q-Sales – Sales Portal PT Alfa Cipta Teknologi Virtual</p>
    </div>
    <div class="body">
        <p class="greeting">Halo Tim Finance,</p>
        <p>Mohon perhatian bahwa status <strong>Selesai (Terbayar)</strong> pada lead berikut telah <strong>dibatalkan / direvisi</strong> ke stage sebelumnya.</p>

        <div class="alert-box">
            <div class="info-row">
                <span class="info-label">Nama Lead / Proyek</span>
                <span class="info-value"><strong>{{ $lead->title ?? '-' }}</strong></span>
            </div>
            <div class="info-row">
                <span class="info-label">Customer</span>
                <span class="info-value">{{ $lead->customer->name ?? '-' }}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Sales PIC</span>
                <span class="info-value">{{ $lead->sales->name ?? '-' }}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Dibatalkan oleh</span>
                <span class="info-value">{{ $revertedBy->name }} <span style="color:#6b7280">({{ $revertedBy->role }})</span></span>
            </div>
            <div class="info-row">
                <span class="info-label">Waktu Pembatalan</span>
                <span class="info-value">{{ now()->locale('id')->isoFormat('D MMMM YYYY, HH:mm') }} WIB</span>
            </div>
            <div class="info-row">
                <span class="info-label">Perubahan Stage</span>
                <span class="info-value"><span class="badge-red">Batal Terbayar</span> &rarr; <span class="badge-yellow">{{ $newStage }}</span></span>
            </div>
        </div>

        <p style="font-size: 13px; color: #4b5563;">
            Mohon <strong>tunda atau sesuaikan</strong> pencatatan administrasi keuangan / invoice terkait lead ini hingga ada konfirmasi pembayaran kembali dari tim sales.
        </p>

        <a class="btn" href="{{ url('/leads') }}">Buka Lead Pipeline →</a>
    </div>
    <div class="footer">
        Email ini dikirim otomatis oleh sistem Q-Sales sebagai koreksi email sebelumnya.<br>
        PT Alfa Cipta Teknologi Virtual
    </div>
</div>
</body>
</html>
