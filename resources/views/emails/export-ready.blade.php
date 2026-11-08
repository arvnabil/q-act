<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Berkas Ekspor Siap Diunduh - Q-Sales</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #334155; line-height: 1.6; margin: 0; padding: 0; background-color: #f1f5f9;">

<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; width: 100%; margin: 0; padding: 30px 0;">
    <tr>
        <td align="center" style="padding: 0 12px;">
            <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
                <!-- Header (Solid Teal + Fallback for Outlook) -->
                <tr>
                    <td bgcolor="#0f766e" style="background-color: #0f766e; background-image: linear-gradient(135deg, #0f766e, #0d9488); color: #ffffff; padding: 28px 32px; border-bottom: 3px solid #0d9488;">
                        <h1 style="margin: 0 0 6px 0; font-size: 22px; font-weight: 700; color: #ffffff; line-height: 1.3;">📦 Berkas Ekspor Siap Diunduh</h1>
                        <p style="margin: 0; font-size: 13px; color: #ccfbf1; opacity: 0.95;">Q-Sales – Sales Portal PT Alfa Cipta Teknologi Virtual</p>
                    </td>
                </tr>

                <!-- Body Content -->
                <tr>
                    <td style="padding: 28px 32px; background-color: #ffffff;">
                        <p style="font-size: 15px; color: #1e293b; margin: 0 0 16px 0;">Halo <strong>{{ $recipient->name }}</strong>,</p>
                        <p style="font-size: 14px; color: #475569; margin: 0 0 20px 0; line-height: 1.6;">
                            Permintaan ekspor data Anda di portal penjualan ACTiV telah <strong>selesai diproses</strong> dan berkas zip siap untuk diunduh.
                        </p>

                        <!-- Key Value Info Box (Table Based for Outlook) -->
                        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; margin: 0 0 20px 0;">
                            <tr>
                                <td style="padding: 16px 20px;">
                                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                                        <tr>
                                            <td width="160" valign="top" style="font-size: 13px; font-weight: 600; color: #475569; padding: 5px 0;">Judul Permintaan</td>
                                            <td valign="top" style="font-size: 13px; color: #0f172a; font-weight: 700; padding: 5px 0;">{{ $exportJob->title }}</td>
                                        </tr>
                                        <tr>
                                            <td width="160" valign="top" style="font-size: 13px; font-weight: 600; color: #475569; padding: 5px 0;">Total Data Sales Order</td>
                                            <td valign="top" style="font-size: 13px; color: #0f172a; padding: 5px 0;">{{ $exportJob->total_items }} Dokumen SO</td>
                                        </tr>
                                        <tr>
                                            <td width="160" valign="top" style="font-size: 13px; font-weight: 600; color: #475569; padding: 5px 0;">Nama Berkas</td>
                                            <td valign="top" style="font-size: 13px; color: #0f172a; font-family: monospace; padding: 5px 0;">{{ $exportJob->file_name }}</td>
                                        </tr>
                                        <tr>
                                            <td width="160" valign="top" style="font-size: 13px; font-weight: 600; color: #475569; padding: 5px 0;">Ukuran Berkas</td>
                                            <td valign="top" style="font-size: 13px; color: #0f172a; padding: 5px 0;">{{ $exportJob->formatted_file_size }}</td>
                                        </tr>
                                        <tr>
                                            <td width="160" valign="top" style="font-size: 13px; font-weight: 600; color: #475569; padding: 5px 0;">Status Ekspor</td>
                                            <td valign="top" style="padding: 5px 0;">
                                                <span style="display: inline-block; background-color: #dcfce7; color: #15803d; border-radius: 4px; padding: 2px 10px; font-size: 12px; font-weight: 700; border: 1px solid #86efac;">✅ Selesai (Ready)</span>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td width="160" valign="top" style="font-size: 13px; font-weight: 600; color: #475569; padding: 5px 0;">Masa Berlaku Tautan</td>
                                            <td valign="top" style="font-size: 13px; color: #0f172a; padding: 5px 0;">{{ $exportJob->expires_at ? $exportJob->expires_at->locale('id')->isoFormat('D MMMM YYYY') : '7 hari' }}</td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                        </table>

                        <!-- Information Note -->
                        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; margin: 0 0 24px 0;">
                            <tr>
                                <td style="padding: 12px 16px; font-size: 13px; color: #475569; line-height: 1.6;">
                                    💡 <strong>Informasi Unduhan:</strong><br>
                                    • Berkas zip dapat diunduh langsung melalui tombol di bawah atau melalui menu <strong>Download Center</strong> di portal ACTiV.<br>
                                    • Jika ukuran file di bawah 15 MB, berkas zip juga telah dilampirkan langsung pada email ini.
                                </td>
                            </tr>
                        </table>

                        <!-- Bulletproof Button -->
                        <table role="presentation" border="0" cellspacing="0" cellpadding="0" style="margin: 0 0 10px 0;">
                            <tr>
                                <td align="center" bgcolor="#0f766e" style="border-radius: 8px; background-color: #0f766e;">
                                    <a href="{{ $downloadUrl }}" target="_blank" style="display: inline-block; padding: 13px 28px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; font-weight: 700; color: #ffffff !important; text-decoration: none !important; border-radius: 8px; background-color: #0f766e; border: 1px solid #0f766e;">
                                        ⬇️ Unduh Berkas ZIP Sekarang &rarr;
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
