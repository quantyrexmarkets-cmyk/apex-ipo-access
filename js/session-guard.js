// ============================================
// APEX — Session Guard v2 (MongoDB / cookie auth)
// Reactive: watches ALL fetch 401s + periodic ping + focus ping
// ============================================
(function(){
  if (window.__apexSessionGuard) return;
  window.__apexSessionGuard = true;

  var CHECK_INTERVAL_MS = 5 * 60 * 1000;   // ping every 5 min
  var VISIBILITY_GRACE_MS = 500;           // small delay after tab focus
  var INITIAL_PING_MS = 300;               // ping shortly after load
  var MAX_FAILS = 2;                       // consecutive 401s before modal
  var failCount = 0;
  var checking = false;
  var expired = false;

  function isPublicPage(){
    var p = (location.pathname || '').toLowerCase();
    return (
      p === '/' ||
      p.indexOf('/login') === 0 ||
      p.indexOf('/signup') === 0 ||
      p.indexOf('/forgot') === 0 ||
      p.indexOf('/reset') === 0 ||
      p.indexOf('/verify') === 0 ||
      p.indexOf('/pending') === 0 ||
      p.indexOf('/index') === 0
    );
  }

  function showExpiredModal(){
    if (expired) return;
    if (document.getElementById('apexExpiredModal')) return;
    expired = true;
    var modal = document.createElement('div');
    modal.id = 'apexExpiredModal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.92);backdrop-filter:blur(8px);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;font-family:Inter,sans-serif';
    modal.innerHTML = '<div style="background:#0a0e14;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:28px;max-width:380px;width:100%;text-align:center"><div style="width:56px;height:56px;border-radius:50%;background:rgba(255,184,0,0.12);color:#ffb800;margin:0 auto 18px;display:flex;align-items:center;justify-content:center"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div><div style="font-family:Manrope,sans-serif;font-size:20px;font-weight:800;color:#fff;margin-bottom:8px">Session Expired</div><div style="color:#8a94a3;font-size:13px;line-height:1.5;margin-bottom:22px">Please sign in again to continue.</div><button id="apexExpiredBtn" style="width:100%;padding:14px;background:linear-gradient(135deg,#4a9eff,#8b5cf6);color:#fff;border:none;border-radius:12px;font-family:Manrope,sans-serif;font-size:14px;font-weight:700;cursor:pointer">Sign In</button></div>';
    document.body.appendChild(modal);
    document.getElementById('apexExpiredBtn').addEventListener('click', function(){
      location.href = '/login.html?expired=1';
    });
    // Auto-redirect after 6s if user doesn't click
    setTimeout(function(){ location.href = '/login.html?expired=1'; }, 6000);
  }

  async function pingServer(){
    if (checking || expired) return;
    if (isPublicPage()) return;
    checking = true;
    try {
      var r = await fetch('/api/auth?action=me', {
        credentials: 'include',
        cache: 'no-store'
      });
      if (r.ok) { failCount = 0; return; }
      if (r.status === 401) {
        failCount++;
        if (failCount >= MAX_FAILS) showExpiredModal();
      } else {
        failCount = 0; // 5xx = don't penalize
      }
    } catch (e) {
      // Network offline — don't show expired modal
    } finally {
      checking = false;
    }
  }

  // ---- NEW: intercept ALL fetches. Any 401 from our own /api counts. ----
  var origFetch = window.fetch;
  window.fetch = function(){
    var args = arguments;
    var url = '';
    try {
      url = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url) || '';
    } catch(e){}
    return origFetch.apply(this, args).then(function(res){
      if (!expired && res && res.status === 401 && url.indexOf('/api/') !== -1) {
        // Don't count the logout endpoint or login endpoint
        if (url.indexOf('logout') === -1 && url.indexOf('action=login') === -1 && !isPublicPage()) {
          failCount++;
          if (failCount >= MAX_FAILS) showExpiredModal();
        }
      }
      return res;
    });
  };

  // Initial ping shortly after load — catches expired sessions immediately
  if (!isPublicPage()) {
    setTimeout(pingServer, INITIAL_PING_MS);
  }

  // Periodic ping (every 5 min)
  setInterval(pingServer, CHECK_INTERVAL_MS);

  // Check shortly after tab regains focus
  document.addEventListener('visibilitychange', function(){
    if (!document.hidden) setTimeout(pingServer, VISIBILITY_GRACE_MS);
  });

  console.log('✓ Apex session guard v2 armed (fetch-intercepting, 5min interval, on-load ping)');
})();
