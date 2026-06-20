/* ============================================================
   APEX IPO ACCESS — View-As Guard
   Read-only impersonation engine for admin support
   ============================================================ */
(function(){
  'use strict';

  // Skip on login/signup/admin/verification pages
  var path = window.location.pathname.toLowerCase();
  var skipPages = ['admin', 'login', 'signup', 'verify-', 'pending-', 'reset', 'forgot'];
  for(var i=0; i<skipPages.length; i++){
    if(path.indexOf(skipPages[i]) !== -1) return;
  }

  var viewAsId   = sessionStorage.getItem('apex_view_as_user');
  var viewAsName = sessionStorage.getItem('apex_view_as_user_name') || 'User';
  var viewAsEmail= sessionStorage.getItem('apex_view_as_user_email') || '';
  var adminId    = sessionStorage.getItem('apex_view_as_admin');

  if(!viewAsId || !adminId){
    window.__VIEW_AS_MODE = false;
    return;
  }

  // OPTIMISTIC: set flag synchronously so downstream page code can branch immediately.
  // Async verifyAdmin() below will UNSET if check fails (anti-tamper safety net).
  window.__VIEW_AS_MODE = true;
  window.__VIEW_AS_USER_ID = viewAsId;
  window.__VIEW_AS_ADMIN_ID = adminId;

  // Layer 1: verify current auth user is actually admin (anti-tamper)
  function verifyAdmin(){
    if(typeof sb === 'undefined' || !sb || !sb.auth){
      setTimeout(verifyAdmin, 200);
      return;
    }
    sb.auth.getUser().then(function(res){
      var user = res && res.data && res.data.user;
      if(!user || user.id !== adminId){
        // Session changed or tampered — disable view-as
        sessionStorage.removeItem('apex_view_as_user');
        sessionStorage.removeItem('apex_view_as_user_name');
        sessionStorage.removeItem('apex_view_as_user_email');
        sessionStorage.removeItem('apex_view_as_admin');
        window.__VIEW_AS_MODE = false;
        return;
      }
      sb.from('profiles').select('is_admin').eq('id', user.id).single().then(function(r){
        if(!r.data || !r.data.is_admin){
          sessionStorage.removeItem('apex_view_as_user');
          sessionStorage.removeItem('apex_view_as_user_name');
          sessionStorage.removeItem('apex_view_as_user_email');
          sessionStorage.removeItem('apex_view_as_admin');
          window.__VIEW_AS_MODE = false;
          return;
        }
        // Verified admin — activate view-as mode
        window.__VIEW_AS_MODE = true;
        window.__VIEW_AS_USER_ID = viewAsId;
        window.__VIEW_AS_ADMIN_ID = adminId;
        injectBanner();
      });
    });
  }

  function injectBanner(){
    if(document.getElementById('apex-view-as-banner')) return;
    var bar = document.createElement('div');
    bar.id = 'apex-view-as-banner';
    bar.innerHTML = ''
      + '<div style="display:flex;align-items:center;gap:12px;padding:10px 16px;background:linear-gradient(90deg,#f59e0b,#ef4444);color:#fff;font:600 13px/1.3 system-ui,-apple-system,sans-serif;box-shadow:0 2px 8px rgba(0,0,0,.4);position:sticky;top:0;left:0;right:0;z-index:99999">'
      + '  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0">'
      + '    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>'
      + '  </svg>'
      + '  <div style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'
      + '    <span style="opacity:.85;text-transform:uppercase;letter-spacing:.5px;font-size:11px;margin-right:8px">Viewing As</span>'
      + '    <strong>' + escapeHtml(viewAsName) + '</strong>'
      + (viewAsEmail ? '<span style="opacity:.85;margin-left:6px">&lt;' + escapeHtml(viewAsEmail) + '&gt;</span>' : '')
      + '    <span style="opacity:.7;margin-left:10px;font-weight:500">Read-only</span>'
      + '  </div>'
      + '  <button id="apex-view-as-exit" style="background:rgba(0,0,0,.25);color:#fff;border:1px solid rgba(255,255,255,.3);padding:6px 14px;border-radius:6px;font:600 12px system-ui;cursor:pointer;flex-shrink:0">Exit View</button>'
      + '</div>';
    if(document.body){
      document.body.insertBefore(bar, document.body.firstChild);
    } else {
      document.addEventListener('DOMContentLoaded', function(){
        document.body.insertBefore(bar, document.body.firstChild);
      });
    }
    setTimeout(function(){
      var btn = document.getElementById('apex-view-as-exit');
      if(btn) btn.addEventListener('click', exitViewAs);
    }, 100);
  }

  function exitViewAs(){
    sessionStorage.removeItem('apex_view_as_user');
    sessionStorage.removeItem('apex_view_as_user_name');
    sessionStorage.removeItem('apex_view_as_user_email');
    sessionStorage.removeItem('apex_view_as_admin');
    window.location.replace('admin.html');
  }

  function escapeHtml(s){
    return String(s||'').replace(/[&<>"']/g, function(c){
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];
    });
  }

  // Public API: call at top of any write/action handler
  window.__viewAsGuard = function(actionLabel){
    if(!window.__VIEW_AS_MODE) return false;
    var msg = '🔒 Read-only view — cannot ' + (actionLabel || 'perform this action') + ' while impersonating.\n\nExit View to return to admin.';
    if(typeof apexAlert === 'function') apexAlert(msg);
    else alert(msg);
    return true;
  };

  // Helper for queries: returns view-as ID or null
  window.__viewAsUserId = function(){
    return window.__VIEW_AS_MODE ? window.__VIEW_AS_USER_ID : null;
  };

  verifyAdmin();
})();
