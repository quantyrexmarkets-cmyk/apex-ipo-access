const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";

// ============ SHARED TEMPLATE WRAPPER ============
function wrap(opts: {
  heading: string;
  preheader?: string;
  body: string;
  ctaText?: string;
  ctaUrl?: string;
  noticeTitle?: string;
  noticeBody?: string;
  iconType?: 'success' | 'info' | 'warn' | 'error';
}) {
  const icons = {
    success: '<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="#3ed598" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    info: '<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="#5fb0ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
    warn: '<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="#ffb800" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    error: '<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="#ff6a6a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
  };
  const iconBgs = {
    success: 'rgba(62,213,152,0.1)',
    info: 'rgba(95,176,255,0.1)',
    warn: 'rgba(255,184,0,0.1)',
    error: 'rgba(255,106,106,0.1)',
  };
  const iconBorders = {
    success: 'rgba(62,213,152,0.3)',
    info: 'rgba(95,176,255,0.3)',
    warn: 'rgba(255,184,0,0.3)',
    error: 'rgba(255,106,106,0.3)',
  };
  const ic = opts.iconType || 'info';
  const iconHtml = `<table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto 20px"><tr><td align="center" valign="middle" width="64" height="64" style="background:${iconBgs[ic]};border:1px solid ${iconBorders[ic]};border-radius:50%">${icons[ic]}</td></tr></table>`;
  const ctaHtml = opts.ctaText && opts.ctaUrl ? `<table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:28px auto"><tr><td align="center" class="cta-btn" style="border-radius:8px"><a href="${opts.ctaUrl}" target="_blank" class="cta-btn" style="display:inline-block;padding:14px 36px;font-family:'Inter','Roboto',Arial,sans-serif;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;letter-spacing:0.2px">${opts.ctaText}</a></td></tr></table>` : '';
  const noticeHtml = opts.noticeTitle ? `<p class="security" style="margin:32px 0 0;padding:14px 16px;border-radius:8px;font-size:12px;line-height:1.6"><strong>${opts.noticeTitle}</strong> ${opts.noticeBody || ''}</p>` : '';
  const preheader = opts.preheader || opts.heading;

  return getEmailShell(opts.heading, preheader, iconHtml, opts.body, ctaHtml, noticeHtml);
}

