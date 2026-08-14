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
      from(bucket) {
        return {
          upload: async function(path, file) {
            try {
              const b = String(bucket || '').toLowerCase();
              const purpose = b.includes('kyc') ? 'kyc'
                            : b.includes('deposit') || b.includes('receipt') || b.includes('proof') ? 'deposit_proof'
                            : b.includes('wallet') || b.includes('qr') ? 'wallet_qr'
                            : 'general';
              const result = await window.ApexAPI.upload.file(file, purpose);
              const url = result.secure_url || result.url || '';
              if (!url) return { data: null, error: { message: 'Upload returned no URL' } };
              window.sb.storage._lastUrls = window.sb.storage._lastUrls || {};
              window.sb.storage._lastUrls[bucket + ':' + path] = url;
              return { data: { path: path, fullPath: result.public_id || path, url: url }, error: null };
            } catch (e) {
              return { data: null, error: { message: e.message || 'Upload failed' } };
            }
          },
          getPublicUrl: function(path) {
            const url = (window.sb.storage._lastUrls || {})[bucket + ':' + path] || '';
            return { data: { publicUrl: url } };
          },
          createSignedUrl: async function(path, ttl) {
            const url = (window.sb.storage._lastUrls || {})[bucket + ':' + path] || '';
            return { data: { signedUrl: url }, error: url ? null : { message: 'No upload found' } };
          }
        };
      }
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
        const data = this.getSignupData() || {};
        const c = data.contact || {};
        const a = data.address || {};
        const ident = data.identity || {};
        const acct = data.account || {};
        const phoneType = data.phone || {};

        const fullName = [c.firstName, c.middleName, c.lastName].filter(Boolean).join(' ').trim()
                      || [data.firstName, data.lastName].filter(Boolean).join(' ').trim()
                      || (email || '').split('@')[0];

        const extra = {
          phone: c.phone || phoneType.phone || data.phone || '',
          addressLine1: a.addr1 || a.line1 || a.address1 || a.street || a.address || '',
          addressLine2: a.addr2 || a.line2 || a.address2 || '',
          city: a.city || '',
          state: a.state || a.region || '',
          zip: a.zip || a.postalCode || a.postal || '',
          country: a.country || data.country || '',
          citizenship: a.citizenship || data.citizenship || ident.citizenship || '',
          dob: ident.dob || data.dob || null,
          ssn: ident.ssn || data.ssn || '',
          idNumber: ident.idNumber || ident.ssn || ident.passport || data.idNumber || '',
          idType: ident.idType || (ident.ssn ? 'ssn' : (ident.passport ? 'passport' : '')),
          occupation: acct.occupation || data.occupation || '',
          employer: acct.employer || data.employer || '',
          accountTypes: Array.isArray(acct.types) ? acct.types
                       : Array.isArray(data.accountTypes) ? data.accountTypes
                       : (acct.type ? [acct.type] : []),
        };

        const res = await ApexAPI.auth.register(email, password, fullName, extra);
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
  async getActivity(limit) {
    limit = limit || 10;
    try {
      // Pull from notifications (the canonical activity feed)
      // Falls back to deposits/withdrawals if notifications endpoint empty
      const [notifRes, depRes, wdRes] = await Promise.all([
        fetch('/api/notifications', { credentials:'include' }).then(r => r.ok ? r.json() : { notifications: [] }).catch(() => ({ notifications: [] })),
        fetch('/api/deposits', { credentials:'include' }).then(r => r.ok ? r.json() : { deposits: [] }).catch(() => ({ deposits: [] })),
        fetch('/api/withdrawals', { credentials:'include' }).then(r => r.ok ? r.json() : { withdrawals: [] }).catch(() => ({ withdrawals: [] }))
      ]);

      const items = [];
      const fmt = n => Number(n||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});

      // Notifications first (covers deposit approval, share buys, balance adjusts, KYC, broadcasts, etc.)
      (notifRes.notifications || []).forEach(n => {
        const created = n.createdAt || n.created_at;
        const t = (n.type || '').toLowerCase();
        const title = (n.title || '').toLowerCase();
        // Map type → color for activity row
        let color = 'blue';
        if (t === 'deposit' || /credit|deposit|approved|purchase|bought/i.test(title)) color = 'green';
        else if (t === 'withdrawal' || /debit|withdraw|sent/i.test(title)) color = 'blue';
        else if (/reject|fail|error|denied/i.test(title) || t === 'error') color = 'red';
        else if (/pending|review|warn/i.test(title) || t === 'warning') color = 'amber';

        items.push({
          title: n.title || 'Notification',
          description: n.message || n.body || '',
          icon_color: color,
          createdAt: created,
          _t: new Date(created).getTime() || 0
        });
      });

      // Add deposits/withdrawals that may not have notifications yet (edge case)
      const knownTitles = new Set(items.map(i => (i.title || '').toLowerCase()));
      (depRes.deposits || []).forEach(d => {
        const created = d.createdAt || d.created_at;
        const amt = d.amountUSD || d.amount || 0;
        const status = (d.status || 'pending').toLowerCase();
        let title = 'Deposit submitted', color = 'blue';
        let desc = 'Your deposit of $' + fmt(amt) + ' is being processed.';
        if (status === 'approved' || status === 'completed' || status === 'credited') {
          title = 'Deposit approved'; color = 'green';
          desc  = 'Your deposit of $' + fmt(amt) + ' has been credited.';
        } else if (status === 'rejected' || status === 'cancelled' || status === 'denied') {
          title = 'Deposit rejected'; color = 'red';
          desc  = 'Your deposit of $' + fmt(amt) + ' was rejected.';
        }
        // Avoid duplicate if notification already exists for this
        const key = title.toLowerCase() + '|' + new Date(created).toDateString();
        if (!items.some(i => (i.title||'').toLowerCase() + '|' + new Date(i.createdAt).toDateString() === key)) {
          items.push({ title, description: desc, icon_color: color, createdAt: created, _t: new Date(created).getTime() || 0 });
        }
      });

      (wdRes.withdrawals || []).forEach(w => {
        const created = w.createdAt || w.created_at;
        const amt = w.amountUSD || w.amount || 0;
        const status = (w.status || 'pending').toLowerCase();
        let title = 'Withdrawal requested', color = 'blue';
        let desc = 'Your withdrawal of $' + fmt(amt) + ' is being processed.';
        if (status === 'approved' || status === 'completed' || status === 'paid') {
          title = 'Withdrawal completed'; color = 'green';
          desc  = 'Your withdrawal of $' + fmt(amt) + ' was sent.';
        } else if (status === 'rejected' || status === 'cancelled' || status === 'denied') {
          title = 'Withdrawal rejected'; color = 'red';
          desc  = 'Your withdrawal of $' + fmt(amt) + ' was rejected.';
        }
        const key = title.toLowerCase() + '|' + new Date(created).toDateString();
        if (!items.some(i => (i.title||'').toLowerCase() + '|' + new Date(i.createdAt).toDateString() === key)) {
          items.push({ title, description: desc, icon_color: color, createdAt: created, _t: new Date(created).getTime() || 0 });
        }
      });

      // Sort newest first, return top N
      items.sort((a, b) => b._t - a._t);
      return items.slice(0, limit);
    } catch (e) {
      console.warn('[getActivity] failed', e);
      return [];
    }
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

