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
    register: (email, password, fullName) =>
      request('/api/auth?action=register', {
        method: 'POST',
        body: { email, password, fullName },
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

        xhr.onerror = () => reject(new Error('Upload network error'));
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
