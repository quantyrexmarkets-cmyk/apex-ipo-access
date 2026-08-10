// Email templates — black/white branded, mobile-friendly, table-based
const APP_URL = process.env.APP_URL || 'https://apexipoholdings.com';
const BRAND = 'APEX IPO Access';

const baseStyles = `
  body{margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#0a0a0a}
  .wrap{max-width:560px;margin:0 auto;background:#fff}
  .header{background:#000;padding:28px 32px;text-align:left}
  .brand{color:#fff;font-size:18px;font-weight:700;letter-spacing:-0.3px;text-decoration:none;margin:0}
  .body{padding:32px}
  h1{font-size:22px;font-weight:700;margin:0 0 16px;letter-spacing:-0.3px;color:#0a0a0a}
  p{font-size:15px;line-height:1.6;margin:0 0 16px;color:#27272a}
  .muted{color:#71717a;font-size:13px}
  .btn{display:inline-block;background:#000;color:#fff !important;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;margin:8px 0 20px}
  .box{background:#f4f4f5;border:1px solid #e4e4e7;border-radius:8px;padding:18px 20px;margin:18px 0}
  .row{display:table;width:100%;margin:6px 0}
  .row .k{display:table-cell;color:#71717a;font-size:13px;padding-right:12px;width:120px}
  .row .v{display:table-cell;color:#0a0a0a;font-size:14px;font-weight:600;font-family:'JetBrains Mono',Menlo,monospace}
  .footer{padding:24px 32px;border-top:1px solid #e4e4e7;color:#71717a;font-size:12px;line-height:1.5}
  .footer a{color:#71717a}
  .danger{color:#dc2626}
  .success{color:#059669}
`;

function shell(title, contentHtml) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${title}</title>
<style>${baseStyles}</style></head>
<body>
<div class="wrap">
  <div class="header">
    <p class="brand">${BRAND}</p>
  </div>
  <div class="body">
    ${contentHtml}
  </div>
  <div class="footer">
    You are receiving this notification because you maintain an account with APEX IPO Access.<br>
    For assistance, please contact <a href="mailto:support@apexipoholdings.com">support@apexipoholdings.com</a>.<br>
    © ${new Date().getFullYear()} APEX IPO Access. All rights reserved.
  </div>
