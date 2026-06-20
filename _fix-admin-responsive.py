with open('admin-new.html', 'r') as f:
    html = f.read()

# Add responsive table CSS — converts tables to cards on mobile
extra_css = '''
  /* ─── MOBILE-RESPONSIVE TABLES (cards on small screens) ─── */
  @media (max-width:760px){
    .table-wrap{overflow-x:visible}
    table,thead,tbody,tr,td,th{display:block;width:100%}
    table{min-width:0}
    thead{display:none}
    tbody tr{
      background:var(--bg-1);border:1px solid var(--border);border-radius:12px;
      padding:14px;margin:0 16px 12px;display:flex;flex-direction:column;gap:10px;
    }
    tbody tr:hover{background:var(--bg-1)}
    tbody td{
      padding:0;border:none;display:flex;justify-content:space-between;
      align-items:center;gap:12px;font-size:13px;
    }
    tbody td::before{
      content:attr(data-label);
      font-size:11px;color:var(--text-3);text-transform:uppercase;
      letter-spacing:.5px;font-weight:600;flex-shrink:0;
    }
    tbody td .truncate{max-width:60vw;text-align:right}
    tbody td .row-actions{justify-content:flex-end;flex:1}
    .panel-body{padding-top:14px}
  }
'''

html = html.replace('  /* ─────────── MOBILE ─────────── */', extra_css + '\n  /* ─────────── MOBILE ─────────── */')

# Add data-label attributes to each TD so labels show on mobile
# USERS table
html = html.replace(
  '<td>${esc(u.fullName)||\'<span style="color:var(--text-3)">unnamed</span>\'}</td>',
  '<td data-label="Name">${esc(u.fullName)||\'<span style="color:var(--text-3)">unnamed</span>\'}</td>'
)
html = html.replace(
  '<td>${esc(u.email)}</td>\n          <td>${u.role===\'admin\'',
  '<td data-label="Email">${esc(u.email)}</td>\n          <td data-label="Role">${u.role===\'admin\''
)
html = html.replace(
  '<td>${badge(u.accountStatus||\'pending\')}</td>\n          <td>${badge(u.kycStatus||\'not_submitted\')}</td>\n          <td style="text-align:right;font-weight:600">$${money(u.balanceUSD)}</td>\n          <td style="text-align:right"><button',
  '<td data-label="Account">${badge(u.accountStatus||\'pending\')}</td>\n          <td data-label="KYC">${badge(u.kycStatus||\'not_submitted\')}</td>\n          <td data-label="Balance" style="font-weight:600">$${money(u.balanceUSD)}</td>\n          <td data-label=""><button'
)

# RECENT USERS (dashboard) — simpler
html = html.replace(
  '<td>${esc(u.fullName)||\'—\'}</td>\n          <td>${esc(u.email)}</td>\n          <td>${badge(u.accountStatus||\'pending\')}</td>\n          <td>${badge(u.kycStatus||\'not_submitted\')}</td>\n          <td style="text-align:right;font-weight:600">$${money(u.balanceUSD)}</td>',
  '<td data-label="Name">${esc(u.fullName)||\'—\'}</td>\n          <td data-label="Email">${esc(u.email)}</td>\n          <td data-label="Status">${badge(u.accountStatus||\'pending\')}</td>\n          <td data-label="KYC">${badge(u.kycStatus||\'not_submitted\')}</td>\n          <td data-label="Balance" style="font-weight:600">$${money(u.balanceUSD)}</td>'
)

# DEPOSITS
html = html.replace(
  '<td>${esc(d.userId?.email||\'—\')}</td>\n          <td><span style="text-transform:capitalize">${esc(d.method)}</span></td>\n          <td style="text-align:right;font-weight:600">$${money(d.amountUSD)}</td>\n          <td><span class="mono">${esc(d.asset)}</span>',
  '<td data-label="User">${esc(d.userId?.email||\'—\')}</td>\n          <td data-label="Method"><span style="text-transform:capitalize">${esc(d.method)}</span></td>\n          <td data-label="Amount" style="font-weight:600">$${money(d.amountUSD)}</td>\n          <td data-label="Asset"><span class="mono">${esc(d.asset)}</span>'
)
html = html.replace(
  '<td><span class="mono truncate" title="${esc(d.txHash||\'\')}">${esc((d.txHash||\'\').slice(0,14))}${d.txHash?\'…\':\'—\'}</span></td>\n          <td>${badge(d.status)}</td>\n          <td><span style="color:var(--text-3);font-size:12px">${formatDate(d.createdAt)}</span></td>\n          <td><div class="row-actions">',
  '<td data-label="TX"><span class="mono truncate" title="${esc(d.txHash||\'\')}">${esc((d.txHash||\'\').slice(0,14))}${d.txHash?\'…\':\'—\'}</span></td>\n          <td data-label="Status">${badge(d.status)}</td>\n          <td data-label="Date"><span style="color:var(--text-3);font-size:12px">${formatDate(d.createdAt)}</span></td>\n          <td data-label=""><div class="row-actions">'
)

