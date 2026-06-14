// ═══════════════════════════════════════════════════════════
// USER NOTIFICATION BELL — shared across all user pages
// ═══════════════════════════════════════════════════════════
(function(){
  if(window._userBellInited) return;
  window._userBellInited = true;

  var userBellNotifs = [];
  var rtSub = null;

  function timeAgo(iso){
    var d = new Date(iso); var sec = Math.floor((Date.now()-d)/1000);
    if(sec<60) return 'just now';
    if(sec<3600) return Math.floor(sec/60)+'m ago';
    if(sec<86400) return Math.floor(sec/3600)+'h ago';
    if(sec<604800) return Math.floor(sec/86400)+'d ago';
    return d.toLocaleDateString();
  }

  function iconFor(type){
    var map = {
      success:'✅', deposit:'💰', withdrawal:'💸', kyc:'🪪',
      purchase:'📈', allocation:'🎟️', warning:'⚠️', info:'ℹ️',
      error:'❌', welcome:'🎉'
    };
    return map[type] || '🔔';
  }

  function injectStyles(){
    if(document.getElementById('userBellStyles')) return;
    var st = document.createElement('style');
    st.id = 'userBellStyles';
    st.textContent = `
      .ub-overlay{position:fixed;inset:0;background:#0a0b0d;z-index:9999;display:none;flex-direction:column}
      .ub-overlay.open{display:flex}
      .ub-head{display:flex;justify-content:space-between;align-items:center;padding:18px 20px;border-bottom:1px solid #1f2227;background:#0f1114}
      .ub-head h2{margin:0;font-size:18px;color:#fff;font-weight:600}
      .ub-head-actions{display:flex;gap:8px;align-items:center}
      .ub-clear{background:none;border:none;color:#5fb0ff;font-size:13px;cursor:pointer;padding:6px 10px;border-radius:6px}
      .ub-close{background:none;border:none;color:#a8b2c1;font-size:26px;cursor:pointer;padding:4px 10px;line-height:1}
      .ub-list{flex:1;overflow-y:auto;padding:8px 0}
      .ub-empty{padding:60px 20px;text-align:center;color:#6b7280;font-size:14px}
      .ub-item{display:flex;gap:12px;padding:16px 20px;border-bottom:1px solid #1a1d21;cursor:pointer;transition:background 0.15s}
      .ub-item:hover,.ub-item:active{background:#1a1d21}
      .ub-item.unread{background:rgba(95,176,255,0.05)}
      .ub-item.unread::before{content:'';width:6px;height:6px;border-radius:50%;background:#5fb0ff;flex-shrink:0;margin-top:8px}
      .ub-item.read::before{content:'';width:6px;flex-shrink:0}
      .ub-icon{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px;background:#1a1d21;flex-shrink:0}
      .ub-body{flex:1;min-width:0}
      .ub-title{color:#fff;font-size:14px;font-weight:500;margin-bottom:3px}
      .ub-msg{color:#a8b2c1;font-size:13px;line-height:1.4}
      .ub-time{color:#6b7280;font-size:11px;margin-top:6px}
      .ub-badge{position:absolute;top:-4px;right:-4px;background:#ef4444;color:#fff;font-size:10px;font-weight:700;min-width:18px;height:18px;border-radius:9px;display:flex;align-items:center;justify-content:center;padding:0 5px}
    `;
    document.head.appendChild(st);
  }

  function buildOverlay(){
    if(document.getElementById('ubOverlay')) return;
    var ov = document.createElement('div');
    ov.id = 'ubOverlay';
    ov.className = 'ub-overlay';
    ov.innerHTML = `
      <div class="ub-head">
        <h2>Notifications</h2>
        <div class="ub-head-actions">
          <button class="ub-clear" id="ubClearAll">Mark all read</button>
          <button class="ub-close" id="ubClose" aria-label="Close">×</button>
        </div>
      </div>
      <div class="ub-list" id="ubList">
        <div class="ub-empty">No notifications yet</div>
      </div>
    `;
    document.body.appendChild(ov);

    document.getElementById('ubClose').addEventListener('click', closeBell);
    document.getElementById('ubClearAll').addEventListener('click', markAllRead);
  }

  async function loadNotifications(){
    try {
      var user = await window.apex.getUser();
      if(!user) return;
      var { data } = await sb.from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at',{ascending:false})
        .limit(50);
      userBellNotifs = data || [];
      renderList();
      updateBadge();
    } catch(e){ console.warn('user bell load err', e); }
  }

  function renderList(){
    var list = document.getElementById('ubList');
    if(!list) return;
    if(!userBellNotifs.length){
      list.innerHTML = '<div class="ub-empty">No notifications yet</div>';
      return;
    }
    list.innerHTML = userBellNotifs.map(function(n){
      var cls = n.is_read ? 'read' : 'unread';
      return '<div class="ub-item '+cls+'" data-id="'+n.id+'">' +
        '<div class="ub-icon">'+iconFor(n.type||n.kind)+'</div>' +
        '<div class="ub-body">' +
          '<div class="ub-title">'+(n.title||n.subject||'Notification')+'</div>' +
          '<div class="ub-msg">'+(n.message||n.body||'')+'</div>' +
          '<div class="ub-time">'+timeAgo(n.created_at)+'</div>' +
        '</div>' +
      '</div>';
    }).join('');

    list.querySelectorAll('.ub-item').forEach(function(el){
      el.addEventListener('click', async function(){
        var id = el.dataset.id;
        await sb.from('notifications').update({is_read:true}).eq('id', id);
        var n = userBellNotifs.find(function(x){return x.id===id});
        if(n) n.is_read = true;
        el.classList.remove('unread'); el.classList.add('read');
        updateBadge();
      });
    });
  }

  function updateBadge(){
    var unread = userBellNotifs.filter(function(n){return !n.is_read}).length;
    document.querySelectorAll('.icon-btn[aria-label="Notifications"]').forEach(function(btn){
      btn.style.position = 'relative';
      var b = btn.querySelector('.ub-badge');
      if(unread > 0){
        if(!b){
          b = document.createElement('span');
          b.className = 'ub-badge';
          btn.appendChild(b);
        }
        b.textContent = unread > 9 ? '9+' : unread;
      } else if(b){
        b.remove();
      }
    });
  }

  async function markAllRead(){
    var unread = userBellNotifs.filter(function(n){return !n.is_read});
    if(!unread.length) return;
    var ids = unread.map(function(n){return n.id});
    await sb.from('notifications').update({is_read:true}).in('id', ids);
    userBellNotifs.forEach(function(n){n.is_read=true});
    renderList(); updateBadge();
  }

  function openBell(){
    var ov = document.getElementById('ubOverlay');
    if(!ov){ buildOverlay(); ov = document.getElementById('ubOverlay'); }
    loadNotifications();
    ov.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeBell(){
    var ov = document.getElementById('ubOverlay');
    if(ov) ov.classList.remove('open');
    document.body.style.overflow = '';
  }

  function attachBellButtons(){
    document.querySelectorAll('.icon-btn[aria-label="Notifications"]').forEach(function(btn){
      // Remove the "coming soon" onclick
      btn.removeAttribute('onclick');
      btn.addEventListener('click', function(e){
        e.preventDefault();
        e.stopPropagation();
        openBell();
      });
    });
  }

  async function startRealtime(){
    try {
      var user = await window.apex.getUser();
      if(!user) return;
      rtSub = sb.channel('user_notif_rt_'+user.id)
        .on('postgres_changes', {event:'INSERT', schema:'public', table:'notifications', filter:'user_id=eq.'+user.id},
          function(payload){
            userBellNotifs.unshift(payload.new);
            if(userBellNotifs.length>50) userBellNotifs.pop();
            updateBadge();
            var ov = document.getElementById('ubOverlay');
            if(ov && ov.classList.contains('open')) renderList();
          })
        .subscribe();
    } catch(e){ console.warn('rt sub failed', e); }
  }

  function init(){
    injectStyles();
    buildOverlay();
    attachBellButtons();
    // Initial badge load (without opening)
    loadNotifications();
    startRealtime();
  }

  // Boot when ready
  function tryInit(){
    if(typeof sb === 'undefined' || typeof window.apex === 'undefined'){
      setTimeout(tryInit, 500); return;
    }
    init();
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', function(){ setTimeout(tryInit, 300); });
  } else {
    setTimeout(tryInit, 300);
  }
})();
