// ═══════════════════════════════════════════════════════════════════════════
// APEX IPO Access — Transactional Email Service
// Minimalist Google/Apple-style design with auto user-data lookup
// ═══════════════════════════════════════════════════════════════════════════

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

// ─── ENV ────────────────────────────────────────────────────────────────────
const RESEND_API_KEY     = Deno.env.get('RESEND_API_KEY')     || '';
const PROJECT_URL        = Deno.env.get('PROJECT_URL')        || '';
const SERVICE_ROLE_KEY   = Deno.env.get('SERVICE_ROLE_KEY')   || '';

// ─── SUPABASE ADMIN CLIENT (service role — bypasses RLS) ────────────────────
const sb = createClient(PROJECT_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ─── ACCOUNT TYPE MAPPING ───────────────────────────────────────────────────
const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  'individual': 'Individual Brokerage Account',
  'joint':      'Joint Brokerage Account',
  'ira':        'Traditional or Roth IRA',
  'trust':      'Trust or Entity Account',
};

function formatAccountTypes(types: any): string {
  if (!types) return 'Individual Brokerage Account';
  const arr = Array.isArray(types) ? types : [types];
  if (arr.length === 0) return 'Individual Brokerage Account';
  return arr.map(t => ACCOUNT_TYPE_LABELS[String(t)] || String(t)).join(' • ');
}

// ─── FORMATTERS ─────────────────────────────────────────────────────────────
function fmtMoney(amount: any): string {
  const n = typeof amount === 'string' ? parseFloat(amount) : Number(amount ?? 0);
  if (isNaN(n)) return '$0.00';
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtNum(n: any): string {
  const v = typeof n === 'string' ? parseFloat(n) : Number(n ?? 0);
  if (isNaN(v)) return '0';
  return v.toLocaleString('en-US');
}

function fmtDate(d: any): string {
  if (!d) d = new Date();
  const dt = typeof d === 'string' ? new Date(d) : d;
  return dt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function fmtDateTime(d: any): string {
  if (!d) d = new Date();
  const dt = typeof d === 'string' ? new Date(d) : d;
  return dt.toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }) + ' UTC';
}

function shortId(uuid: any): string {
  if (!uuid) return '—';
  return String(uuid).replace(/-/g, '').slice(-8).toUpperCase();
}

function escape(s: any): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function firstName(fullName: string): string {
  if (!fullName) return 'Investor';
  return fullName.trim().split(/\s+/)[0];
}

// Beautify an email username like "kelvinpaid21" → "Kelvinpaid 21"
function beautifyHandle(handle: string): string {
  if (!handle) return 'Investor';
  let s = handle.trim();
  // Replace dots, dashes, underscores with spaces
  s = s.replace(/[._-]+/g, ' ');
  // Insert space before any digit group: "kelvinpaid21" → "kelvinpaid 21"
  s = s.replace(/([a-zA-Z])(\d)/g, '$1 $2');
  // Capitalize each word
  s = s.split(/\s+/).map(w => w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : '').join(' ').trim();
  return s || 'Investor';
}

// ─── USER LOOKUP (fetches profile from DB) ──────────────────────────────────
interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  first_name: string;
  account_types: string[] | null;
  account_type_label: string;
  account_ref: string;
  jurisdiction: string;
  cash_balance: number;
  created_at: string;
  kyc_status: string | null;
}

