<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Kata Sandi QSales</title>
    <style>
        body {
            font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif;
            background-color: #f4f6f9;
            margin: 0;
            padding: 0;
            -webkit-font-smoothing: antialiased;
            color: #334155;
        }
        .wrapper {
            width: 100%;
            background-color: #f4f6f9;
            padding: 40px 16px;
            box-sizing: border-box;
        }
        .card {
            max-width: 520px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 16px;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.03);
            border: 1px solid #e2e8f0;
            overflow: hidden;
        }
        .header {
            background-color: #0f172a;
            padding: 28px 32px;
            text-align: center;
        }
        .header img {
            max-height: 48px;
            width: auto;
            display: inline-block;
        }
        .body-content {
            padding: 36px 32px 32px;
        }
        .greeting {
            font-size: 18px;
            font-weight: 700;
            color: #0f172a;
            margin-top: 0;
            margin-bottom: 16px;
        }
        .text {
            font-size: 15px;
            line-height: 1.6;
            color: #475569;
            margin-top: 0;
            margin-bottom: 20px;
        }
        .button-wrapper {
            text-align: center;
            margin: 28px 0;
        }
        .btn {
            background-color: #2563eb;
            color: #ffffff !important;
            font-size: 15px;
            font-weight: 600;
            text-decoration: none;
            padding: 14px 32px;
            border-radius: 10px;
            display: inline-block;
            box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
            transition: background-color 0.2s ease;
        }
        .btn:hover {
            background-color: #1d4ed8;
        }
        .info-box {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-left: 4px solid #2563eb;
            border-radius: 8px;
            padding: 14px 16px;
            font-size: 14px;
            color: #334155;
            margin-bottom: 24px;
        }
        .divider {
            height: 1px;
            background-color: #e2e8f0;
            margin: 28px 0;
        }
        .footer-sign {
            font-size: 15px;
            line-height: 1.5;
            color: #334155;
            margin: 0;
        }
        .subtext {
            font-size: 12px;
            color: #94a3b8;
            word-break: break-all;
            margin-top: 20px;
            line-height: 1.4;
        }
        .footer {
            text-align: center;
            padding: 20px 32px 32px;
            font-size: 12px;
            color: #94a3b8;
        }
    </style>
</head>
<body>
    <div class="wrapper">
        <div class="card">
            <!-- Header dengan Logo -->
            <div class="header">
                @if(isset($message) && file_exists(public_path('logo.png')))
                    <img src="{{ $message->embed(public_path('logo.png')) }}" alt="QSales Logo">
                @else
                    <img src="{{ config('app.url') }}/logo.png" alt="QSales Logo">
                @endif
            </div>

            <!-- Body Content -->
            <div class="body-content">
                <p class="greeting">Halo {{ $nama }},</p>
                
                <p class="text">Kami menerima permintaan untuk mengatur ulang kata sandi akun QSales Anda.</p>

                <p class="text">Untuk melanjutkan, silakan klik tombol berikut:</p>

                <div class="button-wrapper">
                    <a href="{{ $url }}" class="btn" target="_blank">Reset Kata Sandi</a>
                </div>

                <div class="info-box">
                    🔒 Tautan ini berlaku selama {{ $expire }} menit.
                </div>

                <p class="text" style="font-size: 14px; color: #64748b;">
                    Jika Anda tidak meminta reset kata sandi, abaikan email ini. Kata sandi Anda tidak akan berubah tanpa tindakan dari Anda.
                </p>

                <div class="divider"></div>

                <p class="footer-sign">
                    Salam,<br>
                    <strong>QSales Team</strong>
                </p>

                <div class="subtext">
                    Jika Anda mengalami masalah saat mengklik tombol "Reset Kata Sandi", salin dan tempel URL berikut ke browser web Anda:<br>
                    <a href="{{ $url }}" style="color: #2563eb;">{{ $url }}</a>
                </div>
            </div>
        </div>

        <div class="footer">
            &copy; {{ date('Y') }} QSales. All rights reserved.
        </div>
    </div>
</body>
</html>
