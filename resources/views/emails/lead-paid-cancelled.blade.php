<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Koreksi Pembatalan Terbayar - Q-Sales</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #1e293b; line-height: 1.6; margin: 0; padding: 0; background-color: #f8fafc;">

<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; width: 100%; margin: 0; padding: 40px 16px;">
    <tr>
        <td align="center">
            <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden;">
                
                <!-- Brand Topbar -->
                <tr>
                    <td style="padding: 24px 32px 20px 32px; border-bottom: 1px solid #f1f5f9;">
                        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                            <tr>
                                <td valign="middle">
                                    <span style="display: inline-block; background-color: #b91c1c; color: #ffffff; font-weight: 800; font-size: 13px; letter-spacing: 0.5px; padding: 4px 10px; border-radius: 6px;">ACTIV</span>
                                    <span style="font-size: 13px; font-weight: 600; color: #64748b; margin-left: 8px;">Q-SALES PORTAL</span>
                                </td>
                                <td align="right" valign="middle">
                                    <span style="display: inline-block; background-color: #fef2f2; color: #dc2626; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 20px; border: 1px solid #fecaca;">● Pembatalan</span>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>

                <!-- Hero Section -->
                <tr>
                    <td style="padding: 32px 32px 12px 32px;">
                        <div style="display: inline-block; background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 50%; width: 44px; height: 44px; text-align: center; line-height: 44px; font-size: 22px; margin-bottom: 16px;">
                            ⚠️
                        </div>
                        <h1 style="margin: 0 0 8px 0; font-size: 20px; font-weight: 700; color: #0f172a; letter-spacing: -0.3px;">
                            Pembatalan Status Terbayar
                        </h1>
                        <p style="margin: 0; font-size: 14px; color: #64748b; line-height: 1.5;">
                            Halo <strong style="color: #0f172a;">Tim Finance</strong>, status Terbayar pada lead berikut telah <strong>dibatalkan / direvisi</strong> ke stage sebelumnya.
                        </p>
                    </td>
                </tr>

                <!-- Minimalist Details Table -->
                <tr>
                    <td style="padding: 16px 32px 24px 32px;">
                        
                        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 12px 0 24px 0; border-top: 1px solid #f1f5f9; border-bottom: 1px solid #f1f5f9;">
                            <tr>
                                <td style="padding: 12px 0; font-size: 13px; color: #64748b; border-bottom: 1px solid #f8fafc;" width="150">
                                    Judul Proyek / Lead
                                </td>
                                <td style="padding: 12px 0; font-size: 13px; color: #0f172a; font-weight: 600; border-bottom: 1px solid #f8fafc;">
                                    {{ $lead->title ?? '-' }}
                                </td>
                            </tr>
                            <tr>
                                <td style="padding: 12px 0; font-size: 13px; color: #64748b; border-bottom: 1px solid #f8fafc;">
                                    Customer
                                </td>
                                <td style="padding: 12px 0; font-size: 13px; color: #0f172a; border-bottom: 1px solid #f8fafc;">
                                    {{ $lead->customer->name ?? '-' }}
                                </td>
                            </tr>
                            <tr>
                                <td style="padding: 12px 0; font-size: 13px; color: #64748b; border-bottom: 1px solid #f8fafc;">
                                    Sales PIC
                                </td>
                                <td style="padding: 12px 0; font-size: 13px; color: #0f172a; border-bottom: 1px solid #f8fafc;">
                                    {{ $lead->sales->name ?? '-' }}
                                </td>
                            </tr>
                            <tr>
                                <td style="padding: 12px 0; font-size: 13px; color: #64748b; border-bottom: 1px solid #f8fafc;">
                                    Dibatalkan Oleh
                                </td>
                                <td style="padding: 12px 0; font-size: 13px; color: #0f172a; border-bottom: 1px solid #f8fafc;">
                                    {{ $revertedBy->name }} <span style="color: #94a3b8; font-size: 12px;">({{ $revertedBy->role }})</span>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding: 12px 0; font-size: 13px; color: #64748b; border-bottom: 1px solid #f8fafc;">
                                    Waktu Pembatalan
                                </td>
                                <td style="padding: 12px 0; font-size: 13px; color: #0f172a; border-bottom: 1px solid #f8fafc;">
                                    {{ now()->locale('id')->isoFormat('D MMMM YYYY, HH:mm') }} WIB
                                </td>
                            </tr>
                            <tr>
                                <td style="padding: 12px 0; font-size: 13px; color: #64748b;">
                                    Perubahan Stage
                                </td>
                                <td style="padding: 12px 0; font-size: 13px; color: #0f172a;">
                                    <span style="display: inline-block; background-color: #fee2e2; color: #991b1b; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 4px;">Batal Terbayar</span>
                                    <span style="color: #94a3b8; margin: 0 4px;">&rarr;</span>
                                    <span style="display: inline-block; background-color: #fef3c7; color: #92400e; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 4px;">{{ $newStage }}</span>
                                </td>
                            </tr>
                        </table>

                        <!-- Primary Button -->
                        <table role="presentation" border="0" cellspacing="0" cellpadding="0" style="margin: 28px 0 20px 0;">
                            <tr>
                                <td align="center" bgcolor="#b91c1c" style="border-radius: 8px; background-color: #b91c1c;">
                                    <a href="{{ url('/leads') }}" target="_blank" style="display: inline-block; padding: 13px 28px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; font-weight: 600; color: #ffffff !important; text-decoration: none !important; border-radius: 8px; background-color: #b91c1c; border: 1px solid #b91c1c;">
                                        Buka Lead Pipeline &rarr;
                                    </a>
                                </td>
                            </tr>
                        </table>

                        <!-- Subtle Left-Border Note -->
                        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 20px 0 8px 0;">
                            <tr>
                                <td style="border-left: 3px solid #f87171; padding-left: 14px; font-size: 12px; color: #64748b; line-height: 1.6;">
                                    Mohon <strong>tunda atau sesuaikan</strong> pencatatan administrasi keuangan/invoice terkait lead ini hingga ada konfirmasi pembayaran kembali.
                                </td>
                            </tr>
                        </table>

                    </td>
                </tr>

                <!-- Footer -->
                <tr>
                    <td style="padding: 20px 32px; background-color: #fafbfc; border-top: 1px solid #f1f5f9; text-align: center;">
                        <p style="margin: 0 0 4px 0; font-size: 12px; font-weight: 600; color: #475569;">
                            PT Alfa Cipta Teknologi Virtual
                        </p>
                        <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                            Email ini dikirim otomatis oleh sistem Q-Sales Portal. Mohon tidak membalas email ini.
                        </p>
                    </td>
                </tr>

            </table>
        </td>
    </tr>
</table>

</body>
</html>
