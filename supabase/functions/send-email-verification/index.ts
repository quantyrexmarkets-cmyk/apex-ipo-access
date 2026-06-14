import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";

serve(async (req) => {
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

    const name = firstName || "Investor";

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "APEX IPO Access <noreply@apexipoaccess.com>",
        to: [email],
        subject: `${code} is your APEX email verification code`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:40px 20px;background:#000;color:#fff">
            <div style="text-align:center;margin-bottom:30px">
              <h1 style="color:#fff;font-size:24px;margin:0;letter-spacing:3px">APEX IPO ACCESS</h1>
              <p style="color:#4a9eff;font-size:11px;margin:6px 0 0;letter-spacing:2px">INVESTMENT INTELLIGENCE</p>
            </div>

            <div style="background:#0a0d12;border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:32px;text-align:center">
              <h2 style="color:#fff;font-size:20px;margin:0 0 8px;font-weight:600">Verify your email</h2>
              <p style="color:#8b95a8;font-size:14px;margin:0 0 24px;line-height:1.5">
                Hi ${name},<br>Please enter this code to confirm your email address and complete your account setup.
              </p>

              <div style="font-size:36px;font-weight:700;letter-spacing:10px;color:#fff;font-family:'Courier New',monospace;background:#000;padding:20px;border-radius:10px;border:1px solid rgba(74,158,255,0.3)">
                ${code}
              </div>

              <p style="color:#6a7585;font-size:12px;margin:24px 0 0">
                This code expires in 10 minutes.<br>
                If you didn't request this, please ignore this email.
              </p>
            </div>

            <p style="color:#6a7585;font-size:11px;text-align:center;margin-top:24px;line-height:1.6">
              APEX IPO ACCESS &middot; Secure Email Verification<br>
              Questions? <a href="mailto:support@apexipoaccess.com" style="color:#4a9eff">support@apexipoaccess.com</a>
            </p>
          </div>
        `,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Resend error:", err);
      return new Response(JSON.stringify({ error: "Failed to send email" }), {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
});
// trigger deploy