# WITHDRAWALS
html = html.replace(
  '<td>${esc(w.userId?.email||\'—\')}</td>\n          <td><span style="text-transform:capitalize">${esc(w.method)}</span></td>\n          <td style="text-align:right;font-weight:600">$${money(w.amountUSD)}</td>\n          <td><span class="mono truncate" title="${esc(w.destinationAddress||\'\')}">${esc((w.destinationAddress||\'\').slice(0,18))}${w.destinationAddress?\'…\':\'—\'}</span></td>\n          <td>${badge(w.status)}</td>\n          <td><span style="color:var(--text-3);font-size:12px">${formatDate(w.createdAt)}</span></td>\n          <td><div class="row-actions">',
  '<td data-label="User">${esc(w.userId?.email||\'—\')}</td>\n          <td data-label="Method"><span style="text-transform:capitalize">${esc(w.method)}</span></td>\n          <td data-label="Amount" style="font-weight:600">$${money(w.amountUSD)}</td>\n          <td data-label="Destination"><span class="mono truncate" title="${esc(w.destinationAddress||\'\')}">${esc((w.destinationAddress||\'\').slice(0,18))}${w.destinationAddress?\'…\':\'—\'}</span></td>\n          <td data-label="Status">${badge(w.status)}</td>\n          <td data-label="Date"><span style="color:var(--text-3);font-size:12px">${formatDate(w.createdAt)}</span></td>\n          <td data-label=""><div class="row-actions">'
)

# KYC
html = html.replace(
  '<td>${esc(d.userId?.email||\'—\')}</td>\n          <td><span style="text-transform:capitalize">${esc((d.documentType||\'\').replace(\'_\',\' \'))}</span></td>\n          <td>${esc(d.fullName)||\'—\'}</td>\n          <td>${esc(d.country)||\'—\'}</td>\n          <td>${badge(d.status)}</td>\n          <td><span style="color:var(--text-3);font-size:12px">${formatDate(d.createdAt)}</span></td>\n          <td><div class="row-actions">',
  '<td data-label="User">${esc(d.userId?.email||\'—\')}</td>\n          <td data-label="Type"><span style="text-transform:capitalize">${esc((d.documentType||\'\').replace(\'_\',\' \'))}</span></td>\n          <td data-label="Name">${esc(d.fullName)||\'—\'}</td>\n          <td data-label="Country">${esc(d.country)||\'—\'}</td>\n          <td data-label="Status">${badge(d.status)}</td>\n          <td data-label="Date"><span style="color:var(--text-3);font-size:12px">${formatDate(d.createdAt)}</span></td>\n          <td data-label=""><div class="row-actions">'
)

# WALLETS
html = html.replace(
  '<td><strong>${esc(w.label)}</strong></td>\n          <td><span class="badge badge-admin">${esc(w.asset)}</span></td>\n          <td>${esc(w.network)}</td>\n          <td><span class="mono truncate" style="max-width:180px;display:inline-block;vertical-align:middle" title="${esc(w.address)}">${esc(w.address.slice(0,20))}…</span></td>\n          <td>${w.active',
  '<td data-label="Label"><strong>${esc(w.label)}</strong></td>\n          <td data-label="Asset"><span class="badge badge-admin">${esc(w.asset)}</span></td>\n          <td data-label="Network">${esc(w.network)}</td>\n          <td data-label="Address"><span class="mono truncate" style="max-width:60vw;display:inline-block;vertical-align:middle" title="${esc(w.address)}">${esc(w.address.slice(0,20))}…</span></td>\n          <td data-label="Status">${w.active'
)
html = html.replace(
  '<td><div class="row-actions">\n            <button class="btn btn-ghost btn-xs" onclick=\'editWallet',
  '<td data-label=""><div class="row-actions">\n            <button class="btn btn-ghost btn-xs" onclick=\'editWallet'
)

# Remove the style="text-align:right" from amount cells where we added data-label
# (already handled above by replacing the whole line)

with open('admin-new.html', 'w') as f:
    f.write(html)

print("✅ Responsive cards applied")
