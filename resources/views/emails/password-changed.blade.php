<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Kata Sandi Akun Berhasil Diubah</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; background-color: #f8fafc; margin: 0; padding: 24px; }
        .card { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
        .header { background: #0f172a; color: #ffffff; padding: 24px; text-align: left; }
        .header h1 { margin: 0 0 6px 0; font-size: 18px; font-weight: 700; color: #38bdf8; }
        .header p { margin: 0; font-size: 12px; color: #94a3b8; }
        .body { padding: 28px; font-size: 14px; line-height: 1.6; }
        .table { width: 100%; border-collapse: collapse; margin: 18px 0; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; }
        .table td { padding: 10px 14px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
        .table tr:last-child td { border-bottom: none; }
        .table td.label { font-weight: 600; color: #64748b; width: 35%; }
        .table td.value { color: #0f172a; }
        .alert-box { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 14px; margin: 20px 0; color: #991b1b; font-size: 13px; line-height: 1.5; }
        .footer { padding: 18px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; text-align: center; }
    </style>
</head>
<body>
    <div class="card">
        <div class="header">
            <h1>Pemberitahuan Keamanan Akun</h1>
            <p>QSales Notification System — PT ALFA CIPTA TEKNOLOGI VIRTUAL</p>
        </div>
        <div class="body">
            <p>Halo <strong>{{ $user->name }}</strong>,</p>
            <p>Kata sandi untuk akun QSales Anda (<strong>{{ $user->email }}</strong>) baru saja berhasil diubah.</p>

            <table class="table">
                <tr>
                    <td class="label">Nama Akun</td>
                    <td class="value"><strong>{{ $user->name }}</strong> ({{ $user->role ?? 'User' }})</td>
                </tr>
                <tr>
                    <td class="label">Email</td>
                    <td class="value">{{ $user->email }}</td>
                </tr>
                <tr>
                    <td class="label">Waktu Perubahan</td>
                    <td class="value">{{ $changedAt }}</td>
                </tr>
                <tr>
                    <td class="label">Alamat IP</td>
                    <td class="value"><code>{{ $ipAddress }}</code></td>
                </tr>
            </table>

            <div class="alert-box">
                <strong>Bukan Anda yang melakukan perubahan ini?</strong><br>
                Jika Anda merasa tidak mengubah kata sandi akun Anda, harap segera hubungi Administrator Sistem atau reset kembali kata sandi Anda untuk mengamankan akun.
            </div>
        </div>
        <div class="footer">
            Email ini dibuat dan dikirim secara otomatis oleh sistem keamanan QSales.<br>
            Harap jangan membalas email ini secara langsung.
        </div>
    </div>
</body>
</html>
