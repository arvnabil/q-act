<!DOCTYPE html>
<html lang="id">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;background:#f1f5f9;font-family:Arial,sans-serif;color:#0f172a">
  <div style="max-width:640px;margin:24px auto;padding:28px;background:#fff;border:1px solid #e2e8f0;border-radius:12px">
    <div style="font-size:12px;font-weight:bold;letter-spacing:.08em;color:#0f766e">ACTIV Q-SALES PORTAL</div>
    <h1 style="font-size:22px;margin:22px 0 10px">Pengingat Renewal Lisensi Zoom</h1>
    <p>Halo {{ $salesPic->name }}, masa lisensi Zoom untuk akun berikut akan berakhir dalam <strong>{{ $daysBefore }} hari</strong>.</p>
    <table style="width:100%;border-collapse:collapse;margin:20px 0">
      <tr><td style="padding:9px;border-bottom:1px solid #e2e8f0;color:#64748b">Account Name</td><td style="padding:9px;border-bottom:1px solid #e2e8f0;font-weight:bold">{{ $accountDetails['account_name'] }}</td></tr>
      <tr><td style="padding:9px;border-bottom:1px solid #e2e8f0;color:#64748b">ZAN (Zoom Account Number)</td><td style="padding:9px;border-bottom:1px solid #e2e8f0">{{ $accountDetails['account_number'] }}</td></tr>
      <tr><td style="padding:9px;border-bottom:1px solid #e2e8f0;color:#64748b">Account Type</td><td style="padding:9px;border-bottom:1px solid #e2e8f0">{{ $accountDetails['account_type'] }}</td></tr>
      <tr><td style="padding:9px;border-bottom:1px solid #e2e8f0;color:#64748b">Account Owner</td><td style="padding:9px;border-bottom:1px solid #e2e8f0">{{ $accountDetails['account_owner'] }}</td></tr>
      <tr><td style="padding:9px;border-bottom:1px solid #e2e8f0;color:#64748b">Who Will Pay</td><td style="padding:9px;border-bottom:1px solid #e2e8f0">{{ $accountDetails['who_will_pay'] }}</td></tr>
      <tr><td style="padding:9px;border-bottom:1px solid #e2e8f0;color:#64748b">Seats (License)</td><td style="padding:9px;border-bottom:1px solid #e2e8f0">{{ $accountDetails['seats'] }}</td></tr>
      <tr><td style="padding:9px;border-bottom:1px solid #e2e8f0;color:#64748b">Creation Time</td><td style="padding:9px;border-bottom:1px solid #e2e8f0">{{ $accountDetails['creation_time'] }}</td></tr>
      <tr><td style="padding:9px;border-bottom:1px solid #e2e8f0;color:#64748b">Service Effective Date</td><td style="padding:9px;border-bottom:1px solid #e2e8f0">{{ $accountDetails['service_effective_date'] }}</td></tr>
      <tr><td style="padding:9px;border-bottom:1px solid #e2e8f0;color:#64748b">Subscription End</td><td style="padding:9px;border-bottom:1px solid #e2e8f0;font-weight:bold;color:#b45309">{{ $accountDetails['subscription_end'] }}</td></tr>
      <tr><td style="padding:9px;border-bottom:1px solid #e2e8f0;color:#64748b">Auto Renew</td><td style="padding:9px;border-bottom:1px solid #e2e8f0">{{ $accountDetails['auto_renew'] }}</td></tr>
      <tr><td style="padding:9px;color:#64748b">Customer QSales</td><td style="padding:9px">{{ $accountDetails['customer_name'] }}</td></tr>
    </table>
    <p style="font-size:13px;color:#64748b">Silakan tindak lanjuti proses renewal dengan customer. Email ini dikirim ke Sales PIC yang ditetapkan pada akun Zoom di QSales.</p>
  </div>
</body>
</html>