// ═══════════════════════════════════════════════════════════════
// EXTENDED SHIM — dashboard.html compatibility patches
// Adds: window.apex.getProfile, sb.from('allocations'),
//       sb.rpc('get_user_finances'), sb.from('notifications')
// ═══════════════════════════════════════════════════════════════
(function dashboardShim() {
  if (!window.ApexAPI) return;
  window.apex = window.apex || {};

  // ─── window.apex.getProfile() ───────────────────────────────
if (!window.apex.getProfile) {
    window.apex.getProfile = async function() {
      try {
        const r = await fetch('/api/auth?action=me', { credentials: 'include' });
        if (!r.ok) return null;
        const j = await r.json();
        const u = j && j.user ? j.user : j;
        if (!u) return null;
        const fn = (u.fullName || u.full_name || '').trim();
        const parts = fn ? fn.split(/\s+/) : [];
        const first = u.first_name || parts[0] || (u.email || '').split('@')[0] || '';
        const last  = u.last_name  || parts.slice(1).join(' ') || '';
        return {
          id: u.id || u._id,
          email: u.email,
          first_name: first,
          last_name: last,
          full_name: fn || [first, last].filter(Boolean).join(' '),
          fullName: u.fullName || fn,
          avatar_url: u.avatarUrl || u.avatar_url || '',
          avatarUrl:  u.avatarUrl || u.avatar_url || '',
          phone: u.phone || '',
          country: u.country || '',
          citizenship: u.citizenship || '',
          address_line1: u.addressLine1 || u.address_line1 || '',
          addressLine1:  u.addressLine1 || u.address_line1 || '',
          address_line2: u.addressLine2 || u.address_line2 || '',
          addressLine2:  u.addressLine2 || u.address_line2 || '',
          city: u.city || '',
          state: u.state || '',
          zip: u.zip || '',
          dob: u.dob || null,
          id_number: u.idNumber || u.id_number || '',
          idNumber:  u.idNumber || u.id_number || '',
          id_type: u.idType || u.id_type || '',
          idType:  u.idType || u.id_type || '',
          occupation: u.occupation || '',
          employer: u.employer || '',
          is_admin: u.role === 'admin',
          role: u.role || 'user',
          status: u.status,
          account_status: u.accountStatus || 'pending',
          accountStatus:  u.accountStatus || 'pending',
          kyc_status: u.kycStatus || 'not_submitted',
          kycStatus:  u.kycStatus || 'not_submitted',
          cash_balance: u.balanceUSD || u.cash_balance || 0,
          balanceUSD:   u.balanceUSD || u.cash_balance || 0,
          welcome_bonus_claimed: u.welcomeBonusClaimed || false,
          email_verified: !!u.emailVerified,
          emailVerified:  !!u.emailVerified,
          two_factor_enabled: !!u.twoFactorEnabled,
          twoFactorEnabled:   !!u.twoFactorEnabled,
          created_at: u.createdAt || u.created_at,
          createdAt:  u.createdAt || u.created_at,
        };
      } catch (e) {
        console.warn('[shim] getProfile failed', e);
        return null;
      }
    };
  }

  // ─── Extend sb.from() for allocations + notifications ───────
  const originalFrom = window.sb?.from;
  if (window.sb && originalFrom) {
    window.sb.from = function(table) {
      // Pass-through for tables the original shim handles
      if (table === 'profiles' || table === 'deposits' || table === 'withdrawals') {
        return originalFrom.call(window.sb, table);
      }

      // ── allocations table → portfolio holdings ──
      if (table === 'allocations') {
        const state = { filters: {} };
        const chain = {
          select() { return chain; },
          eq(f, v) { state.filters[f] = v; return chain; },
          order() { return chain; },
          limit() { return chain; },
          single() { return execute(true); },
          maybeSingle() { return execute(true); },
          then(res, rej) { return execute(false).then(res, rej); },
        };
        async function execute(isSingle) {
          try {
            const r = await ApexAPI.portfolio.get();
            const holdings = r?.portfolio?.holdings || [];
            const mapped = holdings.map(h => ({
              id: h.id,
              user_id: state.filters.user_id || null,
              symbol: h.symbol,
              company_ticker: h.symbol,
              company_name: h.companyName,
              shares: h.shares,
              avg_price: h.avgPriceUSD,
              price_per_share: h.avgPriceUSD,
              total_value: h.currentValueUSD,
              total_invested: h.totalInvestedUSD,
              current_price: h.currentPriceUSD,
              pnl: h.pnlUSD,
              tier: 3,
              status: 'active',
              matures_at: null,
              created_at: h.lastPurchaseAt,
            }));
            return { data: isSingle ? (mapped[0] || null) : mapped, error: null };
          } catch (e) {
            console.warn('[shim] allocations failed', e);
            return { data: isSingle ? null : [], error: null };
          }
        }
        return chain;
      }

      // ── notifications table ──
      if (table === 'notifications') {
        const state = { filters: {} };
        const chain = {
          select() { return chain; },
          eq(f, v) { state.filters[f] = v; return chain; },
          order() { return chain; },
          limit() { return chain; },
          single() { return execute(true); },
          maybeSingle() { return execute(true); },
          then(res, rej) { return execute(false).then(res, rej); },
        };
        async function execute(isSingle) {
          try {
            const r = await ApexAPI.notifications.list();
            const list = (r?.notifications || []).map(n => ({
              id: n._id,
              user_id: n.userId,
              type: n.type,
              title: n.title,
              message: n.message,
              link: n.link,
              read: n.read,
              is_broadcast: n.isBroadcast || false,
              created_at: n.createdAt,
            }));
            // Filter by is_broadcast if requested
            let filtered = list;
            if (state.filters.is_broadcast === true) {
              filtered = list.filter(n => n.is_broadcast);
            } else if (state.filters.user_id) {
              filtered = list.filter(n => !n.is_broadcast);
            }
            return { data: isSingle ? (filtered[0] || null) : filtered, error: null };
          } catch (e) {
            console.warn('[shim] notifications failed', e);
            return { data: isSingle ? null : [], error: null };
          }
        }
        return chain;
      }

      // Unknown table — return empty chain so dashboard doesn't crash
      console.warn('[shim] Unmapped table:', table);
      const emptyChain = {
        select() { return emptyChain; },
        eq() { return emptyChain; },
        order() { return emptyChain; },
        limit() { return emptyChain; },
        single() { return Promise.resolve({ data: null, error: null }); },
        maybeSingle() { return Promise.resolve({ data: null, error: null }); },
        then(res) { return Promise.resolve({ data: [], error: null }).then(res); },
      };
      return emptyChain;
    };
  }

  // ─── sb.rpc() handler ───────────────────────────────────────
  if (window.sb && !window.sb.rpc) {
    window.sb.rpc = async function(fnName, params = {}) {
      // get_user_finances(p_user_id) → returns [{cash, committed}]
      if (fnName === 'get_user_finances') {
        try {
          const r = await ApexAPI.portfolio.get();
          const p = r?.portfolio || {};
          return {
            data: [{
              cash: p.cashBalanceUSD || 0,
              committed: p.totalCurrentValueUSD || 0,
              total: p.totalEquityUSD || 0,
            }],
            error: null,
          };
        } catch (e) {
          console.warn('[shim] rpc get_user_finances failed', e);
          return { data: [{ cash: 0, committed: 0, total: 0 }], error: null };
        }
      }

      console.warn('[shim] Unmapped rpc:', fnName);
      return { data: null, error: null };
    };
  }

  console.log('[shim] Dashboard compatibility extensions loaded');
})();

