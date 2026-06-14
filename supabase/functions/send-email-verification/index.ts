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
      `<td align="center" style="padding:0 5px"><div style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:24px;font-weight:600;color:#fff;letter-spacing:1px;width:32px">${d}</div></td>`
    ).join("");

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Confirm your email</title></head>
<body style="margin:0;padding:0;background:#0a0d12;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif;color:#e8eef7">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0d12;padding:32px 16px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px">

        <!-- Brand Header -->
        <tr><td style="padding-bottom:32px">
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding-right:10px;vertical-align:middle">
                <img src="https://apexipoaccess.com/assets/spacex-logo.png" alt="APEX" width="28" height="28" style="display:block;width:28px;height:28px">
              </td>
              <td style="vertical-align:middle">
                <div style="font-size:13px;font-weight:700;letter-spacing:2px;color:#fff;line-height:1.1">APEX</div>
                <div style="font-size:10px;font-weight:600;letter-spacing:1.5px;color:#fff;line-height:1.1;margin-top:1px">IPO ACCESS</div>
                <div style="font-size:7px;font-weight:500;letter-spacing:1px;color:#4a9eff;line-height:1.1;margin-top:2px">INVESTMENT INTELLIGENCE</div>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Heading -->
        <tr><td style="padding-bottom:20px">
          <h1 style="margin:0;font-size:20px;font-weight:600;color:#fff;letter-spacing:-0.3px;line-height:1.3"><span style="background:rgba(255,184,0,0.18);color:#ffb800;padding:1px 7px;border-radius:4px">Confirm</span> your <span style="background:rgba(74,158,255,0.18);color:#4a9eff;padding:1px 7px;border-radius:4px">email</span></h1>
        </td></tr>

        <!-- Code Box -->
        <tr><td style="padding:12px 0 20px">
          <table role="presentation" cellpadding="0" cellspacing="0" align="center" width="100%" style="background:#141921;border:1px solid #1f2630;border-radius:10px;padding:20px 12px">
            <tr><td align="center">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>${digits}</tr>
              </table>
            </td></tr>
          </table>
        </td></tr>

        <!-- Body Copy -->
        <tr><td style="padding:12px 0;font-size:14px;line-height:1.6;color:#cfd8e8">
          <p style="margin:0 0 12px">Hi${firstName ? ' ' + firstName : ''}, use the verification code above to confirm your email and finish setting up your APEX IPO Access account.</p>
          <p style="margin:0 0 12px">The code expires in 10 minutes. You can copy and paste it — no need to remember.</p>
          <p style="margin:18px 0 0;color:#a8b2c1;font-size:13px">For your security, never share this code with anyone — not even APEX staff.</p>
        </td></tr>

        <!-- Support Note -->
        <tr><td style="padding:24px 0 0;font-size:12px;line-height:1.6;color:#7a8699">
          <p style="margin:0">Didn't request this code? You can safely ignore this email or contact <a href="mailto:support@apexipoaccess.com" style="color:#3ed598;text-decoration:none">APEX support</a>.</p>
        </td></tr>

        <!-- Gradient Divider -->
        <tr><td style="padding:28px 0 20px">
          <div style="height:2px;background:linear-gradient(90deg,#3ed598 0%,#4a9eff 50%,#ffb800 100%);border-radius:2px"></div>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:0;font-size:11px;line-height:1.6;color:#7a8699">
          <p style="margin:0 0 4px;color:#a8b2c1;font-size:12px;font-weight:600">APEX IPO Access Ltd.</p>
          <p style="margin:0 0 4px">Investment Intelligence Platform</p>
          <p style="margin:0 0 4px"><a href="mailto:support@apexipoaccess.com" style="color:#3ed598;text-decoration:none">support@apexipoaccess.com</a></p>
          <p style="margin:0;color:#5a6675;font-size:10px">© ${new Date().getFullYear()} APEX IPO Access. All rights reserved.</p>
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
