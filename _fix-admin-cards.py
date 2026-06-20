import re

with open('admin-new.html', 'r') as f:
    html = f.read()

# Remove the responsive card CSS that converts table-to-stacked
# and replace with proper compact card layout for users
old_responsive = re.search(
    r'  /\* ─── MOBILE-RESPONSIVE TABLES \(cards on small screens\) ─── \*/.*?(?=  /\* ─────────── MOBILE ─────────── \*/)',
    html, re.DOTALL
)
if old_responsive:
    html = html.replace(old_responsive.group(0), '')

# Add a clean compact user-card style
new_css = '''
  /* ─── COMPACT USER/ROW CARDS (mobile) ─── */
  .user-card{
    display:flex;align-items:center;gap:12px;
    padding:14px 16px;border-bottom:1px solid var(--border);
    transition:background .1s;
  }
  .user-card:last-child{border-bottom:none}
  .user-card:active{background:var(--bg-3)}
  .uc-avatar{
    width:40px;height:40px;border-radius:50%;flex-shrink:0;
    background:linear-gradient(135deg,#4a9eff,#00d4aa);
    display:flex;align-items:center;justify-content:center;
    color:#000;font-weight:700;font-size:15px;
  }
  .uc-info{flex:1;min-width:0;overflow:hidden}
  .uc-name{
    font-size:14px;font-weight:600;color:var(--text);
    white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
    line-height:1.3;
  }
  .uc-email{
    font-size:12px;color:var(--text-3);
    white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
    line-height:1.3;margin-top:1px;
  }
  .uc-right{
    display:flex;flex-direction:column;align-items:flex-end;gap:4px;
    flex-shrink:0;
  }
  .uc-balance{
    font-size:14px;font-weight:700;
    font-family:'Plus Jakarta Sans',sans-serif;
  }
  .uc-badges{display:flex;gap:4px;align-items:center}
  .uc-badges .badge{font-size:10px;padding:2px 7px}
  .uc-action{
    margin-left:8px;flex-shrink:0;color:var(--text-3);
    width:32px;height:32px;border-radius:8px;
    display:flex;align-items:center;justify-content:center;
  }
  .uc-action:hover{color:var(--accent);background:var(--bg-3)}
  .uc-action svg{width:16px;height:16px;stroke-width:2.2}

  /* ─── COMPACT TX ROW (deposits/withdrawals/kyc) ─── */
  .tx-card{
    display:flex;align-items:center;gap:12px;
    padding:14px 16px;border-bottom:1px solid var(--border);
  }
  .tx-card:last-child{border-bottom:none}
  .tx-icon{
    width:40px;height:40px;border-radius:10px;flex-shrink:0;
    display:flex;align-items:center;justify-content:center;
  }
  .tx-icon svg{width:18px;height:18px;stroke-width:2}
  .tx-icon.in{background:rgba(16,185,129,.13);color:#10b981}
  .tx-icon.out{background:rgba(239,68,68,.13);color:#ef4444}
  .tx-icon.kyc{background:rgba(168,85,247,.13);color:#a855f7}
  .tx-info{flex:1;min-width:0;overflow:hidden}
  .tx-title{
    font-size:14px;font-weight:600;
    white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
  }
  .tx-sub{
    font-size:12px;color:var(--text-3);margin-top:2px;
    white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
  }
  .tx-right{
    display:flex;flex-direction:column;align-items:flex-end;gap:5px;
    flex-shrink:0;
  }
  .tx-amount{
    font-size:14px;font-weight:700;font-family:'Plus Jakarta Sans',sans-serif;
  }
  .tx-actions{
    display:flex;gap:6px;margin-top:8px;justify-content:flex-end;
  }
  .tx-meta-row{
    display:flex;justify-content:space-between;align-items:center;gap:10px;
    padding:10px 16px;background:var(--bg-1);font-size:12px;color:var(--text-3);
    border-bottom:1px solid var(--border);
  }

  /* ─── DESKTOP: hide cards / show tables ─── */
  @media (min-width:761px){
    .users-list,.tx-list{display:none}
    .table-wrap{display:block}
  }
  @media (max-width:760px){
    .users-list,.tx-list{display:block}
    .table-wrap{display:none}
  }
'''

