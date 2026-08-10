const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { sendEmail } = require('./_lib/email');
const templates = require('./_lib/emailTemplates');
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
      // Split fullName into first_name/last_name for legacy frontend compat
      const fn = (user.fullName || '').trim();
      const parts = fn ? fn.split(/\s+/) : [];
      const firstName = parts[0] || '';
      const lastName  = parts.slice(1).join(' ') || '';
      return res.status(200).json({
        ok: true,
        user: {
          id: user._id,
          email: user.email,
          fullName: user.fullName,
          first_name: firstName,
          last_name:  lastName,
          role: user.role,
          status: user.status,
          accountStatus: user.accountStatus,
          bannedReason: user.bannedReason,
          kycStatus: user.kycStatus,
          kyc_status: user.kycStatus,
          emailVerified: user.emailVerified,
          balanceUSD: user.balanceUSD,
          cash_balance: user.balanceUSD,
          phone: user.phone || '',
          country: user.country || '',
          citizenship: user.citizenship || '',
          addressLine1: user.addressLine1 || '',
          address_line1: user.addressLine1 || '',
          addressLine2: user.addressLine2 || '',
          address_line2: user.addressLine2 || '',
          city: user.city || '',
          state: user.state || '',
          zip: user.zip || '',
          dob: user.dob || null,
          idNumber: user.idNumber || '',
          idType: user.idType || '',
          occupation: user.occupation || '',
          employer: user.employer || '',
          avatarUrl: user.avatarUrl || '',
          avatar_url: user.avatarUrl || '',
          twoFactorEnabled: !!user.twoFactorEnabled,
          two_factor_enabled: !!user.twoFactorEnabled,
          createdAt: user.createdAt,
          created_at: user.createdAt,
        },
      });
    }

    // ---- /api/auth?action=update-profile ----
    if (action === 'update-profile') {
      if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
      const user = await requireAuth(req, res, Profile);
      if (!user) return;
      const readJson = require('./_lib/readJson');
      const body = await readJson(req);

      const updates = {};
      // Name: accept fullName OR first_name/last_name pair
      if (body.fullName !== undefined) {
        updates.fullName = String(body.fullName).trim();
      } else if (body.first_name !== undefined || body.last_name !== undefined) {
        const f = String(body.first_name || '').trim();
        const l = String(body.last_name || '').trim();
        const joined = [f, l].filter(Boolean).join(' ');
        if (joined) updates.fullName = joined;
      }
      // Contact + address
      const stringFields = ['phone','addressLine1','addressLine2','city','state','zip','country','citizenship','occupation','employer','idNumber','idType'];
      stringFields.forEach(k => {
        const v = body[k] !== undefined ? body[k] : body[k.replace(/[A-Z]/g, m => '_'+m.toLowerCase())];
        if (v !== undefined) updates[k] = String(v).trim();
      });
      // Legacy snake_case shortcuts the old account.html uses
      if (body.address_line1 !== undefined) updates.addressLine1 = String(body.address_line1).trim();
      if (body.address_line2 !== undefined) updates.addressLine2 = String(body.address_line2).trim();

      // Avatar (just stores URL — actual upload is via /api/upload)
      if (body.avatarUrl !== undefined) updates.avatarUrl = String(body.avatarUrl).trim();
      if (body.avatar_url !== undefined) updates.avatarUrl = String(body.avatar_url).trim();

      // 2FA toggle
      if (typeof body.twoFactorEnabled === 'boolean') updates.twoFactorEnabled = body.twoFactorEnabled;
      if (typeof body.two_factor_enabled === 'boolean') updates.twoFactorEnabled = body.two_factor_enabled;

      // DOB
      if (body.dob !== undefined) updates.dob = body.dob ? new Date(body.dob) : null;

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'No valid fields' });
      }

      await Profile.updateOne({ _id: user._id }, { $set: updates });
      return res.status(200).json({ ok: true, updated: Object.keys(updates) });
    }

    // ---- /api/auth?action=change-password ----
    if (action === 'change-password') {
      if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
      const user = await requireAuth(req, res, Profile);
      if (!user) return;
      const bcrypt = require('bcryptjs');
      const readJson = require('./_lib/readJson');
      const body = await readJson(req);
      const { currentPassword, password } = body;

      if (!password || typeof password !== 'string' || password.length < 8) {
        return res.status(400).json({ error: 'New password must be at least 8 characters' });
      }

      // If user has an existing password, require current password match
      const fresh = await Profile.findById(user._id).select('+passwordHash');
      if (fresh && fresh.passwordHash) {
        if (!currentPassword) {
          return res.status(400).json({ error: 'Current password is required' });
        }
        const ok = await bcrypt.compare(currentPassword, fresh.passwordHash);
        if (!ok) return res.status(401).json({ error: 'Current password is incorrect' });
      }

      const newHash = await bcrypt.hash(password, 12);
      await Profile.updateOne({ _id: user._id }, { $set: { passwordHash: newHash } });
      return res.status(200).json({ ok: true });
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


    // Gate: require admin approval (admins bypass)
    if (user.role !== 'admin') {
      if (user.accountStatus === 'rejected') {
        return res.status(403).json({
          error: 'ACCOUNT_REJECTED',
          message: 'Your application was not approved. Contact support for details.',
          email: user.email
        });
      }
      if (user.accountStatus !== 'approved') {
        return res.status(403).json({
          error: 'PENDING_APPROVAL',
          message: 'Your account is being reviewed by an administrator.',
          email: user.email
        });
      }
      if (!user.emailVerified) {
        // Auto-send verification email on every login attempt (until verified)
        const newToken = crypto.randomBytes(32).toString('hex');
        user.emailVerifyToken = newToken;
        user.emailVerifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await user.save();
        const APP_URL = process.env.APP_URL || 'https://apexipoholdings.com';
        const verifyUrl = `${APP_URL}/verify-email?token=${newToken}`;
        sendEmail({
          to: user.email,
          ...templates.verifyEmail(user.fullName, verifyUrl)
        }).catch(e => console.error('[login] auto-verify email failed:', e.message));
        return res.status(403).json({
          error: 'EMAIL_NOT_VERIFIED',
          message: 'A verification email has been sent. Please check your inbox.',
          email: user.email,
          emailSent: true
        });
      }
    }

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
      // Extended signup fields
      const extra = {
        phone: body.phone || '',
        addressLine1: body.addressLine1 || body.address || '',
        addressLine2: body.addressLine2 || '',
        city: body.city || '',
        state: body.state || '',
        zip: body.zip || body.postalCode || '',
        country: body.country || '',
        citizenship: body.citizenship || '',
        dob: body.dob ? new Date(body.dob) : null,
        ssn: body.ssn || '',
        idNumber: body.idNumber || body.passport || body.ssn || '',
        idType: body.idType || (body.ssn ? 'ssn' : (body.passport ? 'passport' : '')),
        occupation: body.occupation || '',
        employer: body.employer || '',
        accountTypes: Array.isArray(body.accountTypes) ? body.accountTypes : [],
      };

      if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
      if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

      const existing = await Profile.findOne({ email });
      if (existing) return res.status(409).json({ error: 'User already exists' });

      const passwordHash = await bcrypt.hash(password, 12);

      // Generate email verification token
      const emailVerifyToken = crypto.randomBytes(32).toString('hex');
      const emailVerifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const user = await Profile.create({
        email, passwordHash, fullName,
        accountStatus: 'pending',
        emailVerifyToken,
        emailVerifyExpires,
        ...extra
      });

      // NO email sent yet — admin must approve first
      // Admin approval will trigger the welcome + verify email

      // DO NOT auto-login.
      return res.status(201).json({
        ok: true,
        requiresApproval: true,
        message: 'Account created. An administrator will review your application shortly.',
        user: { id: user._id, email: user.email, fullName: user.fullName, role: user.role },
      });
    }

    
    
    // ---- /api/auth?action=check-status&email=X ----
    // Public endpoint — no auth needed. Lets pending-approval page poll for status.
    if (action === 'check-status') {
      const email = (req.query.email || '').toLowerCase().trim();
      if (!email) return res.status(400).json({ error: 'Email required' });
      const user = await Profile.findOne({ email })
        .select('accountStatus emailVerified fullName createdAt')
        .lean();
      if (!user) {
        return res.status(404).json({ error: 'Not found' });
      }
      return res.status(200).json({
        ok: true,
        accountStatus: user.accountStatus,
        emailVerified: user.emailVerified,
        fullName: user.fullName,
        createdAt: user.createdAt,
      });
    }

    // ---- /api/auth?action=verify-email ----
    if (action === 'verify-email') {
      const token = req.query.token || (req.method === 'POST' ? (await readJson(req)).token : null);
      if (!token) return res.status(400).json({ error: 'Token required' });
      const user = await Profile.findOne({
        emailVerifyToken: token,
        emailVerifyExpires: { $gt: new Date() }
      });
      if (!user) return res.status(400).json({ error: 'Invalid or expired token' });
      user.emailVerified = true;
      user.emailVerifyToken = null;
      user.emailVerifyExpires = null;
      await user.save();
      return res.status(200).json({ ok: true, message: 'Email verified successfully' });
    }

    // ---- /api/auth?action=resend-verify ----
    if (action === 'resend-verify') {
      if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
      const body = await readJson(req);
      const email = body.email?.toLowerCase().trim();
      if (!email) return res.status(400).json({ error: 'Email required' });
      const user = await Profile.findOne({ email });
      // Always return success (don't leak whether email exists)
      if (!user || user.emailVerified) {
        return res.status(200).json({ ok: true, message: 'If an unverified account exists, a new email was sent.' });
      }
      // Rate limit — don't allow resend within 60s
      if (user.emailVerifyExpires && (Date.now() - new Date(user.emailVerifyExpires).getTime() + 24*60*60*1000) < 60000) {
        return res.status(429).json({ error: 'Please wait before requesting another email.' });
      }
      const newToken = crypto.randomBytes(32).toString('hex');
      user.emailVerifyToken = newToken;
      user.emailVerifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await user.save();
      const APP_URL = process.env.APP_URL || 'https://apexipoholdings.com';
      const verifyUrl = `${APP_URL}/verify-email?token=${newToken}`;
      sendEmail({
        to: email,
        ...templates.verifyEmail(user.fullName, verifyUrl)
      }).catch(e => console.error('[resend-verify] failed:', e));
      return res.status(200).json({ ok: true, message: 'Verification email sent.' });
    }

    // ---- /api/auth?action=forgot-password ----
    if (action === 'forgot-password') {
      if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
      const body = await readJson(req);
      const email = body.email?.toLowerCase().trim();
      if (!email) return res.status(400).json({ error: 'Email required' });
      const user = await Profile.findOne({ email });
      // Always return success (don't leak whether email exists)
      if (!user) {
        return res.status(200).json({ ok: true, message: 'If that email exists, a reset link was sent.' });
      }
      const resetToken = crypto.randomBytes(32).toString('hex');
      user.passwordResetToken = resetToken;
      user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      await user.save();
      const APP_URL = process.env.APP_URL || 'https://apexipoholdings.com';
      const resetUrl = `${APP_URL}/reset-password?token=${resetToken}`;
      sendEmail({
        to: email,
        ...templates.passwordReset(user.fullName, resetUrl)
      }).catch(e => console.error('[forgot-password] failed:', e));
      return res.status(200).json({ ok: true, message: 'If that email exists, a reset link was sent.' });
    }

    // ---- /api/auth?action=reset-password ----
    if (action === 'reset-password') {
      if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
      const body = await readJson(req);
      const { token, password } = body;
      if (!token || !password) return res.status(400).json({ error: 'Token and new password required' });
      if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
      const user = await Profile.findOne({
        passwordResetToken: token,
        passwordResetExpires: { $gt: new Date() }
      });
      if (!user) return res.status(400).json({ error: 'Invalid or expired token' });
      user.passwordHash = await bcrypt.hash(password, 12);
      user.passwordResetToken = null;
      user.passwordResetExpires = null;
      await user.save();
      return res.status(200).json({ ok: true, message: 'Password reset successfully' });
    }

        return res.status(400).json({ error: 'Missing or invalid action parameter' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