// ============ HTML SHELL ============
function getEmailShell(heading: string, preheader: string, iconHtml: string, body: string, ctaHtml: string, noticeHtml: string) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${heading}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Oswald:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
  :root { color-scheme: light dark; supported-color-schemes: light dark; }
  body, .bg { background:#ffffff !important; color:#202124 !important; }
  .card { background:#f8f9fa !important; border-color:#dadce0 !important; }
  .brand-text { color:#202124 !important; }
  .brand-sub { color:#5f6368 !important; }
  .heading { color:#202124 !important; }
  .body-text { color:#3c4043 !important; }
  .meta { color:#5f6368 !important; }
  .cta-btn { background:#1a73e8 !important; color:#ffffff !important; }
  .info-row { background:#ffffff !important; border:1px solid #dadce0 !important; }
  .info-label { color:#5f6368 !important; }
  .info-value { color:#202124 !important; }
  .security { background:#f1f3f4 !important; color:#5f6368 !important; }
  .security strong { color:#202124 !important; }
  .footer { color:#5f6368 !important; }
  .footer-small { color:#80868b !important; }
  a.link { color:#1a73e8 !important; }

  @media (prefers-color-scheme: dark) {
    body, .bg { background:#1f2123 !important; color:#e3e3e3 !important; }
    .card { background:#28292c !important; border-color:#3c3f43 !important; }
    .brand-text { color:#ffffff !important; }
    .brand-sub { color:#a0a4a8 !important; }
    .heading { color:#ffffff !important; }
    .body-text { color:#c8ccd0 !important; }
    .meta { color:#a0a4a8 !important; }
    .cta-btn { background:#5fb0ff !important; color:#0d1117 !important; }
    .info-row { background:#1f2123 !important; border:1px solid #3c3f43 !important; }
    .info-label { color:#a0a4a8 !important; }
    .info-value { color:#ffffff !important; }
    .security { background:#1f2123 !important; color:#a0a4a8 !important; }
    .security strong { color:#e3e3e3 !important; }
    .footer { color:#a0a4a8 !important; }
    .footer-small { color:#6b6f74 !important; }
    a.link { color:#5fb0ff !important; }
  }
</style>
</head>
<body class="bg" style="margin:0;padding:0;font-family:'Inter','Roboto',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">
<div style="display:none;max-height:0;overflow:hidden">${preheader}</div>
<table role="presentation" class="bg" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px">
      <tr><td style="padding:0 8px 28px">
        <table role="presentation" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding-right:14px;vertical-align:middle">
              <img src="https://apexipoaccess.com/assets/spacex-logo.png" alt="" width="52" height="52" style="display:block;width:52px;height:52px">
            </td>
            <td style="vertical-align:middle">
              <span class="brand-text" style="font-family:'Oswald','Impact','Helvetica Neue',Arial,sans-serif;font-size:26px;font-weight:600;letter-spacing:2px;text-transform:uppercase">APEX</span>
              <span class="brand-sub" style="font-family:'Oswald','Impact','Helvetica Neue',Arial,sans-serif;font-size:26px;font-weight:300;letter-spacing:2px;text-transform:uppercase;margin-left:6px">IPO Access</span>
            </td>
          </tr>
        </table>
      </td></tr>
      <tr><td class="card" style="border:1px solid;border-radius:12px;padding:36px 32px;text-align:center">
        ${iconHtml}
        <h1 class="heading" style="margin:0 0 20px;font-family:'Inter','Roboto',Arial,sans-serif;font-size:22px;font-weight:600;letter-spacing:-0.3px;line-height:1.3">${heading}</h1>
        <div style="text-align:left">${body}</div>
        ${ctaHtml}
        ${noticeHtml}
      </td></tr>
      <tr><td align="center" style="padding:24px 8px 8px">
        <p class="footer" style="margin:0 0 6px;font-size:11px;line-height:1.6">You are receiving this email because you have an account at <a class="link" href="https://apexipoaccess.com" style="text-decoration:none">apexipoaccess.com</a></p>
        <p class="footer" style="margin:0 0 6px;font-size:11px;line-height:1.6">For assistance, contact <a class="link" href="mailto:support@apexipoaccess.com" style="text-decoration:none">support@apexipoaccess.com</a></p>
        <p class="footer-small" style="margin:14px 0 0;font-size:10px;line-height:1.6">© ${new Date().getFullYear()} APEX IPO Access · Investment Intelligence Platform</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

// ============ INFO TABLE HELPER ============
function infoTable(rows: Array<[string, string]>) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" class="info-row" style="border-radius:8px;margin:20px 0">
    ${rows.map(([label, value]) => `
      <tr>
        <td class="info-label" style="padding:12px 16px;font-size:13px;border-bottom:1px solid rgba(255,255,255,0.05)">${label}</td>
        <td class="info-value" style="padding:12px 16px;font-size:13px;font-weight:600;text-align:right;border-bottom:1px solid rgba(255,255,255,0.05)">${value}</td>
      </tr>
    `).join('')}
  </table>`;
}

function fmtMoney(n: number) {
  return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function greeting(name: string) {
  return `<p class="body-text" style="margin:0 0 16px;font-size:14px;line-height:1.7">Dear ${name || 'Investor'},</p>`;
}

// ─── TEMPLATE: WELCOME (KYC Approved) ────────────────────────────────────────
function tplWelcome(p: { name: string; email: string }) {
  const body = `
    ${greeting(p.name)}
    <p class="body-text" style="margin:0 0 20px;font-size:14px;line-height:1.7">
      Congratulations! Your identity has been verified and your
      <strong>APEX IPO Access</strong> account is now fully activated.
      You can now deposit funds and participate in upcoming IPO allocations.
    </p>
    ${infoTable([
      { label: 'Account Email', value: p.email },
      { label: 'KYC Status', value: '✅ Verified' },
      { label: 'Account Type', value: 'Individual Investor' },
    ])}
    <p class="body-text" style="margin:20px 0 28px;font-size:14px;line-height:1.7">
      Log in to your dashboard to explore current IPO opportunities and
      make your first deposit.
    </p>
    <div style="text-align:center;margin-bottom:8px">
      <a href="https://apexipoaccess.com/dashboard.html"
         style="display:inline-block;background:#1a73e8;color:#fff;
                font-family:Inter,sans-serif;font-size:14px;font-weight:600;
                text-decoration:none;padding:14px 36px;border-radius:8px">
        Go to Dashboard
      </a>
    </div>`;
  return getEmailShell({
    title: 'Account Activated — APEX IPO Access',
    preview: 'Your account is verified and ready to invest.',
    icon: ICONS.success,
    heading: 'Account Activated',
    body,
  });
}

// ─── TEMPLATE: KYC REJECTED ───────────────────────────────────────────────────
function tplKycRejected(p: { name: string; reason: string }) {
  const body = `
    ${greeting(p.name)}
    <p class="body-text" style="margin:0 0 20px;font-size:14px;line-height:1.7">
      After reviewing your submitted documents, we were unable to verify
      your identity at this time. Your application has been <strong>declined</strong>.
    </p>
    ${infoTable([
      { label: 'Decision', value: '❌ Rejected' },
      { label: 'Reason', value: p.reason || 'Documents could not be verified.' },
    ])}
    <p class="body-text" style="margin:20px 0 16px;font-size:14px;line-height:1.7">
      If you believe this is an error or would like to re-submit your
      documents, please contact our support team and we will be happy to assist.
    </p>
    <div style="text-align:center;margin-bottom:8px">
      <a href="mailto:support@apexipoaccess.com"
         style="display:inline-block;background:#1a73e8;color:#fff;
                font-family:Inter,sans-serif;font-size:14px;font-weight:600;
                text-decoration:none;padding:14px 36px;border-radius:8px">
        Contact Support
      </a>
    </div>`;
  return getEmailShell({
    title: 'KYC Application Declined — APEX IPO Access',
    preview: 'Your identity verification was not approved.',
    icon: ICONS.error,
    heading: 'Identity Verification Declined',
    body,
  });
}

// ─── TEMPLATE: DEPOSIT PENDING ────────────────────────────────────────────────
function tplDepositPending(p: {
  name: string;
  amount: number;
  method?: string;
  submittedAt?: string;
}) {
  const body = `
    ${greeting(p.name)}
    <p class="body-text" style="margin:0 0 20px;font-size:14px;line-height:1.7">
      We have received your deposit submission and it is now
      <strong>under review</strong> by our operations team.
    </p>
    ${infoTable([
      { label: 'Deposit Amount', value: fmtMoney(p.amount) },
      { label: 'Method', value: p.method || 'Funding Transfer' },
      { label: 'Status', value: '⏳ Pending Review' },
      ...(p.submittedAt ? [{ label: 'Submitted', value: p.submittedAt }] : []),
    ])}
    <p class="body-text" style="margin:20px 0 28px;font-size:14px;line-height:1.7">
      You will receive another email once your deposit has been approved or rejected.
      Please do not submit the same deposit multiple times unless instructed.
    </p>
    <div style="text-align:center;margin-bottom:8px">
      <a href="https://apexipoaccess.com/dashboard.html"
         style="display:inline-block;background:#1a73e8;color:#fff;
                font-family:Inter,sans-serif;font-size:14px;font-weight:600;
                text-decoration:none;padding:14px 36px;border-radius:8px">
        View Dashboard
      </a>
    </div>`;
  return getEmailShell({
    title: 'Deposit Submitted — APEX IPO Access',
    preview: 'Your deposit is pending review.',
    icon: ICONS.info,
    heading: 'Deposit Pending Review',
    body,
  });
}

// ─── TEMPLATE: DEPOSIT APPROVED ───────────────────────────────────────────────
function tplDepositApproved(p: {
  name: string;
  amount: number;
  newBalance: number;
  method?: string;
  approvedAt?: string;
}) {
  const body = `
    ${greeting(p.name)}
    <p class="body-text" style="margin:0 0 20px;font-size:14px;line-height:1.7">
      Your deposit has been successfully <strong>approved</strong> and the funds
      have been credited to your APEX IPO Access account.
    </p>
    ${infoTable([
      { label: 'Deposit Amount', value: fmtMoney(p.amount) },
      { label: 'Method', value: p.method || 'Funding Transfer' },
      { label: 'Status', value: '✅ Approved' },
      { label: 'New Cash Balance', value: fmtMoney(p.newBalance) },
      ...(p.approvedAt ? [{ label: 'Approved', value: p.approvedAt }] : []),
    ])}
    <p class="body-text" style="margin:20px 0 28px;font-size:14px;line-height:1.7">
      Your funds are now available in your account and can be used for upcoming
      IPO allocations and investment opportunities.
    </p>
    <div style="text-align:center;margin-bottom:8px">
      <a href="https://apexipoaccess.com/dashboard.html"
         style="display:inline-block;background:#1a73e8;color:#fff;
                font-family:Inter,sans-serif;font-size:14px;font-weight:600;
                text-decoration:none;padding:14px 36px;border-radius:8px">
        Go to Dashboard
      </a>
    </div>`;
  return getEmailShell({
    title: 'Deposit Approved — APEX IPO Access',
    preview: 'Your deposit has been credited to your account.',
    icon: ICONS.success,
    heading: 'Deposit Approved',
    body,
  });
}

// ─── TEMPLATE: DEPOSIT REJECTED ───────────────────────────────────────────────
function tplDepositRejected(p: {
  name: string;
  amount: number;
  reason: string;
  method?: string;
}) {
  const body = `
    ${greeting(p.name)}
    <p class="body-text" style="margin:0 0 20px;font-size:14px;line-height:1.7">
      Unfortunately, your recent deposit submission could not be approved
      and has been <strong>rejected</strong>.
    </p>
    ${infoTable([
      { label: 'Deposit Amount', value: fmtMoney(p.amount) },
      { label: 'Method', value: p.method || 'Funding Transfer' },
      { label: 'Status', value: '❌ Rejected' },
      { label: 'Reason', value: p.reason || 'Deposit submission could not be verified.' },
    ])}
    <p class="body-text" style="margin:20px 0 16px;font-size:14px;line-height:1.7">
      If you believe this decision was made in error, or if you need help
      submitting a new deposit, please contact our support team.
    </p>
    <div style="text-align:center;margin-bottom:8px">
      <a href="mailto:support@apexipoaccess.com"
         style="display:inline-block;background:#1a73e8;color:#fff;
                font-family:Inter,sans-serif;font-size:14px;font-weight:600;
                text-decoration:none;padding:14px 36px;border-radius:8px">
        Contact Support
      </a>
    </div>`;
  return getEmailShell({
    title: 'Deposit Rejected — APEX IPO Access',
    preview: 'Your deposit submission was not approved.',
    icon: ICONS.warn,
    heading: 'Deposit Rejected',
    body,
  });
}

// ─── TEMPLATE: WITHDRAWAL PENDING ─────────────────────────────────────────────
function tplWithdrawalPending(p: {
  name: string;
  amount: number;
  method?: string;
  destination?: string;
  requestedAt?: string;
}) {
  const body = `
    ${greeting(p.name)}
    <p class="body-text" style="margin:0 0 20px;font-size:14px;line-height:1.7">
      We have received your withdrawal request and it is currently
      <strong>pending review</strong> by our operations team.
    </p>
    ${infoTable([
      { label: 'Withdrawal Amount', value: fmtMoney(p.amount) },
      { label: 'Method', value: p.method || 'Withdrawal Transfer' },
      ...(p.destination ? [{ label: 'Destination', value: p.destination }] : []),
      { label: 'Status', value: '⏳ Pending Review' },
      ...(p.requestedAt ? [{ label: 'Submitted', value: p.requestedAt }] : []),
    ])}
    <p class="body-text" style="margin:20px 0 28px;font-size:14px;line-height:1.7">
      You will receive another email once your withdrawal has been approved
      or rejected. Please allow our team time to complete the review.
    </p>
    <div style="text-align:center;margin-bottom:8px">
      <a href="https://apexipoaccess.com/dashboard.html"
         style="display:inline-block;background:#1a73e8;color:#fff;
                font-family:Inter,sans-serif;font-size:14px;font-weight:600;
                text-decoration:none;padding:14px 36px;border-radius:8px">
        View Dashboard
      </a>
    </div>`;
  return getEmailShell({
    title: 'Withdrawal Submitted — APEX IPO Access',
    preview: 'Your withdrawal request is pending review.',
    icon: ICONS.info,
    heading: 'Withdrawal Pending Review',
    body,
  });
}

// ─── TEMPLATE: WITHDRAWAL APPROVED ────────────────────────────────────────────
function tplWithdrawalApproved(p: {
  name: string;
  amount: number;
  method?: string;
  destination?: string;
  approvedAt?: string;
  newBalance?: number;
}) {
  const body = `
    ${greeting(p.name)}
    <p class="body-text" style="margin:0 0 20px;font-size:14px;line-height:1.7">
      Your withdrawal request has been <strong>approved</strong> and is being
      processed to your selected destination.
    </p>
    ${infoTable([
      { label: 'Withdrawal Amount', value: fmtMoney(p.amount) },
      { label: 'Method', value: p.method || 'Withdrawal Transfer' },
      ...(p.destination ? [{ label: 'Destination', value: p.destination }] : []),
      { label: 'Status', value: '✅ Approved' },
      ...(typeof p.newBalance === 'number'
        ? [{ label: 'Remaining Cash Balance', value: fmtMoney(p.newBalance) }]
        : []),
      ...(p.approvedAt ? [{ label: 'Processed', value: p.approvedAt }] : []),
    ])}
    <p class="body-text" style="margin:20px 0 28px;font-size:14px;line-height:1.7">
      Depending on the transfer method, final receipt times may vary.
      If you have questions about settlement timing, please contact support.
    </p>
    <div style="text-align:center;margin-bottom:8px">
      <a href="https://apexipoaccess.com/dashboard.html"
         style="display:inline-block;background:#1a73e8;color:#fff;
                font-family:Inter,sans-serif;font-size:14px;font-weight:600;
                text-decoration:none;padding:14px 36px;border-radius:8px">
        Go to Dashboard
      </a>
    </div>`;
  return getEmailShell({
    title: 'Withdrawal Approved — APEX IPO Access',
    preview: 'Your withdrawal request has been approved.',
    icon: ICONS.success,
    heading: 'Withdrawal Approved',
    body,
  });
}

// ─── TEMPLATE: WITHDRAWAL REJECTED ────────────────────────────────────────────
function tplWithdrawalRejected(p: {
  name: string;
  amount: number;
  reason: string;
  method?: string;
  destination?: string;
}) {
  const body = `
    ${greeting(p.name)}
    <p class="body-text" style="margin:0 0 20px;font-size:14px;line-height:1.7">
      Unfortunately, your recent withdrawal request could not be completed
      and has been <strong>rejected</strong>.
    </p>
    ${infoTable([
      { label: 'Withdrawal Amount', value: fmtMoney(p.amount) },
      { label: 'Method', value: p.method || 'Withdrawal Transfer' },
      ...(p.destination ? [{ label: 'Destination', value: p.destination }] : []),
      { label: 'Status', value: '❌ Rejected' },
      { label: 'Reason', value: p.reason || 'Withdrawal request could not be approved.' },
    ])}
    <p class="body-text" style="margin:20px 0 16px;font-size:14px;line-height:1.7">
      If you believe this decision was made in error, please contact our
      support team for further assistance.
    </p>
    <div style="text-align:center;margin-bottom:8px">
      <a href="mailto:support@apexipoaccess.com"
         style="display:inline-block;background:#1a73e8;color:#fff;
                font-family:Inter,sans-serif;font-size:14px;font-weight:600;
                text-decoration:none;padding:14px 36px;border-radius:8px">
        Contact Support
      </a>
    </div>`;
  return getEmailShell({
    title: 'Withdrawal Rejected — APEX IPO Access',
    preview: 'Your withdrawal request was not approved.',
    icon: ICONS.warn,
    heading: 'Withdrawal Rejected',
    body,
  });
}

// ─── TEMPLATE: PASSWORD RESET ─────────────────────────────────────────────────
function tplPasswordReset(p: {
  name: string;
  resetLink: string;
  expiresIn?: string;
  requestedAt?: string;
  ipAddress?: string;
}) {
  const body = `
    ${greeting(p.name)}
    <p class="body-text" style="margin:0 0 20px;font-size:14px;line-height:1.7">
      We received a request to reset the password for your APEX IPO Access account.
      Click the button below to set a new password.
    </p>
    ${infoTable([
      ...(p.requestedAt ? [{ label: 'Requested', value: p.requestedAt }] : []),
      ...(p.ipAddress ? [{ label: 'IP Address', value: p.ipAddress }] : []),
      { label: 'Link Expires', value: p.expiresIn || '1 hour' },
    ])}
    <div style="text-align:center;margin:28px 0 8px">
      <a href="${p.resetLink}"
         style="display:inline-block;background:#1a73e8;color:#fff;
                font-family:Inter,sans-serif;font-size:14px;font-weight:600;
                text-decoration:none;padding:14px 36px;border-radius:8px">
        Reset My Password
      </a>
    </div>
    <p class="body-text" style="margin:20px 0 0;font-size:13px;line-height:1.7;opacity:0.7">
      If you did not request a password reset, you can safely ignore this email.
      Your password will not change unless you click the link above.
      If you are concerned about your account security, please contact support immediately.
    </p>`;
  return getEmailShell({
    title: 'Password Reset — APEX IPO Access',
    preview: 'Reset your APEX IPO Access account password.',
    icon: ICONS.warn,
    heading: 'Password Reset Request',
    body,
  });
}

// ─── TEMPLATE: LOGIN ALERT ────────────────────────────────────────────────────
function tplLoginAlert(p: {
  name: string;
  time: string;
  ipAddress?: string;
  device?: string;
  location?: string;
}) {
  const body = `
    ${greeting(p.name)}
    <p class="body-text" style="margin:0 0 20px;font-size:14px;line-height:1.7">
      We detected a new sign-in to your APEX IPO Access account.
      If this was you, no action is needed.
    </p>
    ${infoTable([
      { label: 'Time', value: p.time },
      ...(p.ipAddress ? [{ label: 'IP Address', value: p.ipAddress }] : []),
      ...(p.device ? [{ label: 'Device', value: p.device }] : []),
      ...(p.location ? [{ label: 'Location', value: p.location }] : []),
    ])}
    <p class="body-text" style="margin:20px 0 16px;font-size:14px;line-height:1.7">
      If you do <strong>not</strong> recognise this sign-in, your account may be
      compromised. Please change your password immediately and contact our
      support team.
    </p>
    <div style="text-align:center;margin-bottom:8px">
      <a href="mailto:support@apexipoaccess.com"
         style="display:inline-block;background:#1a73e8;color:#fff;
                font-family:Inter,sans-serif;font-size:14px;font-weight:600;
                text-decoration:none;padding:14px 36px;border-radius:8px">
        Contact Support
      </a>
    </div>
    <p class="body-text" style="margin:20px 0 0;font-size:13px;line-height:1.7;opacity:0.7">
      For your security, we send this alert for every new device or
      location sign-in detected on your account.
    </p>`;
  return getEmailShell({
    title: 'New Sign-In Detected — APEX IPO Access',
    preview: 'A new sign-in was detected on your account.',
    icon: ICONS.warn,
    heading: 'New Sign-In Detected',
    body,
  });
}

// ─── TEMPLATE REGISTRY ────────────────────────────────────────────────────────
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
};

// ─── MAIN HANDLER ─────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY not set');

    const body = await req.json();
    const { template, to, subject, params } = body;

    if (!template || !to || !subject) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: template, to, subject' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const tplFn = TEMPLATES[template];
    if (!tplFn) {
      return new Response(
        JSON.stringify({ error: `Unknown template: ${template}` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
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
      console.error('Resend error:', data);
      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: data }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, id: data.id }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('Handler error:', err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