// ═══════════════════════════════════════════════════════════════
// FUNDING SHIM — fund-account/crypto/wire/proof/process pages
// Adds: sb.storage (Cloudinary), sb.from('crypto_wallets'),
//       sb.from('wire_settings'), sb.from('deposits').insert()
// ═══════════════════════════════════════════════════════════════
(function fundingShim() {
  if (!window.ApexAPI || !window.sb) return;

  // ─── sb.storage.from(bucket) → Cloudinary signed upload ─────
  if (!window.sb.storage) {
    window.sb.storage = {
      from(bucket) {
        return {
          async upload(filePath, file, options = {}) {
            try {
              // 1. Get signed Cloudinary params from our backend
              const signRes = await fetch('/api/upload?action=sign', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ folder: 'apex-ipo/' + bucket })
              });
              const sign = await signRes.json();
              if (!sign.signature) {
                return { data: null, error: { message: 'Failed to sign upload' } };
              }

              // 2. POST file to Cloudinary
              const cloudName = sign.cloudName || 'dck0lftqb';
              const fd = new FormData();
              fd.append('file', file);
              fd.append('api_key', sign.apiKey);
              fd.append('timestamp', sign.timestamp);
              fd.append('signature', sign.signature);
              fd.append('folder', sign.folder);
              if (sign.uploadPreset) fd.append('upload_preset', sign.uploadPreset);

              const upRes = await fetch(
                'https://api.cloudinary.com/v1_1/' + cloudName + '/auto/upload',
                { method: 'POST', body: fd }
              );
              const upData = await upRes.json();
              if (!upData.secure_url) {
                return { data: null, error: { message: upData.error?.message || 'Upload failed' } };
              }

              // Stash URL on the bucket instance so getPublicUrl can read it
              this._lastUrl = upData.secure_url;
              window.sb.storage._lastUrls = window.sb.storage._lastUrls || {};
              window.sb.storage._lastUrls[bucket + ':' + filePath] = upData.secure_url;

              return {
                data: { path: filePath, fullPath: upData.public_id, url: upData.secure_url },
                error: null
              };
            } catch (e) {
              return { data: null, error: { message: e.message } };
            }
          },
          getPublicUrl(filePath) {
            const key = bucket + ':' + filePath;
            const url = (window.sb.storage._lastUrls || {})[key] || '';
            return { data: { publicUrl: url } };
          }
        };
      }
    };
  }

  // ─── Extend sb.from() with: crypto_wallets, wire_settings, deposits ─
  const prevFrom = window.sb.from;
  window.sb.from = function(table) {
    // ── crypto_wallets → /api/wallets ──
    if (table === 'crypto_wallets') {
      const state = { filters: {} };
      const chain = {
        select() { return chain; },
        eq(f, v) { state.filters[f] = v; return chain; },
        order() { return chain; },
        limit() { return chain; },
        single() { return execute(true); },
        maybeSingle() { return execute(true); },
        then(res, rej) { return execute(false).then(res, rej); }
      };
      async function execute(isSingle) {
        try {
          const r = await fetch('/api/wallets', { credentials: 'include' });
          const j = await r.json();
          let wallets = (j.wallets || []).map(w => ({
            id: w.id,
            label: w.label,
            network: w.network,
            asset: w.asset,
            address: w.address,
            memo: w.memo,
            qr_url: w.qrUrl, qr_code_url: w.qrUrl, coin: w.asset,
            active: true
          }));
          if (state.filters.active !== undefined) {
            wallets = wallets.filter(w => w.active === state.filters.active);
          }
          return { data: isSingle ? (wallets[0] || null) : wallets, error: null };
        } catch (e) {
          return { data: isSingle ? null : [], error: { message: e.message } };
        }
      }
      return chain;
    }

    // ── wire_settings → static defaults (no backend table yet) ──
    if (table === 'wire_settings') {
      const chain = {
        select() { return chain; },
        eq() { return chain; },
        order() { return chain; },
        limit() { return chain; },
        single() {
          return Promise.resolve({
            data: {
              id: 1,
              bank_name: 'JPMorgan Chase Bank, N.A.',
              account_name: 'Apex IPO Access LLC',
              account_number: 'Contact support for wire details',
              routing_number: 'Contact support',
              swift_code: 'CHASUS33',
              bank_address: '270 Park Avenue, New York, NY 10017',
              reference_required: true,
              instructions: 'Please email support@apexipoholdings.com for wire transfer instructions and your unique reference code.',
              min_amount: 20000,
              processing_time: '1–3 business days'
            },
            error: null
          });
        },
        maybeSingle() { return chain.single(); },
        then(res, rej) { return chain.single().then(res, rej); }
      };
      return chain;
    }

    // ── deposits.insert() → /api/deposits POST ──
    if (table === 'deposits') {
      const builder = {
        async insert(payload) {
          try {
            const p = Array.isArray(payload) ? payload[0] : payload;
            const body = {
              method: p.method || 'crypto',
              asset: (p.asset || 'USD').toUpperCase(),
              network: p.network || '',
              amountUSD: Number(p.amount_usd || p.amount || 0),
              amountAsset: Number(p.amount_asset || 0),
              txHash: p.tx_hash || p.txHash || '',
              walletId: p.wallet_id || p.walletId || null,
              proofUrl: p.proof_url || p.proofUrl || ''
            };
            const r = await fetch('/api/deposits', {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body)
            });
            const j = await r.json();
            if (!r.ok) return { data: null, error: { message: j.error || 'Deposit failed' } };
            return { data: j.deposit || j, error: null };
          } catch (e) {
            return { data: null, error: { message: e.message } };
          }
        },
        // Read path: delegate to previous shim handler
        select() { return prevFrom.call(window.sb, 'deposits').select(); },
        eq(f, v) { return prevFrom.call(window.sb, 'deposits').select().eq(f, v); }
      };
      return builder;
    }

    // Fall through to whatever the previous shim handled
    return prevFrom.call(window.sb, table);
  };

  console.log('[shim] Funding extensions loaded (storage, wallets, wire, deposits.insert)');
})();

