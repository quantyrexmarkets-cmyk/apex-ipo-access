// ═══════════════════════════════════════════════════════════════════════════
// APEX IPO Access — Transactional Email Service
// All 13 templates with distinct designs, institutional tone, real data
// ═══════════════════════════════════════════════════════════════════════════

// ─── ACCOUNT TYPE MAPPING ───────────────────────────────────────────────────
const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  'individual': 'Individual Brokerage Account',
  'joint':      'Joint Brokerage Account',
  'ira':        'Traditional or Roth IRA',
  'trust':      'Trust or Entity Account',
};

function formatAccountTypes(types: string[] | string | null | undefined): string {
  if (!types) return 'Individual Brokerage Account';
  const arr = Array.isArray(types) ? types : [types];
  if (arr.length === 0) return 'Individual Brokerage Account';
  return arr.map(t => ACCOUNT_TYPE_LABELS[t] || t).join(' • ');
}

// ─── FORMATTERS ─────────────────────────────────────────────────────────────
function fmtMoney(amount: number | string | null | undefined): string {
  const n = typeof amount === 'string' ? parseFloat(amount) : (amount ?? 0);
  if (isNaN(n)) return '$0.00';
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const dt = typeof d === 'string' ? new Date(d) : d;
  return dt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function fmtDateTime(d: string | Date | null | undefined): string {
  if (!d) d = new Date();
  const dt = typeof d === 'string' ? new Date(d) : d;
  return dt.toLocaleString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
  });
}

function shortId(uuid: string | null | undefined): string {
  if (!uuid) return '—';
  return uuid.replace(/-/g, '').slice(-8).toUpperCase();
}

function escape(s: any): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── ICONS (color-coded SVG by category) ────────────────────────────────────
const ICONS = {
  success: `<svg width="56" height="56" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="32" cy="32" r="32" fill="rgba(62,213,152,0.16)"/>
    <circle cx="32" cy="32" r="22" fill="none" stroke="#3ed598" stroke-width="2.5"/>
    <path d="M22 32.5l7 7 13-15" stroke="#3ed598" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,
  info: `<svg width="56" height="56" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="32" cy="32" r="32" fill="rgba(95,176,255,0.16)"/>
    <circle cx="32" cy="32" r="22" fill="none" stroke="#5fb0ff" stroke-width="2.5"/>
    <path d="M32 28v14" stroke="#5fb0ff" stroke-width="3.2" stroke-linecap="round"/>
    <circle cx="32" cy="22" r="2.6" fill="#5fb0ff"/>
  </svg>`,
  warn: `<svg width="56" height="56" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="32" cy="32" r="32" fill="rgba(255,184,0,0.16)"/>
    <path d="M32 16l18 31H14l18-31z" fill="none" stroke="#ffb800" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M32 27v10" stroke="#ffb800" stroke-width="3.2" stroke-linecap="round"/>
    <circle cx="32" cy="42" r="2.4" fill="#ffb800"/>
  </svg>`,
  error: `<svg width="56" height="56" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="32" cy="32" r="32" fill="rgba(255,106,106,0.16)"/>
    <circle cx="32" cy="32" r="22" fill="none" stroke="#ff6a6a" stroke-width="2.5"/>
    <path d="M25 25l14 14M39 25L25 39" stroke="#ff6a6a" stroke-width="3.2" stroke-linecap="round"/>
  </svg>`,
  lock: `<svg width="56" height="56" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="32" cy="32" r="32" fill="rgba(167,139,250,0.16)"/>
    <rect x="20" y="29" width="24" height="18" rx="3" fill="none" stroke="#a78bfa" stroke-width="2.5"/>
    <path d="M25 29v-5a7 7 0 0114 0v5" fill="none" stroke="#a78bfa" stroke-width="2.5" stroke-linecap="round"/>
    <circle cx="32" cy="38" r="2.5" fill="#a78bfa"/>
  </svg>`,
  shield: `<svg width="56" height="56" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="32" cy="32" r="32" fill="rgba(255,206,107,0.16)"/>
    <path d="M32 14l14 5v11c0 9-6 16-14 20-8-4-14-11-14-20V19l14-5z" fill="none" stroke="#ffce6b" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M26 32l4 4 8-9" stroke="#ffce6b" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,
  cart: `<svg width="56" height="56" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="32" cy="32" r="32" fill="rgba(62,213,152,0.16)"/>
    <path d="M18 20h4l3 17a3 3 0 003 2.5h14a3 3 0 003-2.3l2.5-11H25" fill="none" stroke="#3ed598" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="29" cy="46" r="2.5" fill="#3ed598"/>
    <circle cx="42" cy="46" r="2.5" fill="#3ed598"/>
  </svg>`,
  trophy: `<svg width="56" height="56" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="32" cy="32" r="32" fill="rgba(167,139,250,0.16)"/>
    <path d="M22 16h20v9a10 10 0 01-20 0v-9z" fill="none" stroke="#a78bfa" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M22 19h-4v4a5 5 0 005 5M42 19h4v4a5 5 0 01-5 5" fill="none" stroke="#a78bfa" stroke-width="2.5"/>
    <path d="M28 38h8v4h-8zM25 44h14v3H25z" fill="#a78bfa"/>
  </svg>`,
  ban: `<svg width="56" height="56" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="32" cy="32" r="32" fill="rgba(255,106,106,0.16)"/>
    <circle cx="32" cy="32" r="22" fill="none" stroke="#ff6a6a" stroke-width="2.8"/>
    <line x1="17" y1="17" x2="47" y2="47" stroke="#ff6a6a" stroke-width="3.2" stroke-linecap="round"/>
  </svg>`,
} as const;

// ─── COLOR PALETTE PER TEMPLATE CATEGORY ────────────────────────────────────
const ACCENTS = {
  success:  { light: '#3ed598', dark: '#3ed598', bg: '#e8f9f1', bgDark: '#1a3a2a' },
  info:     { light: '#5fb0ff', dark: '#5fb0ff', bg: '#e8f2ff', bgDark: '#1a2d44' },
  warn:     { light: '#ffb800', dark: '#ffce6b', bg: '#fff5d6', bgDark: '#3a2f12' },
  error:    { light: '#ff6a6a', dark: '#ff8a8a', bg: '#ffe8e8', bgDark: '#3a1f1f' },
  purple:   { light: '#a78bfa', dark: '#c4b5fd', bg: '#f0ebff', bgDark: '#2a2240' },
} as const;

