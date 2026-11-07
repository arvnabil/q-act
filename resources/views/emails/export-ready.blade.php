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
        .note { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px 16px; font-size: 13px; color: #475569; margin-bottom: 20px; }
        .btn { display: inline-block; background: #0f766e; color: #fff !important; padding: 11px 26px; border-radius: 7px; text-decoration: none; font-weight: 700; font-size: 14px; margin-top: 4px; }
        .footer { background: #f9fafb; padding: 16px 32px; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb; text-align: center; }
    </style>
</head>
<body>
<div class="container">
    <div class="header">
        <h1>📦 Berkas Ekspor Siap Diunduh</h1>
        <p>Q-Sales – Sales Portal PT Alfa Cipta Teknologi Virtual</p>
    </div>
    <div class="body">
        <p class="greeting">Halo <strong>{{ $recipient->name }}</strong>,</p>
        <p>Permintaan ekspor data Anda di portal penjualan ACTiV telah <strong>selesai diproses</strong> dan berkas zip siap untuk diunduh.</p>

        <div class="info-box">
            <div class="info-row">
                <span class="info-label">Judul Permintaan</span>
                <span class="info-value"><strong>{{ $exportJob->title }}</strong></span>
            </div>
            <div class="info-row">
                <span class="info-label">Total Data Sales Order</span>
                <span class="info-value">{{ $exportJob->total_items }} Dokumen SO</span>
            </div>
            <div class="info-row">
                <span class="info-label">Nama Berkas</span>
                <span class="info-value font-mono">{{ $exportJob->file_name }}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Ukuran Berkas</span>
                <span class="info-value">{{ $exportJob->formatted_file_size }}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Status Ekspor</span>
                <span class="info-value"><span class="badge">✅ Selesai (Ready)</span></span>
            </div>
            <div class="info-row">
                <span class="info-label">Masa Berlaku Tautan</span>
                <span class="info-value">{{ $exportJob->expires_at ? $exportJob->expires_at->locale('id')->isoFormat('D MMMM YYYY') : '7 hari' }}</span>
            </div>
        </div>

        <div class="note">
            💡 <strong>Informasi Unduhan:</strong><br>
            • Berkas zip dapat diunduh langsung melalui tombol di bawah atau melalui menu <strong>Download Center</strong> di portal ACTiV.<br>
            • Jika ukuran file di bawah 15 MB, berkas zip juga telah dilampirkan langsung pada email ini.
        </div>

        <a class="btn" href="{{ $downloadUrl }}">⬇️ Unduh Berkas ZIP Sekarang</a>
    </div>
    <div class="footer">
        Email ini dikirim otomatis oleh sistem Q-Sales. Jangan balas email ini.<br>
        PT Alfa Cipta Teknologi Virtual
    </div>
</div>
</body>
</html>
