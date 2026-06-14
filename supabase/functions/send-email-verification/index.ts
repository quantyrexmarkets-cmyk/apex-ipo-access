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
<title>Verification code</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:#1f2123;font-family:'Montserrat',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#e3e3e3">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#1f2123;padding:32px 16px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px">

        <!-- Brand Header (text only, no card) -->
        <tr><td style="padding:0 8px 28px">
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding-right:12px;vertical-align:middle">
                <img src="https://apexipoaccess.com/assets/spacex-logo.png" alt="" width="32" height="32" style="display:block;width:32px;height:32px">
              </td>
              <td style="vertical-align:middle">
                <div style="font-family:'Montserrat',sans-serif;font-size:18px;font-weight:400;color:#e3e3e3;letter-spacing:0.3px">
                  <span style="font-weight:700;color:#ffffff">APEX</span> <span style="color:#a0a4a8">IPO Access</span>
                </div>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Card (subtle border, dark gray bg matching Google style) -->
        <tr><td style="background:#28292c;border:1px solid #3c3f43;border-radius:12px;padding:32px 28px">

          <h1 style="margin:0 0 24px;font-family:'Montserrat',sans-serif;font-size:22px;font-weight:500;color:#ffffff;letter-spacing:-0.2px;line-height:1.3">Confirm your email for APEX IPO Access</h1>

          <p style="margin:0 0 16px;font-size:14px;line-height:1.65;color:#c8ccd0"><span style="color:#a0a4a8">To:</span> ${email}</p>

          <p style="margin:0 0 20px;font-size:14px;line-height:1.65;color:#c8ccd0">Hi ${name}, you recently signed up for APEX IPO Access. Use the verification code below to confirm your email and finish setting up your account.</p>

          <!-- Section heading -->
          <h2 style="margin:28px 0 16px;font-size:15px;font-weight:600;color:#ffffff;letter-spacing:0.2px">Your verification code</h2>

          <!-- Code with numbered marker like Google's "1" circle -->
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 8px">
            <tr>
              <td valign="top" width="36" style="padding-top:2px">
                <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                  <td align="center" valign="middle" width="26" height="26" style="background:#5fb0ff;border-radius:50%;font-family:'Montserrat',sans-serif;font-size:13px;font-weight:600;color:#0d1117">1</td>
                </tr></table>
              </td>
              <td style="padding-left:4px">
                <div style="font-family:'SF Mono','Courier New',monospace;font-size:26px;font-weight:600;color:#ffffff;letter-spacing:8px;line-height:1.3">${code}</div>
                <div style="margin-top:6px;font-size:12px;color:#8b9097;line-height:1.5">Code expires in 10 minutes. You can copy and paste it.</div>
              </td>
            </tr>
          </table>

          <!-- Step 2 -->
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:20px 0 0">
            <tr>
              <td valign="top" width="36" style="padding-top:2px">
                <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                  <td align="center" valign="middle" width="26" height="26" style="background:#5fb0ff;border-radius:50%;font-family:'Montserrat',sans-serif;font-size:13px;font-weight:600;color:#0d1117">2</td>
                </tr></table>
              </td>
              <td style="padding-left:4px">
                <div style="font-size:14px;font-weight:600;color:#ffffff;line-height:1.4">Enter the code in your browser</div>
                <div style="margin-top:4px;font-size:13px;color:#a0a4a8;line-height:1.55">Return to the verification page and paste the 6-digit code to activate your account.</div>
              </td>
            </tr>
          </table>

          <!-- Security note -->
          <p style="margin:32px 0 0;padding:14px 16px;background:#1f2123;border-radius:8px;font-size:12px;line-height:1.6;color:#a0a4a8">
            <strong style="color:#e3e3e3">Security tip:</strong> APEX IPO Access will never ask you to share this code. If you didn't request it, you can safely ignore this email.
          </p>

        </td></tr>

        <!-- Footer (outside card, minimal like Google) -->
        <tr><td align="center" style="padding:24px 8px 8px">
          <p style="margin:0 0 6px;font-size:11px;color:#8b9097;line-height:1.6">You received this email because you signed up at <a href="https://apexipoaccess.com" style="color:#5fb0ff;text-decoration:none">apexipoaccess.com</a></p>
          <p style="margin:0 0 6px;font-size:11px;color:#8b9097;line-height:1.6">Need help? Contact <a href="mailto:support@apexipoaccess.com" style="color:#5fb0ff;text-decoration:none">support@apexipoaccess.com</a></p>
          <p style="margin:14px 0 0;font-size:10px;color:#6b6f74;line-height:1.6">© ${new Date().getFullYear()} APEX IPO Access · Investment Intelligence Platform</p>
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
