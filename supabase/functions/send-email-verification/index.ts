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

    const digits = String(code).split("").map((d) =>
      `<td align="center" style="padding:0 6px"><div style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:26px;font-weight:600;color:#fff;letter-spacing:1px;width:32px">${d}</div></td>`
    ).join("");

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Confirm your email</title></head>
<body style="margin:0;padding:0;background:#161b24;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif;color:#fff">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#161b24;padding:40px 16px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#1c2230;border-radius:14px;padding:36px 32px">

        <!-- Brand Header -->
        <tr><td align="center" style="padding-bottom:36px">
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding-right:14px;vertical-align:middle">
                <img src="https://apexipoaccess.com/assets/spacex-logo.png" alt="APEX" width="48" height="48" style="display:block;width:48px;height:48px">
              </td>
              <td style="vertical-align:middle;text-align:left">
                <div style="font-size:18px;font-weight:700;letter-spacing:2.5px;color:#fff;line-height:1.1">APEX</div>
                <div style="font-size:13px;font-weight:600;letter-spacing:2px;color:#fff;line-height:1.1;margin-top:3px">IPO ACCESS</div>
                <div style="font-size:9px;font-weight:500;letter-spacing:1.2px;color:#4a9eff;line-height:1.1;margin-top:3px">INVESTMENT INTELLIGENCE</div>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Heading -->
        <tr><td align="center" style="padding-bottom:18px">
          <h1 style="margin:0;font-size:18px;font-weight:600;color:#fff;letter-spacing:-0.2px;line-height:1.3">Confirm your email</h1>
        </td></tr>

        <!-- Code Box -->
        <tr><td style="padding:10px 0 22px">
          <table role="presentation" cellpadding="0" cellspacing="0" align="center" width="100%" style="background:#262d3d;border:1px solid #2f3848;border-radius:10px;padding:22px 12px">
            <tr><td align="center">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>${digits}</tr>
              </table>
            </td></tr>
          </table>
        </td></tr>

        <!-- Body Copy -->
        <tr><td style="padding:8px 0;font-size:13px;line-height:1.65;color:#fff">
          <p style="margin:0 0 10px;color:#fff">Hi${firstName ? ' ' + firstName : ''}, use the verification code above to confirm your email and finish setting up your APEX IPO Access account.</p>
          <p style="margin:0 0 10px;color:#fff">The code expires in 10 minutes. You can copy and paste it — no need to remember.</p>
          <p style="margin:16px 0 0;font-size:12px;color:#cfd8e8">For your security, never share this code with anyone — not even APEX staff.</p>
        </td></tr>

        <!-- Support Note -->
        <tr><td style="padding:22px 0 0;font-size:11px;line-height:1.6;color:#a8b2c1">
          <p style="margin:0">Didn't request this code? You can safely ignore this email or contact <a href="mailto:support@apexipoaccess.com" style="color:#3ed598;text-decoration:none">APEX support</a>.</p>
        </td></tr>

        <!-- Gradient Divider -->
        <tr><td style="padding:28px 0 22px">
          <div style="height:2px;background:linear-gradient(90deg,#3ed598 0%,#4a9eff 50%,#ffb800 100%);border-radius:2px"></div>
        </td></tr>

        <!-- Footer Centered -->
        <tr><td align="center" style="padding:0;font-size:11px;line-height:1.7;color:#a8b2c1;text-align:center">
          <p style="margin:0 0 6px;color:#fff;font-size:12px;font-weight:600;letter-spacing:0.5px">APEX IPO Access</p>
          <p style="margin:0 0 14px;color:#a8b2c1;font-size:11px">Investment Intelligence Platform</p>

          <!-- Social Icons -->
          <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto 16px">
            <tr>
              <td style="padding:0 6px">
                <a href="https://apexipoaccess.com" style="text-decoration:none">
                  <table role="presentation" cellpadding="0" cellspacing="0"><tr><td align="center" valign="middle" width="32" height="32" style="background:#262d3d;border-radius:50%;border:1px solid #2f3848">
                    <img src="https://apexipoaccess.com/assets/spacex-logo.png" alt="Site" width="16" height="16" style="display:block;width:16px;height:16px;margin:0 auto">
                  </td></tr></table>
                </a>
              </td>
              <td style="padding:0 6px">
                <a href="https://apexipoaccess.com" style="text-decoration:none">
                  <table role="presentation" cellpadding="0" cellspacing="0"><tr><td align="center" valign="middle" width="32" height="32" style="background:#262d3d;border-radius:50%;border:1px solid #2f3848;font-family:Arial,sans-serif;font-size:13px;font-weight:700;color:#4a9eff">X</td></tr></table>
                </a>
              </td>
              <td style="padding:0 6px">
                <a href="https://apexipoaccess.com" style="text-decoration:none">
                  <table role="presentation" cellpadding="0" cellspacing="0"><tr><td align="center" valign="middle" width="32" height="32" style="background:#262d3d;border-radius:50%;border:1px solid #2f3848;font-family:Arial,sans-serif;font-size:11px;font-weight:700;color:#3ed598">in</td></tr></table>
                </a>
              </td>
              <td style="padding:0 6px">
                <a href="mailto:support@apexipoaccess.com" style="text-decoration:none">
                  <table role="presentation" cellpadding="0" cellspacing="0"><tr><td align="center" valign="middle" width="32" height="32" style="background:#262d3d;border-radius:50%;border:1px solid #2f3848;font-family:Arial,sans-serif;font-size:13px;color:#ffb800">✉</td></tr></table>
                </a>
              </td>
            </tr>
          </table>

          <p style="margin:0 0 4px"><a href="mailto:support@apexipoaccess.com" style="color:#3ed598;text-decoration:none">support@apexipoaccess.com</a></p>
          <p style="margin:0 0 4px"><a href="https://apexipoaccess.com" style="color:#a8b2c1;text-decoration:none">apexipoaccess.com</a></p>
          <p style="margin:8px 0 0;color:#6a7585;font-size:10px">© ${new Date().getFullYear()} APEX IPO Access. All rights reserved.</p>
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
        subject: `Confirm your email`,
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