// ═══════════════════════════════════════════════════════════════
// WITHDRAWAL SHIM — withdraw.html + ach/bank/crypto/process
// Adds: sb.from('withdrawals').insert() + .select().eq().in()
// ═══════════════════════════════════════════════════════════════
(function withdrawalShim() {
  if (!window.ApexAPI || !window.sb) return;

  const prevFrom = window.sb.from;

  window.sb.from = function(table) {
    if (table !== 'withdrawals') return prevFrom.call(window.sb, table);

    const state = { filters: {}, inFilters: {} };
    const builder = {
      // ─── INSERT (POST /api/withdrawals) ────────────────────
      async insert(payload) {
        try {
          const p = Array.isArray(payload) ? payload[0] : payload;

          // Build bankDetails for ach/bank, plus notes parsing
          const bankDetails = {};
          if (p.bank_name)         bankDetails.bankName        = p.bank_name;
          if (p.beneficiary_name)  bankDetails.beneficiaryName = p.beneficiary_name;
          if (p.routing_number)    bankDetails.routingNumber   = p.routing_number;
          if (p.account_number)    bankDetails.accountNumber   = p.account_number;
          if (p.notes)             bankDetails.notes           = p.notes;

          const body = {
            method: p.method || 'crypto',
            asset: (p.asset || 'USD').toUpperCase(),
            amountUSD: Number(p.amount || p.amount_usd || 0),
            destinationAddress: p.destination || p.destination_address || '',
            destinationMemo: p.memo || p.notes || '',
            bankDetails,
            referenceCode: p.reference_code || ''
          };

          const r = await fetch('/api/withdrawals', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
          });
          const j = await r.json();
          if (!r.ok) return { data: null, error: { message: j.error || 'Withdrawal failed' } };
          return { data: j.withdrawal || j, error: null };
        } catch (e) {
          return { data: null, error: { message: e.message } };
        }
      },

      // ─── SELECT chain (GET /api/withdrawals) ───────────────
      select() { return builder; },
      eq(f, v) { state.filters[f] = v; return builder; },
      in(f, vals) { state.inFilters[f] = vals; return builder; },
      order() { return builder; },
      limit() { return builder; },
      single() { return execute(true); },
      maybeSingle() { return execute(true); },
      then(res, rej) { return execute(false).then(res, rej); }
    };

    async function execute(isSingle) {
      try {
        const r = await fetch('/api/withdrawals', { credentials: 'include' });
        const j = await r.json();
        let list = (j.withdrawals || []).map(w => ({
          id: w._id,
          user_id: w.userId,
          method: w.method,
          asset: w.asset,
          amount: w.amountUSD,
          amount_usd: w.amountUSD,
          destination: w.destinationAddress,
          destination_address: w.destinationAddress,
          memo: w.destinationMemo,
          status: w.status,
          reference_code: w.referenceCode,
          bank_name: w.bankDetails?.bankName,
          beneficiary_name: w.bankDetails?.beneficiaryName,
          notes: w.bankDetails?.notes,
          created_at: w.createdAt
        }));

        // Apply .in() filters
        for (const [field, vals] of Object.entries(state.inFilters)) {
          list = list.filter(w => vals.includes(w[field]));
        }
        return { data: isSingle ? (list[0] || null) : list, error: null };
      } catch (e) {
        return { data: isSingle ? null : [], error: { message: e.message } };
      }
    }

    return builder;
  };

  console.log('[shim] Withdrawal extensions loaded');
})();

