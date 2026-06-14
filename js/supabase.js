// ============================================
// APEX IPO ACCESS — Supabase Client
// ============================================
// Loaded via CDN. Provides: window.sb (Supabase client)
// Usage: await sb.auth.signUp({...}), await sb.from('profiles').select()
// ============================================

const SUPABASE_URL  = 'https://tbivhlxkwtklhvsaggwg.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRiaXZobHhrd3RrbGh2c2FnZ3dnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExMjc5MTEsImV4cCI6MjA5NjcwMzkxMX0.rw-LXJTPzYJu5TdEP0pgqUguviMJNwzJkpI5uGtR6XY';

// Load Supabase JS from CDN if not already loaded
(function loadSupabase(){
  if (window.supabase) {
    window.sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
    window.__sbReady = true;
    document.dispatchEvent(new Event('sb-ready'));
    return;
  }
  const s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
  s.onload = () => {
    window.sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
    window.__sbReady = true;
    document.dispatchEvent(new Event('sb-ready'));
    console.log('✓ Supabase client ready');
  };
  s.onerror = () => console.error('✗ Failed to load Supabase');
  document.head.appendChild(s);
})();

// ============================================
// Helper functions used across pages
// ============================================

window.apex = {
  // Save signup form data to localStorage (collected across steps 1-6)
  saveStep(stepName, data){
    const all = JSON.parse(localStorage.getItem('apex_signup') || '{}');
    all[stepName] = data;
    localStorage.setItem('apex_signup', JSON.stringify(all));
  },

  getSignupData(){
    return JSON.parse(localStorage.getItem('apex_signup') || '{}');
  },

  clearSignup(){
    localStorage.removeItem('apex_signup');
  },

  // Final signup: create auth user + populate profile from collected data
  async completeSignup(email, password){
    const data = this.getSignupData();
    const { data: authData, error: authErr } = await sb.auth.signUp({ email, password });
    if (authErr) return { error: authErr };

    // Wait briefly for the trigger to create the profile row
    await new Promise(r => setTimeout(r, 800));

    // Update profile with all collected data
    const update = {
      prefix:        data.contact?.prefix,
      first_name:    data.contact?.firstName,
      last_name:     data.contact?.lastName,
      suffix:        data.contact?.suffix,
      phone:         data.contact?.phone,
      phone_type:    data.contact?.phoneType,
      address_line1: data.address?.addr1,
      address_line2: data.address?.addr2,
      city:          data.address?.city,
      state:         data.address?.state,
      zip:           data.address?.zip,
      citizenship:   data.address?.citizenship,
      dob:           data.identity?.dob,
      ssn_last4:     data.identity?.ssn?.slice(-4),
      account_types: data.accountTypes || [],
      has_existing_account: data.hasExisting || false,
      kyc_status:    'pending',  // requires admin approval
    };
    Object.keys(update).forEach(k => update[k] === undefined && delete update[k]);

    if (authData.user) {
      const { error: profErr } = await sb.from('profiles').update(update).eq('id', authData.user.id);
      if (profErr) console.warn('Profile update error:', profErr);
    }

    // Ensure session exists so pending-approval page works
    if (!authData.session) {
      try { await sb.auth.signInWithPassword({ email, password }); } catch(e) { console.warn('Auto sign-in after signup failed:', e); }
    }

    return { user: authData.user };
  },

  async login(email, password){
    return await sb.auth.signInWithPassword({ email, password });
  },

  async logout(){
    return await sb.auth.signOut();
  },

  async getUser(){
    const { data } = await sb.auth.getUser();
    return data?.user;
  },

  async getProfile(){
    const user = await this.getUser();
    if (!user) return null;
    const { data } = await sb.from('profiles').select('*').eq('id', user.id).single();
    return data;
  },

  async getActivity(limit = 10){
    const user = await this.getUser();
    if (!user) return [];
    const { data } = await sb.from('activity_log').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(limit);
    return data || [];
  },

  // Redirect helpers
  requireAuth(redirectTo = 'login.html'){
    sb.auth.getUser().then(({ data }) => {
      if (!data.user) window.location.href = redirectTo;
    });
  },

  requireGuest(redirectTo = 'dashboard.html'){
    sb.auth.getUser().then(({ data }) => {
      if (data.user) window.location.href = redirectTo;
    });
  }
};


// ============================================
// PLATFORM HELPERS — maintenance + signup gate
// ============================================
window.apex = window.apex || {};

window.apex.checkMaintenance = async function(){
  try {
    const { data } = await sb.from('platform_settings').select('maintenance_mode,maintenance_message,signup_enabled').eq('id',1).single();
    if(!data) return data;
    // Show maintenance banner if enabled (skip for admins)
    if(data.maintenance_mode){
      const { data: userData } = await sb.auth.getUser();
      let isAdmin = false;
      if(userData?.user){
        const { data: profile } = await sb.from('profiles').select('is_admin').eq('id', userData.user.id).single();
        isAdmin = profile?.is_admin === true;
      }
      if(!isAdmin && !document.getElementById('maintBanner')){
        const banner = document.createElement('div');
        banner.id = 'maintBanner';
        banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;background:linear-gradient(90deg,#ffb800,#ff8c00);color:#000;padding:10px 16px;font-family:Inter,sans-serif;font-size:13px;font-weight:600;text-align:center;box-shadow:0 4px 16px rgba(0,0,0,0.3)';
        banner.innerHTML = '🚧 ' + (data.maintenance_message || 'Platform under maintenance. Limited functionality.');
        document.body.appendChild(banner);
        document.body.style.paddingTop = (banner.offsetHeight + (parseInt(document.body.style.paddingTop||0))) + 'px';
      }
    }
    return data;
  } catch(e){ console.warn('Platform check:', e); }
};

// Auto-run on every page that loads supabase.js
document.addEventListener('sb-ready', () => {
  setTimeout(() => window.apex.checkMaintenance(), 500);
});
