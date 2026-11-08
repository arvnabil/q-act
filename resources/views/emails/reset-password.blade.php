<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Reset Kata Sandi Akun - Q-Sales</title>
    <!--[if mso]>
    <xml>
      <o:OfficeDocumentSettings>
        <o:AllowPNG/>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
    <style type="text/css">
      body, table, td, p, a, span { font-family: Calibri, 'Segoe UI', Arial, sans-serif !important; }
    </style>
    <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">

<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f6f8; table-layout: fixed;">
    <tr>
        <td align="center" style="padding: 30px 10px;">
            <!--[if (gte mso 9)|(IE)]>
            <table align="center" border="0" cellspacing="0" cellpadding="0" width="560">
            <tr>
            <td>
            <![endif]-->
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px; background-color: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden;">
                
                <!-- Brand Bar -->
                <tr>
                    <td style="padding: 20px 28px; border-bottom: 1px solid #eef2f6; background-color: #ffffff;">
                        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                            <tr>
                                <td align="left" valign="middle">
                                    <span style="font-size: 15px; font-weight: 800; color: #0f766e; letter-spacing: 0.5px;">ACTIV</span>
                                    <span style="font-size: 13px; font-weight: 600; color: #64748b; margin-left: 6px;">| Q-Sales Portal</span>
                                </td>
                                <td align="right" valign="middle">
                                    <span style="font-size: 11px; font-weight: 600; color: #0f766e; background-color: #f0fdfa; padding: 4px 10px; border-radius: 4px; border: 1px solid #ccfbf1;">Keamanan Akun</span>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>

                <!-- Main Content -->
                <tr>
                    <td style="padding: 32px 28px 20px 28px;">
                        <h2 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 700; color: #1e293b; line-height: 24px;">
                            Permintaan Reset Kata Sandi
                        </h2>
                        <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 22px; color: #475569;">
                            Halo <strong>{{ $nama }}</strong>,<br />
                            Kami menerima permintaan untuk mengatur ulang kata sandi akun Q-Sales Anda. Klik tombol di bawah ini untuk membuat kata sandi baru:
                        </p>

                        <!-- Outlook Bulletproof VML Rounded Button -->
                        <div style="margin: 26px 0;">
                            <!--[if mso]>
                            <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="{{ $url }}" style="height:44px;v-text-anchor:middle;width:240px;" arcsize="12%" stroke="f" fillcolor="#0f766e">
                            <w:anchorlock/>
                            <center style="color:#ffffff;font-family:Calibri,sans-serif;font-size:14px;font-weight:bold;">Atur Ulang Kata Sandi &rarr;</center>
                            </v:roundrect>
                            <![endif]-->
                            <!--[if !mso]><!-- -->
                            <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" bgcolor="#0f766e" style="border-radius: 6px;">
                                        <a href="{{ $url }}" target="_blank" style="display: inline-block; padding: 12px 26px; font-size: 14px; font-weight: bold; color: #ffffff !important; text-decoration: none !important; border-radius: 6px; background-color: #0f766e;">
                                            Atur Ulang Kata Sandi &rarr;
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            <!--<![endif]-->
                        </div>

                        <!-- Data Row: Expiration -->
                        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 24px 0 16px 0; border-top: 1px solid #f1f5f9; border-bottom: 1px solid #f1f5f9;">
                            <tr>
                                <td style="padding: 10px 0; font-size: 13px; color: #64748b;" width="140">Masa Berlaku Tautan:</td>
                                <td style="padding: 10px 0; font-size: 13px; font-weight: 600; color: #0f172a;">⏱️ {{ $expire }} Menit</td>
                            </tr>
                        </table>

                        <!-- Note Callout -->
                        <p style="margin: 20px 0 0 0; font-size: 12px; line-height: 18px; color: #64748b; border-left: 3px solid #cbd5e1; padding-left: 12px;">
                            Jika Anda tidak meminta perubahan kata sandi, abaikan email ini dengan aman. Akun Anda tetap terlindungi dan kata sandi tidak akan berubah tanpa tindakan Anda.
                        </p>

                        <!-- Fallback URL -->
                        <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #f1f5f9; font-size: 11px; line-height: 18px; color: #94a3b8; word-break: break-all;">
                            Tombol tidak bisa diklik? Buka tautan berikut di browser Anda:<br />
                            <a href="{{ $url }}" style="color: #0f766e; text-decoration: underline;">{{ $url }}</a>
                        </div>
                    </td>
                </tr>

                <!-- Footer -->
                <tr>
                    <td style="padding: 18px 28px; background-color: #f8fafc; border-top: 1px solid #eef2f6; text-align: center;">
                        <span style="font-size: 11px; font-weight: 600; color: #475569;">PT Alfa Cipta Teknologi Virtual</span><br />
                        <span style="font-size: 11px; color: #94a3b8;">Email ini dikirim otomatis oleh sistem Q-Sales Portal.</span>
                    </td>
                </tr>

            </table>
            <!--[if (gte mso 9)|(IE)]>
            </td>
            </tr>
            </table>
            <![endif]-->
        </td>
    </tr>
</table>

</body>
</html>