// ─── HELPER: Info table (label/value rows) ──────────────────────────────────
function infoTable(rows: Array<{ label: string; value: string }> | null | undefined): string {
  if (!Array.isArray(rows) || rows.length === 0) return '';
  const inner = rows.map((r, i) => {
    const isLast = i === rows.length - 1;
    const border = isLast ? '' : 'border-bottom:1px solid #e8eaed;';
    return `
      <tr>
        <td class="info-label" style="padding:14px 16px;${border}font-family:Inter,Arial,sans-serif;font-size:13px;color:#5f6368;width:44%;vertical-align:top">
          ${escape(r.label)}
        </td>
        <td class="info-value" style="padding:14px 16px;${border}font-family:Inter,Arial,sans-serif;font-size:13px;color:#202124;font-weight:600;vertical-align:top;text-align:right">
          ${escape(r.value)}
        </td>
      </tr>`;
  }).join('');
  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" class="info-table" style="margin:8px 0 24px;border:1px solid #e8eaed;border-radius:10px;border-collapse:separate;border-spacing:0;overflow:hidden;background:#ffffff">
      ${inner}
    </table>`;
}

// ─── HELPER: Hero amount display (big centered $$$) ─────────────────────────
function heroAmount(amount: number, label: string, accent: keyof typeof ACCENTS = 'info'): string {
  const c = ACCENTS[accent];
  return `
    <div class="hero-amount" style="text-align:center;margin:8px 0 28px;padding:28px 20px;background:${c.bg};border-radius:12px;border:1px solid ${c.light}33">
      <div style="font-family:Inter,Arial,sans-serif;font-size:12px;text-transform:uppercase;letter-spacing:2px;color:#5f6368;margin-bottom:10px;font-weight:600">${escape(label)}</div>
      <div style="font-family:Inter,Arial,sans-serif;font-size:38px;font-weight:700;color:${c.light};letter-spacing:-0.8px;line-height:1.1">${fmtMoney(amount)}</div>
    </div>`;
}

// ─── HELPER: Callout box (for reasons, warnings, notes) ─────────────────────
function callout(title: string, body: string, accent: keyof typeof ACCENTS = 'warn'): string {
  const c = ACCENTS[accent];
  return `
    <div class="callout" style="margin:0 0 24px;padding:18px 20px;background:${c.bg};border-left:4px solid ${c.light};border-radius:6px">
      <div style="font-family:Inter,Arial,sans-serif;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:${c.light};margin-bottom:8px">${escape(title)}</div>
      <div style="font-family:Inter,Arial,sans-serif;font-size:14px;line-height:1.65;color:#3c4043">${escape(body)}</div>
    </div>`;
}

// ─── HELPER: CTA button ─────────────────────────────────────────────────────
function ctaButton(label: string, url: string, accent: keyof typeof ACCENTS = 'info'): string {
  const c = ACCENTS[accent];
  return `
    <div style="text-align:center;margin:28px 0 12px">
      <a href="${escape(url)}" class="cta-btn"
         style="display:inline-block;background:${c.light};color:#ffffff;
                font-family:Inter,Arial,sans-serif;font-size:14px;font-weight:600;
                text-decoration:none;padding:14px 36px;border-radius:8px;
                letter-spacing:0.3px">
        ${escape(label)}
      </a>
    </div>`;
}

// ─── HELPER: Greeting paragraph ─────────────────────────────────────────────
function greeting(name: string): string {
  const safeName = escape(name || 'Investor');
  return `<p class="body-text" style="margin:0 0 18px;font-family:Inter,Arial,sans-serif;font-size:14.5px;line-height:1.7;color:#3c4043">Dear ${safeName},</p>`;
}

// ─── HELPER: Body paragraph ─────────────────────────────────────────────────
function para(text: string): string {
  return `<p class="body-text" style="margin:0 0 16px;font-family:Inter,Arial,sans-serif;font-size:14.5px;line-height:1.75;color:#3c4043">${text}</p>`;
}

// ─── HELPER: Security / compliance notice (footer-style) ────────────────────
function securityNotice(text: string): string {
  return `
    <div class="security" style="margin:24px 0 0;padding:16px 18px;background:#f1f3f4;border-radius:8px">
      <p style="margin:0;font-family:Inter,Arial,sans-serif;font-size:12px;line-height:1.65;color:#5f6368">
        <strong style="color:#3c4043">Security Notice:</strong> ${text}
      </p>
    </div>`;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN EMAIL SHELL — wraps every template
// ═══════════════════════════════════════════════════════════════════════════
function getEmailShell(opts: {
  title: string;
  preheader: string;
  bannerColor: keyof typeof ACCENTS;
  bannerLabel: string;
  icon: string;
  heading: string;
  bodyHtml: string;
}): string {
  const c = ACCENTS[opts.bannerColor];
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${escape(opts.title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Oswald:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
  :root { color-scheme: light dark; supported-color-schemes: light dark; }
  body, .bg { background:#ffffff !important; color:#202124 !important; }
  .card { background:#ffffff !important; border-color:#e8eaed !important; }
  .brand-text { color:#202124 !important; }
  .brand-sub { color:#5f6368 !important; }
  .heading { color:#202124 !important; }
  .body-text { color:#3c4043 !important; }
  .footer { color:#5f6368 !important; }
  .footer-small { color:#80868b !important; }
  .info-table { background:#ffffff !important; border-color:#e8eaed !important; }
  .info-label { color:#5f6368 !important; }
  .info-value { color:#202124 !important; }
  .banner { background:${c.bg} !important; color:${c.light} !important; }
  .security { background:#f1f3f4 !important; }
  a.link { color:${c.light} !important; }
  @media (prefers-color-scheme: dark) {
    body, .bg { background:#1f2123 !important; color:#e3e3e3 !important; }
    .card { background:#28292c !important; border-color:#3c3f43 !important; }
    .brand-text { color:#ffffff !important; }
    .brand-sub { color:#a0a4a8 !important; }
    .heading { color:#ffffff !important; }
    .body-text { color:#c8ccd0 !important; }
    .footer { color:#a0a4a8 !important; }
    .footer-small { color:#6b6f74 !important; }
    .info-table { background:#1f2123 !important; border-color:#3c3f43 !important; }
    .info-label { color:#a0a4a8 !important; }
    .info-value { color:#ffffff !important; }
    .banner { background:${c.bgDark} !important; color:${c.dark} !important; }
    .security { background:#1f2123 !important; }
    a.link { color:${c.dark} !important; }
  }
</style>
</head>
<body class="bg" style="margin:0;padding:0;font-family:Inter,Roboto,-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">

<div style="display:none;max-height:0;overflow:hidden;color:transparent">${escape(opts.preheader)}</div>

<table role="presentation" class="bg" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px">

      <!-- Brand header -->
      <tr><td style="padding:0 8px 24px">
        <table role="presentation" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding-right:14px;vertical-align:middle">
              <img src="https://apexipoaccess.com/assets/spacex-logo.png" alt="" width="48" height="48" style="display:block;width:48px;height:48px">
            </td>
            <td style="vertical-align:middle">
              <span class="brand-text" style="font-family:Oswald,Impact,'Helvetica Neue',Arial,sans-serif;font-size:24px;font-weight:600;letter-spacing:2px;text-transform:uppercase">APEX</span>
              <span class="brand-sub" style="font-family:Oswald,Impact,'Helvetica Neue',Arial,sans-serif;font-size:24px;font-weight:300;letter-spacing:2px;text-transform:uppercase;margin-left:6px">IPO Access</span>
            </td>
          </tr>
        </table>
      </td></tr>

      <!-- Colored category banner -->
      <tr><td class="banner" style="padding:10px 20px;border-radius:10px 10px 0 0;text-align:center;font-family:Inter,Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase">
        ${escape(opts.bannerLabel)}
      </td></tr>

      <!-- Main card -->
      <tr><td class="card" style="border:1px solid #e8eaed;border-top:none;border-radius:0 0 12px 12px;padding:36px 32px">
        <div style="text-align:center;margin-bottom:18px">${opts.icon}</div>
        <h1 class="heading" style="margin:0 0 22px;font-family:Inter,Roboto,Arial,sans-serif;font-size:24px;font-weight:600;letter-spacing:-0.4px;line-height:1.3;text-align:center">${escape(opts.heading)}</h1>
        <div>${opts.bodyHtml}</div>
      </td></tr>

      <!-- Footer -->
      <tr><td align="center" style="padding:28px 8px 8px">
        <p class="footer" style="margin:0 0 6px;font-family:Inter,Arial,sans-serif;font-size:11.5px;line-height:1.6">
          You are receiving this email because you have a registered account at
          <a class="link" href="https://apexipoaccess.com" style="text-decoration:none">apexipoaccess.com</a>
        </p>
        <p class="footer" style="margin:0 0 6px;font-family:Inter,Arial,sans-serif;font-size:11.5px;line-height:1.6">
          For assistance, contact <a class="link" href="mailto:support@apexipoaccess.com" style="text-decoration:none">support@apexipoaccess.com</a>
        </p>
        <p class="footer-small" style="margin:14px 0 0;font-family:Inter,Arial,sans-serif;font-size:10.5px;line-height:1.6">
          © ${new Date().getFullYear()} APEX IPO Access · Institutional Investment Intelligence Platform
        </p>
        <p class="footer-small" style="margin:6px 0 0;font-family:Inter,Arial,sans-serif;font-size:10px;line-height:1.6;opacity:0.75">
          Securities offered through licensed broker-dealers. Investments involve risk, including possible loss of principal.
        </p>
      </td></tr>

    </table>
  </td></tr>
</table>

</body>
</html>`;
}

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATE 1: WELCOME (KYC Approved — Account Activated)
// Banner: GREEN | Icon: trophy | Layout: celebration + account summary
// ═══════════════════════════════════════════════════════════════════════════
function tplWelcome(p: {
  name: string;
  email: string;
  accountTypes?: string[] | string;
  accountId?: string;
  jurisdiction?: string;
  openedAt?: string;
}): string {
  const acctType = formatAccountTypes(p.accountTypes);
  const rows = [
    { label: 'Account Holder',     value: p.name || '—' },
    { label: 'Registered Email',   value: p.email || '—' },
    { label: 'Account Type',       value: acctType },
    { label: 'Account Reference',  value: shortId(p.accountId) },
    { label: 'Jurisdiction',       value: p.jurisdiction || 'United States' },
    { label: 'Account Opened',     value: fmtDate(p.openedAt) },
    { label: 'KYC Status',         value: 'Verified & Approved' },
    { label: 'Account Status',     value: 'Active' },
  ];

  const body = `
    ${greeting(p.name)}
    ${para(`We are pleased to confirm that your identity verification has been successfully completed and your <strong>APEX IPO Access</strong> account is now fully activated and ready for use. Welcome to our institutional investment platform.`)}
    ${para(`As an activated investor, you now have access to our curated selection of <strong>launched pre-IPO opportunities</strong>, secondary market allocations, and exclusive institutional placements. Our platform provides access to investment opportunities typically reserved for accredited and qualified institutional investors.`)}

    <h2 style="margin:28px 0 14px;font-family:Inter,Arial,sans-serif;font-size:16px;font-weight:600;color:#202124;letter-spacing:-0.2px">Account Summary</h2>
    ${infoTable(rows)}

    ${para(`To begin investing, please log in to your dashboard, fund your account via wire transfer or supported digital asset, and browse the current selection of available IPO allocations. Each opportunity includes a detailed investor briefing, valuation analysis, and subscription terms.`)}

    ${ctaButton('Access Your Dashboard', 'https://apexipoaccess.com/dashboard.html', 'success')}

    ${securityNotice(`Please retain this email for your records. Your account reference number above is required when contacting our support team. If you did not authorize the creation of this account, contact us immediately at support@apexipoaccess.com.`)}
  `;

  return getEmailShell({
    title: 'Account Activated — APEX IPO Access',
    preheader: 'Your account has been verified and is now active. Access institutional pre-IPO opportunities today.',
    bannerColor: 'success',
    bannerLabel: 'Account Activated',
    icon: ICONS.trophy,
    heading: 'Welcome to APEX IPO Access',
    bodyHtml: body,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATE 2: KYC REJECTED
// Banner: RED | Icon: error | Layout: reason callout + appeal CTA
// ═══════════════════════════════════════════════════════════════════════════
function tplKycRejected(p: {
  name: string;
  reason: string;
  reviewedAt?: string;
}): string {
  const body = `
    ${greeting(p.name)}
    ${para(`Thank you for submitting your application to <strong>APEX IPO Access</strong>. Following a thorough review of the documentation and identity information you provided, we regret to inform you that we are unable to verify your identity at this time. Your application has not been approved.`)}

    ${callout('Reason for Decision', p.reason || 'The documentation submitted did not meet our identity verification requirements. This may be due to image quality, expired documents, mismatched information, or compliance restrictions in your jurisdiction.', 'error')}

    ${para(`Identity verification is a regulatory requirement under applicable Know Your Customer (KYC) and Anti-Money Laundering (AML) frameworks, including the USA PATRIOT Act for U.S. residents. We are required to confirm the identity of all account holders before granting platform access.`)}

    ${para(`If you believe this decision was made in error, or if you would like to re-submit corrected documentation, please contact our compliance team. We will be happy to review your case and assist you through the re-verification process.`)}

    ${infoTable([
      { label: 'Application Status', value: 'Declined' },
      { label: 'Review Date',        value: fmtDate(p.reviewedAt) },
      { label: 'Next Step',          value: 'Contact Compliance' },
    ])}

    ${ctaButton('Contact Compliance Team', 'mailto:support@apexipoaccess.com?subject=KYC%20Appeal', 'error')}

    ${securityNotice(`This decision does not affect your ability to apply again in the future with updated documentation. All submitted information is retained in accordance with our Privacy Policy and applicable financial regulations.`)}
  `;

  return getEmailShell({
    title: 'Account Application Declined — APEX IPO Access',
    preheader: 'Your identity verification was not approved. Review the reason and next steps.',
    bannerColor: 'error',
    bannerLabel: 'Application Declined',
    icon: ICONS.error,
    heading: 'Identity Verification Declined',
    bodyHtml: body,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATE 3: DEPOSIT PENDING
// Banner: BLUE | Icon: info | Layout: pending hero amount + status table
// ═══════════════════════════════════════════════════════════════════════════
function tplDepositPending(p: {
  name: string;
  amount: number;
  method?: string;
  reference?: string;
  submittedAt?: string;
}): string {
  const body = `
    ${greeting(p.name)}
    ${para(`We have received your deposit submission and confirm that it has entered our operations queue for review and reconciliation. Your funds will be credited to your APEX IPO Access account once our team has verified receipt and confirmed the originating transfer.`)}

    ${heroAmount(p.amount, 'Deposit Amount — Pending Review', 'info')}

    ${infoTable([
      { label: 'Funding Method',     value: p.method || 'Bank Wire Transfer' },
      { label: 'Reference Number',   value: p.reference || shortId(crypto.randomUUID()) },
      { label: 'Submission Status',  value: 'Pending Verification' },
      { label: 'Submitted',          value: fmtDateTime(p.submittedAt) },
      { label: 'Expected Review',    value: 'Within 1 business day' },
    ])}

    ${para(`Bank wire transfers are typically reconciled within one business day of receipt. Cryptocurrency deposits are credited after the required number of network confirmations. You will receive a separate confirmation email the moment your deposit is credited and made available for investment.`)}

    ${para(`<strong>Please do not resubmit this deposit.</strong> Duplicate submissions may delay processing. If you believe there has been an error or your deposit has not appeared after the expected review window, please contact our operations desk.`)}

    ${ctaButton('View Account Activity', 'https://apexipoaccess.com/dashboard.html', 'info')}

    ${securityNotice(`All deposits are processed in accordance with applicable banking regulations and our compliance procedures. Reference your account number when corresponding with support.`)}
  `;

  return getEmailShell({
    title: 'Deposit Received — Pending Review | APEX IPO Access',
    preheader: `Your deposit of ${fmtMoney(p.amount)} has been received and is pending verification.`,
    bannerColor: 'info',
    bannerLabel: 'Deposit Pending',
    icon: ICONS.info,
    heading: 'Deposit Received & Under Review',
    bodyHtml: body,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATE 4: DEPOSIT APPROVED
// Banner: GREEN | Icon: success | Layout: hero amount + new balance + CTA
// ═══════════════════════════════════════════════════════════════════════════
function tplDepositApproved(p: {
  name: string;
  amount: number;
  newBalance: number;
  method?: string;
  reference?: string;
  approvedAt?: string;
}): string {
  const body = `
    ${greeting(p.name)}
    ${para(`We are pleased to confirm that your deposit has been successfully verified and credited to your <strong>APEX IPO Access</strong> account. Your funds are now available and ready to be deployed into our current selection of launched IPO opportunities and institutional allocations.`)}

    ${heroAmount(p.amount, 'Deposit Credited to Your Account', 'success')}

    ${infoTable([
      { label: 'Funding Method',        value: p.method || 'Bank Wire Transfer' },
      { label: 'Transaction Reference', value: p.reference || shortId(crypto.randomUUID()) },
      { label: 'Status',                value: 'Approved & Credited' },
      { label: 'Approved',              value: fmtDateTime(p.approvedAt) },
      { label: 'New Available Balance', value: fmtMoney(p.newBalance) },
    ])}

    ${para(`Your available balance reflects funds that are immediately deployable across our platform. You may now subscribe to active IPO allocations, place orders for available secondary market positions, or hold cash pending future opportunities.`)}

    ${para(`We recommend reviewing our currently available investment opportunities at your earliest convenience, as many allocations are subject to limited availability and close on a first-come, first-served basis.`)}

    ${ctaButton('Browse Available IPOs', 'https://apexipoaccess.com/dashboard.html', 'success')}

    ${securityNotice(`This deposit transaction has been logged to your account history and is auditable through your account statements. Retain this confirmation for your tax and financial records.`)}
  `;

  return getEmailShell({
    title: 'Deposit Approved & Credited | APEX IPO Access',
    preheader: `Your deposit of ${fmtMoney(p.amount)} has been credited. New balance: ${fmtMoney(p.newBalance)}.`,
    bannerColor: 'success',
    bannerLabel: 'Funds Credited',
    icon: ICONS.success,
    heading: 'Deposit Successfully Credited',
    bodyHtml: body,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATE 5: DEPOSIT REJECTED
// Banner: AMBER | Icon: warn | Layout: reason callout + resubmit info
// ═══════════════════════════════════════════════════════════════════════════
function tplDepositRejected(p: {
  name: string;
  amount: number;
  reason: string;
  method?: string;
  reviewedAt?: string;
}): string {
  const body = `
    ${greeting(p.name)}
    ${para(`Following review of your recent deposit submission to <strong>APEX IPO Access</strong>, we regret to inform you that we are unable to credit this transaction to your account at this time. The deposit has been rejected and the corresponding entry has been removed from your pending activity.`)}

    ${heroAmount(p.amount, 'Deposit Amount — Not Credited', 'warn')}

    ${callout('Reason for Rejection', p.reason || 'The submitted deposit could not be verified against our compliance and operational requirements. This may be due to mismatched sender information, missing reference details, incomplete documentation, or compliance restrictions.', 'warn')}

    ${infoTable([
      { label: 'Funding Method', value: p.method || 'Bank Wire Transfer' },
      { label: 'Status',         value: 'Rejected' },
      { label: 'Reviewed',       value: fmtDateTime(p.reviewedAt) },
      { label: 'Funds Status',   value: 'Returned to source / Not received' },
    ])}

    ${para(`If your funds were sent via bank wire and did not arrive in our reconciliation account, they will typically be returned to the originating account by your bank within 3–5 business days. If funds were sent but did not match the required reference information, please contact us so we can assist with reconciliation.`)}

    ${para(`To resubmit a corrected deposit, please log in to your dashboard and follow the funding instructions carefully, ensuring the reference number is included on the wire instruction. Our operations team is available to assist if you have any questions.`)}

    ${ctaButton('Contact Operations Desk', 'mailto:support@apexipoaccess.com?subject=Deposit%20Rejection%20Inquiry', 'warn')}

    ${securityNotice(`If you did not initiate this deposit, please contact us immediately. All financial activity is logged and monitored in accordance with our anti-fraud and compliance procedures.`)}
  `;

  return getEmailShell({
    title: 'Deposit Not Credited | APEX IPO Access',
    preheader: `Your deposit of ${fmtMoney(p.amount)} could not be processed. Review the reason and next steps.`,
    bannerColor: 'warn',
    bannerLabel: 'Deposit Rejected',
    icon: ICONS.warn,
    heading: 'Deposit Could Not Be Processed',
    bodyHtml: body,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATE 6: WITHDRAWAL PENDING
// Banner: BLUE | Icon: info | Layout: hero amount + destination + status
// ═══════════════════════════════════════════════════════════════════════════
function tplWithdrawalPending(p: {
  name: string;
  amount: number;
  method?: string;
  destination?: string;
  reference?: string;
  requestedAt?: string;
}): string {
  const body = `
    ${greeting(p.name)}
    ${para(`We have received your withdrawal request and confirm that it has entered our operations and compliance review queue. Withdrawal requests undergo standard verification procedures, including identity confirmation, source-of-funds review, and destination account validation, prior to disbursement.`)}

    ${heroAmount(p.amount, 'Withdrawal Amount — Pending Review', 'info')}

    ${infoTable([
      { label: 'Withdrawal Method',  value: p.method || 'Bank Wire Transfer' },
      { label: 'Destination',        value: p.destination || 'Verified bank account on file' },
      { label: 'Reference Number',   value: p.reference || shortId(crypto.randomUUID()) },
      { label: 'Submission Status',  value: 'Pending Compliance Review' },
      { label: 'Requested',          value: fmtDateTime(p.requestedAt) },
      { label: 'Expected Review',    value: 'Within 1–2 business days' },
    ])}

    ${para(`Once your withdrawal request is approved, funds will be transmitted to your verified destination account via the selected method. You will receive a separate notification email confirming the disbursement and including any applicable tracking or reference information.`)}

    ${para(`<strong>Please do not submit duplicate withdrawal requests.</strong> If you need to modify or cancel this request, please contact our operations desk as soon as possible. Once a withdrawal enters the disbursement phase, it cannot be reversed.`)}

    ${ctaButton('View Withdrawal Status', 'https://apexipoaccess.com/dashboard.html', 'info')}

    ${securityNotice(`If you did not initiate this withdrawal request, please contact us immediately at support@apexipoaccess.com so we can secure your account and investigate.`)}
  `;

  return getEmailShell({
    title: 'Withdrawal Request Received | APEX IPO Access',
    preheader: `Your withdrawal request of ${fmtMoney(p.amount)} is pending compliance review.`,
    bannerColor: 'info',
    bannerLabel: 'Withdrawal Pending',
    icon: ICONS.info,
    heading: 'Withdrawal Request Received',
    bodyHtml: body,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATE 7: WITHDRAWAL APPROVED
// Banner: GREEN | Icon: success | Layout: hero + destination + ETA
// ═══════════════════════════════════════════════════════════════════════════
function tplWithdrawalApproved(p: {
  name: string;
  amount: number;
  method?: string;
  destination?: string;
  reference?: string;
  approvedAt?: string;
  newBalance?: number;
  eta?: string;
}): string {
  const balanceRow = typeof p.newBalance === 'number'
    ? [{ label: 'Remaining Available Balance', value: fmtMoney(p.newBalance) }]
    : [];

  const body = `
    ${greeting(p.name)}
    ${para(`We are pleased to confirm that your withdrawal request has been reviewed, approved, and processed for disbursement. The funds are now in transit to your verified destination account.`)}

    ${heroAmount(p.amount, 'Withdrawal Disbursed', 'success')}

    ${infoTable([
      { label: 'Withdrawal Method',     value: p.method || 'Bank Wire Transfer' },
      { label: 'Destination Account',   value: p.destination || 'Verified bank account on file' },
      { label: 'Transaction Reference', value: p.reference || shortId(crypto.randomUUID()) },
      { label: 'Status',                value: 'Approved & Disbursed' },
      { label: 'Approved',              value: fmtDateTime(p.approvedAt) },
      { label: 'Estimated Arrival',     value: p.eta || '1–3 business days (domestic wire)' },
      ...balanceRow,
    ])}

    ${para(`Settlement timing depends on the selected disbursement method. Domestic bank wires typically arrive within 1–3 business days, while international transfers may take 3–7 business days depending on intermediary banks and recipient jurisdiction. Cryptocurrency disbursements are typically credited after the required network confirmations.`)}

    ${para(`If you have not received the funds within the expected timeframe, please contact our operations desk with your transaction reference number for assistance with tracing.`)}

    ${ctaButton('View Transaction History', 'https://apexipoaccess.com/dashboard.html', 'success')}

    ${securityNotice(`This withdrawal has been logged to your permanent account history. Please retain this confirmation for your tax and financial records. All disbursements are reported in accordance with applicable financial regulations.`)}
  `;

  return getEmailShell({
    title: 'Withdrawal Approved & Disbursed | APEX IPO Access',
    preheader: `Your withdrawal of ${fmtMoney(p.amount)} has been approved and sent to your verified account.`,
    bannerColor: 'success',
    bannerLabel: 'Withdrawal Disbursed',
    icon: ICONS.success,
    heading: 'Withdrawal Successfully Processed',
    bodyHtml: body,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATE 8: WITHDRAWAL REJECTED
// Banner: AMBER | Icon: warn | Layout: reason callout + support CTA
// ═══════════════════════════════════════════════════════════════════════════
function tplWithdrawalRejected(p: {
  name: string;
  amount: number;
  reason: string;
  method?: string;
  destination?: string;
  reviewedAt?: string;
}): string {
  const body = `
    ${greeting(p.name)}
    ${para(`Following review by our compliance and operations team, we regret to inform you that your recent withdrawal request from <strong>APEX IPO Access</strong> could not be approved at this time. The requested funds have been returned to your available cash balance and remain accessible within your account.`)}

    ${heroAmount(p.amount, 'Withdrawal Amount — Not Disbursed', 'warn')}

    ${callout('Reason for Rejection', p.reason || 'The withdrawal request could not be approved due to compliance, verification, or operational requirements. This may be related to insufficient account verification, destination mismatch, regulatory holds, or risk-management policies.', 'warn')}

    ${infoTable([
      { label: 'Withdrawal Method', value: p.method || 'Bank Wire Transfer' },
      { label: 'Destination',       value: p.destination || 'Account on file' },
      { label: 'Status',            value: 'Rejected — Funds Returned to Balance' },
      { label: 'Reviewed',          value: fmtDateTime(p.reviewedAt) },
    ])}

    ${para(`Your funds remain safe within your APEX IPO Access account and are reflected in your available balance. You may submit a new withdrawal request once the underlying issue has been addressed, or contact our compliance team for guidance.`)}

    ${para(`Common reasons for withdrawal rejection include: unverified destination accounts, mismatched account holder information, insufficient time elapsed since deposit (clearing period), pending KYC re-verification, or compliance flags requiring further review.`)}

    ${ctaButton('Contact Compliance Team', 'mailto:support@apexipoaccess.com?subject=Withdrawal%20Rejection%20Inquiry', 'warn')}

    ${securityNotice(`If you believe this decision was made in error, our compliance team will be happy to review your case. All decisions are made in accordance with applicable financial regulations and our internal risk-management procedures.`)}
  `;

  return getEmailShell({
    title: 'Withdrawal Request Declined | APEX IPO Access',
    preheader: `Your withdrawal of ${fmtMoney(p.amount)} could not be processed. Funds have been returned to your balance.`,
    bannerColor: 'warn',
    bannerLabel: 'Withdrawal Declined',
    icon: ICONS.warn,
    heading: 'Withdrawal Request Could Not Be Processed',
    bodyHtml: body,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATE 9: PASSWORD RESET
// Banner: PURPLE | Icon: lock | Layout: single big button + security tip
// ═══════════════════════════════════════════════════════════════════════════
function tplPasswordReset(p: {
  name: string;
  resetLink: string;
  expiresIn?: string;
  requestedAt?: string;
  ipAddress?: string;
  device?: string;
}): string {
  const body = `
    ${greeting(p.name)}
    ${para(`We received a request to reset the password for your <strong>APEX IPO Access</strong> account. If you initiated this request, please use the secure link below to set a new password. For your security, this link will expire shortly.`)}

    ${ctaButton('Reset My Password', p.resetLink, 'purple')}

    ${para(`<strong>This link is single-use and time-limited.</strong> If the link expires before you use it, you may request a new password reset from the login page.`)}

    ${infoTable([
      { label: 'Link Expires In', value: p.expiresIn || '1 hour' },
      { label: 'Requested At',    value: fmtDateTime(p.requestedAt) },
      { label: 'Request IP',      value: p.ipAddress || 'Not recorded' },
      { label: 'Device',          value: p.device || 'Not recorded' },
    ])}

    ${callout('Did Not Request This?', `If you did not request a password reset, you can safely ignore this email — your current password will remain unchanged. However, if you are concerned that someone may be attempting to access your account, we strongly recommend contacting our security team immediately and enabling two-factor authentication.`, 'purple')}

    ${securityNotice(`We will never ask for your password, two-factor codes, or account recovery information by email, phone, or text message. If anyone requests this information claiming to represent APEX IPO Access, please report it to security@apexipoaccess.com immediately.`)}
  `;

  return getEmailShell({
    title: 'Password Reset Request | APEX IPO Access',
    preheader: 'A password reset was requested for your account. Use the secure link inside to set a new password.',
    bannerColor: 'purple',
    bannerLabel: 'Security Request',
    icon: ICONS.lock,
    heading: 'Password Reset Request',
    bodyHtml: body,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATE 10: LOGIN ALERT
// Banner: YELLOW | Icon: shield | Layout: device fingerprint card
// ═══════════════════════════════════════════════════════════════════════════
function tplLoginAlert(p: {
  name: string;
  time?: string;
  ipAddress?: string;
  device?: string;
  browser?: string;
  location?: string;
}): string {
  const body = `
    ${greeting(p.name)}
    ${para(`We detected a new sign-in to your <strong>APEX IPO Access</strong> account. This notification is sent automatically as part of our account security monitoring. If this sign-in was authorized by you, no further action is required.`)}

    <h2 style="margin:24px 0 14px;font-family:Inter,Arial,sans-serif;font-size:15px;font-weight:600;color:#202124;letter-spacing:-0.2px;text-transform:uppercase;letter-spacing:1px">Sign-In Details</h2>

    ${infoTable([
      { label: 'Date & Time',  value: fmtDateTime(p.time) },
      { label: 'IP Address',   value: p.ipAddress || 'Not recorded' },
      { label: 'Device',       value: p.device || 'Not recorded' },
      { label: 'Browser',      value: p.browser || 'Not recorded' },
      { label: 'Location',     value: p.location || 'Not recorded' },
    ])}

    ${callout('Was This You?', `If you recognise this sign-in activity, no action is needed and you may safely disregard this email. If you do not recognise this activity, your account may be compromised — please change your password immediately, enable two-factor authentication, and contact our security team.`, 'warn')}

    ${ctaButton('Secure My Account', 'https://apexipoaccess.com/account.html', 'warn')}

    ${para(`To strengthen your account security, we recommend: (1) enabling two-factor authentication, (2) using a unique, strong password not used on other services, (3) reviewing your active sessions regularly, and (4) keeping your contact information up to date so we can reach you in case of suspicious activity.`)}

    ${securityNotice(`Login notifications are sent for new devices, new browsers, and significant location changes. You can manage your notification preferences in your account settings. APEX IPO Access will never ask you for your password or recovery codes by email.`)}
  `;

  return getEmailShell({
    title: 'New Sign-In Detected | APEX IPO Access',
    preheader: 'A new sign-in was detected on your account. Review the details and confirm it was you.',
    bannerColor: 'warn',
    bannerLabel: 'Security Alert',
    icon: ICONS.shield,
    heading: 'New Sign-In to Your Account',
    bodyHtml: body,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATE 11: SHARE PURCHASE CONFIRMATION
// Banner: GREEN | Icon: cart | Layout: receipt-style with order details
// ═══════════════════════════════════════════════════════════════════════════
function tplSharePurchase(p: {
  name: string;
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
  const tickerDisplay = p.ticker ? `${p.company} (${p.ticker})` : p.company;
  const feesRow = typeof p.fees === 'number' && p.fees > 0
    ? [{ label: 'Transaction Fees', value: fmtMoney(p.fees) }]
    : [];
  const balanceRow = typeof p.newCashBalance === 'number'
    ? [{ label: 'Remaining Cash Balance', value: fmtMoney(p.newCashBalance) }]
    : [];

  const body = `
    ${greeting(p.name)}
    ${para(`We are pleased to confirm that your share purchase order has been successfully executed and the corresponding allocation has been credited to your <strong>APEX IPO Access</strong> portfolio. The position is now reflected in your holdings and will appear in your portfolio dashboard.`)}

    ${heroAmount(p.totalCost, 'Total Investment', 'success')}

    <h2 style="margin:24px 0 14px;font-family:Inter,Arial,sans-serif;font-size:15px;font-weight:600;color:#202124;letter-spacing:-0.2px">Order Confirmation</h2>

    ${infoTable([
      { label: 'Security',              value: tickerDisplay },
      { label: 'Order Type',            value: 'Pre-IPO Allocation Purchase' },
      { label: 'Shares Acquired',       value: p.shares.toLocaleString('en-US') },
      { label: 'Price Per Share',       value: fmtMoney(p.pricePerShare) },
      { label: 'Subtotal',              value: fmtMoney(p.shares * p.pricePerShare) },
      ...feesRow,
      { label: 'Total Settlement',      value: fmtMoney(p.totalCost) },
      { label: 'Order Reference',       value: p.orderId ? shortId(p.orderId) : shortId(crypto.randomUUID()) },
      { label: 'Execution Time',        value: fmtDateTime(p.executedAt) },
      { label: 'Order Status',          value: 'Filled & Settled' },
      ...balanceRow,
    ])}

    ${para(`Your shares are held in custody and represented as a pre-IPO allocation in your APEX IPO Access portfolio. You will be notified of any material corporate actions, valuation updates, and ultimately of any liquidity event including the eventual public offering, secondary market opportunity, or strategic exit.`)}

    ${para(`Please note that pre-IPO allocations are illiquid by nature and subject to lock-up periods, transfer restrictions, and the underlying company's progress toward a public listing. Past performance and pre-IPO valuations do not guarantee future results.`)}

    ${ctaButton('View Your Portfolio', 'https://apexipoaccess.com/portfolio.html', 'success')}

    ${securityNotice(`This trade confirmation serves as your official record of execution. Please retain for tax reporting purposes. Cost basis information will be reflected in your year-end statements.`)}
  `;

  return getEmailShell({
    title: `Trade Confirmation — ${p.company} | APEX IPO Access`,
    preheader: `Your purchase of ${p.shares.toLocaleString('en-US')} shares of ${p.company} for ${fmtMoney(p.totalCost)} has been executed.`,
    bannerColor: 'success',
    bannerLabel: 'Trade Executed',
    icon: ICONS.cart,
    heading: 'Share Purchase Confirmed',
    bodyHtml: body,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATE 12: IPO ALLOCATION GRANTED
// Banner: PURPLE | Icon: trophy | Layout: celebration + allocation summary
// ═══════════════════════════════════════════════════════════════════════════
function tplIpoAllocation(p: {
  name: string;
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
  const tickerDisplay = p.ticker ? `${p.company} (${p.ticker})` : p.company;

  const body = `
    ${greeting(p.name)}
    ${para(`Congratulations. We are pleased to inform you that you have been granted an institutional allocation in <strong>${escape(tickerDisplay)}</strong>. This allocation reflects your standing as a qualified investor on our platform and our confidence in your continued participation in our offerings.`)}

    ${heroAmount(p.totalValue, 'Allocation Value at Subscription Price', 'purple')}

    <h2 style="margin:24px 0 14px;font-family:Inter,Arial,sans-serif;font-size:15px;font-weight:600;color:#202124;letter-spacing:-0.2px">Allocation Details</h2>

    ${infoTable([
      { label: 'Issuer',              value: tickerDisplay },
      { label: 'Allocation Type',     value: 'Pre-IPO Institutional Placement' },
      { label: 'Shares Allocated',    value: p.shares.toLocaleString('en-US') },
      { label: 'Subscription Price',  value: fmtMoney(p.pricePerShare) },
      { label: 'Total Value',         value: fmtMoney(p.totalValue) },
      { label: 'Allocation Reference',value: p.allocationId ? shortId(p.allocationId) : shortId(crypto.randomUUID()) },
      { label: 'Granted',             value: fmtDateTime(p.grantedAt) },
      { label: 'Lock-up Period',      value: p.lockupPeriod || '180 days post-listing' },
      { label: 'Expected Listing',    value: p.expectedListing || 'To be announced' },
      { label: 'Status',              value: 'Active — Held in Custody' },
    ])}

    ${para(`This allocation has been credited to your portfolio and is now visible in your holdings. The shares are held in custody on your behalf and are subject to the standard terms of pre-IPO allocations, including applicable lock-up restrictions, transfer limitations, and regulatory holding requirements.`)}

    ${para(`You will receive periodic updates regarding the issuer's progress toward listing, including any material corporate developments, financing rounds, and updates to anticipated public-offering timelines. In the event of a liquidity event, you will be notified well in advance with full instructions.`)}

    ${ctaButton('View Allocation in Portfolio', 'https://apexipoaccess.com/portfolio.html', 'purple')}

    ${securityNotice(`Pre-IPO investments involve substantial risk including potential total loss of principal, illiquidity, and lack of public market valuation. Allocations are non-transferable except as permitted by the issuer and applicable securities regulations.`)}
  `;

  return getEmailShell({
    title: `IPO Allocation Granted — ${p.company} | APEX IPO Access`,
    preheader: `You have been granted ${p.shares.toLocaleString('en-US')} shares of ${p.company} at the subscription price.`,
    bannerColor: 'purple',
    bannerLabel: 'Allocation Granted',
    icon: ICONS.trophy,
    heading: 'You Have Received an IPO Allocation',
    bodyHtml: body,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATE 13: ACCOUNT BANNED / SUSPENDED
// Banner: RED | Icon: ban | Layout: serious tone + reason + appeal
// ═══════════════════════════════════════════════════════════════════════════
function tplAccountBanned(p: {
  name: string;
  reason: string;
  bannedAt?: string;
  caseId?: string;
}): string {
  const body = `
    ${greeting(p.name)}
    ${para(`This is a formal notification that your <strong>APEX IPO Access</strong> account has been suspended and access has been revoked, effective immediately. This action has been taken following review by our compliance and risk-management team in accordance with our Terms of Service and applicable financial regulations.`)}

    ${callout('Reason for Suspension', p.reason || 'Your account has been suspended following a compliance review. Specific details regarding this decision are available upon written request to our compliance team.', 'error')}

    ${infoTable([
      { label: 'Account Status', value: 'Suspended — Access Revoked' },
      { label: 'Action Taken',   value: fmtDateTime(p.bannedAt) },
      { label: 'Case Reference', value: p.caseId ? shortId(p.caseId) : shortId(crypto.randomUUID()) },
      { label: 'Next Step',      value: 'Contact Compliance for Appeal' },
    ])}

    ${para(`During the suspension period, you will be unable to log in, deposit funds, withdraw funds, or transact on the platform. Any open positions, pending allocations, or active orders will be reviewed in accordance with our procedures. Funds held in your account remain subject to our terms and applicable regulatory holds.`)}

    ${para(`You have the right to request a formal review of this decision by contacting our compliance team in writing within thirty (30) days of this notice. Please include your case reference number above in all correspondence. Our compliance team will review your appeal and respond within a reasonable timeframe.`)}

    ${para(`If your account is reinstated following review, you will receive a separate notification with instructions for restoring access. If the suspension is upheld, we will provide further information regarding the disposition of any funds or positions held on your behalf, in accordance with our terms and applicable regulations.`)}

    ${ctaButton('File a Formal Appeal', 'mailto:compliance@apexipoaccess.com?subject=Account%20Suspension%20Appeal', 'error')}

    ${securityNotice(`This action has been taken in accordance with our Terms of Service, Privacy Policy, and applicable anti-money-laundering and compliance regulations. All decisions are logged and auditable. We are required to retain account records for periods specified by applicable financial regulations.`)}
  `;

  return getEmailShell({
    title: 'Account Suspension Notice | APEX IPO Access',
    preheader: 'Your APEX IPO Access account has been suspended. Review the reason and appeal process inside.',
    bannerColor: 'error',
    bannerLabel: 'Account Suspended',
    icon: ICONS.ban,
    heading: 'Notice of Account Suspension',
    bodyHtml: body,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATE REGISTRY
// ═══════════════════════════════════════════════════════════════════════════
const TEMPLATES: Record<string, (p: any) => string> = {
  'welcome':             tplWelcome,
  'kyc-rejected':        tplKycRejected,
  'deposit-pending':     tplDepositPending,
  'deposit-approved':    tplDepositApproved,
  'deposit-rejected':    tplDepositRejected,
  'withdrawal-pending':  tplWithdrawalPending,
  'withdrawal-approved': tplWithdrawalApproved,
  'withdrawal-rejected': tplWithdrawalRejected,
  'password-reset':      tplPasswordReset,
  'login-alert':         tplLoginAlert,
  'share-purchase':      tplSharePurchase,
  'ipo-allocation':      tplIpoAllocation,
  'account-banned':      tplAccountBanned,
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN HTTP HANDLER
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

  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY not set in environment');

    const body = await req.json();
    const { template, to, subject, params } = body;

    if (!template || !to || !subject) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: template, to, subject' }),
        { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    const tplFn = TEMPLATES[template];
    if (!tplFn) {
      return new Response(
        JSON.stringify({ error: `Unknown template: ${template}`, available: Object.keys(TEMPLATES) }),
        { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    const html = tplFn(params || {});

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'APEX IPO Access <noreply@apexipoaccess.com>',
        to: [to],
        subject,
        html,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('Resend API error:', data);
      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: data }),
        { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, id: data.id, template }),
      { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );

  } catch (err) {
    console.error('Handler error:', err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );
  }
});