// ═══════════════════════════════════════════════════════════════
// KYC SHIM — kyc.html compatibility
// Adds: sb.storage.createSignedUrl (returns Cloudinary URL),
//       sb.from('profiles').update() intercept for KYC fields
// ═══════════════════════════════════════════════════════════════
(function kycShim() {
  if (!window.ApexAPI || !window.sb || !window.sb.storage) return;

  // ─── Patch sb.storage.from() to add createSignedUrl ─────────
  const originalStorageFrom = window.sb.storage.from.bind(window.sb.storage);
  window.sb.storage.from = function(bucket) {
    const inst = originalStorageFrom(bucket);

    // Cloudinary URLs are already public — return the stored URL as "signed"
    inst.createSignedUrl = async function(filePath, ttlSeconds) {
      const key = bucket + ':' + filePath;
      const url = (window.sb.storage._lastUrls || {})[key] || '';
      return { data: { signedUrl: url }, error: url ? null : { message: 'No upload found for ' + filePath } };
    };

    return inst;
  };

  // ─── Intercept profiles.update() for KYC submission ─────────
  const prevFrom = window.sb.from;
  window.sb.from = function(table) {
    if (table !== 'profiles') return prevFrom.call(window.sb, table);

    const base = prevFrom.call(window.sb, 'profiles');
    const state = { filters: {} };

    return {
      select: base.select ? base.select.bind(base) : (() => base),
      eq(f, v) {
        state.filters[f] = v;
        if (base.eq) return base.eq(f, v);
        return this;
      },
      single() { return base.single ? base.single() : Promise.resolve({ data: null, error: null }); },
      then(res, rej) { return (base.then ? base.then(res, rej) : Promise.resolve({ data: null, error: null }).then(res, rej)); },

      // ⬇ THE KEY INTERCEPT: route KYC updates to /api/kyc POST
      async update(payload) {
        try {
          // Detect if this update contains KYC fields
          const isKyc = payload.kyc_status || payload.kyc_id_front_url || payload.kyc_selfie_url || payload.kyc_submitted_at;

          if (isKyc) {
            // First check current status — backend rejects re-submission while pending
            try {
              const chk = await fetch('/api/kyc', { credentials: 'include' });
              const chkJ = await chk.json();
              if (chkJ.kycStatus === 'pending') {
                return { data: null, error: { message: 'KYC submission is already being processed' } };
              }
              if (chkJ.kycStatus === 'approved') {
                return { data: null, error: { message: 'KYC already approved' } };
              }
            } catch (_) { /* ignore — let backend re-check */ }

            // Get profile for fullName/country defaults
            const me = await ApexAPI.auth.check();
            const u = me?.user || me || {};

            const body = {
              documentType: 'national_id', // sensible default; can be enhanced with a selector
              fullName: u.fullName || u.name || (u.email || '').split('@')[0] || 'User',
              country: u.country || 'US',
              frontImageUrl: payload.kyc_id_front_url || '',
              backImageUrl: payload.kyc_id_back_url || '',
              selfieUrl: payload.kyc_selfie_url || ''
            };

            if (!body.frontImageUrl && !body.selfieUrl) {
              return { data: null, error: { message: 'Front ID and selfie required' } };
            }

            const r = await fetch('/api/kyc', {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body)
            });
            const j = await r.json();
            if (!r.ok) return { data: null, error: { message: j.error || 'KYC submission failed' } };
            return { data: j.document || j, error: null };
          }

          // Non-KYC profile updates — pass through (currently unsupported by shim)
          console.warn('[shim] profiles.update non-KYC not implemented:', Object.keys(payload));
          return { data: null, error: null };
        } catch (e) {
          return { data: null, error: { message: e.message } };
        }
      }
    };
  };

  console.log('[shim] KYC extensions loaded (createSignedUrl + profiles.update intercept)');
})();