</div>
</body></html>`;
}

function fmtUSD(n) {
  return '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ────────── TEMPLATES ──────────

const templates = {
  welcome: (name, verifyUrl) => ({
    subject: 'Welcome to APEX IPO Access — Verify Your Email',
    html: shell('Welcome', `
      <h1>Welcome to APEX${name ? ', ' + esc(name) : ''}</h1>
      <p>Your APEX IPO Access account has been approved. To finalize activation and secure your account, please verify your email address below.</p>
      <a href="${verifyUrl}" class="btn">Verify Email</a>
      <p class="muted">Or copy this link: ${esc(verifyUrl)}</p>
      <p class="muted">This verification link will expire in 24 hours.</p>
    `)
  }),

  verifyEmail: (name, verifyUrl) => ({
    subject: 'Verify Your APEX IPO Access Email',
    html: shell('Verify Email', `
      <h1>Email Verification Required</h1>
      <p>Hello${name ? ' ' + esc(name) : ''},<br><br>Please verify your email address to activate your APEX IPO Access account. This step is required for account security and regulatory compliance.</p>
      <a href="${verifyUrl}" class="btn">Verify Email</a>
      <p class="muted">Or copy this link: ${esc(verifyUrl)}</p>
      <p class="muted">This link will expire in 24 hours. If you did not initiate this request, you may safely disregard this email.</p>
    `)
  }),

  passwordReset: (name, resetUrl) => ({
    subject: 'Password Reset Request — APEX IPO Access',
    html: shell('Reset Password', `
      <h1>Reset Your Password</h1>
      <p>Hello${name ? ' ' + esc(name) : ''},<br><br>We received a request to reset the password for your APEX IPO Access account. Click the button below to choose a new password.</p>
      <a href="${resetUrl}" class="btn">Reset Password</a>
      <p class="muted">Or copy this link: ${esc(resetUrl)}</p>
      <p class="muted">This link will expire in 1 hour for your security. If you did not request a password reset, please disregard this email — your password will remain unchanged.</p>
    `)
  }),

  kycApproved: (name) => ({
    subject: 'Identity Verification Approved — APEX IPO Access',
    html: shell('KYC Approved', `
      <h1>Identity Verification Approved</h1>
      <p>Hello${name ? ' ' + esc(name) : ''},<br><br>We are pleased to inform you that your identity verification has been successfully completed. You may now fund your account and begin investing in available IPO opportunities.</p>
      <a href="${APP_URL}/dashboard" class="btn">Go to Dashboard</a>
    `)
  }),

  kycRejected: (name, reason) => ({
    subject: 'Identity Verification Update — APEX IPO Access',
    html: shell('KYC Update', `
      <h1>Identity Verification Update</h1>
      <p>Hello${name ? ' ' + esc(name) : ''},<br><br>After review, we were unable to approve your identity verification submission. Please resubmit your documents to complete the verification process.</p>
      ${reason ? `<div class="box"><strong>Reason:</strong> ${esc(reason)}</div>` : ''}
      
      <a href="${APP_URL}/kyc" class="btn">Resubmit Documents</a>
    `)
  }),

  depositApproved: (name, amount, currency, txid) => ({
    subject: `Deposit Approved — ${fmtUSD(amount)}`,
    html: shell('Deposit Approved', `
      <h1>Deposit Confirmed</h1>
      <p>Hello${name ? ' ' + esc(name) : ''},<br><br>Your deposit has been successfully processed and credited to your APEX account balance.</p>
      <div class="box">
        <div class="row"><span class="k">Amount</span><span class="v">${fmtUSD(amount)}</span></div>
        ${currency ? `<div class="row"><span class="k">Method</span><span class="v">${esc(currency)}</span></div>` : ''}
        ${txid ? `<div class="row"><span class="k">Reference</span><span class="v">${esc(txid)}</span></div>` : ''}
      </div>
      <a href="${APP_URL}/dashboard" class="btn">View Dashboard</a>
    `)
  }),

  depositRejected: (name, amount, currency, reason) => ({
    subject: 'Deposit Rejected',
    html: shell('Deposit Rejected', `
      <h1>Deposit Could Not Be Processed</h1>
      <p>Hello${name ? ' ' + esc(name) : ''},<br><br>We were unable to process your recent deposit. Please review the details below and try again.</p>
      <div class="box">
        <div class="row"><span class="k">Amount</span><span class="v">${fmtUSD(amount)}</span></div>
        ${currency ? `<div class="row"><span class="k">Method</span><span class="v">${esc(currency)}</span></div>` : ''}
      </div>
      ${reason ? `<p><strong>Reason:</strong> ${esc(reason)}</p>` : ''}
      <a href="${APP_URL}/fund" class="btn">Try Again</a>
    `)
  }),

  withdrawalApproved: (name, amount, method, dest) => ({
    subject: `Withdrawal Sent — ${fmtUSD(amount)}`,
    html: shell('Withdrawal Sent', `
      <h1>Withdrawal Processed</h1>
      <p>Hello${name ? ' ' + esc(name) : ''},<br><br>Your withdrawal request has been approved and the funds have been released to your designated destination.</p>
      <div class="box">
        <div class="row"><span class="k">Amount</span><span class="v">${fmtUSD(amount)}</span></div>
        ${method ? `<div class="row"><span class="k">Method</span><span class="v">${esc(method)}</span></div>` : ''}
        ${dest ? `<div class="row"><span class="k">Destination</span><span class="v">${esc(dest)}</span></div>` : ''}
      </div>
      <p class="muted">Funds typically arrive within 1–3 business days depending on method.</p>
    `)
  }),

  withdrawalRejected: (name, amount, reason) => ({
    subject: 'Withdrawal Rejected',
    html: shell('Withdrawal Rejected', `
      <h1>Withdrawal Could Not Be Processed</h1>
      <p>Hello${name ? ' ' + esc(name) : ''},<br><br>We were unable to process your withdrawal request. The funds have been returned to your APEX account balance.</p>
      <div class="box">
        <div class="row"><span class="k">Amount</span><span class="v">${fmtUSD(amount)}</span></div>
      </div>
      ${reason ? `<p><strong>Reason:</strong> ${esc(reason)}</p>` : ''}
      <a href="${APP_URL}/withdraw" class="btn">Try Again</a>
    `)
  }),

  buyConfirmation: (name, ticker, shares, price, total) => ({
    subject: `Order Filled — ${shares} ${ticker} @ ${fmtUSD(price)}`,
    html: shell('Order Filled', `
      <h1>Order Confirmation</h1>
      <p>Hello${name ? ' ' + esc(name) : ''},<br><br>Your purchase order has been successfully executed. Order details are provided below for your records.</p>
      <div class="box">
        <div class="row"><span class="k">Ticker</span><span class="v">${esc(ticker)}</span></div>
        <div class="row"><span class="k">Shares</span><span class="v">${Number(shares).toLocaleString()}</span></div>
        <div class="row"><span class="k">Price</span><span class="v">${fmtUSD(price)}</span></div>
        <div class="row"><span class="k">Total</span><span class="v">${fmtUSD(total)}</span></div>
      </div>
      <a href="${APP_URL}/portfolio" class="btn">View Portfolio</a>
    `)
  }),

  balanceAdjust: (name, delta, newBalance, note) => {
    const isCredit = delta >= 0;
    const absAmount = Math.abs(delta);
    const headline = isCredit ? 'Funds Credited to Your Account' : 'Account Debit Notice';
    const subjectVerb = isCredit ? 'Funds Credited' : 'Account Debit Notice';
    const intro = isCredit
      ? `We are confirming that <strong>${fmtUSD(absAmount)}</strong> has been credited to your APEX IPO Access account. The funds are now available for IPO allocations and trading.`
      : `A debit of <strong>${fmtUSD(absAmount)}</strong> has been applied to your APEX IPO Access account. Your updated available balance is shown below.`;
    return {
      subject: `${subjectVerb} — ${fmtUSD(absAmount)} · APEX IPO Access`,
      html: shell(headline, `
        <h1>${headline}</h1>
        <p>Hello${name ? ' ' + esc(name) : ''},<br><br>${intro}</p>
        <div class="box">
          <div class="row"><span class="k">${isCredit ? 'Amount Credited' : 'Amount Debited'}</span><span class="v">${isCredit ? '+' : '−'}${fmtUSD(absAmount)}</span></div>
          <div class="row"><span class="k">Available Balance</span><span class="v">${fmtUSD(newBalance)}</span></div>
          ${note ? `<div class="row"><span class="k">Reference</span><span class="v">${esc(note)}</span></div>` : ''}
        </div>
        <p style="font-size:13px;color:#9aa3b2;margin-top:18px">If you have any questions about this transaction, please contact our support team.</p>
      `)
    };
  },

  broadcast: (name, title, message, link) => ({
    subject: title,
    html: shell(title, `
      <h1>${esc(title)}</h1>
      <p>${esc(message).replace(/\n/g, '<br>')}</p>
      ${link ? `<a href="${link.startsWith('http') ? link : APP_URL + link}" class="btn">Learn More</a>` : ''}
    `)
  }),
};

module.exports = templates;
