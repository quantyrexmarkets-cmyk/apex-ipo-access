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
      `<td style="padding:0 6px"><div style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:28px;font-weight:600;color:#fff;letter-spacing:2px">${d}</div></td>`
    ).join("");

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Confirm your email</title></head>
<body style="margin:0;padding:0;background:#0a0d12;font-family:'Helvetica Neue',Arial,sans-serif;color:#e8eef7">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0d12;padding:40px 20px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">
        <tr><td style="padding-bottom:32px">
          <div style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:18px;font-weight:700;letter-spacing:3px;color:#fff">APEX <span style="color:#4a9eff">·</span> IPO ACCESS</div>
        </td></tr>

        <tr><td style="padding-bottom:24px">
          <h1 style="margin:0;font-size:28px;font-weight:600;color:#fff;letter-spacing:-0.5px"><span style="background:#3a2d10;color:#ffb800;padding:2px 8px;border-radius:4px">Confirm</span> your <span style="background:#1a2d3a;color:#4a9eff;padding:2px 8px;border-radius:4px">email</span></h1>
        </td></tr>

        <tr><td style="padding:24px 0">
          <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="background:#141921;border-radius:12px;padding:24px 16px">
            <tr>${digits}</tr>
          </table>
        </td></tr>

        <tr><td style="padding:24px 0 0;font-size:15px;line-height:1.6;color:#cfd8e8">
          <p style="margin:0 0 14px">This is your one time code to access APEX IPO ACCESS.<br>Use it to log in.</p>
          <p style="margin:0 0 14px">You can copy-paste it, there is no need to remember it.</p>
          <p style="margin:24px 0 0;color:#a8b2c1">Never share this code with anyone.</p>
        </td></tr>

        <tr><td style="padding:32px 0 0;font-size:13px;line-height:1.6;color:#7a8699">
          <p style="margin:0">Not you who just tried to log in? Please ignore this message and contact our support through <a href="mailto:support@apexipoaccess.com" style="color:#3ed598;text-decoration:none">APEX support</a>.</p>
        </td></tr>

        <tr><td style="padding:24px 0">
          <div style="height:3px;background:linear-gradient(90deg,#3ed598,#4a9eff,#ffb800);border-radius:2px"></div>
        </td></tr>

        <tr><td style="padding:8px 0;font-size:12px;line-height:1.6;color:#7a8699">
          <p style="margin:0 0 6px;color:#a8b2c1">APEX IPO ACCESS Ltd.</p>
          <p style="margin:0 0 6px"><a href="mailto:support@apexipoaccess.com" style="color:#3ed598;text-decoration:none">support@apexipoaccess.com</a></p>
          <p style="margin:0;color:#5a6675">Investment Intelligence Platform</p>
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