# Insert before MOBILE block
html = html.replace(
    '  /* ─────────── MOBILE ─────────── */',
    new_css + '\n  /* ─────────── MOBILE ─────────── */'
)

# Now patch render functions to ALSO output card view (alongside table)

# RECENT USERS
old_recent = '''function renderRecentUsers(users){
  if (!users.length) return $('#recentUsers').innerHTML = emptyState('No users yet');
  $('#recentUsers').innerHTML = `
    <div class="table-wrap"><table>
      <thead><tr><th>Name</th><th>Email</th><th>Status</th><th>KYC</th><th style="text-align:right">Balance</th></tr></thead>
      <tbody>${users.map(u=>`
        <tr>
          <td data-label="Name">${esc(u.fullName)||'—'}</td>
          <td data-label="Email">${esc(u.email)}</td>
          <td data-label="Status">${badge(u.accountStatus||'pending')}</td>
          <td data-label="KYC">${badge(u.kycStatus||'not_submitted')}</td>
          <td data-label="Balance" style="font-weight:600">$${money(u.balanceUSD)}</td>
        </tr>`).join('')}
      </tbody>
    </table></div>`;
}'''

new_recent = '''function renderRecentUsers(users){
  if (!users.length) return $('#recentUsers').innerHTML = emptyState('No users yet');
  const cards = users.map(u=>userCardHTML(u)).join('');
  const rows = users.map(u=>`
        <tr>
          <td>${esc(u.fullName)||'—'}</td>
          <td>${esc(u.email)}</td>
          <td>${badge(u.accountStatus||'pending')}</td>
          <td>${badge(u.kycStatus||'not_submitted')}</td>
          <td style="text-align:right;font-weight:600">$${money(u.balanceUSD)}</td>
          <td style="text-align:right"><button class="btn btn-ghost btn-xs" onclick="viewUser('${u.id}')">View</button></td>
        </tr>`).join('');
  $('#recentUsers').innerHTML = `
    <div class="users-list">${cards}</div>
    <div class="table-wrap"><table>
      <thead><tr><th>Name</th><th>Email</th><th>Status</th><th>KYC</th><th style="text-align:right">Balance</th><th></th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>`;
}'''

html = html.replace(old_recent, new_recent)

# USERS LIST
old_users_render = '''function renderUsers(){
  if (!state.users.length) return $('#usersTable').innerHTML = emptyState('No users found');
  $('#usersTable').innerHTML = `
    <div class="table-wrap"><table>
      <thead><tr><th>User</th><th>Email</th><th>Role</th><th>Account</th><th>KYC</th><th style="text-align:right">Balance</th><th></th></tr></thead>
      <tbody>${state.users.map(u=>`
        <tr>
          <td data-label="Name">${esc(u.fullName)||'<span style="color:var(--text-3)">unnamed</span>'}</td>
          <td data-label="Email">${esc(u.email)}</td>
          <td data-label="Role">${u.role==='admin'?'<span class="badge badge-admin">Admin</span>':'<span style="color:var(--text-3)">User</span>'}</td>
          <td data-label="Account">${badge(u.accountStatus||'pending')}</td>
          <td data-label="KYC">${badge(u.kycStatus||'not_submitted')}</td>
          <td data-label="Balance" style="font-weight:600">$${money(u.balanceUSD)}</td>
          <td data-label=""><button class="btn btn-ghost btn-xs" onclick="viewUser('${u.id}')">View</button></td>
        </tr>`).join('')}
      </tbody>
    </table></div>`;
}'''

