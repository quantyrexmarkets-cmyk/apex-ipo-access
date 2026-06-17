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

  function stripEmoji(s){
    if(!s) return '';
    return String(s).replace(/^[\u2600-\u27BF\uD83C-\uDBFF\uDC00-\uDFFF\uFE0F\u200D\s]+/, '').trim();
  }

  function iconFor(type, title){
    var t = (type || '').toLowerCase();
    var ti = (title || '').toLowerCase();
    function has(k){ return t.indexOf(k)>=0 || ti.indexOf(k)>=0; }

    var icons = {
      success:    {c:'green',  svg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'},
      deposit:    {c:'green',  svg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>'},
      withdrawal: {c:'blue',   svg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>'},
      kyc:        {c:'amber',  svg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>'},
      purchase:   {c:'blue',   svg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>'},
      allocation: {c:'blue',   svg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>'},
      warning:    {c:'amber',  svg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'},
      error:      {c:'red',    svg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>'},
      info:       {c:'blue',   svg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'},
      welcome:    {c:'green',  svg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>'},
      bell:       {c:'blue',   svg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>'}
    };

    if(icons[t]) return {svg: icons[t].svg, cls: icons[t].c};
    if(has('credit') || has('deposit')) return {svg: icons.deposit.svg, cls: 'green'};
    if(has('withdraw')) return {svg: icons.withdrawal.svg, cls: 'blue'};
    if(has('kyc') || has('verif')) return {svg: icons.kyc.svg, cls: 'amber'};
    if(has('approve') || has('success')) return {svg: icons.success.svg, cls: 'green'};
    if(has('purchase') || has('bought')) return {svg: icons.purchase.svg, cls: 'blue'};
    if(has('allocation') || has('share')) return {svg: icons.allocation.svg, cls: 'blue'};
    if(has('welcome')) return {svg: icons.welcome.svg, cls: 'green'};
    if(has('warn') || has('suspend')) return {svg: icons.warning.svg, cls: 'amber'};
    if(has('error') || has('fail') || has('reject')) return {svg: icons.error.svg, cls: 'red'};
    return {svg: icons.bell.svg, cls: 'blue'};
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
      .ub-icon{width:38px;height:38px;border-radius:10px;display:flex;align-items:center;justify-content:center;background:#1a1d21;flex-shrink:0;color:#a8b2c1}.ub-icon svg{width:18px;height:18px}.ub-icon-green{background:rgba(62,213,152,0.12);color:#3ed598}.ub-icon-blue{background:rgba(95,176,255,0.12);color:#5fb0ff}.ub-icon-amber{background:rgba(255,189,74,0.12);color:#ffbd4a}.ub-icon-red{background:rgba(239,68,68,0.12);color:#ef4444}
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
        (function(){var _i=iconFor(n.type||n.kind, n.title||n.subject); return '<div class="ub-icon ub-icon-'+_i.cls+'">'+_i.svg+'</div>';})() +
        '<div class="ub-body">' +
          '<div class="ub-title">'+stripEmoji(n.title||n.subject||'Notification')+'</div>' +
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
