// ============================================
// APEX — Sidebar Drawer (reusable across pages)
// ============================================
// Auto-injects on any page with a .menu-btn / hamburger element
// Usage: just include this script after supabase.js

(function(){
  if(window.__apexSidebarLoaded) return;
  window.__apexSidebarLoaded = true;

  // Inject CSS
  const css = `
    .ax-sidebar-overlay{
      position:fixed;inset:0;background:rgba(0,0,0,0.6);
      backdrop-filter:blur(4px);z-index:998;
      opacity:0;pointer-events:none;transition:opacity .25s;
    }
    .ax-sidebar-overlay.open{opacity:1;pointer-events:auto}

    .ax-sidebar{
      position:fixed;top:0;left:0;bottom:0;
      width:88%;max-width:340px;
      background:#0a0a0a;
      border-right:1px solid rgba(255,255,255,0.08);
      z-index:999;
      transform:translateX(-100%);
      transition:transform .28s cubic-bezier(.2,.8,.2,1);
      display:flex;flex-direction:column;
      font-family:'Inter',sans-serif;color:#fff;
    }
    .ax-sidebar.open{transform:translateX(0)}

    
    
    
    
    
    

    .ax-sb-nav{
      flex:1;overflow-y:auto;padding:10px 0;
    }
    .ax-sb-group-label{
      font-size:10px;color:#5a6473;
      letter-spacing:1px;font-weight:700;
      text-transform:uppercase;
      padding:14px 22px 6px;
    }
    .ax-sb-item{
      display:flex;align-items:center;gap:14px;
      padding:13px 22px;
      color:#cfd8e8;font-size:14px;font-weight:500;
      text-decoration:none;cursor:pointer;
      transition:background .12s, color .12s;
      border-left:3px solid transparent;
    }
    .ax-sb-item:hover{
      background:rgba(74,158,255,0.06);color:#fff;
    }
    .ax-sb-item.active{
      background:rgba(74,158,255,0.08);
      color:#4a9eff;border-left-color:#4a9eff;
    }
    .ax-sb-item svg{width:18px;height:18px;flex-shrink:0}
    .ax-sb-item.danger{color:#ff6a6a}
    .ax-sb-item.danger:hover{background:rgba(255,106,106,0.06);color:#ff8484}

    .ax-sb-foot{
      padding:16px 22px 22px;
      border-top:1px solid rgba(255,255,255,0.06);
      font-size:11px;color:#5a6473;letter-spacing:0.3px;
      display:flex;justify-content:space-between;align-items:center;
    }
    .ax-sb-foot .ver{font-family:'JetBrains Mono',monospace}
    .ax-sb-close{
      position:absolute;top:18px;right:18px;
      width:32px;height:32px;border-radius:50%;
      background:rgba(255,255,255,0.05);
      border:1px solid rgba(255,255,255,0.1);
      color:#8a94a3;cursor:pointer;
      display:flex;align-items:center;justify-content:center;
    }
    .ax-sb-close:hover{color:#fff}
    .ax-sb-close svg{width:14px;height:14px}

    .ax-sb-head{
      padding:20px 20px 16px;
      border-bottom:1px solid rgba(255,255,255,0.06);
    }
    .ax-sb-head-top{
      display:flex; align-items:center;
      gap:12px; margin-bottom:14px;
    }
    .ax-sb-avatar{
      width:48px; height:48px; border-radius:50%;
      background:rgba(74,158,255,0.12);
      border:1.5px solid rgba(74,158,255,0.3);
      display:flex; align-items:center; justify-content:center;
      color:#4a9eff;
      flex-shrink:0;
    }
    .ax-sb-avatar svg{ width:24px; height:24px; }
    .ax-sb-identity{ flex:1; min-width:0; text-align:left; }
    .ax-sb-name{
      font-family:'Plus Jakarta Sans',sans-serif;
      font-weight:600; font-size:15px; color:#fff;
      letter-spacing:-0.2px; line-height:1.2;
      white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
    }
    .ax-sb-email{
      font-size:12px; color:#8a94a3; margin-top:2px;
      white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
    }
    .ax-sb-badges{
      display:flex; flex-direction:column;
      gap:6px; align-items:flex-start;
    }
    .ax-sb-badges::-webkit-scrollbar{display:none}
    .ax-sb-badges::-webkit-scrollbar{display:none}
    .ax-sb-badge{
      display:inline-flex; align-items:center; gap:6px;
      font-size:11px; font-weight:600;
      padding:0; background:none !important;
      border:none !important; border-radius:0;
      letter-spacing:0.3px; text-transform:none;
    }
    .ax-sb-badge svg{ width:13px; height:13px; flex-shrink:0; }
    .ax-sb-badge.verified{ color:#3ed598; }
    .ax-sb-badge.tier{ color:#ffb800; }
    .ax-sb-badge.secure{ color:#4a9eff; }
    .ax-sb-dot{
      width:13px; height:13px;
      display:inline-flex; align-items:center; justify-content:center;
      flex-shrink:0;
    }
    .ax-sb-dot::before{
      content:""; width:7px; height:7px;
      border-radius:50%;
      background:#3ed598;
      box-shadow:0 0 6px rgba(62,213,152,0.6);
      animation:axDotPulse 2s ease-in-out infinite;
    }
    @keyframes axDotPulse{
      0%,100%{opacity:1}
      50%{opacity:0.4}
    }

  `;
  const styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  // Inject sidebar HTML
  const overlay = document.createElement('div');
  overlay.className = 'ax-sidebar-overlay';

  const sidebar = document.createElement('aside');
  sidebar.className = 'ax-sidebar';
  sidebar.innerHTML = `
    <button class="ax-sb-close" aria-label="Close menu">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>

    <div class="ax-sb-head">
        <div class="ax-sb-head-top">
          <div class="ax-sb-avatar" id="axSbAvatar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <div class="ax-sb-identity">
            <div class="ax-sb-name" id="axSbName">Loading…</div>
            <div class="ax-sb-email" id="axSbEmail">·</div>
          </div>
        </div>
        <div class="ax-sb-badges">
          <span class="ax-sb-badge verified" id="axSbBadgeKyc">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 12l2 2 4-4M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            Verified
          </span>
          <span class="ax-sb-badge tier" id="axSbBadgeTier">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            Founding
          </span>
          <span class="ax-sb-badge secure">
            <span class="ax-sb-dot"></span>
            Secure
          </span>
        </div>
      </div>

    <nav class="ax-sb-nav">
      <div class="ax-sb-group-label">Main</div>
      <a class="ax-sb-item" data-page="dashboard.html" href="dashboard.html">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        Home
      </a>
      <a class="ax-sb-item" data-page="portfolio.html" href="portfolio.html">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
        Portfolio
      </a>
      <a class="ax-sb-item" data-page="ipos.html" href="ipos.html">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
        Browse IPOs
      </a>
      <a class="ax-sb-item" data-page="docs.html" href="docs.html">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        Documents
      </a>
      <a class="ax-sb-item" data-page="account.html" href="account.html">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        Account
      </a>

      <div class="ax-sb-group-label">Account</div>
      <a class="ax-sb-item" data-page="fund-account.html" href="fund-account.html">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
        Deposit
      </a>
      <a class="ax-sb-item" data-page="withdraw.html" href="withdraw.html">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
        Withdraw
      </a>
      <a class="ax-sb-item" href="#">
            <a class="ax-sb-item" data-page="activity.html" href="activity.html">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
        Activity
      </a>
      <a class="ax-sb-item" data-page="security.html" href="security.html">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        Security
      </a>
      <a class="ax-sb-item" id="axHelpSupport" href="#">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
        Help &amp; Support
      </a>

      <div class="ax-sb-group-label">Session</div>
      <a class="ax-sb-item danger" id="axLogoutBtn" href="#">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        Sign Out
      </a>
    </nav>

    <div class="ax-sb-foot">
      <span>Apex IPO Access</span>
      <span class="ver">v1.0</span>
    </div>
  `;

  document.body.appendChild(overlay);
  document.body.appendChild(sidebar);

  // Open / close logic
  function open(){
    overlay.classList.add('open');
    sidebar.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function close(){
    overlay.classList.remove('open');
    sidebar.classList.remove('open');
    document.body.style.overflow = '';
  }
  overlay.addEventListener('click', close);
  sidebar.querySelector('.ax-sb-close').addEventListener('click', close);

  // Hook ANY .menu-btn on the page
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.menu-btn, [data-open-sidebar]');
    if(btn){
      e.preventDefault();
      open();
    }
  });

  // Highlight active page
  const currentPage = location.pathname.split('/').pop() || 'dashboard.html';
  sidebar.querySelectorAll('.ax-sb-item[data-page]').forEach(a => {
    if(a.dataset.page === currentPage) a.classList.add('active');
  });

  // Logout handler
  sidebar.querySelector('#axLogoutBtn').addEventListener('click', async (e) => {
    e.preventDefault();
    if(!confirm('Sign out of your APEX account?')) return;
    if(window.sb){
      await sb.auth.signOut();
    }
    sessionStorage.clear();
    localStorage.removeItem('apex_signup');
    window.location.href = 'login.html';
  });

  // Populate profile when Supabase is ready
  function fillProfile(){
    if(!window.sb || !window.apex) return;
    window.apex.getProfile().then(p => {
      if(!p) return;
      const name = (p.first_name && p.last_name)
        ? `${p.first_name} ${p.last_name}`
        : (p.first_name || (p.email||'').split('@')[0] || 'Investor');
      const initial = (p.first_name || p.email || 'A').charAt(0).toUpperCase();
      document.getElementById('axSbName').textContent = name;
      document.getElementById('axSbEmail').textContent = p.email || '';
      // avatar uses SVG, no text needed
    });
  }
  if(window.sb) fillProfile();
  else document.addEventListener('sb-ready', fillProfile);


  // ========== Click handlers for nav items ==========
  // Show "Coming soon" toast for pages not yet built
  const COMING_SOON = [];

  sidebar.querySelectorAll('.ax-sb-item').forEach(item => {
    const href = item.getAttribute('href') || '';
    const page = href.split('/').pop();
    if(COMING_SOON.includes(page)){
      item.addEventListener('click', (e) => {
        e.preventDefault();
        showToast(item.textContent.trim() + ' coming soon');
        close();
      });
    }
  });

  // Toast notification helper
  function showToast(msg){
    let toast = document.getElementById('axToast');
    if(!toast){
      toast = document.createElement('div');
      toast.id = 'axToast';
      toast.style.cssText = `
        position:fixed;bottom:90px;left:50%;transform:translateX(-50%) translateY(20px);
        background:rgba(74,158,255,0.95);color:#000;
        padding:14px 22px;border-radius:12px;
        font-family:'Plus Jakarta Sans',sans-serif;font-weight:600;font-size:14px;
        z-index:10000;opacity:0;transition:all .3s;
        box-shadow:0 8px 24px rgba(74,158,255,0.4);
        pointer-events:none;letter-spacing:0.2px;
      `;
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateX(-50%) translateY(0)';
    });
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-50%) translateY(20px)';
    }, 2200);
  }
  window.apexToast = showToast;

  // ---- Global sidebar API (compat for older pages) ----
  window.openSidebar = function(){
    try { open(); } catch(e){ console.warn('[sidebar] open failed:', e); }
  };
  window.closeSidebar = function(){
    try { close(); } catch(e){ console.warn('[sidebar] close failed:', e); }
  };
  window.toggleSidebar = function(){
    try {
      var sb = document.getElementById('apexSidebar') || document.querySelector('.apex-sidebar, #sidebar, .sidebar');
      if (sb && sb.classList.contains('open')) { close(); }
      else { open(); }
    } catch(e){ console.warn('[sidebar] toggle failed:', e); }
  };


  // ── Help & Support → mailto with user info ──
  var helpBtn = sidebar.querySelector('#axHelpSupport');
  if (helpBtn) {
    helpBtn.addEventListener('click', async function(e){
      e.preventDefault();
      var info = '';
      try {
        if (window.sb) {
          var { data } = await sb.auth.getUser();
          if (data && data.user) {
            info = '\n\n---\nAccount: ' + (data.user.email || '') +
                   '\nUser ID: ' + data.user.id +
                   '\nPage: ' + location.pathname;
          }
        }
      } catch(_) {}
      var subject = 'APEX Support Request';
      var body = 'Hi APEX team,\n\n[describe your question]' + info;
      window.location.href = 'mailto:support@apexipoaccess.com' +
        '?subject=' + encodeURIComponent(subject) +
        '&body=' + encodeURIComponent(body);
      // close sidebar after click
      if (typeof closeSidebar === 'function') closeSidebar();
      else if (overlay) overlay.classList.remove('open');
      if (sidebar) sidebar.classList.remove('open');
    });
  }


  // Enhanced profile populate (badges)
  async function axPopulateBadges(){
    if(!window.sb) return;
    try {
      var { data: { user } } = await sb.auth.getUser();
      if(!user) return;
      var { data: profile } = await sb.from('profiles').select('kyc_status, first_name, last_name').eq('id', user.id).single();
      if(!profile) return;

      var kycBadge = document.getElementById('axSbBadgeKyc');
      var tierBadge = document.getElementById('axSbBadgeTier');

      if(kycBadge){
        var kyc = (profile.kyc_status || 'pending').toLowerCase();
        if(kyc === 'verified'){
          kycBadge.className = 'ax-sb-badge verified';
          kycBadge.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 12l2 2 4-4M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg> Verified';
        } else if(kyc === 'pending'){
          kycBadge.className = 'ax-sb-badge';
          kycBadge.style.background = 'rgba(255,184,0,0.12)';
          kycBadge.style.color = '#ffb800';
          kycBadge.style.border = '1px solid rgba(255,184,0,0.2)';
          kycBadge.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> KYC Pending';
        } else {
          kycBadge.style.display = 'none';
        }
      }

      if(tierBadge){
        var tier = profile.account_tier || 'Founding';
        tierBadge.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> ' + tier;
      }
    } catch(e){ /* silent */ }
  }

  if(window.sb) axPopulateBadges();
  else document.addEventListener('sb-ready', axPopulateBadges, { once: true });



  // ---- Global error guard: silence stray "is not defined" popups ----
  if (!window.__apexErrorGuardInstalled) {
    window.__apexErrorGuardInstalled = true;
    window.addEventListener('error', function(ev){
      var msg = (ev && ev.message) || '';
      if (/is not defined/i.test(msg) || /Cannot read propert/i.test(msg)) {
        console.warn('[Guard] Suppressed UI error:', msg);
        ev.preventDefault();
        return true;
      }
    });
    window.addEventListener('unhandledrejection', function(ev){
      console.warn('[Guard] Unhandled promise rejection:', ev.reason);
      ev.preventDefault();
    });
  }

})();
