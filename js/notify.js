// ============================================
// APEX — Unified Notification System
// ============================================
// Provides: window.apexToast(msg, type), apexAlert(), apexConfirm()
// Also: global error handler that catches silent failures
// ============================================

(function(){
  if (window.__apexNotifyLoaded) return;
  window.__apexNotifyLoaded = true;

  // ── CSS ──────────────────────────────────────
  var css = `
    .apex-toast-stack{
      position:fixed; top:20px; left:50%;
      transform:translateX(-50%);
      z-index:99999; display:flex; flex-direction:column;
      gap:8px; pointer-events:none;
      max-width:calc(100vw - 32px); width:auto;
      align-items:center;
    }
    .apex-toast{
      pointer-events:auto;
      background:rgba(20,20,25,0.98);
      backdrop-filter:blur(20px);
      border:1px solid rgba(255,255,255,0.12);
      border-left:4px solid #4a9eff;
      color:#fff; padding:14px 18px;
      border-radius:12px;
      font-family:'Inter',sans-serif;
      font-size:14px; font-weight:500;
      box-shadow:0 12px 32px rgba(0,0,0,0.5);
      display:flex; align-items:center; gap:12px;
      min-width:260px; max-width:420px;
      transform:translateY(-12px); opacity:0;
      transition:transform .25s cubic-bezier(.2,.8,.2,1), opacity .25s;
    }
    .apex-toast.show{ transform:translateY(0); opacity:1; }
    .apex-toast.success{ border-left-color:#3ed598; }
    .apex-toast.error{ border-left-color:#ff6a6a; }
    .apex-toast.warning{ border-left-color:#ffb800; }
    .apex-toast .ic{
      width:24px; height:24px; flex-shrink:0;
      display:flex; align-items:center; justify-content:center;
      border-radius:50%; font-size:14px; font-weight:700;
    }
    .apex-toast.info .ic{ background:rgba(74,158,255,0.18); color:#4a9eff; }
    .apex-toast.success .ic{ background:rgba(62,213,152,0.18); color:#3ed598; }
    .apex-toast.error .ic{ background:rgba(255,106,106,0.18); color:#ff6a6a; }
    .apex-toast.warning .ic{ background:rgba(255,184,0,0.18); color:#ffb800; }
    .apex-toast .txt{ flex:1; line-height:1.4; word-wrap:break-word; }
    .apex-toast .x{
      background:none; border:none; color:rgba(255,255,255,0.45);
      cursor:pointer; font-size:18px; line-height:1; padding:0 2px;
      flex-shrink:0;
    }
    .apex-toast .x:hover{ color:#fff; }

    /* Modal */
    .apex-modal-overlay{
      position:fixed; inset:0; z-index:99998;
      background:rgba(0,0,0,0.78);
      backdrop-filter:blur(8px);
      display:flex; align-items:center; justify-content:center;
      padding:20px; opacity:0; pointer-events:none;
      transition:opacity .2s;
    }
    .apex-modal-overlay.show{ opacity:1; pointer-events:auto; }
    .apex-modal-box{
      background:rgba(18,18,22,0.99);
      border:1px solid rgba(255,255,255,0.1);
      border-radius:16px; padding:24px;
      max-width:380px; width:100%;
      transform:scale(0.92); transition:transform .2s;
      font-family:'Inter',sans-serif;
    }
    .apex-modal-overlay.show .apex-modal-box{ transform:scale(1); }
    .apex-modal-box h4{
      font-family:'Plus Jakarta Sans',sans-serif;
      font-weight:600; font-size:17px; color:#fff;
      margin:0 0 8px;
    }
    .apex-modal-box .body{
      font-size:14px; color:#a8b2c1; line-height:1.55;
      margin-bottom:20px; white-space:pre-wrap;
    }
    .apex-modal-box .row{
      display:flex; gap:10px; justify-content:flex-end;
    }
    .apex-modal-box button{
      padding:10px 18px; border:none; border-radius:9px;
      font-size:13px; font-weight:600;
      cursor:pointer; font-family:inherit;
      transition:all .15s;
    }
    .apex-modal-box .cancel{
      background:rgba(255,255,255,0.06); color:#a8b2c1;
    }
    .apex-modal-box .cancel:hover{ background:rgba(255,255,255,0.1); color:#fff; }
    .apex-modal-box .ok{
      background:linear-gradient(135deg,#4a9eff,#357abd); color:#fff;
    }
    .apex-modal-box .ok:hover{ filter:brightness(1.1); }
    .apex-modal-box .ok.danger{
      background:linear-gradient(135deg,#ff6a6a,#c44545);
    }
  `;
  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  // ── Stack container ──────────────────────────
  var stack = document.createElement('div');
  stack.className = 'apex-toast-stack';
  function ensureStack(){
    if(!stack.parentNode) document.body.appendChild(stack);
  }

  var ICONS = { info:'i', success:'✓', error:'!', warning:'!' };

  // ── Main toast function ──────────────────────
  function toast(msg, type, opts){
    ensureStack();
    type = type || 'info';
    opts = opts || {};
    var duration = opts.duration || (type === 'error' ? 6000 : 3500);

    var el = document.createElement('div');
    el.className = 'apex-toast ' + type;
    el.innerHTML =
      '<div class="ic">' + (ICONS[type] || 'i') + '</div>' +
      '<div class="txt"></div>' +
      '<button class="x" aria-label="Close">×</button>';
    el.querySelector('.txt').textContent = String(msg);

    var dismiss = function(){
      el.classList.remove('show');
      setTimeout(function(){ if(el.parentNode) el.parentNode.removeChild(el); }, 250);
    };
    el.querySelector('.x').addEventListener('click', dismiss);
    stack.appendChild(el);
    requestAnimationFrame(function(){ el.classList.add('show'); });

    if(duration > 0) setTimeout(dismiss, duration);
    return { dismiss: dismiss };
  }

  // ── Alert (modal with OK button) ─────────────
  function alertModal(opts){
    opts = typeof opts === 'string' ? { body: opts } : (opts || {});
    return new Promise(function(resolve){
      var overlay = document.createElement('div');
      overlay.className = 'apex-modal-overlay';
      overlay.innerHTML =
        '<div class="apex-modal-box">' +
          '<h4></h4>' +
          '<div class="body"></div>' +
          '<div class="row"><button class="ok">' + (opts.okLabel || 'OK') + '</button></div>' +
        '</div>';
      overlay.querySelector('h4').textContent = opts.title || 'Notice';
      overlay.querySelector('.body').textContent = opts.body || '';

      var close = function(val){
        overlay.classList.remove('show');
        setTimeout(function(){
          if(overlay.parentNode) overlay.parentNode.removeChild(overlay);
          resolve(val);
        }, 200);
      };
      overlay.querySelector('.ok').addEventListener('click', function(){ close(true); });
      document.body.appendChild(overlay);
      requestAnimationFrame(function(){ overlay.classList.add('show'); });
    });
  }

  // ── Confirm (modal with Cancel + OK) ─────────
  function confirmModal(opts){
    opts = typeof opts === 'string' ? { body: opts } : (opts || {});
    return new Promise(function(resolve){
      var overlay = document.createElement('div');
      overlay.className = 'apex-modal-overlay';
      var okClass = 'ok' + (opts.danger ? ' danger' : '');
      overlay.innerHTML =
        '<div class="apex-modal-box">' +
          '<h4></h4>' +
          '<div class="body"></div>' +
          '<div class="row">' +
            '<button class="cancel">' + (opts.cancelLabel || 'Cancel') + '</button>' +
            '<button class="' + okClass + '">' + (opts.okLabel || 'Confirm') + '</button>' +
          '</div>' +
        '</div>';
      overlay.querySelector('h4').textContent = opts.title || 'Confirm';
      overlay.querySelector('.body').textContent = opts.body || '';

      var close = function(val){
        overlay.classList.remove('show');
        setTimeout(function(){
          if(overlay.parentNode) overlay.parentNode.removeChild(overlay);
          resolve(val);
        }, 200);
      };
      overlay.querySelector('.cancel').addEventListener('click', function(){ close(false); });
      overlay.querySelector('.ok').addEventListener('click', function(){ close(true); });
      document.body.appendChild(overlay);
      requestAnimationFrame(function(){ overlay.classList.add('show'); });
    });
  }

  // ── Expose globals ───────────────────────────
  window.apexToast   = function(msg, type, opts){ return toast(msg, type || 'info', opts); };
  window.apexSuccess = function(msg, opts){ return toast(msg, 'success', opts); };
  window.apexError   = function(msg, opts){ return toast(msg, 'error', opts); };
  window.apexWarn    = function(msg, opts){ return toast(msg, 'warning', opts); };
  window.apexAlert   = alertModal;
  window.apexConfirm = confirmModal;

  // ── Global error catcher ─────────────────────
  window.addEventListener('error', function(e){
    var msg = e && e.message ? e.message : 'An unexpected error occurred';
    if(/Script error/i.test(msg)) return; // ignore cross-origin
    console.error('[Global error]', e);
    toast(msg, 'error');
  });

  window.addEventListener('unhandledrejection', function(e){
    var r = e.reason;
    var msg = (r && r.message) || (typeof r === 'string' ? r : 'Unhandled promise rejection');
    console.error('[Unhandled rejection]', r);
    toast(msg, 'error');
  });

  // ── Supabase error helper ────────────────────
  window.apexHandleSbError = function(error, fallback){
    if(!error) return false;
    var msg = error.message || error.error_description || fallback || 'Database error';
    toast(msg, 'error');
    console.error('[Supabase]', error);
    return true;
  };

  console.log('✓ APEX notify system ready');
})();
