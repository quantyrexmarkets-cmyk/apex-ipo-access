/**
 * APEX API CLIENT
 * Central wrapper for all backend calls.
 * Replaces all Supabase usage.
 */

const ApexAPI = (() => {
  const BASE = ''; // same origin

  // --- Core fetch wrapper ---
  async function request(path, options = {}) {
    const opts = {
      method: options.method || 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    };

    if (options.body !== undefined) {
      opts.body = typeof options.body === 'string'
        ? options.body
        : JSON.stringify(options.body);
    }

    let res;
    try {
      res = await fetch(BASE + path, opts);
    } catch (networkErr) {
      throw new Error('Network error. Please check your connection.');
    }

    let data = null;
    try {
      data = await res.json();
    } catch {
      // not JSON — ignore
    }

    if (!res.ok) {
      const msg = (data && data.error) || `Request failed (${res.status})`;
      const err = new Error(msg);
      err.status = res.status;
      err.data = data;
      throw err;
    }

    return data;
  }

  // --- AUTH ---
  const auth = {
    register: (email, password, fullName, extra) =>
      request('/api/auth?action=register', {
        method: 'POST',
        body: Object.assign({ email, password, fullName }, extra || {}),
      }),

    login: (email, password) =>
      request('/api/auth?action=login', {
        method: 'POST',
        body: { email, password },
      }),

    logout: () => request('/api/auth?action=logout', { method: 'POST' }),

    me: () => request('/api/auth?action=me'),

    /**
     * Check if user is logged in.
     * Returns user object or null.
     */
    async check() {
      try {
        const data = await this.me();
        return data.user;
      } catch {
        return null;
      }
    },

    /**
     * Redirect to login if not authenticated.
     * Returns user object if authenticated.
     */
    async require(redirectTo = '/login.html') {
      const user = await this.check();
      if (!user) {
        window.location.href = redirectTo;
        return null;
      }
      return user;
    },

    /**
     * Redirect to dashboard if not admin.
     */
    async requireAdmin(redirectTo = '/dashboard.html') {
      const user = await this.check();
      if (!user) {
        window.location.href = '/login.html';
        return null;
      }
      if (user.role !== 'admin') {
        window.location.href = redirectTo;
        return null;
      }
      return user;
    },
  };

  // --- WALLETS ---
  const wallets = {
    listActive: () => request('/api/wallets'),
  };

  // --- DEPOSITS ---
  const deposits = {
    list: () => request('/api/deposits'),
    create: (data) =>
      request('/api/deposits', { method: 'POST', body: data }),
  };

  // --- WITHDRAWALS ---
  const withdrawals = {
    list: () => request('/api/withdrawals'),
    create: (data) =>
      request('/api/withdrawals', { method: 'POST', body: data }),
  };

  // --- PORTFOLIO ---
  const portfolio = {
    get: () => request('/api/portfolio'),
  };

  // --- BUY ---
  const buy = {
    submit: (data) => request('/api/buy', { method: 'POST', body: data }),
  };

  // --- KYC ---
  const kyc = {
    get: () => request('/api/kyc'),
    submit: (data) => request('/api/kyc', { method: 'POST', body: data }),
  };

  // --- NOTIFICATIONS ---
  const notifications = {
    list: () => request('/api/notifications'),
    markRead: (id) =>
      request('/api/notifications', { method: 'POST', body: { id } }),
    markAllRead: () =>
      request('/api/notifications', { method: 'POST', body: { all: true } }),
  };

  // --- ADMIN ---
  const admin = {
    listUsers: (filters = {}) => {
      const qs = new URLSearchParams(filters).toString();
      return request(`/api/admin?resource=users${qs ? '&' + qs : ''}`);
    },
    getUser: (id) => request(`/api/admin?resource=user&id=${encodeURIComponent(id)}`),
    updateUser: (id, updates) =>
      request('/api/admin?resource=user', { method: 'PUT', body: { id, ...updates } }),

    listDeposits: (status) =>
      request(`/api/admin?resource=deposits${status ? '&status=' + status : ''}`),
    reviewDeposit: (id, action, note) =>
      request('/api/admin?resource=deposits', {
        method: 'POST',
        body: { id, action, note },
      }),

    listWithdrawals: (status) =>
      request(`/api/admin?resource=withdrawals${status ? '&status=' + status : ''}`),
    reviewWithdrawal: (id, action, note, txHash) =>
      request('/api/admin?resource=withdrawals', {
        method: 'POST',
        body: { id, action, note, txHash },
      }),

    listKyc: (status) =>
      request(`/api/admin?resource=kyc${status ? '&status=' + status : ''}`),
    reviewKyc: (id, action, note) =>
      request('/api/admin?resource=kyc', {
        method: 'POST',
        body: { id, action, note },
      }),

    adjustBalance: (userId, amount, reason, type) =>
      request('/api/admin?resource=balance', {
        method: 'POST',
        body: { userId, amount, reason, type },
      }),

    listWallets: () => request('/api/admin?resource=wallets'),
    createWallet: (data) =>
      request('/api/admin?resource=wallets', { method: 'POST', body: data }),
    updateWallet: (id, updates) =>
      request('/api/admin?resource=wallets', {
        method: 'PUT',
        body: { id, ...updates },
      }),
    deleteWallet: (id) =>
      request(`/api/admin?resource=wallets&id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      }),
  };

  // --- UPLOAD (Cloudinary) ---
  const upload = {
    getConfig: () => request('/api/upload?action=config'),
    getSignature: (purpose) =>
      request('/api/upload?action=sign', { method: 'POST', body: { purpose } }),

    /**
     * Upload a file directly to Cloudinary (signed).
     * purpose: 'kyc' | 'deposit_proof' | 'wallet_qr' | 'general'
     * Returns { secure_url, public_id, ... }
     */
    async file(file, purpose = 'general', onProgress) {
      const sig = await this.getSignature(purpose);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('api_key', sig.apiKey);
      formData.append('timestamp', sig.timestamp);
      formData.append('signature', sig.signature);
      formData.append('folder', sig.folder);
      if (sig.uploadPreset) formData.append('upload_preset', sig.uploadPreset);

      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open(
          'POST',
          `https://api.cloudinary.com/v1_1/${sig.cloudName}/auto/upload`
        );

        if (onProgress) {
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              onProgress(Math.round((e.loaded / e.total) * 100));
            }
          };
        }

        xhr.onload = () => {
          try {
            const result = JSON.parse(xhr.responseText);
            if (xhr.status >= 200 && xhr.status < 300) resolve(result);
            else reject(new Error(result.error?.message || 'Upload failed'));
          } catch (e) {
            reject(new Error('Invalid response from Cloudinary'));
          }
        };

        xhr.onerror = () => {
          console.error('[Cloudinary upload failed]', {
            status: xhr.status,
            response: xhr.responseText,
            url: xhr.responseURL
          });
          reject(new Error('Upload network error (status: ' + xhr.status + ') — check Cloudinary settings'));
        };
        xhr.onloadend = () => {
          if (xhr.status >= 400) {
            console.error('[Cloudinary rejected]', xhr.status, xhr.responseText);
          }
        };
        xhr.send(formData);
      });
    },
  };

  // --- HELPERS ---
  const helpers = {
    money(value) {
      const n = Number(value || 0);
      return n.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
      });
    },
    formatDate(d) {
      if (!d) return '—';
      return new Date(d).toLocaleString();
    },
  };

  // --- PUBLIC API ---
  return {
    request,
    auth,
    wallets,
    deposits,
    withdrawals,
    portfolio,
    buy,
    kyc,
    notifications,
    admin,
    upload,
    helpers,
  };
})();