new_users_render = '''function renderUsers(){
  if (!state.users.length) return $('#usersTable').innerHTML = emptyState('No users found');
  const cards = state.users.map(u=>userCardHTML(u)).join('');
  const rows = state.users.map(u=>`
        <tr>
          <td>${esc(u.fullName)||'<span style="color:var(--text-3)">unnamed</span>'}</td>
          <td>${esc(u.email)}</td>
          <td>${u.role==='admin'?'<span class="badge badge-admin">Admin</span>':'<span style="color:var(--text-3)">User</span>'}</td>
          <td>${badge(u.accountStatus||'pending')}</td>
          <td>${badge(u.kycStatus||'not_submitted')}</td>
          <td style="text-align:right;font-weight:600">$${money(u.balanceUSD)}</td>
          <td style="text-align:right"><button class="btn btn-ghost btn-xs" onclick="viewUser('${u.id}')">View</button></td>
        </tr>`).join('');
  $('#usersTable').innerHTML = `
    <div class="users-list">${cards}</div>
    <div class="table-wrap"><table>
      <thead><tr><th>User</th><th>Email</th><th>Role</th><th>Account</th><th>KYC</th><th style="text-align:right">Balance</th><th></th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>`;
}

function userCardHTML(u){
  const initial = (u.fullName || u.email || '?').charAt(0).toUpperCase();
  return `<div class="user-card" onclick="viewUser('${u.id}')">
    <div class="uc-avatar">${initial}</div>
    <div class="uc-info">
      <div class="uc-name">${esc(u.fullName)||'<span style="color:var(--text-3)">unnamed</span>'} ${u.role==='admin'?'<span class="badge badge-admin" style="margin-left:4px;font-size:9px;padding:1px 6px">Admin</span>':''}</div>
      <div class="uc-email">${esc(u.email)}</div>
    </div>
    <div class="uc-right">
      <div class="uc-balance">$${money(u.balanceUSD)}</div>
      <div class="uc-badges">${badge(u.accountStatus||'pending')}</div>
    </div>
    <div class="uc-action">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
    </div>
  </div>`;
}'''

html = html.replace(old_users_render, new_users_render)

# DEPOSITS — add card view
old_dep = '''function renderDeposits(){
  if (!state.deposits.length) return $('#depositsTable').innerHTML = emptyState('No deposits found');
  $('#depositsTable').innerHTML = `
    <div class="table-wrap"><table>'''

new_dep = '''function renderDeposits(){
  if (!state.deposits.length) return $('#depositsTable').innerHTML = emptyState('No deposits found');
  const cards = state.deposits.map(d=>txCardHTML(d,'deposit')).join('');
  $('#depositsTable').innerHTML = `
    <div class="tx-list">${cards}</div>
    <div class="table-wrap"><table>'''
html = html.replace(old_dep, new_dep)

# WITHDRAWALS — card view
old_wd = '''function renderWithdrawals(){
  if (!state.withdrawals.length) return $('#withdrawalsTable').innerHTML = emptyState('No withdrawals found');
  $('#withdrawalsTable').innerHTML = `
    <div class="table-wrap"><table>'''

new_wd = '''function renderWithdrawals(){
  if (!state.withdrawals.length) return $('#withdrawalsTable').innerHTML = emptyState('No withdrawals found');
  const cards = state.withdrawals.map(w=>txCardHTML(w,'withdrawal')).join('');
  $('#withdrawalsTable').innerHTML = `
    <div class="tx-list">${cards}</div>
    <div class="table-wrap"><table>'''
html = html.replace(old_wd, new_wd)

# KYC — card view
old_kyc = '''function renderKyc(){
  if (!state.kyc.length) return $('#kycTable').innerHTML = emptyState('No KYC submissions');
  $('#kycTable').innerHTML = `
    <div class="table-wrap"><table>'''

new_kyc = '''function renderKyc(){
  if (!state.kyc.length) return $('#kycTable').innerHTML = emptyState('No KYC submissions');
  const cards = state.kyc.map(d=>kycCardHTML(d)).join('');
  $('#kycTable').innerHTML = `
    <div class="tx-list">${cards}</div>
    <div class="table-wrap"><table>'''
html = html.replace(old_kyc, new_kyc)

# WALLETS — card view
old_wal = '''function renderWallets(){
  if (!state.wallets.length) return $('#walletsTable').innerHTML = emptyState('No wallets yet — tap "Add Wallet" to create one');
  $('#walletsTable').innerHTML = `
    <div class="table-wrap"><table>'''

new_wal = '''function renderWallets(){
  if (!state.wallets.length) return $('#walletsTable').innerHTML = emptyState('No wallets yet — tap "Add Wallet" to create one');
  const cards = state.wallets.map(w=>walletCardHTML(w)).join('');
  $('#walletsTable').innerHTML = `
    <div class="tx-list">${cards}</div>
    <div class="table-wrap"><table>'''
html = html.replace(old_wal, new_wal)

