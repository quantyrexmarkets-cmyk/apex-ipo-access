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
<body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1a1f2e">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:32px 16px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">

        <!-- Brand Header (outside card) -->
        <tr><td align="left" style="padding:0 4px 20px">
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding-right:10px;vertical-align:middle">
                <img src="https://apexipoaccess.com/assets/spacex-logo.png" alt="APEX" width="28" height="28" style="display:block;width:28px;height:28px">
              </td>
              <td style="vertical-align:middle">
                <div style="font-size:13px;font-weight:700;letter-spacing:1.8px;color:#1a1f2e;line-height:1.1">APEX IPO ACCESS</div>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- White Card -->
        <tr><td style="background:#ffffff;border:1px solid #e5e8ee;border-radius:8px;padding:40px 36px">

          <!-- Eyebrow -->
          <p style="margin:0 0 8px;font-size:11px;font-weight:600;letter-spacing:1.2px;color:#6a7585;text-transform:uppercase">Security · Verification Code</p>

          <!-- Heading -->
          <h1 style="margin:0 0 20px;font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:400;color:#1a1f2e;letter-spacing:-0.3px;line-height:1.3">Confirm your email address</h1>

          <!-- Body -->
          <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#3a4250">Dear ${name},</p>

          <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#3a4250">To complete your account verification with APEX IPO Access, please enter the one-time verification code below in your active browser session.</p>

          <!-- Code -->
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 28px;border-collapse:collapse">
            <tr><td align="center" style="background:#f8f9fb;border:1px solid #e5e8ee;border-radius:6px;padding:24px 16px">
              <div style="font-family:'SF Mono','Courier New',monospace;font-size:30px;font-weight:600;color:#1a1f2e;letter-spacing:10px;line-height:1">${code}</div>
              <div style="margin-top:10px;font-size:11px;color:#8b95a8;letter-spacing:0.5px">Expires in 10 minutes</div>
            </td></tr>
          </table>

          <p style="margin:0 0 16px;font-size:13px;line-height:1.6;color:#3a4250">If you did not request this code, please disregard this email. Your account remains secure.</p>

          <p style="margin:0 0 4px;font-size:13px;line-height:1.6;color:#3a4250">Kind regards,</p>
          <p style="margin:0;font-size:13px;font-weight:600;color:#1a1f2e">The APEX IPO Access Team</p>

        </td></tr>

        <!-- Security Notice -->
        <tr><td style="padding:24px 4px 16px">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#fef9e7;border:1px solid #f5e6a8;border-radius:6px;padding:14px 16px">
            <tr><td style="font-size:12px;line-height:1.55;color:#5c4a14">
              <strong style="color:#3d3208">Security Notice:</strong> APEX IPO Access will never ask you to share this code by phone, email, or chat. Never disclose this code to anyone, including APEX staff.
            </td></tr>
          </table>
        </td></tr>

        <!-- Footer -->
        <tr><td align="center" style="padding:32px 4px 16px;font-size:11px;line-height:1.7;color:#6a7585">

          <!-- Social icons -->
          <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto 16px">
            <tr>
              <td style="padding:0 5px">
                <a href="https://apexipoaccess.com" style="text-decoration:none">
                  <table role="presentation" cellpadding="0" cellspacing="0"><tr><td align="center" valign="middle" width="30" height="30" style="background:#ffffff;border:1px solid #e5e8ee;border-radius:50%;font-family:Arial,sans-serif;font-size:13px;font-weight:700;color:#1a1f2e">A</td></tr></table>
                </a>
              </td>
              <td style="padding:0 5px">
                <a href="https://twitter.com/apexipoaccess" style="text-decoration:none">
                  <table role="presentation" cellpadding="0" cellspacing="0"><tr><td align="center" valign="middle" width="30" height="30" style="background:#ffffff;border:1px solid #e5e8ee;border-radius:50%;font-family:Arial,sans-serif;font-size:12px;font-weight:700;color:#1a1f2e">𝕏</td></tr></table>
                </a>
              </td>
              <td style="padding:0 5px">
                <a href="https://linkedin.com/company/apexipoaccess" style="text-decoration:none">
                  <table role="presentation" cellpadding="0" cellspacing="0"><tr><td align="center" valign="middle" width="30" height="30" style="background:#ffffff;border:1px solid #e5e8ee;border-radius:50%;font-family:Arial,sans-serif;font-size:11px;font-weight:700;color:#1a1f2e">in</td></tr></table>
                </a>
              </td>
              <td style="padding:0 5px">
                <a href="mailto:support@apexipoaccess.com" style="text-decoration:none">
                  <table role="presentation" cellpadding="0" cellspacing="0"><tr><td align="center" valign="middle" width="30" height="30" style="background:#ffffff;border:1px solid #e5e8ee;border-radius:50%;font-family:Arial,sans-serif;font-size:14px;color:#1a1f2e">✉</td></tr></table>
                </a>
              </td>
            </tr>
          </table>

          <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#1a1f2e;letter-spacing:0.5px">APEX IPO Access</p>
          <p style="margin:0 0 8px;color:#8b95a8">Investment Intelligence Platform</p>
          <p style="margin:0 0 4px"><a href="mailto:support@apexipoaccess.com" style="color:#1a1f2e;text-decoration:underline">support@apexipoaccess.com</a></p>
          <p style="margin:0 0 12px"><a href="https://apexipoaccess.com" style="color:#6a7585;text-decoration:none">apexipoaccess.com</a></p>
          <p style="margin:0;font-size:10px;color:#8b95a8;line-height:1.6">This is a transactional message from APEX IPO Access.<br>© ${new Date().getFullYear()} APEX IPO Access. All rights reserved.</p>
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
