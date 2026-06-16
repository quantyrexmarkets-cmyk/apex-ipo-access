import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";

serve(async (req) => {
  // CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, content-type",
      },
    });
  }

  try {
    const { email, code } = await req.json();

    if (!email || !code) {
      return new Response(JSON.stringify({ error: "Missing email or code" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    // Send email via Resend (free tier: 100 emails/day)
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Apex IPO Access <security@yourdomain.com>",
        to: [email],
        subject: `${code} is your APEX verification code`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:40px 20px">
            <div style="text-align:center;margin-bottom:30px">
              <h1 style="color:#000;font-size:24px;margin:0">Apex IPO Access</h1>
              <p style="color:#666;font-size:13px;margin:4px 0 0">Investment Intelligence</p>
            </div>
            <div style="background:#f8f9fa;border-radius:12px;padding:30px;text-align:center">
              <p style="color:#333;font-size:15px;margin:0 0 20px">Your verification code is:</p>
              <div style="font-size:36px;font-weight:700;letter-spacing:8px;color:#1a1a1a;font-family:monospace;background:#fff;padding:16px;border-radius:8px;border:1px solid #e0e0e0">
                ${code}
              </div>
              <p style="color:#888;font-size:12px;margin:20px 0 0">This code expires in 5 minutes.<br>If you didn't request this, please ignore this email.</p>
            </div>
            <p style="color:#aaa;font-size:11px;text-align:center;margin-top:24px">
              APEX Capital Markets LLC · Secure Login Verification
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
