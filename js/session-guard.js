// ============================================
// APEX — Session Idle Timeout Guard
// Include on every authenticated page after supabase.js
// ============================================
(function(){
  if (window.__apexSessionGuard) return;
  window.__apexSessionGuard = true;

  // Config
  var IDLE_MS = 30 * 60 * 1000;       // 30 min idle
  var WARN_MS = 60 * 1000;            // warn 60s before
  var MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hr absolute max
  var STORAGE_KEY = 'apex_last_activity';
  var SESSION_START_KEY = 'apex_session_start';

  function now(){ return Date.now(); }

  function touch(){
    try { localStorage.setItem(STORAGE_KEY, String(now())); } catch(e){}
    hideWarnBanner();
  }

  function getLast(){
    try {
      var v = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10);
      return v || now();
    } catch(e){ return now(); }
  }

  function getSessionStart(){
    try {
      var v = parseInt(localStorage.getItem(SESSION_START_KEY) || '0', 10);
      if (!v) { v = now(); localStorage.setItem(SESSION_START_KEY, String(v)); }
      return v;
    } catch(e){ return now(); }
  }

  async function signOutAndRedirect(reason){
    try {
      if (window.sb && window.sb.auth) await window.sb.auth.signOut();
    } catch(e){}
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(SESSION_START_KEY);
    } catch(e){}
    // Carry reason in URL for login page to display
    location.href = 'login.html?expired=' + encodeURIComponent(reason || 'timeout');
  }

  function showExpiredModal(reason){
    if (document.getElementById('apexExpiredModal')) return;
    var modal = document.createElement('div');
    modal.id = 'apexExpiredModal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.92);backdrop-filter:blur(8px);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;font-family:Inter,sans-serif';
    modal.innerHTML = '<div style="background:#0a0e14;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:28px;max-width:380px;width:100%;text-align:center"><div style="width:56px;height:56px;border-radius:50%;background:rgba(255,184,0,0.12);color:#ffb800;margin:0 auto 18px;display:flex;align-items:center;justify-content:center"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div><div style="font-family:Manrope,sans-serif;font-size:20px;font-weight:800;color:#fff;margin-bottom:8px">Session Expired</div><div style="color:#8a94a3;font-size:13px;line-height:1.5;margin-bottom:22px">For your security, you have been signed out due to ' + (reason === 'maxAge' ? 'extended session length' : 'inactivity') + '.</div><button id="apexExpiredBtn" style="width:100%;padding:14px;background:linear-gradient(135deg,#4a9eff,#8b5cf6);color:#fff;border:none;border-radius:12px;font-family:Manrope,sans-serif;font-size:14px;font-weight:700;cursor:pointer">Sign In Again</button></div>';
    document.body.appendChild(modal);
    document.getElementById('apexExpiredBtn').addEventListener('click', function(){
      signOutAndRedirect(reason);
    });
    // Auto-redirect after 8s if user doesn't click
    setTimeout(function(){ signOutAndRedirect(reason); }, 8000);
  }

  function showWarnBanner(){
    if (document.getElementById('apexWarnBanner')) return;
    var b = document.createElement('div');
    b.id = 'apexWarnBanner';
    b.style.cssText = 'position:fixed;top:0;left:0;right:0;background:linear-gradient(135deg,rgba(255,184,0,0.95),rgba(255,140,0,0.95));color:#000;padding:12px 18px;text-align:center;font-family:Inter,sans-serif;font-size:13px;font-weight:600;z-index:99998;cursor:pointer;box-shadow:0 4px 20px rgba(0,0,0,0.4)';
    b.innerHTML = '⏳ Session expiring in <span id="apexWarnSec">60</span>s — tap anywhere to stay signed in';
    b.addEventListener('click', touch);
    document.body.appendChild(b);
    var s = 60;
    var iv = setInterval(function(){
      s--;
      var el = document.getElementById('apexWarnSec');
      if (!el) { clearInterval(iv); return; }
      el.textContent = String(s);
      if (s <= 0) clearInterval(iv);
    }, 1000);
  }

  function hideWarnBanner(){
    var b = document.getElementById('apexWarnBanner');
    if (b) b.remove();
  }

  function check(){
    var last = getLast();
    var start = getSessionStart();
    var idle = now() - last;
    var age = now() - start;

    if (age > MAX_AGE_MS) {
      showExpiredModal('maxAge');
      return;
    }
    if (idle > IDLE_MS) {
      showExpiredModal('timeout');
      return;
    }
    if (idle > IDLE_MS - WARN_MS) {
      showWarnBanner();
    } else {
      hideWarnBanner();
    }
  }

  // Track activity
  ['mousedown','touchstart','keydown','scroll','click'].forEach(function(ev){
    window.addEventListener(ev, touch, { passive: true });
  });

  // Initial touch + periodic check
  touch();
  setInterval(check, 10000); // check every 10s

  // Check on visibility change (returning to tab)
  document.addEventListener('visibilitychange', function(){
    if (!document.hidden) check();
  });

  console.log('✓ Apex session guard armed (30min idle, 24hr max)');
})();
