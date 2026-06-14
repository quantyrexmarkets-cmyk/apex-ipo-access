const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, content-type",
      },
    });
  }

  try {
    const { email, code, firstName } = await req.json();
    if (!email || !code) {
      return new Response(JSON.stringify({ error: "Missing email or code" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    const name = firstName ? firstName : "Investor";

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>Email Verification Required</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Oswald:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
  :root { color-scheme: light dark; supported-color-schemes: light dark; }
  body, .bg { background:#ffffff !important; color:#1a1f2e !important; }
  .card { background:#fafbfc !important; border-color:#e5e8ee !important; }
  .brand-text { color:#1a1f2e !important; }
  .brand-sub { color:#5f6368 !important; }
  .eyebrow { color:#5f6368 !important; }
  .heading { color:#1a1f2e !important; }
  .body-text { color:#3a4250 !important; }
  .label { color:#5f6368 !important; }
  .code-box { background:#ffffff !important; border:1px solid #dadce0 !important; }
  .code-digits { color:#1a1f2e !important; }
  .section-title { color:#1a1f2e !important; }
  .list-text { color:#3a4250 !important; }
  .notice-box { background:#fef9e7 !important; border:1px solid #f5e6a8 !important; color:#5c4a14 !important; }
  .notice-box strong { color:#3d3208 !important; }
  .divider { border-top:1px solid #e5e8ee !important; }
  .footer { color:#5f6368 !important; }
  .footer-small { color:#80868b !important; }
  a.link { color:#1a73e8 !important; }

  @media (prefers-color-scheme: dark) {
    body, .bg { background:#1f2123 !important; color:#e3e3e3 !important; }
    .card { background:#28292c !important; border-color:#3c3f43 !important; }
    .brand-text { color:#ffffff !important; }
    .brand-sub { color:#a0a4a8 !important; }
    .eyebrow { color:#a0a4a8 !important; }
    .heading { color:#ffffff !important; }
    .body-text { color:#c8ccd0 !important; }
    .label { color:#a0a4a8 !important; }
    .code-box { background:#1f2123 !important; border:1px solid #3c3f43 !important; }
    .code-digits { color:#ffffff !important; }
    .section-title { color:#ffffff !important; }
    .list-text { color:#c8ccd0 !important; }
    .notice-box { background:rgba(255,184,0,0.06) !important; border:1px solid rgba(255,184,0,0.2) !important; color:#d4b86a !important; }
    .notice-box strong { color:#ffb800 !important; }
    .divider { border-top:1px solid #3c3f43 !important; }
    .footer { color:#a0a4a8 !important; }
    .footer-small { color:#6b6f74 !important; }
    a.link { color:#5fb0ff !important; }
  }
</style>
</head>
<body class="bg" style="margin:0;padding:0;font-family:'Inter','Roboto',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">
  <table role="presentation" class="bg" width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px">

        <!-- Brand Header (bigger logo + Oswald wordmark) -->
        <tr><td style="padding:0 4px 32px">
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding-right:14px;vertical-align:middle">
                <img src="https://apexipoaccess.com/assets/spacex-logo.png" alt="" width="52" height="52" style="display:block;width:52px;height:52px">
              </td>
              <td style="vertical-align:middle">
                <div>
                  <span class="brand-text" style="font-family:'Oswald','Impact','Helvetica Neue',Arial,sans-serif;font-size:28px;font-weight:600;letter-spacing:2px;text-transform:uppercase">APEX</span>
                  <span class="brand-sub" style="font-family:'Oswald','Impact','Helvetica Neue',Arial,sans-serif;font-size:28px;font-weight:300;letter-spacing:2px;text-transform:uppercase;margin-left:6px">IPO Access</span>
                </div>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Card -->
        <tr><td class="card" style="border:1px solid;border-radius:12px;padding:40px 36px">

          <!-- Eyebrow -->
          <p class="eyebrow" style="margin:0 0 10px;font-size:11px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase">Account Verification</p>

          <!-- Main Heading -->
          <h1 class="heading" style="margin:0 0 28px;font-family:'Inter','Roboto',Arial,sans-serif;font-size:24px;font-weight:600;letter-spacing:-0.3px;line-height:1.3">Email Verification Required</h1>

          <!-- Greeting -->
          <p class="body-text" style="margin:0 0 18px;font-size:15px;line-height:1.7">Dear ${name},</p>

          <p class="body-text" style="margin:0 0 32px;font-size:15px;line-height:1.7">Thank you for registering with APEX IPO Access. To complete your account setup and activate your access, please verify your email address using the code below.</p>

          <!-- Code Label -->
          <p class="label" style="margin:0 0 12px;font-size:12px;font-weight:600;letter-spacing:0.8px;text-transform:uppercase">Your Verification Code</p>

          <!-- Code Box -->
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 14px">
            <tr><td align="center" class="code-box" style="border-radius:10px;padding:30px 16px">
              <div class="code-digits" style="font-family:'SF Mono','Roboto Mono','Courier New',monospace;font-size:34px;font-weight:600;letter-spacing:12px;line-height:1">${code}</div>
            </td></tr>
          </table>

          <p class="body-text" style="margin:0 0 36px;font-size:13px;line-height:1.65">This code will expire in <strong>10 minutes</strong>. You may copy and paste it directly into the verification page.</p>

          <!-- Divider -->
          <div class="divider" style="margin:0 0 24px"></div>

          <!-- Next Step -->
          <h2 class="section-title" style="margin:0 0 14px;font-family:'Inter','Roboto',Arial,sans-serif;font-size:15px;font-weight:600">Next Steps</h2>

          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 8px">
            <tr>
              <td valign="top" width="22" style="padding:6px 0 0">
                <div style="width:6px;height:6px;background:#1a73e8;border-radius:50%"></div>
              </td>
              <td class="list-text" style="font-size:14px;line-height:1.65;padding:0 0 8px">Return to the APEX IPO Access verification page</td>
            </tr>
            <tr>
              <td valign="top" width="22" style="padding:6px 0 0">
                <div style="width:6px;height:6px;background:#1a73e8;border-radius:50%"></div>
              </td>
              <td class="list-text" style="font-size:14px;line-height:1.65;padding:0">Enter the 6-digit code above to confirm your email and activate your account</td>
            </tr>
          </table>

          <!-- Security Notice -->
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:32px 0 0">
            <tr><td class="notice-box" style="border-radius:8px;padding:16px 18px">
              <p style="margin:0 0 6px;font-size:13px;font-weight:600"><strong>Security Notice</strong></p>
              <p style="margin:0;font-size:13px;line-height:1.6">APEX IPO Access will never request your verification code via email or any other channel. If you did not initiate this request, you may safely ignore this message.</p>
            </td></tr>
          </table>

        </td></tr>

        <!-- Footer -->
        <tr><td align="center" style="padding:28px 8px 8px">
          <p class="footer" style="margin:0 0 6px;font-size:12px;line-height:1.6">You are receiving this email because you signed up at <a class="link" href="https://apexipoaccess.com" style="text-decoration:none">apexipoaccess.com</a></p>
          <p class="footer" style="margin:0 0 16px;font-size:12px;line-height:1.6">For assistance, contact <a class="link" href="mailto:support@apexipoaccess.com" style="text-decoration:none">support@apexipoaccess.com</a></p>
          <p class="footer-small" style="margin:0 0 4px;font-size:11px;line-height:1.6">© ${new Date().getFullYear()} APEX IPO Access</p>
          <p class="footer-small" style="margin:0;font-size:11px;line-height:1.6">Investment Intelligence Platform</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "APEX IPO Access <noreply@apexipoaccess.com>",
        to: [email],
        subject: `Email Verification Required - APEX IPO Access`,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Resend error:", err);
      return new Response(JSON.stringify({ error: err }), {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
});
