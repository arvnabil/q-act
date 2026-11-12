<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Disposisi Prospek Baru - Q-Sales</title>
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
                                    <span style="display: inline-block; background-color: #0f766e; color: #ffffff; font-weight: 800; font-size: 13px; letter-spacing: 0.5px; padding: 4px 10px; border-radius: 6px;">ACTIV</span>
                                    <span style="font-size: 13px; font-weight: 600; color: #64748b; margin-left: 8px;">Q-SALES PORTAL</span>
                                </td>
                                <td align="right" valign="middle">
                                    <span style="display: inline-block; background-color: #e0e7ff; color: #4338ca; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 20px; border: 1px solid #c7d2fe;">● Lead Baru Ditugaskan</span>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>

                <!-- Hero Section -->
                <tr>
                    <td style="padding: 32px 32px 12px 32px;">
                        <div style="display: inline-block; background-color: #e0e7ff; border: 1px solid #c7d2fe; border-radius: 50%; width: 44px; height: 44px; text-align: center; line-height: 44px; font-size: 22px; margin-bottom: 16px;">
                            🎯
                        </div>
                        <h1 style="margin: 0 0 8px 0; font-size: 20px; font-weight: 700; color: #0f172a; letter-spacing: -0.3px;">
                            Disposisi Penugasan Prospek Baru
                        </h1>
                        <p style="margin: 0; font-size: 14px; color: #64748b; line-height: 1.5;">
                            Halo <strong style="color: #0f172a;">{{ $assignedSales->name }}</strong>, sebuah prospek / lead baru telah dialokasikan kepada Anda{{ $assignedBy ? " oleh {$assignedBy->name}" : "" }}. Segera tindak lanjuti prospek ini.
                        </p>
                    </td>
                </tr>

                <!-- Details Table -->
                <tr>
                    <td style="padding: 16px 32px 24px 32px;">
                        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 12px 0 24px 0; border-top: 1px solid #f1f5f9; border-bottom: 1px solid #f1f5f9;">
                            <tr>
                                <td style="padding: 12px 0; font-size: 13px; color: #64748b; border-bottom: 1px solid #f8fafc;" width="150">
                                    Judul Prospek / Lead
                                </td>
                                <td style="padding: 12px 0; font-size: 13px; color: #0f172a; font-weight: 700; border-bottom: 1px solid #f8fafc;">
                                    {{ $lead->title }}
                                </td>
                            </tr>
                            <tr>
                                <td style="padding: 12px 0; font-size: 13px; color: #64748b; border-bottom: 1px solid #f8fafc;">
                                    Kode Lead
                                </td>
                                <td style="padding: 12px 0; font-size: 13px; color: #0f766e; font-weight: 600; border-bottom: 1px solid #f8fafc;">
                                    {{ $lead->lead_code ?? '-' }}
                                </td>
                            </tr>
                            <tr>
                                <td style="padding: 12px 0; font-size: 13px; color: #64748b; border-bottom: 1px solid #f8fafc;">
                                    Pelanggan / Customer
                                </td>
                                <td style="padding: 12px 0; font-size: 13px; color: #0f172a; font-weight: 600; border-bottom: 1px solid #f8fafc;">
                                    {{ $lead->customer_name ?? ($lead->customer?->name ?? '-') }}
                                </td>
                            </tr>
                            <tr>
                                <td style="padding: 12px 0; font-size: 13px; color: #64748b; border-bottom: 1px solid #f8fafc;">
                                    Kontak PIC
                                </td>
                                <td style="padding: 12px 0; font-size: 13px; color: #0f172a; border-bottom: 1px solid #f8fafc;">
                                    {{ $lead->pic_name ?? '-' }} ({{ $lead->pic_phone ?? ($lead->customer_phone ?? '-') }})
                                </td>
                            </tr>
                            <tr>
                                <td style="padding: 12px 0; font-size: 13px; color: #64748b; border-bottom: 1px solid #f8fafc;">
                                    Estimasi Nilai
                                </td>
                                <td style="padding: 12px 0; font-size: 13px; color: #0f766e; font-weight: 700; border-bottom: 1px solid #f8fafc;">
                                    Rp {{ number_format($lead->estimated_value ?? 0, 0, ',', '.') }}
                                </td>
                            </tr>
                            @if($lead->notes)
                            <tr>
                                <td style="padding: 12px 0; font-size: 13px; color: #64748b;">
                                    Catatan Awal
                                </td>
                                <td style="padding: 12px 0; font-size: 13px; color: #0f172a; font-style: italic;">
                                    "{{ $lead->notes }}"
                                </td>
                            </tr>
                            @endif
                        </table>

                        <!-- CTA Button -->
                        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                            <tr>
                                <td align="center" style="padding-top: 8px;">
                                    <a href="{{ config('app.url') }}/leads/{{ $lead->id }}" target="_blank" style="display: inline-block; background-color: #0f766e; color: #ffffff; font-size: 13px; font-weight: 700; text-decoration: none; padding: 12px 28px; border-radius: 8px;">
                                        Lihat & Tindak Lanjuti Lead &rarr;
                                    </a>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>

                <!-- Footer -->
                <tr>
                    <td style="padding: 20px 32px; background-color: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center;">
                        <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                            Email otomatis ini dikirimkan oleh sistem <strong>Q-Sales ACTIV Portal</strong>.
                        </p>
                    </td>
                </tr>

            </table>
        </td>
    </tr>
</table>

</body>
</html>
