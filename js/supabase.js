// ============================================
// Apex IPO Access — Compatibility Shim
// Routes legacy window.sb / window.apex calls
// to the new MongoDB-backed ApexAPI.
// ============================================

(function bootShim() {
  if (!window.ApexAPI) {
    console.error('[shim] ApexAPI not loaded.');
    return;
  }

  // ---- helper: a chain-builder that resolves on .single() / .then() ----
  function createQueryChain(table, op = 'select') {
    const state = {
      table,
      op,
      filters: {},
      orderBy: null,
      limitN: null,
      payload: null,
      isSingle: false,
    };

    const chain = {
      select(fields = '*') { state.op = 'select'; state.fields = fields; return chain; },
      insert(payload) { state.op = 'insert'; state.payload = payload; return chain; },
      update(payload) { state.op = 'update'; state.payload = payload; return chain; },
      delete() { state.op = 'delete'; return chain; },
      eq(field, value) { state.filters[field] = { op: 'eq', value }; return chain; },
      in(field, values) { state.filters[field] = { op: 'in', value: values }; return chain; },
      is(field, value) { state.filters[field] = { op: 'is', value }; return chain; },
      order(field, opts = {}) { state.orderBy = { field, ...opts }; return chain; },
      limit(n) { state.limitN = n; return chain; },
      single() {
        state.isSingle = true;
        return executeQuery(state);
      },
      maybeSingle() {
        state.isSingle = true;
        return executeQuery(state);
      },
      then(resolve, reject) {
        return executeQuery(state).then(resolve, reject);
      },
    };

    return chain;
  }

  async function executeQuery(state) {
    try {
      const { table, op, filters, isSingle } = state;
      const user = await ApexAPI.auth.check();

      // -------- PROFILES --------
      if (table === 'profiles') {
        if (op === 'select') {
          // Used everywhere: sb.from('profiles').select('*').eq('id', userId).single()
          if (filters.id && user) {
            const data = {
              id: user.id,
              email: user.email,
              full_name: user.fullName,
              role: user.role,
              is_admin: user.role === 'admin',
              account_status: user.accountStatus || 'pending',
              kyc_status: user.kycStatus || 'not_submitted',
              banned: user.status === 'disabled',
              banned_reason: user.bannedReason || '',
              email_verified_at: user.emailVerified ? new Date().toISOString() : null,
              cash_balance: user.balanceUSD || 0,
              phone: user.phone || '',
              country: user.country || '',
            };
            return { data: isSingle ? data : [data], error: null };
          }
          return { data: isSingle ? null : [], error: null };
        }

        if (op === 'update') {
          // Profile update — limited support for now
          console.warn('[shim] profiles.update not fully implemented yet');
          return { data: null, error: null };
        }
      }

      // -------- DEPOSITS --------
      if (table === 'deposits') {
        if (op === 'select') {
          try {
            const res = await ApexAPI.deposits.list();
            const mapped = (res.deposits || []).map(d => ({
              id: d._id,
              user_id: d.userId,
              method: d.method,
              asset: d.asset,
              amount: d.amountUSD,
              amount_usd: d.amountUSD,
              status: d.status,
              tx_hash: d.txHash,
              proof_url: d.proofUrl,
              created_at: d.createdAt,
            }));
            return { data: isSingle ? mapped[0] || null : mapped, error: null };
          } catch (err) {
            return { data: null, error: { message: err.message } };
          }
        }
      }

      // -------- WITHDRAWALS --------
      if (table === 'withdrawals') {
        if (op === 'select') {
          try {
            const res = await ApexAPI.withdrawals.list();
            const mapped = (res.withdrawals || []).map(w => ({
              id: w._id,
              user_id: w.userId,
              method: w.method,
              asset: w.asset,
              amount: w.amountUSD,
              amount_usd: w.amountUSD,
              status: w.status,
              destination_address: w.destinationAddress,
              created_at: w.createdAt,
            }));
            return { data: isSingle ? mapped[0] || null : mapped, error: null };
          } catch (err) {
            return { data: null, error: { message: err.message } };
          }
        }
      }

      // -------- NOTIFICATIONS --------
      if (table === 'notifications') {
        if (op === 'select') {
          try {
            const res = await ApexAPI.notifications.list();
            const mapped = (res.notifications || []).map(n => ({
              id: n._id,
              user_id: n.userId,
              title: n.title,
              message: n.message,
              type: n.type,
              link: n.link,
              read_at: n.read ? n.readAt : null,
              is_broadcast: false,
              created_at: n.createdAt,
            }));
            return { data: isSingle ? mapped[0] || null : mapped, error: null };
          } catch (err) {
            return { data: null, error: { message: err.message } };
          }
        }
        if (op === 'update') {
          try {
            await ApexAPI.notifications.markAllRead();
            return { data: null, error: null };
          } catch (err) {
            return { data: null, error: { message: err.message } };
          }
        }
      }

      // -------- HOLDINGS / ALLOCATIONS --------
      if (table === 'holdings' || table === 'allocations') {
        try {
          const res = await ApexAPI.portfolio.get();
          const mapped = (res.portfolio?.holdings || []).map(h => ({
            id: h.id,
            symbol: h.symbol,
            company_name: h.companyName,
            shares: h.shares,
            quantity: h.shares,
            avg_price: h.avgPriceUSD,
            avg_price_usd: h.avgPriceUSD,
            current_price: h.currentPriceUSD,
            total_invested: h.totalInvestedUSD,
            current_value: h.currentValueUSD,
            pnl: h.pnlUSD,
            outcome: 'active',
          }));
          return { data: isSingle ? mapped[0] || null : mapped, error: null };
        } catch (err) {
          return { data: null, error: { message: err.message } };
        }
      }

      // -------- CRYPTO WALLETS --------
      if (table === 'crypto_wallets') {
        try {
          const res = await ApexAPI.wallets.listActive();
          const mapped = (res.wallets || []).map(w => ({
            id: w.id,
            label: w.label,
            network: w.network,
            asset: w.asset,
            address: w.address,
            memo: w.memo,
            qr_code_url: w.qrUrl,
            active: true,
          }));
          return { data: isSingle ? mapped[0] || null : mapped, error: null };
        } catch (err) {
          return { data: null, error: { message: err.message } };
        }
      }

      // -------- PLATFORM SETTINGS (stub) --------
      if (table === 'platform_settings') {
        return {
          data: isSingle
            ? { signup_enabled: true, maintenance_mode: false }
            : [{ signup_enabled: true, maintenance_mode: false }],
          error: null,
        };
      }

      // -------- DEFAULT: stub --------
      console.warn(`[shim] Unhandled table "${table}" (op=${op})`);
      return { data: isSingle ? null : [], error: null };
    } catch (err) {
      return { data: null, error: { message: err.message } };
    }
  }

  // ---- MOCK sb OBJECT ----
  window.sb = {
    auth: {
      async signInWithPassword({ email, password }) {
        try {
          const res = await ApexAPI.auth.login(email, password);
          return {
            data: { user: { id: res.user.id, email: res.user.email }, session: { user: res.user } },
            error: null,
          };
        } catch (err) {
          return { data: null, error: { message: err.message } };
        }
      },
      async signUp({ email, password }) {
        try {
          const res = await ApexAPI.auth.register(email, password, '');
          return {
            data: { user: { id: res.user.id, email: res.user.email }, session: { user: res.user } },
            error: null,
          };
        } catch (err) {
          return { data: null, error: { message: err.message } };
        }
      },
      async signOut() {
        try { await ApexAPI.auth.logout(); return { error: null }; }
        catch (err) { return { error: { message: err.message } }; }
      },
      async getUser() {
        const user = await ApexAPI.auth.check();
        return { data: { user: user ? { id: user.id, email: user.email } : null } };
      },
      async getSession() {
        const user = await ApexAPI.auth.check();
        return { data: { session: user ? { user } : null } };
      },
      async updateUser() {
        return { data: null, error: { message: 'Password change not implemented yet.' } };
      },
    },

    from(table) {
      return createQueryChain(table);
    },

    storage: {
      from() {
        return {
          upload: () => Promise.resolve({ data: null, error: { message: 'Use ApexAPI.upload.file()' } }),
          getPublicUrl: () => ({ data: { publicUrl: '' } }),
          createSignedUrl: () => Promise.resolve({ data: null, error: { message: 'Not implemented' } }),
        };
      },
    },
  };

  window.__sbReady = true;
  document.dispatchEvent(new Event('sb-ready'));

  // ---- window.apex helpers ----
  window.apex = {
    saveStep(stepName, data) {
      const all = JSON.parse(localStorage.getItem('apex_signup') || '{}');
      all[stepName] = data;
      localStorage.setItem('apex_signup', JSON.stringify(all));
    },
    getSignupData() { return JSON.parse(localStorage.getItem('apex_signup') || '{}'); },
    clearSignup() { localStorage.removeItem('apex_signup'); },

    async completeSignup(email, password) {
      try {
        const data = this.getSignupData();
        const fullName = [data.contact?.firstName, data.contact?.lastName].filter(Boolean).join(' ').trim();
        const res = await ApexAPI.auth.register(email, password, fullName);
        localStorage.setItem('apex_signup_extra', JSON.stringify(data));
        return { user: res.user };
      } catch (err) {
        return { error: { message: err.message } };
      }
    },
    async login(email, password) {
      try { const res = await ApexAPI.auth.login(email, password); return { data: { user: res.user }, error: null }; }
      catch (err) { return { data: null, error: { message: err.message } }; }
    },
    async logout() {
      try { await ApexAPI.auth.logout(); return { error: null }; }
      catch (err) { return { error: { message: err.message } }; }
    },
    async getUser() { return await ApexAPI.auth.check(); },
    async getProfile() { return await ApexAPI.auth.check(); },
    async getActivity() {
      try { const data = await ApexAPI.notifications.list(); return data.notifications || []; }
      catch { return []; }
    },
    requireAuth(redirectTo = 'login.html') {
      ApexAPI.auth.check().then(user => { if (!user) window.location.href = redirectTo; });
    },
    requireGuest(redirectTo = 'dashboard.html') {
      ApexAPI.auth.check().then(user => { if (user) window.location.href = redirectTo; });
    },
    async checkMaintenance() {
      return { maintenance_mode: false, signup_enabled: true };
    },
  };

  console.log('✓ Apex shim ready (MongoDB backend)');
})();
