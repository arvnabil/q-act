<!doctype html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex, nofollow">
    <title>{{ $status }} · {{ $title }} | QSales</title>
    <style>
        :root { color-scheme: light; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #172033; background: #f5f8fb; }
        * { box-sizing: border-box; }
        body { min-height: 100vh; margin: 0; display: grid; place-items: center; padding: 28px 18px; background: radial-gradient(ellipse at 85% 8%, rgba(20, 184, 166, .10), transparent 32%), radial-gradient(ellipse at 8% 90%, rgba(59, 130, 246, .07), transparent 28%), #f5f8fb; }
        .shell { width: min(100%, 720px); }
        .brand { display: flex; align-items: center; gap: 11px; margin: 0 0 18px 6px; }
        .brand-mark { display: grid; width: 42px; height: 42px; place-items: center; border: 1px solid #b6eee4; border-radius: 13px; background: #e9fbf7; color: #008f7b; font-size: 12px; font-weight: 900; letter-spacing: -.06em; }
        .brand-name { color: #087f70; font-size: 15px; font-weight: 800; letter-spacing: .02em; }
        .brand-caption { margin-top: 2px; color: #8290a5; font-size: 11px; }
        .card { position: relative; overflow: hidden; border: 1px solid #e0e8f0; border-radius: 22px; background: rgba(255,255,255,.96); box-shadow: 0 18px 55px rgba(25, 47, 76, .08), 0 2px 7px rgba(25, 47, 76, .04); }
        .accent { height: 5px; background: linear-gradient(90deg, #009b87, #19b69e 55%, #8ce0ce); }
        .content { padding: clamp(26px, 6vw, 54px); text-align: center; }
        .symbol { position: relative; display: grid; width: 106px; height: 106px; place-items: center; margin: 0 auto 24px; border: 1px solid #d8f1ed; border-radius: 31px; background: linear-gradient(145deg, #f0fdfa, #eff6ff); }
        .symbol::before, .symbol::after { position: absolute; content: ""; border: 1px solid rgba(0, 155, 135, .12); border-radius: 50%; }
        .symbol::before { inset: -11px; }
        .symbol::after { inset: -22px; border-color: rgba(59, 130, 246, .08); }
        .code { color: #078b79; font-size: 34px; font-weight: 850; letter-spacing: -.06em; line-height: 1; }
        .eyebrow { margin: 0 0 10px; color: #008f7b; font-size: 11px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; }
        h1 { margin: 0; color: #172033; font-size: clamp(23px, 4vw, 31px); line-height: 1.25; letter-spacing: -.035em; }
        .description { max-width: 480px; margin: 13px auto 0; color: #64748b; font-size: 14px; line-height: 1.75; }
        .actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; margin-top: 28px; }
        .button { display: inline-flex; min-height: 43px; align-items: center; justify-content: center; gap: 8px; padding: 0 17px; border: 1px solid #dbe5ef; border-radius: 11px; background: white; color: #43536a; font-size: 12px; font-weight: 750; text-decoration: none; cursor: pointer; transition: .16s ease; }
        .button:hover { transform: translateY(-1px); border-color: #a9ddd5; background: #f3fcfa; color: #087f70; }
        .button-primary { border-color: #009b87; background: #009b87; color: white; box-shadow: 0 5px 13px rgba(0, 155, 135, .18); }
        .button-primary:hover { border-color: #008574; background: #008f7b; color: white; }
        .footer { display: flex; align-items: center; justify-content: center; gap: 7px; padding: 15px 20px; border-top: 1px solid #edf1f5; color: #94a3b8; font-size: 11px; }
        .dot { width: 6px; height: 6px; border-radius: 50%; background: #0ab394; }
        @media (max-width: 520px) { .content { padding: 30px 22px; } .actions { flex-direction: column; } .button { width: 100%; } }
    </style>
</head>
<body>
    <main class="shell">
        <div class="brand" aria-label="ACTiV QSales Portal">
            <div class="brand-mark">ACTiV</div>
            <div><div class="brand-name">ACTiV</div><div class="brand-caption">QSales Portal</div></div>
        </div>

        <section class="card" aria-labelledby="error-title">
            <div class="accent"></div>
            <div class="content">
                <div class="symbol" aria-hidden="true"><span class="code">{{ $status }}</span></div>
                <p class="eyebrow">{{ $eyebrow }}</p>
                <h1 id="error-title">{{ $title }}</h1>
                <p class="description">{{ $description }}</p>
                <div class="actions">
                    @if($isServerError)
                        <button type="button" class="button button-primary" onclick="window.location.reload()">Coba Muat Ulang</button>
                    @endif
                    <a class="button button-primary" href="/">Kembali ke QSales</a>
                    <button type="button" class="button" onclick="history.back()">Halaman Sebelumnya</button>
                </div>
            </div>
            <div class="footer"><span class="dot"></span><span>ACTiV · QSales Portal</span></div>
        </section>
    </main>
</body>
</html>
