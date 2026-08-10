// Resend email — direct fetch (bypasses SDK to avoid networking bugs)
const RESEND_KEY = process.env.RESEND_API_KEY;
const FROM = process.env.EMAIL_FROM || 'Apex IPO Access <noreply@apexipoholdings.com>';
const REPLY_TO = process.env.EMAIL_REPLY_TO || 'support@apexipoholdings.com';
const EMAILS_ENABLED = process.env.EMAILS_ENABLED !== 'false';

async function sendEmail({ to, subject, html, text, replyTo, tags }) {
  try {
    if (!EMAILS_ENABLED) {
      console.error('[email] DISABLED, would send:', { to, subject });
      return { ok: false, error: 'Emails disabled' };
    }
    if (!RESEND_KEY) {
      console.error('[email] No RESEND_API_KEY configured');
      return { ok: false, error: 'No API key' };
    }
    if (!to || !subject || !html) {
      return { ok: false, error: 'Missing to/subject/html' };
    }

    const payload = {
      from: FROM,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text: text || stripHtml(html),
      reply_to: replyTo || REPLY_TO,
    };
    if (tags) payload.tags = tags;

    console.error('[email] Sending to Resend API:', payload.to[0], 'subject:', payload.subject);

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      console.error('[email] Resend rejected:', response.status, JSON.stringify(data));
      return { ok: false, error: (data && data.message) || `HTTP ${response.status}` };
    }

    console.error('[email] Sent! ID:', data?.id);
    return { ok: true, id: data?.id };
  } catch (e) {
    console.error('[email] Network exception:', e.message, e.stack);
    return { ok: false, error: e.message };
  }
}

function stripHtml(html) {
  return String(html)
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

module.exports = { sendEmail };
