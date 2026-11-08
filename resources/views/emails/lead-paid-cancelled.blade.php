<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Koreksi Pembatalan Konfirmasi Terbayar - Q-Sales</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #334155; line-height: 1.6; margin: 0; padding: 0; background-color: #f1f5f9;">

<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; width: 100%; margin: 0; padding: 30px 0;">
    <tr>
        <td align="center" style="padding: 0 12px;">
            <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
                <!-- Header (Solid Crimson Red + Fallback for Outlook) -->
                <tr>
                    <td bgcolor="#b91c1c" style="background-color: #b91c1c; background-image: linear-gradient(135deg, #b91c1c, #dc2626); color: #ffffff; padding: 28px 32px; border-bottom: 3px solid #dc2626;">
                        <h1 style="margin: 0 0 6px 0; font-size: 21px; font-weight: 700; color: #ffffff; line-height: 1.3;">⚠️ Koreksi / Pembatalan Konfirmasi Terbayar</h1>
                        <p style="margin: 0; font-size: 13px; color: #fee2e2; opacity: 0.95;">Q-Sales – Sales Portal PT Alfa Cipta Teknologi Virtual</p>
                    </td>
                </tr>

                <!-- Body Content -->
                <tr>
                    <td style="padding: 28px 32px; background-color: #ffffff;">
                        <p style="font-size: 15px; color: #1e293b; margin: 0 0 16px 0;">Halo <strong>Tim Finance</strong>,</p>
                        <p style="font-size: 14px; color: #475569; margin: 0 0 20px 0; line-height: 1.6;">
                            Mohon perhatian bahwa status <strong>Selesai (Terbayar)</strong> pada lead berikut telah <strong>dibatalkan / direvisi</strong> ke stage sebelumnya.
                        </p>

                        <!-- Key Value Info Box (Table Based for Outlook) -->
                        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; margin: 0 0 20px 0;">
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
                                            <td valign="top" style="font-size: 13px; color: #0f172a; padding: 5px 0;">{{ $lead->sales->name ?? '-' }}</td>
                                        </tr>
                                        <tr>
                                            <td width="160" valign="top" style="font-size: 13px; font-weight: 600; color: #475569; padding: 5px 0;">Dibatalkan oleh</td>
                                            <td valign="top" style="font-size: 13px; color: #0f172a; padding: 5px 0;">{{ $revertedBy->name }} <span style="color:#64748b;">({{ $revertedBy->role }})</span></td>
                                        </tr>
                                        <tr>
                                            <td width="160" valign="top" style="font-size: 13px; font-weight: 600; color: #475569; padding: 5px 0;">Waktu Pembatalan</td>
                                            <td valign="top" style="font-size: 13px; color: #0f172a; padding: 5px 0;">{{ now()->locale('id')->isoFormat('D MMMM YYYY, HH:mm') }} WIB</td>
                                        </tr>
                                        <tr>
                                            <td width="160" valign="top" style="font-size: 13px; font-weight: 600; color: #475569; padding: 5px 0;">Perubahan Stage</td>
                                            <td valign="top" style="padding: 5px 0;">
                                                <span style="display: inline-block; background-color: #fee2e2; color: #991b1b; border-radius: 4px; padding: 2px 10px; font-size: 12px; font-weight: 700; border: 1px solid #f87171;">Batal Terbayar</span>
                                                &rarr;
                                                <span style="display: inline-block; background-color: #fef3c7; color: #92400e; border-radius: 4px; padding: 2px 10px; font-size: 12px; font-weight: 700; border: 1px solid #fcd34d;">{{ $newStage }}</span>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                        </table>

                        <p style="font-size: 13px; color: #475569; margin: 0 0 24px 0; line-height: 1.6;">
                            Mohon <strong>tunda atau sesuaikan</strong> pencatatan administrasi keuangan / invoice terkait lead ini hingga ada konfirmasi pembayaran kembali dari tim sales.
                        </p>

                        <!-- Bulletproof Button -->
                        <table role="presentation" border="0" cellspacing="0" cellpadding="0" style="margin: 0 0 10px 0;">
                            <tr>
                                <td align="center" bgcolor="#b91c1c" style="border-radius: 8px; background-color: #b91c1c;">
                                    <a href="{{ url('/leads') }}" target="_blank" style="display: inline-block; padding: 13px 28px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; font-weight: 700; color: #ffffff !important; text-decoration: none !important; border-radius: 8px; background-color: #b91c1c; border: 1px solid #b91c1c;">
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
                        Email ini dikirim otomatis oleh sistem Q-Sales sebagai koreksi email sebelumnya.<br>
                        <strong>PT Alfa Cipta Teknologi Virtual</strong>
                    </td>
                </tr>
            </table>
        </td>
    </tr>
</table>

</body>
</html>
