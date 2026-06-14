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
<title>Confirm your email</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  :root { color-scheme: light dark; supported-color-schemes: light dark; }
  body, .bg { background:#ffffff !important; color:#202124 !important; }
  .card { background:#f8f9fa !important; border-color:#dadce0 !important; }
  .brand-text { color:#202124 !important; }
  .brand-sub { color:#5f6368 !important; }
  .heading { color:#202124 !important; }
  .body-text { color:#3c4043 !important; }
  .meta { color:#5f6368 !important; }
  .step-title { color:#202124 !important; }
  .step-desc { color:#5f6368 !important; }
  .code-box { background:#ffffff !important; border:1px solid #dadce0 !important; }
  .code-digits { color:#202124 !important; }
  .code-expiry { color:#5f6368 !important; }
  .security { background:#f1f3f4 !important; color:#5f6368 !important; }
  .security strong { color:#202124 !important; }
  .footer { color:#5f6368 !important; }
  .footer-small { color:#80868b !important; }
  a.link { color:#1a73e8 !important; }
  .step-circle { background:#1a73e8 !important; color:#ffffff !important; }

  @media (prefers-color-scheme: dark) {
    body, .bg { background:#1f2123 !important; color:#e3e3e3 !important; }
    .card { background:#28292c !important; border-color:#3c3f43 !important; }
    .brand-text { color:#ffffff !important; }
    .brand-sub { color:#a0a4a8 !important; }
    .heading { color:#ffffff !important; }
    .body-text { color:#c8ccd0 !important; }
    .meta { color:#a0a4a8 !important; }
    .step-title { color:#ffffff !important; }
    .step-desc { color:#a0a4a8 !important; }
    .code-box { background:#1f2123 !important; border:1px solid #3c3f43 !important; }
    .code-digits { color:#ffffff !important; }
    .code-expiry { color:#8b9097 !important; }
    .security { background:#1f2123 !important; color:#a0a4a8 !important; }
    .security strong { color:#e3e3e3 !important; }
    .footer { color:#a0a4a8 !important; }
    .footer-small { color:#6b6f74 !important; }
    a.link { color:#5fb0ff !important; }
    .step-circle { background:#5fb0ff !important; color:#0d1117 !important; }
  }
</style>
</head>
<body class="bg" style="margin:0;padding:0;font-family:'Inter','Roboto',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">
  <table role="presentation" class="bg" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px">

        <!-- Brand Header -->
        <tr><td style="padding:0 8px 28px">
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding-right:10px;vertical-align:middle">
                <img src="https://apexipoaccess.com/assets/spacex-logo.png" alt="" width="28" height="28" style="display:block;width:28px;height:28px">
              </td>
              <td style="vertical-align:middle">
                <span class="brand-text" style="font-family:'Inter','Roboto',Arial,sans-serif;font-size:20px;font-weight:700;letter-spacing:-0.2px">APEX</span>
                <span class="brand-sub" style="font-family:'Inter','Roboto',Arial,sans-serif;font-size:20px;font-weight:400;letter-spacing:-0.2px;margin-left:4px">IPO Access</span>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Card -->
        <tr><td class="card" style="border:1px solid;border-radius:12px;padding:32px 28px">

          <h1 class="heading" style="margin:0 0 24px;font-family:'Inter','Roboto',Arial,sans-serif;font-size:22px;font-weight:500;letter-spacing:-0.3px;line-height:1.3">Confirm your email for APEX IPO Access</h1>

          <p class="body-text" style="margin:0 0 16px;font-size:14px;line-height:1.65"><span class="meta">To:</span> ${email}</p>

          <p class="body-text" style="margin:0 0 8px;font-size:14px;line-height:1.65">Hi ${name}, you recently signed up for APEX IPO Access. Use the verification code below to confirm your email and finish setting up your account.</p>

          <h2 class="heading" style="margin:28px 0 16px;font-family:'Inter','Roboto',Arial,sans-serif;font-size:15px;font-weight:600">Your verification code</h2>

          <!-- Step 1 -->
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 8px">
            <tr>
              <td valign="top" width="36" style="padding-top:2px">
                <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                  <td align="center" valign="middle" width="26" height="26" class="step-circle" style="border-radius:50%;font-family:'Inter','Roboto',Arial,sans-serif;font-size:13px;font-weight:600">1</td>
                </tr></table>
              </td>
              <td style="padding-left:4px">
                <div class="code-box" style="padding:14px 16px;border-radius:8px;display:inline-block">
                  <span class="code-digits" style="font-family:'SF Mono','Roboto Mono','Courier New',monospace;font-size:24px;font-weight:600;letter-spacing:8px">${code}</span>
                </div>
                <div class="code-expiry" style="margin-top:8px;font-size:12px;line-height:1.5">Code expires in 10 minutes. You can copy and paste it.</div>
              </td>
            </tr>
          </table>

          <!-- Step 2 -->
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:20px 0 0">
            <tr>
              <td valign="top" width="36" style="padding-top:2px">
                <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                  <td align="center" valign="middle" width="26" height="26" class="step-circle" style="border-radius:50%;font-family:'Inter','Roboto',Arial,sans-serif;font-size:13px;font-weight:600">2</td>
                </tr></table>
              </td>
              <td style="padding-left:4px">
                <div class="step-title" style="font-size:14px;font-weight:600;line-height:1.4">Enter the code in your browser</div>
                <div class="step-desc" style="margin-top:4px;font-size:13px;line-height:1.55">Return to the verification page and paste the 6-digit code to activate your account.</div>
              </td>
            </tr>
          </table>

          <!-- Security tip -->
          <p class="security" style="margin:32px 0 0;padding:14px 16px;border-radius:8px;font-size:12px;line-height:1.6">
            <strong>Security tip:</strong> APEX IPO Access will never ask you to share this code. If you didn't request it, you can safely ignore this email.
          </p>

        </td></tr>

        <!-- Footer -->
        <tr><td align="center" style="padding:24px 8px 8px">
          <p class="footer" style="margin:0 0 6px;font-size:11px;line-height:1.6">You received this email because you signed up at <a class="link" href="https://apexipoaccess.com" style="text-decoration:none">apexipoaccess.com</a></p>
          <p class="footer" style="margin:0 0 6px;font-size:11px;line-height:1.6">Need help? Contact <a class="link" href="mailto:support@apexipoaccess.com" style="text-decoration:none">support@apexipoaccess.com</a></p>
          <p class="footer-small" style="margin:14px 0 0;font-size:10px;line-height:1.6">© ${new Date().getFullYear()} APEX IPO Access · Investment Intelligence Platform</p>
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
        subject: `Confirm your email for APEX IPO Access`,
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
