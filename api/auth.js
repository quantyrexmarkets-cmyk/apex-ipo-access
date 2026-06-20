const bcrypt = require('bcryptjs');
const dbConnect = require('./_lib/db');
const readJson = require('./_lib/readJson');
const { signToken, setAuthCookie, clearAuthCookie, requireAuth } = require('./_lib/auth');
const Profile = require('../models/Profile');

module.exports = async (req, res) => {
  try {
    await dbConnect();

    const action = (req.query.action || '').toLowerCase();

    // ---- /api/auth?action=me ----
    if (action === 'me') {
      if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
      const user = await requireAuth(req, res, Profile);
      if (!user) return;
      return res.status(200).json({
        ok: true,
        user: {
          id: user._id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          status: user.status,
          accountStatus: user.accountStatus,
          bannedReason: user.bannedReason,
          kycStatus: user.kycStatus,
          emailVerified: user.emailVerified,
          balanceUSD: user.balanceUSD,
          phone: user.phone,
          country: user.country,
        },
      });
    }

    // ---- /api/auth?action=logout ----
    if (action === 'logout') {
      if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
      clearAuthCookie(res);
      return res.status(200).json({ ok: true });
    }

    // ---- /api/auth?action=login ----
    if (action === 'login') {
      if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
      const body = await readJson(req);
      const email = body.email?.toLowerCase().trim();
      const password = body.password;

      if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

      const user = await Profile.findOne({ email }).select('+passwordHash');
      if (!user) return res.status(401).json({ error: 'Invalid credentials' });
      if (user.status === 'disabled') return res.status(403).json({ error: 'Account disabled' });

      const match = await bcrypt.compare(password, user.passwordHash);
      if (!match) return res.status(401).json({ error: 'Invalid credentials' });

      const token = signToken(user);
      setAuthCookie(res, token);
      return res.status(200).json({
        ok: true,
        user: { id: user._id, email: user.email, fullName: user.fullName, role: user.role },
      });
    }

    // ---- /api/auth?action=register ----
    if (action === 'register') {
      if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
      const body = await readJson(req);
      const email = body.email?.toLowerCase().trim();
      const password = body.password;
      const fullName = body.fullName?.trim() || '';

      if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
      if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

      const existing = await Profile.findOne({ email });
      if (existing) return res.status(409).json({ error: 'User already exists' });

      const passwordHash = await bcrypt.hash(password, 12);
      const user = await Profile.create({ email, passwordHash, fullName, accountStatus: 'pending' });

      const token = signToken(user);
      setAuthCookie(res, token);
      return res.status(201).json({
        ok: true,
        user: { id: user._id, email: user.email, fullName: user.fullName, role: user.role },
      });
    }

    return res.status(400).json({ error: 'Missing or invalid action parameter' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
