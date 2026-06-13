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
    document.dispatchEvent(new Event('sb-ready'));
    return;
  }
  const s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
  s.onload = () => {
    window.sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
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