// Expose globally
window.ApexAPI = ApexAPI;


// ─────────────────────────────────────────────────────────────
// ADMIN USER DETAIL METHODS — added for admin-user.html page
// ─────────────────────────────────────────────────────────────
(function() {
  if (!window.ApexAPI) window.ApexAPI = {};
  if (!window.ApexAPI.admin) window.ApexAPI.admin = {};

  async function adminFetch(url, options = {}) {
    const res = await fetch(url, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.error) {
      return { success: false, error: data.error || ('Request failed (' + res.status + ')') };
    }
    return { success: true, ...data };
  }

  // GET full user detail
  window.ApexAPI.admin.getUser = async function(id) {
    const res = await adminFetch('/api/admin?resource=user&id=' + encodeURIComponent(id));
    if (!res.success) return res;
    if (res.user) {
      res.user._id     = res.user._id     || res.user.id;
      res.user.balance = (res.user.balance !== undefined) ? res.user.balance : (res.user.balanceUSD || 0);
      res.user.status  = res.user.status  || res.user.accountStatus;
    }
    return res;
  };

  // PUT update user
  window.ApexAPI.admin.updateUser = async function(id, data) {
    const payload = { id };
    // Pass through everything the API accepts (camelCase + legacy mappings)
    if (data.fullName !== undefined)      payload.fullName = data.fullName;
    if (data.email !== undefined)         payload.email = data.email;
    if (data.accountStatus !== undefined) payload.accountStatus = data.accountStatus;
    if (data.status !== undefined && data.accountStatus === undefined) payload.accountStatus = data.status;
    if (data.role !== undefined)          payload.role = data.role;
    if (data.kycStatus !== undefined)     payload.kycStatus = data.kycStatus;
    if (data.emailVerified !== undefined) payload.emailVerified = data.emailVerified;
    if (data.avatarUrl !== undefined)     payload.avatarUrl = data.avatarUrl;
    ['phone','addressLine1','addressLine2','city','state','zip','country','citizenship','dob','idNumber','idType','occupation','employer'].forEach(k => {
      if (data[k] !== undefined) payload[k] = data[k];
    });

    const userRes = await adminFetch('/api/admin?resource=user', {
      method: 'PUT',
      body: JSON.stringify(payload)
    });

    // Normalize the response shape — API returns { ok, user } — caller may check .success
    if (userRes && userRes.ok && userRes.success === undefined) userRes.success = true;

    // NOTE: balance changes go through ApexAPI.admin.adjustBalance() directly.
    // updateUser() never writes balance — prevents accidental $0 emails.
    return userRes;
  };

  // DELETE user
  window.ApexAPI.admin.deleteUser = async function(id) {
    return adminFetch('/api/admin?resource=user&id=' + encodeURIComponent(id), {
      method: 'DELETE'
    });
  };

  


// Companies (IPO catalog) admin CRUD
window.ApexAPI.admin.listCompanies = async function() {
  return adminFetch('/api/admin?resource=companies');
};
window.ApexAPI.admin.getCompany = async function(ticker) {
  return adminFetch('/api/admin?resource=companies&ticker=' + encodeURIComponent(ticker));
};
window.ApexAPI.admin.createCompany = async function(data) {
  return adminFetch('/api/admin?resource=companies', { method: 'POST', body: JSON.stringify(data) });
};
window.ApexAPI.admin.updateCompany = async function(id, data) {
  return adminFetch('/api/admin?resource=companies', { method: 'PUT', body: JSON.stringify({ id, ...data }) });
};
window.ApexAPI.admin.deleteCompany = async function(id) {
  return adminFetch('/api/admin?resource=companies&id=' + encodeURIComponent(id), { method: 'DELETE' });
};

// Admin self-profile
window.ApexAPI.admin.getMe = async function() {
  return adminFetch('/api/admin?resource=me');
};
window.ApexAPI.admin.updateMe = async function(data) {
  return adminFetch('/api/admin?resource=me', {
    method: 'PATCH',
    body: JSON.stringify(data || {})
  });
};

// Impersonation
window.ApexAPI.admin.impersonate = async function(userId) {
  return adminFetch('/api/admin?resource=impersonate', {
    method: 'POST',
    body: JSON.stringify({ userId })
  });
};
window.ApexAPI.admin.unimpersonate = async function() {
  return adminFetch('/api/admin?resource=unimpersonate', {
    method: 'POST',
    body: '{}'
  });
};


  // ── Public companies list (cached 60s in-memory) ──
  if (!window.ApexAPI.companies) window.ApexAPI.companies = {};
  window.ApexAPI.companies.list = async function(force) {
    if (!force && window.__apexCompCache && (Date.now() - window.__apexCompTs) < 60000) {
      return { ok: true, companies: window.__apexCompCache, cached: true };
    }
    try {
      const r = await fetch('/api/companies', { credentials: 'omit' });
      const j = await r.json();
      if (j && j.ok && Array.isArray(j.companies)) {
        window.__apexCompCache = j.companies;
        window.__apexCompTs = Date.now();
      }
      return j;
    } catch (e) {
      return { ok: false, error: e.message, companies: window.__apexCompCache || [] };
    }
  };
  window.ApexAPI.companies.get = async function(ticker) {
    const r = await window.ApexAPI.companies.list();
    if (!r.ok) return r;
    const c = (r.companies || []).find(x => String(x.ticker).toUpperCase() === String(ticker).toUpperCase());
    return { ok: !!c, company: c || null };
  };
  window.ApexAPI.companies.invalidate = function() {
    window.__apexCompCache = null;
    window.__apexCompTs = 0;
  };
  window.ApexAPI.admin.listLogs = async function(opts) {
    opts = opts || {};
    const params = new URLSearchParams({ resource: 'logs' });
    if (opts.page) params.set('page', opts.page);
    if (opts.limit) params.set('limit', opts.limit);
    if (opts.action) params.set('action', opts.action);
    if (opts.targetType) params.set('targetType', opts.targetType);
    if (opts.search) params.set('search', opts.search);
    if (opts.from) params.set('from', opts.from);
    if (opts.to) params.set('to', opts.to);
    return adminFetch('/api/admin?' + params.toString());
  };

    window.ApexAPI.admin.previewBroadcast = async function(target) {
    const params = new URLSearchParams({ resource: 'broadcast' });
    if (target?.type) params.set('targetType', target.type);
    if (target?.emails?.length) params.set('emails', target.emails.join(','));
    if (target?.from) params.set('from', target.from);
    if (target?.to) params.set('to', target.to);
    return adminFetch('/api/admin?' + params.toString());
  };
  window.ApexAPI.admin.sendBroadcast = async function(data) {
    return adminFetch('/api/admin?resource=broadcast', {
      method: 'POST',
      body: JSON.stringify(data || {})
    });
  };

    window.ApexAPI.admin.getSettings = async function() {
    return adminFetch('/api/admin?resource=settings');
  };
  window.ApexAPI.admin.updateSettings = async function(data) {
    return adminFetch('/api/admin?resource=settings', {
      method: 'PATCH',
      body: JSON.stringify(data || {})
    });
  };

    window.ApexAPI.admin.listHoldings = async function() {
    return adminFetch('/api/admin?resource=holdings');
  };

    console.log('[apex-api] companies.list / get / invalidate loaded');

  // ── Smart navigation helper (shared back-button logic) ──
  if (!window.ApexAPI.nav) window.ApexAPI.nav = {};
  window.ApexAPI.nav.smartBack = function(fallback) {
    fallback = fallback || '/adminprivate';
    // 1. URL param ?from= takes priority (explicit return path)
    try {
      const params = new URLSearchParams(location.search);
      const from = params.get('from');
      if (from && from.startsWith('/')) {
        location.href = from;
        return;
      }
    } catch(e) {}
    // 2. If we have history AND came from same origin, go back
    if (window.history.length > 1 && document.referrer) {
      try {
        const ref = new URL(document.referrer);
        if (ref.origin === location.origin && ref.pathname !== location.pathname) {
          history.back();
          return;
        }
      } catch(e) {}
    }
    // 3. Fallback
    location.href = fallback;
  };
  // Auto-wire any <a data-smart-back href="..."> link
  window.ApexAPI.nav.wireBackButtons = function() {
    document.querySelectorAll('[data-smart-back]').forEach(el => {
      if (el.__wired) return;
      el.__wired = true;
      el.addEventListener('click', e => {
        e.preventDefault();
        const fallback = el.getAttribute('href') || '/adminprivate';
        window.ApexAPI.nav.smartBack(fallback);
      });
    });
  };
  // Auto-wire on load
  if (document.readyState !== 'loading') {
    setTimeout(() => window.ApexAPI.nav.wireBackButtons(), 0);
  } else {
    document.addEventListener('DOMContentLoaded', () => window.ApexAPI.nav.wireBackButtons());
  }
  console.log('[apex-api] nav.smartBack loaded');

    console.log('[apex-api] admin.getUser / updateUser / deleteUser / impersonate loaded');
})();
