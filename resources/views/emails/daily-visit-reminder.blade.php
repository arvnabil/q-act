<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Agenda Kunjungan Hari Ini - Q-Sales</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #1e293b; line-height: 1.6; margin: 0; padding: 0; background-color: #f8fafc;">

<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; width: 100%; margin: 0; padding: 40px 16px;">
    <tr>
        <td align="center">
            <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden;">
                
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
                                    <span style="display: inline-block; background-color: #ccfbf1; color: #0f766e; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 20px; border: 1px solid #99f6e4;">● Reminder Pagi 07:00</span>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>

                <!-- Hero Section -->
                <tr>
                    <td style="padding: 32px 32px 12px 32px;">
                        <div style="display: inline-block; background-color: #ccfbf1; border: 1px solid #99f6e4; border-radius: 50%; width: 44px; height: 44px; text-align: center; line-height: 44px; font-size: 22px; margin-bottom: 16px;">
                            📅
                        </div>
                        <h1 style="margin: 0 0 8px 0; font-size: 20px; font-weight: 700; color: #0f172a; letter-spacing: -0.3px;">
                            Agenda Jadwal Kunjungan Hari Ini
                        </h1>
                        <p style="margin: 0; font-size: 14px; color: #64748b; line-height: 1.5;">
                            Selamat pagi <strong style="color: #0f172a;">{{ $sales->name }}</strong>! Anda memiliki <strong>{{ $visits->count() }} agenda kegiatan</strong> terjadwal untuk hari ini (<strong style="color: #0f172a;">{{ $dateFormatted }}</strong>).
                        </p>
                    </td>
                </tr>

                <!-- Visits List -->
                <tr>
                    <td style="padding: 16px 32px 24px 32px;">
                        <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin-bottom: 12px;">
                            Daftar Jadwal Kegiatan Hari Ini:
                        </div>

                        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                            @foreach($visits as $idx => $visit)
                                @php
                                    $timeStr = $visit->is_all_day ? 'Sepanjang Hari' : \Carbon\Carbon::parse($visit->scheduled_at)->format('H:i') . ($visit->end_at ? ' - ' . \Carbon\Carbon::parse($visit->end_at)->format('H:i') : '');
                                @endphp
                                <tr style="background-color: {{ $idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}; border-bottom: 1px solid #f1f5f9;">
                                    <td style="padding: 14px 16px; width: 110px; vertical-align: top;">
                                        <span style="display: inline-block; background-color: #0f766e; color: #ffffff; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 6px;">
                                            {{ $timeStr }}
                                        </span>
                                    </td>
                                    <td style="padding: 14px 16px; vertical-align: top;">
                                        <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 4px;">
                                            {{ $visit->subject }}
                                        </div>
                                        <div style="font-size: 12px; color: #64748b; margin-bottom: 4px;">
                                            🏢 {{ $visit->customer?->name ?? ($visit->lead?->customer_name ?? 'Internal / Lainnya') }}
                                        </div>
                                        @if($visit->location)
                                        <div style="font-size: 12px; color: #475569;">
                                            📍 {{ $visit->location }}
                                        </div>
                                        @endif
                                        @if($visit->zoom_join_url)
                                        <div style="margin-top: 6px;">
                                            <a href="{{ $visit->zoom_join_url }}" target="_blank" style="display: inline-block; font-size: 11px; font-weight: 700; color: #2563eb; text-decoration: underline;">
                                                🔗 Buka Zoom Meeting
                                            </a>
                                        </div>
                                        @endif
                                    </td>
                                </tr>
                            @endforeach
                        </table>

                        <!-- CTA Button -->
                        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                            <tr>
                                <td align="center" style="padding-top: 8px;">
                                    <a href="{{ config('app.url') }}/leads/visits" target="_blank" style="display: inline-block; background-color: #0f766e; color: #ffffff; font-size: 13px; font-weight: 700; text-decoration: none; padding: 12px 28px; border-radius: 8px;">
                                        Buka Kalender & Check-in Kunjungan &rarr;
                                    </a>
                                </td>
                            </tr>
                        </table>

                        <p style="margin: 16px 0 0 0; font-size: 11px; color: #94a3b8; text-align: center;">
                            💡 <em>Tips: Jangan lupa lakukan check-in atau tandai selesai setelah kunjungan Anda selesai. Agenda yang belum diselesaikan akan otomatis ditandai selesai setelah 2 hari.</em>
                        </p>
                    </td>
                </tr>

                <!-- Footer -->
                <tr>
                    <td style="padding: 20px 32px; background-color: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center;">
                        <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                            Email otomatis ini dikirimkan oleh sistem <strong>Q-Sales ACTIV Portal</strong> setiap pukul 07.00 WIB.
                        </p>
                    </td>
                </tr>

            </table>
        </td>
    </tr>
</table>

</body>
</html>
