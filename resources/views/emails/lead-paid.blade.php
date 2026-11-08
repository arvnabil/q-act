<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Konfirmasi Terbayar - Q-Sales</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #334155; line-height: 1.6; margin: 0; padding: 0; background-color: #f1f5f9;">

<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; width: 100%; margin: 0; padding: 30px 0;">
    <tr>
        <td align="center" style="padding: 0 12px;">
            <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
                <!-- Header (Solid Teal + Fallback for Outlook) -->
                <tr>
                    <td bgcolor="#0f766e" style="background-color: #0f766e; background-image: linear-gradient(135deg, #0f766e, #0d9488); color: #ffffff; padding: 28px 32px; border-bottom: 3px solid #0d9488;">
                        <h1 style="margin: 0 0 6px 0; font-size: 22px; font-weight: 700; color: #ffffff; line-height: 1.3;">🎉 Konfirmasi Terbayar</h1>
                        <p style="margin: 0; font-size: 13px; color: #ccfbf1; opacity: 0.95;">Q-Sales – Sales Portal PT Alfa Cipta Teknologi Virtual</p>
                    </td>
                </tr>

                <!-- Body Content -->
                <tr>
                    <td style="padding: 28px 32px; background-color: #ffffff;">
                        <p style="font-size: 15px; color: #1e293b; margin: 0 0 16px 0;">Halo <strong>Tim Finance</strong>,</p>
                        <p style="font-size: 14px; color: #475569; margin: 0 0 20px 0; line-height: 1.6;">
                            Sebuah lead telah <strong>dikonfirmasi sebagai Selesai (Terbayar)</strong> oleh tim sales. Mohon tindak lanjut proses administrasi keuangan yang diperlukan.
                        </p>

                        <!-- Key Value Info Box (Table Based for Outlook) -->
                        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; margin: 0 0 20px 0;">
                            <tr>
                                <td style="padding: 16px 20px;">
                                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                                        <tr>
                                            <td width="160" valign="top" style="font-size: 13px; font-weight: 600; color: #475569; padding: 5px 0;">Nama Lead / Proyek</td>
                                            <td valign="top" style="font-size: 13px; color: #0f172a; font-weight: 700; padding: 5px 0;">{{ $lead->title ?? '-' }}</td>
                                        </tr>
                                        <tr>
                                            <td width="160" valign="top" style="font-size: 13px; font-weight: 600; color: #475569; padding: 5px 0;">Customer</td>
                                            <td valign="top" style="font-size: 13px; color: #0f172a; padding: 5px 0;">{{ $lead->customer->name ?? '-' }}</td>
                                        </tr>
                                        <tr>
                                            <td width="160" valign="top" style="font-size: 13px; font-weight: 600; color: #475569; padding: 5px 0;">Sales PIC</td>
                                            <td valign="top" style="font-size: 13px; color: #0f172a; padding: 5px 0;">{{ $lead->sales->name ?? $confirmedBy->name }}</td>
                                        </tr>
                                        <tr>
                                            <td width="160" valign="top" style="font-size: 13px; font-weight: 600; color: #475569; padding: 5px 0;">Dikonfirmasi oleh</td>
                                            <td valign="top" style="font-size: 13px; color: #0f172a; padding: 5px 0;">{{ $confirmedBy->name }} <span style="color:#64748b;">({{ $confirmedBy->role }})</span></td>
                                        </tr>
                                        <tr>
                                            <td width="160" valign="top" style="font-size: 13px; font-weight: 600; color: #475569; padding: 5px 0;">Tanggal Konfirmasi</td>
                                            <td valign="top" style="font-size: 13px; color: #0f172a; padding: 5px 0;">{{ now()->locale('id')->isoFormat('D MMMM YYYY, HH:mm') }} WIB</td>
                                        </tr>
                                        <tr>
                                            <td width="160" valign="top" style="font-size: 13px; font-weight: 600; color: #475569; padding: 5px 0;">Status Lead</td>
                                            <td valign="top" style="padding: 5px 0;">
                                                <span style="display: inline-block; background-color: #dcfce7; color: #15803d; border-radius: 4px; padding: 2px 10px; font-size: 12px; font-weight: 700; border: 1px solid #86efac;">✅ Selesai (Terbayar)</span>
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
                                    ⚠️ <strong>Catatan:</strong> Jika terdapat kesalahan konfirmasi, hubungi Sales Manager atau Administrator untuk melakukan pembatalan.
                                </td>
                            </tr>
                        </table>

                        <!-- Bulletproof Button -->
                        <table role="presentation" border="0" cellspacing="0" cellpadding="0" style="margin: 0 0 10px 0;">
                            <tr>
                                <td align="center" bgcolor="#0f766e" style="border-radius: 8px; background-color: #0f766e;">
                                    <a href="{{ url('/leads') }}" target="_blank" style="display: inline-block; padding: 13px 28px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; font-weight: 700; color: #ffffff !important; text-decoration: none !important; border-radius: 8px; background-color: #0f766e; border: 1px solid #0f766e;">
                                        Buka Lead Pipeline &rarr;
                                    </a>
                                </td>
                            </tr>
                        </table>
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
