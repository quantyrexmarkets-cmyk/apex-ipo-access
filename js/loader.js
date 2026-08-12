// ═══════════════════════════════════════════════════════════
// APEX Loading Splash — shows on every page load
// Auto-injects HTML + CSS, fades out when page is ready
// Min duration: 500ms (prevents flicker)
// Max duration: 3000ms (fail-safe timeout)
// ═══════════════════════════════════════════════════════════
(function(){
  if (window.__apexLoaderInited) return;
  window.__apexLoaderInited = true;

  // ─── Only show on real page loads (URL entry, reload, external link) ───
  // Skip if user navigated from within the app (tapped sidebar/nav/link)
  const INTERNAL_KEY = '__apex_internal_nav';
  const wasInternalNav = sessionStorage.getItem(INTERNAL_KEY) === '1';
  sessionStorage.removeItem(INTERNAL_KEY);

  // Detect navigation type via Performance API
  let navType = 'navigate';
  try {
    const nav = performance.getEntriesByType('navigation')[0];
    if (nav && nav.type) navType = nav.type;
  } catch(e) {}

  // Show splash ONLY if it was a fresh load or a reload, NOT internal nav
  const isReload = (navType === 'reload');
  const isFreshLoad = !wasInternalNav;
  const shouldShow = isReload || isFreshLoad;

  if (!shouldShow) {
    // Still set up the internal-nav listener for next click, then bail
    setupInternalNavTracking();
    return;
  }

  const MIN_MS = 2200;
  const MAX_MS = 7000;
  const startTime = Date.now();

  // ─── Mark next navigation as internal when user taps an in-app link/button ───
  function setupInternalNavTracking() {
    if (window.__apexNavTrackerInited) return;
    window.__apexNavTrackerInited = true;

    // Any click on <a href> or button with onclick=location.href / navigation
    document.addEventListener('click', function(e){
      let el = e.target;
      // Walk up to find anchor or clickable element
      while (el && el !== document.body) {
        // Skip if opens new tab, downloads, or is external
        if (el.tagName === 'A') {
          const href = el.getAttribute('href') || '';
          const target = el.getAttribute('target') || '';
          if (href && !href.startsWith('#') && !href.startsWith('mailto:') && !href.startsWith('tel:') && target !== '_blank') {
            // Internal link — mark it
            try { sessionStorage.setItem(INTERNAL_KEY, '1'); } catch(_){}
          }
          return;
        }
        // Check for onclick attribute that changes location
        const oc = el.getAttribute && el.getAttribute('onclick');
        if (oc && (oc.indexOf('location.href') >= 0 || oc.indexOf('location.replace') >= 0)) {
          try { sessionStorage.setItem(INTERNAL_KEY, '1'); } catch(_){}
          return;
        }
        el = el.parentElement;
      }
    }, true); // capture phase — fires before the actual navigation

    // Also intercept programmatic location.href changes
    try {
      const origAssign = window.location.assign.bind(window.location);
      window.location.assign = function(url){ try { sessionStorage.setItem(INTERNAL_KEY, '1'); } catch(_){} return origAssign(url); };
    } catch(_){}
  }

  setupInternalNavTracking();

  // ─── Inject CSS ───
  const css = `
    #apexLoader {
      position: fixed; inset: 0; z-index: 999999;
      background: #0a0a0a;
      display: flex; align-items: center; justify-content: center;
      opacity: 1;
      transition: opacity 0.35s ease-out;
    }
    #apexLoader.hide { opacity: 0; pointer-events: none; }

    .apex-spinner {
      width: 56px; height: 56px;
      border-radius: 50%;
      border: 3px solid rgba(74, 158, 255, 0.15);
      border-top-color: #4a9eff;
      animation: apexSpin 0.9s linear infinite;
    }

    @keyframes apexSpin {
      to { transform: rotate(360deg); }
    }
  `;

  const style = document.createElement('style');
  style.id = 'apexLoaderStyle';
  style.textContent = css;
  (document.head || document.documentElement).appendChild(style);

  // ─── Inject HTML ───
  function inject() {
    if (document.getElementById('apexLoader')) return;
    const el = document.createElement('div');
    el.id = 'apexLoader';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-label', 'Loading');
    el.innerHTML = `<div class="apex-spinner"></div>`;
    (document.body || document.documentElement).appendChild(el);
  }

  // Insert as early as possible — before DOM is parsed
  if (document.body) {
    inject();
  } else {
    document.addEventListener('DOMContentLoaded', inject, { once: true });
    // Fallback in case DOMContentLoaded fires before we're ready
    setTimeout(inject, 0);
  }

  // ─── Hide loader ───
  function hide() {
    const el = document.getElementById('apexLoader');
    if (!el) return;
    const elapsed = Date.now() - startTime;
    const remaining = Math.max(0, MIN_MS - elapsed);
    setTimeout(() => {
      el.classList.add('hide');
      setTimeout(() => { el.remove(); const s = document.getElementById('apexLoaderStyle'); if (s) s.remove(); }, 400);
    }, remaining);
  }

  // Hide when window is fully loaded (images + async)
  if (document.readyState === 'complete') {
    hide();
  } else {
    window.addEventListener('load', hide, { once: true });
  }

  // Fail-safe: never let it hang forever
  setTimeout(hide, MAX_MS);

  // Expose manual controls for edge cases
  window.__apexLoader = { hide, inject };
})();
