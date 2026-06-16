const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

function generateToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

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
    const { email, userId, firstName } = await req.json();
    if (!email || !userId) {
      return new Response(JSON.stringify({ error: "Missing email or userId" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    const name = firstName ? firstName : "Investor";
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

    // Save token via service role (bypasses RLS)
    const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/email_verification_codes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Prefer": "return=minimal",
      },
      body: JSON.stringify({
        user_id: userId,
        token: token,
        code: token.substring(0, 6).toUpperCase(),
        expires_at: expiresAt,
      }),
    });

    if (!insertRes.ok) {
      const err = await insertRes.text();
      console.error("DB insert error:", err);
      return new Response(JSON.stringify({ error: "Failed to save token: " + err }), {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    const verifyUrl = `https://apexipoaccess.com/verify-email.html?token=${token}`;

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>Confirm your email</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Oswald:wght@300;400;500;600;700&display=swap" rel="stylesheet">
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
  .verify-btn { background:#4a9eff !important; color:#ffffff !important; }
  .fallback-box { background:#ffffff !important; border:1px solid #dadce0 !important; color:#5f6368 !important; }
  .fallback-url { color:#4a9eff !important; }
  .security { background:#f1f3f4 !important; color:#5f6368 !important; }
  .security strong { color:#202124 !important; }
  .footer { color:#5f6368 !important; }
  .footer-small { color:#80868b !important; }
  a.link { color:#4a9eff !important; }

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
    .verify-btn { background:#4a9eff !important; color:#0d1117 !important; }
    .fallback-box { background:#1f2123 !important; border:1px solid #3c3f43 !important; color:#a0a4a8 !important; }
    .fallback-url { color:#4a9eff !important; }
    .security { background:#1f2123 !important; color:#a0a4a8 !important; }
    .security strong { color:#e3e3e3 !important; }
    .footer { color:#a0a4a8 !important; }
    .footer-small { color:#6b6f74 !important; }
    a.link { color:#4a9eff !important; }
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
              <td align="center" style="vertical-align:middle">
                <img src="https://apexipoaccess.com/assets/apex-logo-dark.png?v=2" alt="" width="180" style="display:block;max-width:180px;height:auto">
              </td>
              <td style="vertical-align:middle">
                <span class="brand-text" style="font-family:'Oswald','Impact','Helvetica Neue',Arial,sans-serif;font-size:26px;font-weight:600;letter-spacing:2px;text-transform:uppercase">APEX</span>
                <span class="brand-sub" style="font-family:'Oswald','Impact','Helvetica Neue',Arial,sans-serif;font-size:26px;font-weight:300;letter-spacing:2px;text-transform:uppercase;margin-left:6px">IPO Access</span>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Card -->
        <tr><td class="card" style="border:1px solid;border-radius:12px;padding:36px 32px">

          <h1 class="heading" style="margin:0 0 24px;font-family:'Inter','Roboto',Arial,sans-serif;font-size:22px;font-weight:500;letter-spacing:-0.3px;line-height:1.3">Confirm your email address</h1>

          <p class="body-text" style="margin:0 0 16px;font-size:14px;line-height:1.7">Hi ${name},</p>

          <p class="body-text" style="margin:0 0 16px;font-size:14px;line-height:1.7">Thank you for registering with Apex IPO Access. To complete your account setup and activate your access to our investment intelligence platform, please confirm your email address by clicking the button below.</p>

          <!-- Verify Button -->
          <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:32px auto">
            <tr><td align="center" class="verify-btn" style="border-radius:8px">
              <a href="${verifyUrl}" target="_blank" class="verify-btn" style="display:inline-block;padding:14px 36px;font-family:'Inter','Roboto',Arial,sans-serif;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;letter-spacing:0.2px">Verify Email Address</a>
            </td></tr>
          </table>

          <p class="step-desc" style="margin:0 0 14px;font-size:13px;line-height:1.6;text-align:center">This verification link will expire in <strong>24 hours</strong>.</p>

          <!-- Fallback URL -->
          <p class="meta" style="margin:32px 0 10px;font-size:12px;line-height:1.6">If the button above doesn't work, copy and paste this link into your browser:</p>
          <div class="fallback-box" style="padding:12px 14px;border-radius:8px;word-break:break-all;font-family:'SF Mono','Roboto Mono','Courier New',monospace;font-size:12px;line-height:1.5">
            <a href="${verifyUrl}" class="fallback-url" style="text-decoration:none">${verifyUrl}</a>
          </div>

          <!-- Security tip -->
          <p class="security" style="margin:32px 0 0;padding:14px 16px;border-radius:8px;font-size:12px;line-height:1.6">
            <strong>Security Notice:</strong> Apex IPO Access will never ask you to share this link or your login credentials. If you did not create an account with us, you may safely disregard this email — no action is required.
          </p>

        </td></tr>

        <!-- Footer -->
        <tr><td align="center" style="padding:24px 8px 8px">
          <p class="footer" style="margin:0 0 6px;font-size:11px;line-height:1.6">You are receiving this email because you signed up at <a class="link" href="https://apexipoaccess.com" style="text-decoration:none">apexipoaccess.com</a></p>
          <p class="footer" style="margin:0 0 6px;font-size:11px;line-height:1.6">For assistance, contact <a class="link" href="mailto:support@apexipoaccess.com" style="text-decoration:none">support@apexipoaccess.com</a></p>
          <p class="footer-small" style="margin:14px 0 0;font-size:10px;line-height:1.6">© ${new Date().getFullYear()} Apex IPO Access · Investment Intelligence Platform</p>
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
        from: "Apex IPO Access <noreply@apexipoaccess.com>",
        to: [email],
        subject: `Confirm your email address - Apex IPO Access`,
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