# Add helper functions just before "// ---------- HELPERS ----------"
helpers = '''
function txCardHTML(t, kind){
  const dir = kind === 'deposit' ? 'in' : 'out';
  const icon = kind === 'deposit'
    ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>';
  const actions = t.status === 'pending'
    ? (kind === 'deposit'
      ? `<button class="btn btn-success btn-xs" onclick="event.stopPropagation();reviewDeposit('${t._id}','approve')">Approve</button>
         <button class="btn btn-danger btn-xs" onclick="event.stopPropagation();reviewDeposit('${t._id}','reject')">Reject</button>`
      : `<button class="btn btn-warn btn-xs" onclick="event.stopPropagation();reviewWithdrawal('${t._id}','approve')">Process</button>
         <button class="btn btn-danger btn-xs" onclick="event.stopPropagation();reviewWithdrawal('${t._id}','reject')">Reject</button>`)
    : (t.status === 'processing' && kind === 'withdrawal'
      ? `<button class="btn btn-success btn-xs" onclick="event.stopPropagation();reviewWithdrawal('${t._id}','complete')">Complete</button>
         <button class="btn btn-danger btn-xs" onclick="event.stopPropagation();reviewWithdrawal('${t._id}','reject')">Reject</button>`
      : '');
  return `<div class="tx-card">
    <div class="tx-icon ${dir}">${icon}</div>
    <div class="tx-info">
      <div class="tx-title">${esc(t.userId?.email||'—')}</div>
      <div class="tx-sub"><span style="text-transform:capitalize">${esc(t.method)}</span> · ${esc(t.asset||'USD')} · ${formatDate(t.createdAt)}</div>
    </div>
    <div class="tx-right">
      <div class="tx-amount">$${money(t.amountUSD)}</div>
      ${badge(t.status)}
    </div>
  </div>
  ${actions ? `<div class="tx-meta-row"><span>Actions</span><div style="display:flex;gap:6px">${actions}</div></div>` : ''}`;
}

function kycCardHTML(d){
  const actions = d.status === 'pending'
    ? `<button class="btn btn-success btn-xs" onclick="event.stopPropagation();reviewKyc('${d._id}','approve')">Approve</button>
       <button class="btn btn-danger btn-xs" onclick="event.stopPropagation();reviewKyc('${d._id}','reject')">Reject</button>`
    : '';
  return `<div class="tx-card">
    <div class="tx-icon kyc">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
    </div>
    <div class="tx-info">
      <div class="tx-title">${esc(d.fullName)||esc(d.userId?.email)||'—'}</div>
      <div class="tx-sub"><span style="text-transform:capitalize">${esc((d.documentType||'').replace('_',' '))}</span> · ${esc(d.country)||'—'} · ${formatDate(d.createdAt)}</div>
    </div>
    <div class="tx-right">${badge(d.status)}</div>
  </div>
  ${actions ? `<div class="tx-meta-row"><span>Actions</span><div style="display:flex;gap:6px">${actions}</div></div>` : ''}`;
}

function walletCardHTML(w){
  return `<div class="tx-card">
    <div class="tx-icon ${w.active?'in':'out'}">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/></svg>
    </div>
    <div class="tx-info">
      <div class="tx-title">${esc(w.label)} <span class="badge badge-admin" style="font-size:9px;padding:1px 6px;margin-left:4px">${esc(w.asset)}</span></div>
      <div class="tx-sub">${esc(w.network)} · <span class="mono">${esc(w.address.slice(0,16))}…</span></div>
    </div>
    <div class="tx-right">${w.active?'<span class="badge badge-active">Active</span>':'<span class="badge badge-disabled">Off</span>'}</div>
  </div>
  <div class="tx-meta-row"><span>Actions</span><div style="display:flex;gap:6px">
    <button class="btn btn-ghost btn-xs" onclick='editWallet(${JSON.stringify(w).replace(/'/g,"&apos;")})'>Edit</button>
    <button class="btn btn-danger btn-xs" onclick="deleteWallet('${w._id}')">Delete</button>
  </div></div>`;
}

'''

html = html.replace('// ---------- HELPERS ----------', helpers + '// ---------- HELPERS ----------')

with open('admin-new.html', 'w') as f:
    f.write(html)

print("✅ Compact cards applied")
