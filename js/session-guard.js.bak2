// ============================================
// APEX — Session Guard (MongoDB / cookie auth)
// ============================================
(function(){
  if (window.__apexSessionGuard) return;
  window.__apexSessionGuard = true;

  // Cookie lifetime is 7 days (server side). We only nudge the user
  // when the SERVER says the session is gone — never on local timers.
  var CHECK_INTERVAL_MS = 5 * 60 * 1000;   // ping server every 5 min
  var VISIBILITY_GRACE_MS = 2 * 1000;      // small delay after tab focus
  var MAX_FAILS = 2;                       // ignore transient network blips

  var failCount = 0;
  var checking = false;

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
    if (document.getElementById('apexExpiredModal')) return;
    var modal = document.createElement('div');
    modal.id = 'apexExpiredModal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.92);backdrop-filter:blur(8px);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;font-family:Inter,sans-serif';
    modal.innerHTML = '<div style="background:#0a0e14;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:28px;max-width:380px;width:100%;text-align:center"><div style="width:56px;height:56px;border-radius:50%;background:rgba(255,184,0,0.12);color:#ffb800;margin:0 auto 18px;display:flex;align-items:center;justify-content:center"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div><div style="font-family:Manrope,sans-serif;font-size:20px;font-weight:800;color:#fff;margin-bottom:8px">Session Expired</div><div style="color:#8a94a3;font-size:13px;line-height:1.5;margin-bottom:22px">Please sign in again to continue.</div><button id="apexExpiredBtn" style="width:100%;padding:14px;background:linear-gradient(135deg,#4a9eff,#8b5cf6);color:#fff;border:none;border-radius:12px;font-family:Manrope,sans-serif;font-size:14px;font-weight:700;cursor:pointer">Sign In</button></div>';
    document.body.appendChild(modal);
    document.getElementById('apexExpiredBtn').addEventListener('click', function(){
      location.href = '/login.html';
    });
  }

  async function pingServer(){
    if (checking) return;
    if (isPublicPage()) return;
    checking = true;
    try {
      var r = await fetch('/api/auth?action=me', {
        credentials: 'include',
        cache: 'no-store'
      });
      if (r.ok) {
        failCount = 0;        // session is healthy — reset
        return;
      }
      if (r.status === 401) {
        failCount++;
        // Require multiple consecutive 401s to avoid blip false-positives
        if (failCount >= MAX_FAILS) {
          showExpiredModal();
        }
      } else {
        // 5xx, network error — don't penalize the user
        failCount = 0;
      }
    } catch (e) {
      // Network offline — don't show expired modal
      // (user will re-validate when connection returns)
    } finally {
      checking = false;
    }
  }

  // Periodic ping (every 5 min)
  setInterval(pingServer, CHECK_INTERVAL_MS);

  // Check shortly after tab regains focus
  document.addEventListener('visibilitychange', function(){
    if (!document.hidden) {
      setTimeout(pingServer, VISIBILITY_GRACE_MS);
    }
  });

  // No initial ping — page load already authenticates via auth guard
  console.log('✓ Apex session guard armed (server-validated, 5min interval)');
})();
