<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Kata Sandi Akun - Q-Sales</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #334155; line-height: 1.6; margin: 0; padding: 0; background-color: #f1f5f9;">

<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; width: 100%; margin: 0; padding: 30px 0;">
    <tr>
        <td align="center" style="padding: 0 12px;">
            <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
                <!-- Header (Solid Teal + Fallback for Outlook) -->
                <tr>
                    <td bgcolor="#0f766e" style="background-color: #0f766e; background-image: linear-gradient(135deg, #0f766e, #0d9488); color: #ffffff; padding: 28px 32px; border-bottom: 3px solid #0d9488;">
                        <h1 style="margin: 0 0 6px 0; font-size: 22px; font-weight: 700; color: #ffffff; line-height: 1.3;">🔐 Reset Kata Sandi Akun</h1>
                        <p style="margin: 0; font-size: 13px; color: #ccfbf1; opacity: 0.95;">Q-Sales – Sales Portal PT Alfa Cipta Teknologi Virtual</p>
                    </td>
                </tr>

                <!-- Body Content -->
                <tr>
                    <td style="padding: 28px 32px; background-color: #ffffff;">
                        <p style="font-size: 15px; color: #1e293b; margin: 0 0 16px 0;">Halo <strong>{{ $nama }}</strong>,</p>
                        <p style="font-size: 14px; color: #475569; margin: 0 0 20px 0; line-height: 1.6;">
                            Kami menerima permintaan untuk mengatur ulang kata sandi akun Q-Sales Anda. Silakan klik tombol di bawah untuk membuat kata sandi baru:
                        </p>

                        <!-- Key Value Info Box (Table Based for Outlook) -->
                        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; margin: 0 0 20px 0;">
                            <tr>
                                <td style="padding: 16px 20px;">
                                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                                        <tr>
                                            <td width="160" valign="top" style="font-size: 13px; font-weight: 600; color: #475569; padding: 5px 0;">Jenis Permintaan</td>
                                            <td valign="top" style="font-size: 13px; color: #0f172a; font-weight: 700; padding: 5px 0;">Reset Kata Sandi Pengguna</td>
                                        </tr>
                                        <tr>
                                            <td width="160" valign="top" style="font-size: 13px; font-weight: 600; color: #475569; padding: 5px 0;">Masa Berlaku</td>
                                            <td valign="top" style="padding: 5px 0;">
                                                <span style="display: inline-block; background-color: #dcfce7; color: #15803d; border-radius: 4px; padding: 2px 10px; font-size: 12px; font-weight: 700; border: 1px solid #86efac;">⏱️ {{ $expire }} Menit</span>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                        </table>

                        <!-- Warning / Notice Note -->
                        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; margin: 0 0 24px 0;">
                            <tr>
                                <td style="padding: 12px 16px; font-size: 13px; color: #92400e; line-height: 1.5;">
                                    ⚠️ <strong>Perhatian:</strong> Jika Anda tidak merasa meminta reset kata sandi, abaikan email ini dengan aman. Kata sandi akun Anda tidak akan berubah tanpa tindakan dari Anda.
                                </td>
                            </tr>
                        </table>

                        <!-- Bulletproof Button (Outlook Table VML compatible) -->
                        <table role="presentation" border="0" cellspacing="0" cellpadding="0" style="margin: 0 0 24px 0;">
                            <tr>
                                <td align="center" bgcolor="#0f766e" style="border-radius: 8px; background-color: #0f766e;">
                                    <a href="{{ $url }}" target="_blank" style="display: inline-block; padding: 13px 28px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; font-weight: 700; color: #ffffff !important; text-decoration: none !important; border-radius: 8px; background-color: #0f766e; border: 1px solid #0f766e;">
                                        Reset Kata Sandi Sekarang &rarr;
                                    </a>
                                </td>
                            </tr>
                        </table>

                        <!-- Fallback URL Link -->
                        <div style="font-size: 12px; color: #94a3b8; word-break: break-all; margin-top: 16px; line-height: 1.5; border-top: 1px solid #f1f5f9; padding-top: 16px;">
                            Jika tombol di atas tidak dapat diklik, salin dan tempel URL berikut ke browser Anda:<br>
                            <a href="{{ $url }}" style="color: #0f766e; text-decoration: underline;">{{ $url }}</a>
                        </div>
                    </td>
                </tr>

                <!-- Footer -->
                <tr>
                    <td style="background-color: #f8fafc; padding: 18px 32px; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; text-align: center; line-height: 1.5;">
                        Email ini dikirim otomatis oleh sistem Q-Sales. Jangan balas email ini.<br>
                        <strong>PT Alfa Cipta Teknologi Virtual</strong>
                    </td>
                </tr>
            </table>
        </td>
    </tr>
</table>

</body>
</html>
