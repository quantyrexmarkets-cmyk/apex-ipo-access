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
<head><meta charset="UTF-8"><title>Verification code</title></head>
<body style="margin:0;padding:0;background:#0a0d12;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#e8eef7">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0d12;padding:32px 16px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">

        <!-- Brand Header -->
        <tr><td align="left" style="padding:0 4px 24px">
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding-right:14px;vertical-align:middle">
                <img src="https://apexipoaccess.com/assets/spacex-x-blue.svg" alt="APEX" width="48" height="48" style="display:block;width:48px;height:48px">
              </td>
              <td style="vertical-align:middle">
                <div style="font-family:'Manrope','Helvetica Neue',Arial,sans-serif;font-size:20px;font-weight:300;letter-spacing:3px;color:#ffffff;line-height:1.1">APEX IPO ACCESS</div>
                <div style="font-family:'Manrope','Helvetica Neue',Arial,sans-serif;font-size:11px;font-weight:300;letter-spacing:2px;color:#4a9eff;line-height:1.1;margin-top:6px">INVESTMENT INTELLIGENCE</div>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Card -->
        <tr><td style="background:#141a24;border:1px solid #1f2630;border-radius:10px;padding:40px 36px">

          <!-- Eyebrow -->
          <p style="margin:0 0 10px;font-size:11px;font-weight:600;letter-spacing:1.2px;color:#4a9eff;text-transform:uppercase">Security · Verification Code</p>

          <!-- Heading -->
          <h1 style="margin:0 0 22px;font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:400;color:#ffffff;letter-spacing:-0.3px;line-height:1.3">Confirm your email address</h1>

          <!-- Body -->
          <p style="margin:0 0 14px;font-size:14px;line-height:1.65;color:#cfd8e8">Dear ${name},</p>

          <p style="margin:0 0 24px;font-size:14px;line-height:1.65;color:#cfd8e8">To complete your account verification with APEX IPO Access, please enter the one-time verification code below in your active browser session.</p>

          <!-- Code -->
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 28px;border-collapse:collapse">
            <tr><td align="center" style="background:#0a0d12;border:1px solid #1f2630;border-radius:8px;padding:28px 16px">
              <div style="font-family:'SF Mono','Courier New',monospace;font-size:32px;font-weight:600;color:#ffffff;letter-spacing:10px;line-height:1">${code}</div>
              <div style="margin-top:12px;font-size:11px;color:#8b95a8;letter-spacing:0.5px">Expires in 10 minutes</div>
            </td></tr>
          </table>

          <p style="margin:0 0 18px;font-size:13px;line-height:1.65;color:#a8b2c1">If you did not request this code, please disregard this email. Your account remains secure.</p>

          <p style="margin:0 0 4px;font-size:13px;line-height:1.65;color:#a8b2c1">Kind regards,</p>
          <p style="margin:0;font-size:13px;font-weight:600;color:#ffffff">The APEX IPO Access Team</p>

        </td></tr>

        <!-- Security Notice -->
        <tr><td style="padding:20px 4px 0">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:rgba(255,184,0,0.06);border:1px solid rgba(255,184,0,0.25);border-radius:8px;padding:14px 16px">
            <tr><td style="font-size:12px;line-height:1.6;color:#e8d59a">
              <strong style="color:#ffb800">Security Notice:</strong> APEX IPO Access will never ask you to share this code by phone, email, or chat. Never disclose this code to anyone, including APEX staff.
            </td></tr>
          </table>
        </td></tr>

        <!-- Gradient Divider -->
        <tr><td style="padding:32px 4px 20px">
          <div style="height:2px;background:linear-gradient(90deg,#3ed598 0%,#4a9eff 50%,#ffb800 100%);border-radius:2px"></div>
        </td></tr>

        <!-- Footer -->
        <tr><td align="center" style="padding:0 4px 16px;font-size:11px;line-height:1.7;color:#7a8699">

          <!-- Social icons -->
          <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto 18px">
            <tr>
              <td style="padding:0 5px">
                <a href="https://apexipoaccess.com" style="text-decoration:none">
                  <table role="presentation" cellpadding="0" cellspacing="0"><tr><td align="center" valign="middle" width="32" height="32" style="background:#141a24;border:1px solid #2a3242;border-radius:50%">
                    <img src="https://apexipoaccess.com/assets/spacex-x.png" alt="Web" width="16" height="16" style="display:block;width:16px;height:16px">
                  </td></tr></table>
                </a>
              </td>
              <td style="padding:0 5px">
                <a href="https://twitter.com/apexipoaccess" style="text-decoration:none">
                  <table role="presentation" cellpadding="0" cellspacing="0"><tr><td align="center" valign="middle" width="32" height="32" style="background:#141a24;border:1px solid #2a3242;border-radius:50%;font-family:Arial,sans-serif;font-size:13px;font-weight:700;color:#ffffff">𝕏</td></tr></table>
                </a>
              </td>
              <td style="padding:0 5px">
                <a href="https://linkedin.com/company/apexipoaccess" style="text-decoration:none">
                  <table role="presentation" cellpadding="0" cellspacing="0"><tr><td align="center" valign="middle" width="32" height="32" style="background:#141a24;border:1px solid #2a3242;border-radius:50%;font-family:Arial,sans-serif;font-size:11px;font-weight:700;color:#ffffff">in</td></tr></table>
                </a>
              </td>
              <td style="padding:0 5px">
                <a href="mailto:support@apexipoaccess.com" style="text-decoration:none">
                  <table role="presentation" cellpadding="0" cellspacing="0"><tr><td align="center" valign="middle" width="32" height="32" style="background:#141a24;border:1px solid #2a3242;border-radius:50%;font-family:Arial,sans-serif;font-size:14px;color:#4a9eff">✉</td></tr></table>
                </a>
              </td>
            </tr>
          </table>

          <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#ffffff;letter-spacing:0.4px">APEX IPO Access</p>
          <p style="margin:0 0 10px;color:#8b95a8;font-size:11px">Investment Intelligence Platform</p>
          <p style="margin:0 0 4px"><a href="mailto:support@apexipoaccess.com" style="color:#4a9eff;text-decoration:none">support@apexipoaccess.com</a></p>
          <p style="margin:0 0 14px"><a href="https://apexipoaccess.com" style="color:#7a8699;text-decoration:none">apexipoaccess.com</a></p>
          <p style="margin:0;font-size:10px;color:#6a7585;line-height:1.6">This is a transactional message from APEX IPO Access.<br>© ${new Date().getFullYear()} APEX IPO Access. All rights reserved.</p>
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
        subject: `Your APEX IPO Access verification code`,
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