async function fetchUser(userId: string): Promise<UserProfile | null> {
  if (!userId) return null;

  // Get profile row (service role bypasses RLS)
  const { data: profile, error: pErr } = await sb
    .from('profiles')
    .select('id,email,first_name,last_name,prefix,suffix,account_types,cash_balance,kyc_status,created_at,country,jurisdiction')
    .eq('id', userId)
    .maybeSingle();

  if (pErr) {
    console.error('fetchUser profile error:', pErr);
  }

  // Get auth user (for email + created_at fallback)
  let authEmail = '';
  let authCreatedAt = '';
  try {
    const { data: authData } = await sb.auth.admin.getUserById(userId);
    authEmail = authData?.user?.email || '';
    authCreatedAt = authData?.user?.created_at || '';
  } catch (e) {
    console.error('fetchUser auth lookup error:', e);
  }

  const email = (profile?.email) || authEmail || '';
  if (!email && !profile) {
    console.error('fetchUser: no profile and no auth user for', userId);
    return null;
  }

  // Build full display name: "Prefix First Last Suffix"
  const realName = [profile?.prefix, profile?.first_name, profile?.last_name, profile?.suffix]
    .filter(Boolean)
    .join(' ')
    .trim();
  const fallbackName = beautifyHandle(email.split('@')[0]);
  const fullName = realName || fallbackName || 'Investor';

  const fname = profile?.first_name
    ? (profile.first_name.charAt(0).toUpperCase() + profile.first_name.slice(1).toLowerCase())
    : fallbackName;

  return {
    id: userId,
    email,
    full_name: fullName,
    first_name: fname,
    account_types: profile?.account_types || null,
    account_type_label: formatAccountTypes(profile?.account_types),
    account_ref: shortId(userId),
    jurisdiction: profile?.country || profile?.jurisdiction || 'United States',
    cash_balance: Number(profile?.cash_balance ?? 0),
    created_at: profile?.created_at || authCreatedAt || new Date().toISOString(),
    kyc_status: profile?.kyc_status || null,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// EMAIL SHELL — Minimalist Google/Apple style
// Centered logo, huge headline, subtitle, single pill button, minimal footer
// ═══════════════════════════════════════════════════════════════════════════
function shell(opts: {
  preheader: string;
  headline: string;       // Big bold headline (28-32px)
  subtitle?: string;      // Short subtitle paragraph under headline
  ctaLabel?: string;      // Optional pill button label
  ctaUrl?: string;        // Optional pill button URL
  detailsHtml?: string;   // Optional plain-text details below button
  footerNote?: string;    // Custom footer note (e.g. "sent because you signed up")
  recipientEmail?: string;// User's email for footer
}): string {
  const cta = (opts.ctaLabel && opts.ctaUrl) ? `
    <tr><td align="center" style="padding:8px 24px 40px">
      <a href="${escape(opts.ctaUrl)}" class="cta"
         style="display:inline-block;background:#1a73e8;color:#ffffff;
                font-family:'Google Sans',Inter,Arial,sans-serif;
                font-size:15px;font-weight:500;text-decoration:none;
                padding:14px 40px;border-radius:24px;letter-spacing:0.1px">
        ${escape(opts.ctaLabel)}
      </a>
    </td></tr>` : '';

  const details = opts.detailsHtml ? `
    <tr><td style="padding:0 32px 36px;font-family:'Google Sans',Inter,Arial,sans-serif;font-size:14px;line-height:1.7;color:#5f6368;text-align:center">
      ${opts.detailsHtml}
    </td></tr>` : '';

  const subtitle = opts.subtitle ? `
    <tr><td style="padding:0 32px 36px;font-family:'Google Sans',Inter,Arial,sans-serif;font-size:15.5px;line-height:1.65;color:#5f6368;text-align:center;padding-bottom:8px" class="subtitle">
      ${escape(opts.subtitle)}
    </td></tr>` : '';

  const footerNote = opts.footerNote || 'You are receiving this email because you have a registered account at apexipoaccess.com';
  const recipientLine = opts.recipientEmail
    ? `This email was sent to <strong style="color:#3c4043" class="footer-strong">${escape(opts.recipientEmail)}</strong>.`
    : '';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${escape(opts.headline)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Oswald:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
  :root { color-scheme: light dark; supported-color-schemes: light dark; }
  body, .bg { background:#1f2123 !important; }
  .card { background:#28292c !important; }
  .brand-apex { color:#1a73e8 !important; }
  .brand-rest { color:#202124 !important; }
  .headline { color:#202124 !important; }
  .subtitle { color:#5f6368 !important; }
  .details { color:#5f6368 !important; }
  .footer { color:#5f6368 !important; }
  .footer-strong { color:#3c4043 !important; }
  .footer-link { color:#1a73e8 !important; }
  .divider { border-color:#e8eaed !important; }
  .cta { background:#1a73e8 !important; color:#ffffff !important; }
  @media (prefers-color-scheme: dark) {
    body, .bg { background:#1f2123 !important; }
    .card { background:#28292c !important; }
    .brand-apex { color:#5fb0ff !important; }
    .brand-rest { color:#ffffff !important; }
    .headline { color:#ffffff !important; }
    .subtitle { color:#bdc1c6 !important; }
    .details { color:#a0a4a8 !important; }
    .footer { color:#a0a4a8 !important; }
    .footer-strong { color:#e3e3e3 !important; }
    .footer-link { color:#5fb0ff !important; }
    .divider { border-color:#3c3f43 !important; }
    .cta { background:#1a73e8 !important; color:#ffffff !important; }
  }
  @media only screen and (max-width:600px) {
    .headline { font-size:26px !important; line-height:1.35 !important; font-weight:400 !important; padding:16px 24px 24px !important; }
    .card { border-radius:16px !important; }
  }
</style>
</head>
<body class="bg" style="margin:0;padding:0;font-family:'Google Sans',Inter,Roboto,-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">

<div style="display:none;max-height:0;overflow:hidden;color:transparent">${escape(opts.preheader)}</div>

<table role="presentation" class="bg" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px">

      <!-- Main card -->
      <tr><td class="card" style="border-radius:20px;padding:0;border:1px solid #3c3f43">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">

          <!-- Brand logo (dark version - white text works on dark card) -->
          <tr><td align="center" style="padding:36px 32px 8px">
            <img src="https://apexipoaccess.com/assets/apex-logo-dark.png?v=2" alt="Apex IPO Access"
                 width="220" style="display:block;margin:0 auto;width:220px;max-width:70%;height:auto">
          </td></tr>

          <!-- Big headline (Google style: lighter weight, more spacing) -->
          <tr><td class="headline" style="padding:24px 32px 28px;font-family:'Google Sans',Inter,Arial,sans-serif;font-size:32px;font-weight:400;line-height:1.35;letter-spacing:-0.3px;text-align:center">${opts.headline.split('\n').map(l => escape(l)).join('<br style="line-height:1.55">')}</td></tr>

          ${subtitle}
          ${cta}
          ${details}

        </table>
      </td></tr>

      <!-- Footer (outside card) -->
      <tr><td style="padding:28px 16px 8px;text-align:center">
        <p class="footer" style="margin:0 0 12px;font-family:'Google Sans',Inter,Arial,sans-serif;font-size:12.5px;line-height:1.6">
          ${recipientLine} ${escape(footerNote)} If you do not wish to receive these emails, please <a href="mailto:support@apexipoaccess.com?subject=Unsubscribe" class="footer-link" style="text-decoration:underline">contact support</a>.
        </p>
        <p class="footer" style="margin:0;font-family:'Google Sans',Inter,Arial,sans-serif;font-size:11.5px;line-height:1.6">
          © ${new Date().getFullYear()} APEX IPO Access LLC ·
          <a href="https://apexipoaccess.com" class="footer-link" style="text-decoration:none">apexipoaccess.com</a>
        </p>
      </td></tr>

    </table>
  </td></tr>
</table>

</body>
</html>`;
}

// ─── Reusable detail-row helper for inside `detailsHtml` ────────────────────
function detailLine(label: string, value: string): string {
  return `<div style="margin:6px 0"><span style="opacity:0.7">${escape(label)}:</span> <strong style="color:inherit">${escape(value)}</strong></div>`;
}

// ─── Reusable detail block (boxed, slightly highlighted) ────────────────────
function detailBlock(rows: Array<{ label: string; value: string }>): string {
  const inner = rows.map(r => detailLine(r.label, r.value)).join('');
  return `<div style="display:inline-block;text-align:left;padding:18px 24px;border-radius:12px;background:rgba(0,0,0,0.03);font-size:13.5px;line-height:1.8">${inner}</div>`;
}

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATE 1: WELCOME (KYC Approved)
// ═══════════════════════════════════════════════════════════════════════════
function tplWelcome(user: UserProfile): string {
  const details = `
    ${detailBlock([
      { label: 'Account Holder', value: user.full_name },
      { label: 'Account Type', value: user.account_type_label },
      { label: 'Account Reference', value: user.account_ref },
      { label: 'Jurisdiction', value: user.jurisdiction },
      { label: 'Account Opened', value: fmtDate(user.created_at) },
      { label: 'Status', value: 'Active & Verified' },
    ])}
  `;
  return shell({
    preheader: 'Your account is verified and ready. Start exploring launched IPO opportunities.',
    headline: `Hi ${user.first_name},\nWelcome to Apex Ipo Access`,
    subtitle: `Your identity has been verified. Your account is now fully activated and ready to access curated pre-IPO opportunities.`,
    ctaLabel: 'Go to Dashboard',
    ctaUrl: 'https://apexipoaccess.com/dashboard.html',
    detailsHtml: details,
    footerNote: 'This email confirms that your Apex Ipo Access account has been activated following successful identity verification.',
    recipientEmail: user.email,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATE 2: KYC REJECTED
// ═══════════════════════════════════════════════════════════════════════════
function tplKycRejected(user: UserProfile, params: { reason?: string; reviewedAt?: string }): string {
  const reason = params.reason || 'The documentation submitted did not meet our identity verification requirements. This may be due to image quality, expired documents, or mismatched information.';
  const details = `
    <p style="margin:0 0 16px;font-size:14px;line-height:1.7">${escape(reason)}</p>
    ${detailBlock([
      { label: 'Application Status', value: 'Declined' },
      { label: 'Reviewed', value: fmtDateTime(params.reviewedAt) },
      { label: 'Account Reference', value: user.account_ref },
    ])}
  `;
  return shell({
    preheader: 'Your identity verification was not approved. Review the reason and contact support if needed.',
    headline: `Hi ${user.first_name},\nWe couldn't verify your identity`,
    subtitle: 'Following review of your submitted documents, we are unable to verify your identity at this time. Your application has not been approved.',
    ctaLabel: 'Contact Compliance',
    ctaUrl: 'mailto:support@apexipoaccess.com?subject=KYC%20Appeal',
    detailsHtml: details,
    footerNote: 'Identity verification is required by Know Your Customer (KYC) and Anti-Money Laundering (AML) regulations. You may re-apply with updated documentation.',
    recipientEmail: user.email,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATE 3: DEPOSIT PENDING
// ═══════════════════════════════════════════════════════════════════════════
function tplDepositPending(user: UserProfile, params: {
  amount: number;
  method?: string;
  reference?: string;
  submittedAt?: string;
}): string {
  const details = `
    ${detailBlock([
      { label: 'Amount', value: fmtMoney(params.amount) },
      { label: 'Method', value: params.method || 'Bank Wire Transfer' },
      { label: 'Reference', value: params.reference || shortId(crypto.randomUUID()) },
      { label: 'Submitted', value: fmtDateTime(params.submittedAt) },
      { label: 'Status', value: 'Pending Verification' },
    ])}
    <p style="margin:18px 0 0;font-size:13px;line-height:1.65;opacity:0.75">You will be notified once your deposit has been credited. Bank wires typically reconcile within 1 business day.</p>
  `;
  return shell({
    preheader: `Your deposit of ${fmtMoney(params.amount)} has been received and is pending verification.`,
    headline: `Hi ${user.first_name},\nWe received your deposit`,
    subtitle: `Your deposit of ${fmtMoney(params.amount)} is now in our operations queue and will be credited to your account once verified.`,
    ctaLabel: 'View Account',
    ctaUrl: 'https://apexipoaccess.com/dashboard.html',
    detailsHtml: details,
    footerNote: 'You are receiving this email because a deposit was submitted to your Apex Ipo Access account.',
    recipientEmail: user.email,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATE 4: DEPOSIT APPROVED
// ═══════════════════════════════════════════════════════════════════════════
function tplDepositApproved(user: UserProfile, params: {
  amount: number;
  newBalance?: number;
  method?: string;
  reference?: string;
  approvedAt?: string;
}): string {
  const newBal = typeof params.newBalance === 'number' ? params.newBalance : user.cash_balance;
  const details = `
    ${detailBlock([
      { label: 'Amount Credited', value: fmtMoney(params.amount) },
      { label: 'Method', value: params.method || 'Bank Wire Transfer' },
      { label: 'Reference', value: params.reference || shortId(crypto.randomUUID()) },
      { label: 'Approved', value: fmtDateTime(params.approvedAt) },
      { label: 'New Available Balance', value: fmtMoney(newBal) },
    ])}
    <p style="margin:18px 0 0;font-size:13px;line-height:1.65;opacity:0.75">Your funds are now available for investment across our launched IPO opportunities and institutional allocations.</p>
  `;
  return shell({
    preheader: `Your deposit of ${fmtMoney(params.amount)} has been credited. New balance: ${fmtMoney(newBal)}.`,
    headline: `Hi ${user.first_name},\nYour deposit has been credited`,
    subtitle: `${fmtMoney(params.amount)} has been added to your Apex Ipo Access account and is now available to invest.`,
    ctaLabel: 'Browse Available IPOs',
    ctaUrl: 'https://apexipoaccess.com/dashboard.html',
    detailsHtml: details,
    footerNote: 'This trade confirmation has been logged to your account history. Retain for tax and financial records.',
    recipientEmail: user.email,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATE 5: DEPOSIT REJECTED
// ═══════════════════════════════════════════════════════════════════════════
function tplDepositRejected(user: UserProfile, params: {
  amount: number;
  reason?: string;
  method?: string;
  reviewedAt?: string;
}): string {
  const reason = params.reason || 'The submitted deposit could not be verified against our compliance and operational requirements.';
  const details = `
    <p style="margin:0 0 16px;font-size:14px;line-height:1.7">${escape(reason)}</p>
    ${detailBlock([
      { label: 'Amount', value: fmtMoney(params.amount) },
      { label: 'Method', value: params.method || 'Bank Wire Transfer' },
      { label: 'Status', value: 'Rejected' },
      { label: 'Reviewed', value: fmtDateTime(params.reviewedAt) },
    ])}
    <p style="margin:18px 0 0;font-size:13px;line-height:1.65;opacity:0.75">If funds were transferred to us, they will typically be returned to the originating account by your bank within 3–5 business days.</p>
  `;
  return shell({
    preheader: `Your deposit of ${fmtMoney(params.amount)} could not be processed.`,
    headline: `Hi ${user.first_name},\nWe couldn't process your deposit`,
    subtitle: `Your deposit submission of ${fmtMoney(params.amount)} has not been approved. Please review the details below.`,
    ctaLabel: 'Contact Operations',
    ctaUrl: 'mailto:support@apexipoaccess.com?subject=Deposit%20Inquiry',
    detailsHtml: details,
    footerNote: 'If you did not initiate this deposit, please contact us immediately. All financial activity is logged in accordance with our compliance procedures.',
    recipientEmail: user.email,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATE 6: WITHDRAWAL PENDING
// ═══════════════════════════════════════════════════════════════════════════
function tplWithdrawalPending(user: UserProfile, params: {
  amount: number;
  method?: string;
  destination?: string;
  reference?: string;
  requestedAt?: string;
}): string {
  const details = `
    ${detailBlock([
      { label: 'Amount', value: fmtMoney(params.amount) },
      { label: 'Method', value: params.method || 'Bank Wire Transfer' },
      { label: 'Destination', value: params.destination || 'Verified account on file' },
      { label: 'Reference', value: params.reference || shortId(crypto.randomUUID()) },
      { label: 'Requested', value: fmtDateTime(params.requestedAt) },
      { label: 'Status', value: 'Pending Compliance Review' },
    ])}
    <p style="margin:18px 0 0;font-size:13px;line-height:1.65;opacity:0.75">You will be notified once your withdrawal has been approved. Reviews typically complete within 1–2 business days.</p>
  `;
  return shell({
    preheader: `Your withdrawal request of ${fmtMoney(params.amount)} is pending review.`,
    headline: `Hi ${user.first_name},\nWe received your withdrawal request`,
    subtitle: `Your request to withdraw ${fmtMoney(params.amount)} has been received and is now in compliance review.`,
    ctaLabel: 'View Status',
    ctaUrl: 'https://apexipoaccess.com/dashboard.html',
    detailsHtml: details,
    footerNote: 'You are receiving this email because a withdrawal was requested from your Apex Ipo Access account. If this was not you, contact support immediately.',
    recipientEmail: user.email,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATE 7: WITHDRAWAL APPROVED
// ═══════════════════════════════════════════════════════════════════════════
function tplWithdrawalApproved(user: UserProfile, params: {
  amount: number;
  method?: string;
  destination?: string;
  reference?: string;
  approvedAt?: string;
  newBalance?: number;
  eta?: string;
}): string {
  const newBal = typeof params.newBalance === 'number' ? params.newBalance : user.cash_balance;
  const details = `
    ${detailBlock([
      { label: 'Amount Disbursed', value: fmtMoney(params.amount) },
      { label: 'Method', value: params.method || 'Bank Wire Transfer' },
      { label: 'Destination', value: params.destination || 'Verified account on file' },
      { label: 'Reference', value: params.reference || shortId(crypto.randomUUID()) },
      { label: 'Approved', value: fmtDateTime(params.approvedAt) },
      { label: 'Estimated Arrival', value: params.eta || '1–3 business days' },
      { label: 'Remaining Balance', value: fmtMoney(newBal) },
    ])}
    <p style="margin:18px 0 0;font-size:13px;line-height:1.65;opacity:0.75">Settlement timing depends on the disbursement method. Contact our operations desk with your reference number if you need assistance.</p>
  `;
  return shell({
    preheader: `Your withdrawal of ${fmtMoney(params.amount)} has been approved and disbursed.`,
    headline: `Hi ${user.first_name},\nYour withdrawal is on its way`,
    subtitle: `${fmtMoney(params.amount)} has been approved and disbursed to your verified destination account.`,
    ctaLabel: 'View Transaction',
    ctaUrl: 'https://apexipoaccess.com/dashboard.html',
    detailsHtml: details,
    footerNote: 'This transaction has been logged to your account history. Retain this confirmation for your tax and financial records.',
    recipientEmail: user.email,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATE 8: WITHDRAWAL REJECTED
// ═══════════════════════════════════════════════════════════════════════════
function tplWithdrawalRejected(user: UserProfile, params: {
  amount: number;
  reason?: string;
  method?: string;
  destination?: string;
  reviewedAt?: string;
}): string {
  const reason = params.reason || 'The withdrawal request could not be approved due to compliance or operational requirements.';
  const details = `
    <p style="margin:0 0 16px;font-size:14px;line-height:1.7">${escape(reason)}</p>
    ${detailBlock([
      { label: 'Amount', value: fmtMoney(params.amount) },
      { label: 'Method', value: params.method || 'Bank Wire Transfer' },
      { label: 'Destination', value: params.destination || 'Account on file' },
      { label: 'Status', value: 'Rejected — Funds Returned to Balance' },
      { label: 'Reviewed', value: fmtDateTime(params.reviewedAt) },
    ])}
    <p style="margin:18px 0 0;font-size:13px;line-height:1.65;opacity:0.75">Your funds remain safely in your Apex Ipo Access account and are reflected in your available balance.</p>
  `;
  return shell({
    preheader: `Your withdrawal of ${fmtMoney(params.amount)} could not be processed. Funds returned to your balance.`,
    headline: `Hi ${user.first_name},\nWe couldn't process your withdrawal`,
    subtitle: `Your withdrawal request of ${fmtMoney(params.amount)} has not been approved. Your funds have been returned to your available balance.`,
    ctaLabel: 'Contact Compliance',
    ctaUrl: 'mailto:support@apexipoaccess.com?subject=Withdrawal%20Inquiry',
    detailsHtml: details,
    footerNote: 'All withdrawal decisions are made in accordance with applicable financial regulations and our internal risk-management procedures.',
    recipientEmail: user.email,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATE 9: PASSWORD RESET
// ═══════════════════════════════════════════════════════════════════════════
function tplPasswordReset(user: UserProfile, params: {
  resetLink: string;
  expiresIn?: string;
  requestedAt?: string;
  ipAddress?: string;
  device?: string;
}): string {
  const details = `
    ${detailBlock([
      { label: 'Link Expires In', value: params.expiresIn || '1 hour' },
      { label: 'Requested', value: fmtDateTime(params.requestedAt) },
      { label: 'IP Address', value: params.ipAddress || 'Not recorded' },
      { label: 'Device', value: params.device || 'Not recorded' },
    ])}
    <p style="margin:18px 0 0;font-size:13px;line-height:1.65;opacity:0.75">If you did not request this, you can safely ignore this email — your password will remain unchanged.</p>
  `;
  return shell({
    preheader: 'Reset your APEX IPO Access password. The secure link expires in 1 hour.',
    headline: `Hi ${user.first_name},\nReset your password`,
    subtitle: 'We received a request to reset your APEX IPO Access password. Click the button below to set a new password. This link is single-use and time-limited.',
    ctaLabel: 'Reset Password',
    ctaUrl: params.resetLink,
    detailsHtml: details,
    footerNote: 'APEX IPO Access will never ask for your password, two-factor codes, or recovery information by email, phone, or text.',
    recipientEmail: user.email,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATE 10: LOGIN ALERT
// ═══════════════════════════════════════════════════════════════════════════
function tplLoginAlert(user: UserProfile, params: {
  time?: string;
  ipAddress?: string;
  device?: string;
  browser?: string;
  location?: string;
}): string {
  const details = `
    ${detailBlock([
      { label: 'Date & Time', value: fmtDateTime(params.time) },
      { label: 'IP Address', value: params.ipAddress || 'Not recorded' },
      { label: 'Device', value: params.device || 'Not recorded' },
      { label: 'Browser', value: params.browser || 'Not recorded' },
      { label: 'Location', value: params.location || 'Not recorded' },
    ])}
    <p style="margin:18px 0 0;font-size:13px;line-height:1.65;opacity:0.75">If this was not you, change your password immediately and enable two-factor authentication.</p>
  `;
  return shell({
    preheader: 'A new sign-in was detected on your Apex Ipo Access account.',
    headline: `Hi ${user.first_name},\nNew sign-in to your account`,
    subtitle: 'We detected a new sign-in to your Apex Ipo Access account. If this was you, no action is needed.',
    ctaLabel: 'Secure My Account',
    ctaUrl: 'https://apexipoaccess.com/account.html',
    detailsHtml: details,
    footerNote: 'Login alerts are sent for new devices, browsers, and significant location changes. You can manage notification preferences in your account settings.',
    recipientEmail: user.email,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATE 11: SHARE PURCHASE CONFIRMATION
// ═══════════════════════════════════════════════════════════════════════════
function tplSharePurchase(user: UserProfile, params: {
  company: string;
  ticker?: string;
  shares: number;
  pricePerShare: number;
  totalCost: number;
  fees?: number;
  newCashBalance?: number;
  orderId?: string;
  executedAt?: string;
}): string {
  const tickerDisplay = params.ticker ? `${params.company} (${params.ticker})` : params.company;
  const newBal = typeof params.newCashBalance === 'number' ? params.newCashBalance : user.cash_balance;
  const feeRow = (typeof params.fees === 'number' && params.fees > 0)
    ? [{ label: 'Fees', value: fmtMoney(params.fees) }]
    : [];

  const details = `
    ${detailBlock([
      { label: 'Security', value: tickerDisplay },
      { label: 'Shares Acquired', value: fmtNum(params.shares) },
      { label: 'Price Per Share', value: fmtMoney(params.pricePerShare) },
      ...feeRow,
      { label: 'Total Settlement', value: fmtMoney(params.totalCost) },
      { label: 'Order Reference', value: params.orderId ? shortId(params.orderId) : shortId(crypto.randomUUID()) },
      { label: 'Executed', value: fmtDateTime(params.executedAt) },
      { label: 'Status', value: 'Filled & Settled' },
      { label: 'Remaining Cash Balance', value: fmtMoney(newBal) },
    ])}
    <p style="margin:18px 0 0;font-size:13px;line-height:1.65;opacity:0.75">Your shares are held in custody and reflected as a pre-IPO allocation in your portfolio. You will be notified of any material corporate actions or liquidity events.</p>
  `;

  return shell({
    preheader: `Your purchase of ${fmtNum(params.shares)} shares of ${params.company} for ${fmtMoney(params.totalCost)} has been executed.`,
    headline: `Hi ${user.first_name},\nYour purchase is confirmed`,
    subtitle: `You acquired ${fmtNum(params.shares)} shares of ${params.company} for ${fmtMoney(params.totalCost)}. The position has been added to your portfolio.`,
    ctaLabel: 'View Portfolio',
    ctaUrl: 'https://apexipoaccess.com/portfolio.html',
    detailsHtml: details,
    footerNote: 'This trade confirmation serves as your official record of execution. Please retain for tax reporting purposes.',
    recipientEmail: user.email,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATE 12: IPO ALLOCATION GRANTED
// ═══════════════════════════════════════════════════════════════════════════
function tplIpoAllocation(user: UserProfile, params: {
  company: string;
  ticker?: string;
  shares: number;
  pricePerShare: number;
  totalValue: number;
  allocationId?: string;
  grantedAt?: string;
  lockupPeriod?: string;
  expectedListing?: string;
}): string {
  const tickerDisplay = params.ticker ? `${params.company} (${params.ticker})` : params.company;
  const details = `
    ${detailBlock([
      { label: 'Issuer', value: tickerDisplay },
      { label: 'Shares Allocated', value: fmtNum(params.shares) },
      { label: 'Subscription Price', value: fmtMoney(params.pricePerShare) },
      { label: 'Total Value', value: fmtMoney(params.totalValue) },
      { label: 'Reference', value: params.allocationId ? shortId(params.allocationId) : shortId(crypto.randomUUID()) },
      { label: 'Granted', value: fmtDateTime(params.grantedAt) },
      { label: 'Lock-up Period', value: params.lockupPeriod || '180 days post-listing' },
      { label: 'Expected Listing', value: params.expectedListing || 'To be announced' },
    ])}
    <p style="margin:18px 0 0;font-size:13px;line-height:1.65;opacity:0.75">This allocation is held in custody on your behalf and subject to standard pre-IPO terms including applicable lock-up restrictions.</p>
  `;

  return shell({
    preheader: `You have been granted ${fmtNum(params.shares)} shares of ${params.company} at the subscription price.`,
    headline: `Hi ${user.first_name},\nYou received an IPO allocation`,
    subtitle: `Congratulations. You have been granted an institutional allocation in ${tickerDisplay} valued at ${fmtMoney(params.totalValue)} at the subscription price.`,
    ctaLabel: 'View Allocation',
    ctaUrl: 'https://apexipoaccess.com/portfolio.html',
    detailsHtml: details,
    footerNote: 'Pre-IPO investments involve substantial risk including potential total loss of principal and illiquidity. Allocations are non-transferable except as permitted by the issuer.',
    recipientEmail: user.email,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATE 13: ACCOUNT BANNED / SUSPENDED
// ═══════════════════════════════════════════════════════════════════════════
function tplAccountBanned(user: UserProfile, params: {
  reason?: string;
  bannedAt?: string;
  caseId?: string;
}): string {
  const reason = params.reason || 'Your account has been suspended following compliance review. Specific details are available upon written request.';
  const details = `
    <p style="margin:0 0 16px;font-size:14px;line-height:1.7">${escape(reason)}</p>
    ${detailBlock([
      { label: 'Account Status', value: 'Suspended — Access Revoked' },
      { label: 'Action Taken', value: fmtDateTime(params.bannedAt) },
      { label: 'Case Reference', value: params.caseId ? shortId(params.caseId) : shortId(crypto.randomUUID()) },
      { label: 'Account Reference', value: user.account_ref },
    ])}
    <p style="margin:18px 0 0;font-size:13px;line-height:1.65;opacity:0.75">You have the right to request a formal review of this decision by contacting our compliance team in writing within thirty (30) days.</p>
  `;

  return shell({
    preheader: 'Your Apex Ipo Access account has been suspended. Review the reason and appeal process inside.',
    headline: `Hi ${user.first_name},\nYour account has been suspended`,
    subtitle: 'Following review by our compliance and risk-management team, your Apex Ipo Access account has been suspended and access has been revoked.',
    ctaLabel: 'File an Appeal',
    ctaUrl: 'mailto:compliance@apexipoaccess.com?subject=Account%20Suspension%20Appeal',
    detailsHtml: details,
    footerNote: 'This action has been taken in accordance with our Terms of Service and applicable anti-money-laundering and compliance regulations.',
    recipientEmail: user.email,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATE REGISTRY
// Each template receives (user: UserProfile, params: any) → html
// ═══════════════════════════════════════════════════════════════════════════
const TEMPLATES: Record<string, (user: UserProfile, params: any) => string> = {
  'welcome':             (u, _p) => tplWelcome(u),
  'kyc-rejected':        (u, p)  => tplKycRejected(u, p),
  'deposit-pending':     (u, p)  => tplDepositPending(u, p),
  'deposit-approved':    (u, p)  => tplDepositApproved(u, p),
  'deposit-rejected':    (u, p)  => tplDepositRejected(u, p),
  'withdrawal-pending':  (u, p)  => tplWithdrawalPending(u, p),
  'withdrawal-approved': (u, p)  => tplWithdrawalApproved(u, p),
  'withdrawal-rejected': (u, p)  => tplWithdrawalRejected(u, p),
  'password-reset':      (u, p)  => tplPasswordReset(u, p),
  'login-alert':         (u, p)  => tplLoginAlert(u, p),
  'share-purchase':      (u, p)  => tplSharePurchase(u, p),
  'ipo-allocation':      (u, p)  => tplIpoAllocation(u, p),
  'account-banned':      (u, p)  => tplAccountBanned(u, p),
};

// ═══════════════════════════════════════════════════════════════════════════
// SUBJECT LINE DEFAULTS (if caller doesn't provide one)
// ═══════════════════════════════════════════════════════════════════════════
const DEFAULT_SUBJECTS: Record<string, string> = {
  'welcome':             'Welcome to Apex Ipo Access',
  'kyc-rejected':        'Identity Verification Update',
  'deposit-pending':     'We received your deposit',
  'deposit-approved':    'Your deposit has been credited',
  'deposit-rejected':    'We couldn\'t process your deposit',
  'withdrawal-pending':  'We received your withdrawal request',
  'withdrawal-approved': 'Your withdrawal is on its way',
  'withdrawal-rejected': 'We couldn\'t process your withdrawal',
  'password-reset':      'Reset your APEX IPO Access password',
  'login-alert':         'New sign-in to your account',
  'share-purchase':      'Your purchase is confirmed',
  'ipo-allocation':      'You received an IPO allocation',
  'account-banned':      'Your account has been suspended',
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN HTTP HANDLER
// Body: { userId: string, template: string, subject?: string, params?: any }
// ═══════════════════════════════════════════════════════════════════════════
Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
    });
  }

  const cors = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  try {
    if (!RESEND_API_KEY)   throw new Error('RESEND_API_KEY not configured');
    if (!PROJECT_URL)      throw new Error('PROJECT_URL not configured');
    if (!SERVICE_ROLE_KEY) throw new Error('SERVICE_ROLE_KEY not configured');

    const body = await req.json();
    const { userId, template, subject, params } = body;

    if (!userId || !template) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: userId, template' }),
        { status: 400, headers: cors }
      );
    }

    const tplFn = TEMPLATES[template];
    if (!tplFn) {
      return new Response(
        JSON.stringify({ error: `Unknown template: ${template}`, available: Object.keys(TEMPLATES) }),
        { status: 400, headers: cors }
      );
    }

    // Fetch user profile from DB
    const user = await fetchUser(userId);
    if (!user) {
      return new Response(
        JSON.stringify({ error: `User not found: ${userId}` }),
        { status: 404, headers: cors }
      );
    }

    if (!user.email) {
      return new Response(
        JSON.stringify({ error: `User has no email address: ${userId}` }),
        { status: 400, headers: cors }
      );
    }

    // Generate HTML
    const html = tplFn(user, params || {});
    const finalSubject = subject || DEFAULT_SUBJECTS[template] || 'APEX IPO Access';

    // Send via Resend
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'APEX IPO Access <noreply@apexipoaccess.com>',
        to: [user.email],
        subject: finalSubject,
        html,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('Resend API error:', data);
      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: data }),
        { status: 500, headers: cors }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        id: data.id,
        template,
        recipient: user.email,
      }),
      { status: 200, headers: cors }
    );

  } catch (err) {
    console.error('Handler error:', err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: cors }
    );
  }
});
