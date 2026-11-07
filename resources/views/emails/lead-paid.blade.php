<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: Arial, sans-serif; color: #333; line-height: 1.6; margin: 0; padding: 0; background: #f5f5f5; }
        .container { max-width: 600px; margin: 30px auto; background: #fff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
        .header { background: linear-gradient(135deg, #0f766e, #0d9488); color: #fff; padding: 28px 32px; }
        .header h1 { margin: 0 0 4px; font-size: 22px; }
        .header p { margin: 0; font-size: 13px; opacity: 0.85; }
        .body { padding: 28px 32px; }
        .greeting { font-size: 15px; margin-bottom: 16px; }
        .info-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 18px 20px; margin-bottom: 20px; }
        .info-row { display: flex; margin-bottom: 10px; gap: 8px; }
        .info-row:last-child { margin-bottom: 0; }
        .info-label { font-weight: 600; min-width: 170px; color: #555; font-size: 13px; flex-shrink: 0; }
        .info-value { color: #111; font-size: 13px; }
        .badge { display: inline-block; background: #dcfce7; color: #15803d; border-radius: 4px; padding: 2px 10px; font-size: 12px; font-weight: 700; border: 1px solid #86efac; }
        .note { background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 12px 16px; font-size: 13px; color: #92400e; margin-bottom: 20px; }
        .btn { display: inline-block; background: #0f766e; color: #fff !important; padding: 11px 26px; border-radius: 7px; text-decoration: none; font-weight: 700; font-size: 14px; margin-top: 4px; }
        .footer { background: #f9fafb; padding: 16px 32px; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb; text-align: center; }
    </style>
</head>
<body>
<div class="container">
    <div class="header">
        <h1>🎉 Konfirmasi Terbayar</h1>
        <p>Q-Sales – Sales Portal PT Alfa Cipta Teknologi Virtual</p>
    </div>
    <div class="body">
        <p class="greeting">Halo Tim Finance,</p>
        <p>Sebuah lead telah <strong>dikonfirmasi sebagai Selesai (Terbayar)</strong> oleh tim sales. Mohon tindak lanjut proses administrasi keuangan yang diperlukan.</p>

        <div class="info-box">
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
                <span class="info-value">{{ $lead->sales->name ?? $confirmedBy->name }}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Dikonfirmasi oleh</span>
                <span class="info-value">{{ $confirmedBy->name }} <span style="color:#6b7280">({{ $confirmedBy->role }})</span></span>
            </div>
            <div class="info-row">
                <span class="info-label">Tanggal Konfirmasi</span>
                <span class="info-value">{{ now()->locale('id')->isoFormat('D MMMM YYYY, HH:mm') }} WIB</span>
            </div>
            <div class="info-row">
                <span class="info-label">Status Lead</span>
                <span class="info-value"><span class="badge">✅ Selesai (Terbayar)</span></span>
            </div>
        </div>

        <div class="note">
            ⚠️ Jika terdapat kesalahan konfirmasi, hubungi Sales Manager atau Administrator untuk melakukan pembatalan.
        </div>

        <a class="btn" href="{{ url('/leads') }}">Buka Lead Pipeline →</a>
    </div>
    <div class="footer">
        Email ini dikirim otomatis oleh sistem Q-Sales. Jangan balas email ini.<br>
        PT Alfa Cipta Teknologi Virtual
    </div>
</div>
</body>
</html>