// ═══════════════════════════════════════════════════════════════
// BUY FLOW EXTENSIONS (Task 7) — companies, allocations, activity_log
// Routes all buy-related sb.* calls through ApexAPI.buy / portfolio
// ═══════════════════════════════════════════════════════════════
(function(){
  if (!window.sb || !window.ApexAPI) {
    document.addEventListener('sb-ready', arguments.callee, { once:true });
    return;
  }

  const _origFrom = window.sb.from.bind(window.sb);

  window.sb.from = function(table){
    // ── companies table → live MongoDB via /api/companies (cached 60s) ──
      if (table === 'companies') {
        // Map Mongo field names → legacy snake_case used by user pages
        const mapDoc = (c) => c ? {
          ticker: c.ticker,
          name: c.name,
          sector: c.sector,
          stage: c.stage,
          status: c.status,
          valuation: c.valuation,
          price_per_share: Number(c.pricePerShare) || 0,
          min_investment: Number(c.minInvestment) || 0,
          max_investment: Number(c.maxInvestment) || 0,
          available_shares: Number(c.availableShares) || 0,
          reserved_shares: Number(c.reservedShares) || 0,
          success_rate: Number(c.successRate) || 0,
          expected_return: c.expectedReturn || '',
          growth_yoy: c.growthYoy || '',
          ipo_window: c.ipoWindow || '',
          founded_year: c.foundedYear,
          hq: c.hq || '',
          domain: c.domain || '',
          description: c.description || '',
          logo_url: c.logoUrl || '',
          sort_order: Number(c.sortOrder) || 0
        } : null;

        const fetchAll = async () => {
          if (window.ApexAPI && window.ApexAPI.companies && window.ApexAPI.companies.list) {
            const r = await window.ApexAPI.companies.list();
            return (r && r.companies) ? r.companies.map(mapDoc) : [];
          }
          try {
            const r = await fetch('/api/companies');
            const j = await r.json();
            return (j && j.companies) ? j.companies.map(mapDoc) : [];
          } catch (e) { return []; }
        };

        const chain = {
          _col: null, _val: null, _cols: null,
          select(cols){ this._cols = cols; return this; },
          eq(col, val){ this._col = col; this._val = val; return this; },
          single: async function(){
            const all = await fetchAll();
            if (this._col && this._val) {
              const found = all.find(c => String(c[this._col]).toUpperCase() === String(this._val).toUpperCase());
              return found
                ? { data: found, error: null }
                : { data: null, error: { message: 'not found' } };
            }
            return { data: all[0] || null, error: null };
          },
          then: function(resolve, reject){
            if (this._col && this._val) {
              return this.single().then(resolve, reject);
            }
            return fetchAll().then(arr => resolve({ data: arr, error: null }), reject);
          }
        };
        return chain;
      }

    // ── allocations.insert() → /api/buy ──
    if (table === 'allocations') {
      const base = _origFrom(table); // keep existing select/eq behavior (portfolio mapping)
      const origInsert = base.insert ? base.insert.bind(base) : null;
      base.insert = function(row){
        const payload = Array.isArray(row) ? row[0] : row;
        const buyBody = {
          symbol: payload.company_ticker || payload.symbol || '',
          companyName: payload.company_name || '',
          shares: Number(payload.shares) || 0,
          pricePerShare: Number(payload.price_per_share) || 0,
        };
        const chain = {
          _data: null,
          _err: null,
          select(){ return this; },
          single: async function(){
            try {
              const r = await ApexAPI.buy.submit(buyBody);
              const h = r.holding || {};
              this._data = {
                id: h._id || h.id || ('alloc_' + Date.now()),
                user_id: payload.user_id,
                company_ticker: buyBody.symbol,
                company_name: buyBody.companyName,
                shares: buyBody.shares,
                price_per_share: buyBody.pricePerShare,
                total_value: buyBody.shares * buyBody.pricePerShare,
                tier: payload.tier || 3,
                status: payload.status || 'reserved',
                created_at: new Date().toISOString(),
                matures_at: payload.matures_at || null,
              };
              return { data: this._data, error: null };
            } catch(e){
              return { data: null, error: { message: e.message || 'buy failed' } };
            }
          }
        };
        // also allow await without .select().single()
        chain.then = function(resolve, reject){
          return chain.single().then(resolve, reject);
        };
        return chain;
      };
      return base;
    }

    // ── activity_log.insert() → notifications (no-op success) ──
    // api/buy.js already creates a Notification; just swallow the call.
    if (table === 'activity_log') {
      return {
        insert: async function(){ return { data: null, error: null }; },
        select(){ return this; },
        eq(){ return this; },
        order(){ return this; },
        limit(){ return this; },
        single: async function(){ return { data: null, error: null }; }
      };
    }

    return _origFrom(table);
  };

  // ── Profiles update for cash_balance → no-op (api/buy already deducts) ──
  // Hook only the specific update().eq() pattern used in buy-shares.html
  const _origFrom2 = window.sb.from.bind(window.sb);
  window.sb.from = function(table){
    if (table === 'profiles') {
      const base = _origFrom2(table);
      const origUpdate = base.update ? base.update.bind(base) : null;
      base.update = function(patch){
        // If the only field is cash_balance, swallow it — api/buy handled the deduction.
        const keys = Object.keys(patch || {});
        if (keys.length === 1 && keys[0] === 'cash_balance') {
          return {
            eq: async function(){ return { data: null, error: null }; }
          };
        }
        return origUpdate ? origUpdate(patch) : { eq: async()=>({ data:null, error:null }) };
      };
      return base;
    }
    return _origFrom2(table);
  };

  console.log('[shim] Buy flow extensions loaded (companies, allocations.insert, activity_log, profiles.update cash_balance)');
})();
