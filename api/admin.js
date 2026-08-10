const bcrypt = require('bcryptjs');
const dbConnect = require('./_lib/db');
const readJson = require('./_lib/readJson');
const { requireAdmin } = require('./_lib/adminAuth');
const Profile = require('../models/Profile');
const Deposit = require('../models/Deposit');
const Withdrawal = require('../models/Withdrawal');
const Holding = require('../models/Holding');
const KycDocument = require('../models/KycDocument');
const CryptoWallet = require('../models/CryptoWallet');
const Notification = require('../models/Notification');
const AdminLog = require('../models/AdminLog');
const { sendEmail } = require('./_lib/email');
const crypto = require('crypto');
const templates = require('./_lib/emailTemplates');
const Company = require('../models/Company');
const Position = require('../models/Position');
let Order = null;
try { Order = require('../models/Order'); } catch(e) { /* Order model optional */ }
let ValuationSnapshot = null;
try { ValuationSnapshot = require('../models/ValuationSnapshot'); } catch(e) {}
let LiquidityEvent = null;
try { LiquidityEvent = require('../models/LiquidityEvent'); } catch(e) {}
const Settings = require('../models/Settings');
const { signToken } = require('./_lib/auth');
const { serialize } = require('cookie');


// ═══════════════════════════════════════════════════════════════
// ADMIN TRADE MANAGEMENT — helpers
// ═══════════════════════════════════════════════════════════════
const _PUBLIC_MAP = { TESLA:'TSLA', AAPL:'AAPL', MSFT:'MSFT', GOOGL:'GOOGL', AMZN:'AMZN', META:'META', NVDA:'NVDA', V:'V', NXPI:'NXPI', UBS:'UBS', JPM:'JPM', BAC:'BAC', NFLX:'NFLX', PLTR:'PLTR' };
const _CRYPTO_MAP = { BTC:'BINANCE:BTCUSDT', ETH:'BINANCE:ETHUSDT', SOL:'BINANCE:SOLUSDT', XRP:'BINANCE:XRPUSDT', BNB:'BINANCE:BNBUSDT', ADA:'BINANCE:ADAUSDT' };

async function adminFillPrice(ticker) {
  const T = (ticker||'').toUpperCase();
  const sym = _PUBLIC_MAP[T] || _CRYPTO_MAP[T];
  if (!sym || !process.env.FINNHUB_API_KEY) return null;
  try {
    const r = await fetch(`https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(sym)}&token=${process.env.FINNHUB_API_KEY}`);
    const j = await r.json();
    if (j && typeof j.c === 'number' && j.c > 0) return { price: j.c, bid: j.c * 0.9995, ask: j.c * 1.0005 };
  } catch(e) {}
  return null;
}

async function adminLog(adminUser, action, targetUserId, resource, before, after, reason) {
  try {
    // Map 'resource' string to targetType enum
    const typeMap = { 'trades':'trade', 'orders-admin':'order', 'cash-adjust':'cash' };
    const targetType = typeMap[resource] || 'system';
    await AdminLog.create({
      adminId: adminUser._id,
      action,
      targetType,
      targetId: targetUserId || null,
      details: {
        adminEmail: adminUser.email,
        resource,
        before: before || null,
        after: after || null,
        reason: reason || '',
      },
    });
  } catch(e) { console.error('[adminLog]', e.message); }
}


module.exports = async (req, res) => {
  try {
    await dbConnect();
    // Early handler — unimpersonate must work even when current token is a USER token
    const earlyResource = (req.query.resource || '').toLowerCase();
    if (earlyResource === 'unimpersonate' && req.method === 'POST') {
      const { serialize } = require('cookie');
      const cookieRaw = req.headers.cookie || '';
      const adminTokMatch = cookieRaw.match(/apex_admin_token=([^;]+)/);
      const adminTok = adminTokMatch ? adminTokMatch[1] : '';
      if (!adminTok) return res.status(400).json({ error: 'No admin session to restore' });
      const cookies = [
        serialize('apex_token', adminTok, {
          httpOnly: true, secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 7,
        }),
        serialize('apex_admin_token', '', { path: '/', expires: new Date(0) }),
        serialize('apex_impersonating', '', { path: '/', expires: new Date(0) }),
        serialize('apex_impersonating_email', '', { path: '/', expires: new Date(0) }),
      ];
      res.setHeader('Set-Cookie', cookies);
      return res.status(200).json({ ok: true, redirect: '/adminprivate' });
    }

    const admin = await requireAdmin(req, res, Profile);
    if (!admin) return;

    const resource = (req.query.resource || '').toLowerCase();

    // ============ USERS ============
    if (resource === 'users') {
      if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

      const search = (req.query.search || '').trim();
      const status = req.query.status || '';
      const kyc = req.query.kyc || '';

      const filter = {};
      // Exclude admins from regular user list unless explicitly requested
      if (req.query.includeAdmins !== '1') filter.role = { $ne: 'admin' };
      if (search) {
        filter.$or = [
          { email: { $regex: search, $options: 'i' } },
          { fullName: { $regex: search, $options: 'i' } },
        ];
      }
      if (status) filter.status = status;
      if (kyc) filter.kycStatus = kyc;

      const users = await Profile.find(filter).sort({ createdAt: -1 }).limit(200).lean();
      return res.status(200).json({
        ok: true,
        count: users.length,
        users: users.map(u => ({
          id: u._id,
          email: u.email,
          fullName: u.fullName,
          avatarUrl: u.avatarUrl || '',
          role: u.role,
          status: u.status,
          accountStatus: u.accountStatus,
          kycStatus: u.kycStatus,
          emailVerified: u.emailVerified,
          balanceUSD: u.balanceUSD || 0,
          createdAt: u.createdAt,
        })),
      });
    }

    // ============ USER (single) ============
    if (resource === 'user') {
      if (req.method === 'GET') {
        const id = req.query.id;
        if (!id) return res.status(400).json({ error: 'User id required' });
        const user = await Profile.findById(id).lean();
        if (!user) return res.status(404).json({ error: 'User not found' });

        const [deposits, withdrawals, holdings, kyc] = await Promise.all([
          Deposit.find({ userId: id }).sort({ createdAt: -1 }).limit(50).lean(),
          Withdrawal.find({ userId: id }).sort({ createdAt: -1 }).limit(50).lean(),
          Holding.find({ userId: id }).sort({ totalInvestedUSD: -1 }).lean(),
          KycDocument.find({ userId: id }).sort({ createdAt: -1 }).lean(),
        ]);

        return res.status(200).json({
          ok: true,
          user: {
            id: user._id,
            email: user.email,
            fullName: user.fullName,
            avatarUrl: user.avatarUrl || '',
            role: user.role,
            status: user.status,
            accountStatus: user.accountStatus,
            kycStatus: user.kycStatus,
            emailVerified: user.emailVerified,
            balanceUSD: user.balanceUSD || 0,
            phone: user.phone || '',
            addressLine1: user.addressLine1 || '',
            addressLine2: user.addressLine2 || '',
            city: user.city || '',
            state: user.state || '',
            zip: user.zip || '',
            country: user.country || '',
            citizenship: user.citizenship || '',
            dob: user.dob || null,
            idNumber: user.idNumber || '',
            idType: user.idType || '',
            occupation: user.occupation || '',
            employer: user.employer || '',
            accountTypes: user.accountTypes || [],
            createdAt: user.createdAt,
          },
          deposits, withdrawals, holdings, kycDocuments: kyc,
        });
      }

      if (req.method === 'PUT') {
        const body = await readJson(req);
        const { id, status, role, kycStatus, emailVerified, fullName, accountStatus,
                phone, addressLine1, addressLine2, city, state: stateField, zip, country,
                citizenship, dob, idNumber, idType, occupation, employer , avatarUrl} = body;
        if (!id) return res.status(400).json({ error: 'User id required' });

        const updates = {};
        if (status && ['active', 'disabled'].includes(status)) updates.status = status;
        if (role && ['user', 'admin'].includes(role)) updates.role = role;
        if (accountStatus && ['pending', 'approved', 'rejected'].includes(accountStatus)) updates.accountStatus = accountStatus;
        if (kycStatus && ['not_submitted', 'pending', 'approved', 'rejected'].includes(kycStatus)) updates.kycStatus = kycStatus;
        if (typeof emailVerified === 'boolean') updates.emailVerified = emailVerified;
        if (fullName !== undefined) updates.fullName = String(fullName).trim();
        if (phone !== undefined) updates.phone = String(phone).trim();
        if (avatarUrl !== undefined) updates.avatarUrl = String(avatarUrl).trim();
        if (addressLine1 !== undefined) updates.addressLine1 = String(addressLine1).trim();
        if (addressLine2 !== undefined) updates.addressLine2 = String(addressLine2).trim();
        if (city !== undefined) updates.city = String(city).trim();
        if (stateField !== undefined) updates.state = String(stateField).trim();
        if (zip !== undefined) updates.zip = String(zip).trim();
        if (country !== undefined) updates.country = String(country).trim();
        if (citizenship !== undefined) updates.citizenship = String(citizenship).trim();
        if (dob !== undefined) updates.dob = dob ? new Date(dob) : null;
        if (idNumber !== undefined) updates.idNumber = String(idNumber).trim();
        if (idType !== undefined) updates.idType = String(idType).trim();
        if (occupation !== undefined) updates.occupation = String(occupation).trim();
        if (employer !== undefined) updates.employer = String(employer).trim();
        if (typeof fullName === 'string') updates.fullName = fullName.trim();

        if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No valid fields' });
        if (id === admin._id.toString() && updates.role && updates.role !== 'admin') {
          return res.status(400).json({ error: 'Cannot demote yourself' });
        }

        // Detect transition pending -> approved (for sending welcome email)
        const prevUser = await Profile.findById(id).select('accountStatus emailVerifyToken emailVerified fullName email').lean();
        const wasPending = prevUser && prevUser.accountStatus !== 'approved';
        const willBeApproved = updates.accountStatus === 'approved';
        const shouldSendWelcome = wasPending && willBeApproved && !prevUser.emailVerified;

        // If approving, also (re)generate email verify token
        if (shouldSendWelcome) {
          updates.emailVerifyToken = crypto.randomBytes(32).toString('hex');
          updates.emailVerifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
        }

        const user = await Profile.findByIdAndUpdate(id, updates, { new: true }).lean();
        if (!user) return res.status(404).json({ error: 'User not found' });

        // Send welcome + verify email on approval
        if (shouldSendWelcome && user.email) {
          const APP_URL = process.env.APP_URL || 'https://apexipoholdings.com';
          const verifyUrl = `${APP_URL}/verify-email?token=${updates.emailVerifyToken}`;
          sendEmail({
            to: user.email,
            ...templates.welcome(user.fullName, verifyUrl)
          }).catch(e => console.error('[admin/approve] welcome email failed:', e.message));
        }

        await AdminLog.create({
          adminId: admin._id, action: 'user_update', targetType: 'user',
          targetId: user._id, details: updates,
        });

        return res.status(200).json({
          ok: true,
          user: {
            id: user._id, email: user.email, fullName: user.fullName,
            role: user.role, status: user.status, accountStatus: user.accountStatus,
            kycStatus: user.kycStatus, emailVerified: user.emailVerified,
            balanceUSD: user.balanceUSD || 0,
          },
        });
      }

            if (req.method === 'DELETE') {
        const id = req.query.id;
        if (!id) return res.status(400).json({ error: 'User id required' });
        if (id === admin._id.toString()) return res.status(400).json({ error: 'Cannot delete yourself' });

        const user = await Profile.findById(id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        await Promise.all([
          Deposit.deleteMany({ userId: id }),
          Withdrawal.deleteMany({ userId: id }),
          Holding.deleteMany({ userId: id }),
          KycDocument.deleteMany({ userId: id }),
          Notification.deleteMany({ userId: id }),
        ]);
        await Profile.findByIdAndDelete(id);

        await AdminLog.create({
          adminId: admin._id, action: 'user_delete', targetType: 'user',
          targetId: id, details: { email: user.email },
        });
        return res.status(200).json({ ok: true });
      }

      return res.status(405).json({ error: 'Method not allowed' });
    }

    // ============ BALANCE ============
    if (resource === 'balance') {
      if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
      const body = await readJson(req);
      const { userId, amount, reason, type } = body;

      if (!userId || amount === undefined) return res.status(400).json({ error: 'userId and amount required' });
      const numAmount = Number(amount);
      if (isNaN(numAmount)) return res.status(400).json({ error: 'amount must be a number' });

      const adjustType = type === 'set' ? 'set' : 'adjust';
      const targetUser = await Profile.findById(userId);
      if (!targetUser) return res.status(404).json({ error: 'User not found' });

      const oldBalance = targetUser.balanceUSD || 0;
      let newBalance;
      if (adjustType === 'set') {
        newBalance = numAmount;
        targetUser.balanceUSD = newBalance;
      } else {
        newBalance = oldBalance + numAmount;
        if (newBalance < 0) return res.status(400).json({ error: 'Balance cannot go below zero' });
        targetUser.balanceUSD = newBalance;
      }
      await targetUser.save();

      const delta = newBalance - oldBalance;

      // Clean, neutral notification copy
      const absDelta = Math.abs(delta);
      const fmtAmt = absDelta.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      let notifMsg;
      if (delta > 0) {
        notifMsg = `$${fmtAmt} has been credited to your APEX cash balance.`;
      } else if (delta < 0) {
        notifMsg = `$${fmtAmt} has been debited from your APEX cash balance.`;
      } else {
        notifMsg = `Account balance reviewed. No change applied.`;
      }

      await Notification.create({
        userId: targetUser._id,
        type: delta >= 0 ? 'deposit' : 'withdrawal',
        title: delta > 0 ? 'Funds credited' : (delta < 0 ? 'Account debited' : 'Balance reviewed'),
        message: notifMsg,
        link: '/account',
      });

      await AdminLog.create({
        adminId: admin._id, action: 'balance_adjust', targetType: 'user',
        targetId: targetUser._id,
        details: { type: adjustType, amount: numAmount, oldBalance, newBalance, reason: reason || '' },
      });
      // EMAIL balance user — only when balance actually changed
      if (delta !== 0) {
        try {
          if (targetUser?.email) {
            sendEmail({
              to: targetUser.email,
              ...templates.balanceAdjust(targetUser.fullName, delta, newBalance, req.body?.note)
            }).catch(e => console.error('[email] balance failed:', e));
          }
        } catch(e) { console.error('[email] balance lookup failed:', e); }
      }

      return res.status(200).json({ ok: true, user: { id: targetUser._id, email: targetUser.email, oldBalance, newBalance } });
    }

    // ============ DEPOSITS ============
    if (resource === 'deposits') {
      if (req.method === 'GET') {
        const status = req.query.status;
        const filter = status ? { status } : {};
        const deposits = await Deposit.find(filter).sort({ createdAt: -1 }).limit(200)
          .populate('userId', 'email fullName').lean();
        return res.status(200).json({ ok: true, count: deposits.length, deposits });
      }

      if (req.method === 'POST') {
        const body = await readJson(req);
        const { id, action, note } = body;
        if (!id || !['approve', 'reject'].includes(action)) return res.status(400).json({ error: 'Invalid request' });

        const deposit = await Deposit.findById(id);
        if (!deposit) return res.status(404).json({ error: 'Deposit not found' });
        if (deposit.status !== 'pending') return res.status(400).json({ error: `Deposit already ${deposit.status}` });

        if (action === 'approve') {
          await Profile.updateOne({ _id: deposit.userId }, { $inc: { balanceUSD: deposit.amountUSD } });
          deposit.status = 'approved';
        } else {
          deposit.status = 'rejected';
        }
        deposit.adminNote = note || '';
        deposit.reviewedBy = admin._id;
        deposit.reviewedAt = new Date();
        await deposit.save();

        const _fmtD = (n) => Number(n||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
        await Notification.create({
          userId: deposit.userId,
          type: action === 'approve' ? 'deposit' : 'error',
          title: action === 'approve' ? 'Deposit cleared' : 'Deposit not accepted',
          message: action === 'approve'
            ? `$${_fmtD(deposit.amountUSD)} has been credited to your APEX cash balance.`
            : `$${_fmtD(deposit.amountUSD)} deposit could not be processed.${note ? ' Reason: ' + note : ''}`.trim(),
          link: '/activity',
        });
        // EMAIL deposit user
        try {
          const u = await Profile.findById(deposit.userId).lean();
          if (u?.email) {
            const tpl = action === 'approve'
              ? templates.depositApproved(u.fullName, deposit.amountUSD, deposit.currency || deposit.method, deposit._id)
              : templates.depositRejected(u.fullName, deposit.amountUSD, deposit.currency || deposit.method, deposit.rejectionReason);
            sendEmail({ to: u.email, ...tpl }).catch(e => console.error('[email] deposit failed:', e));
          }
        } catch(e) { console.error('[email] deposit lookup failed:', e); }

        await AdminLog.create({
          adminId: admin._id, action: `deposit_${action}`, targetType: 'deposit',
          targetId: deposit._id, details: { amountUSD: deposit.amountUSD, note: note || '' },
        });

        return res.status(200).json({ ok: true, deposit });
      }

      return res.status(405).json({ error: 'Method not allowed' });
    }

    // ============ WITHDRAWALS ============
    if (resource === 'withdrawals') {
      if (req.method === 'GET') {
        const status = req.query.status;
        const filter = status ? { status } : {};
        const withdrawals = await Withdrawal.find(filter).sort({ createdAt: -1 }).limit(200)
          .populate('userId', 'email fullName').lean();
        return res.status(200).json({ ok: true, count: withdrawals.length, withdrawals });
      }

      if (req.method === 'POST') {
        const body = await readJson(req);
        const { id, action, note, txHash } = body;
        if (!id || !['approve', 'complete', 'reject'].includes(action)) return res.status(400).json({ error: 'Invalid request' });

        const withdrawal = await Withdrawal.findById(id);
        if (!withdrawal) return res.status(404).json({ error: 'Withdrawal not found' });

        if (action === 'approve') {
          if (withdrawal.status !== 'pending') return res.status(400).json({ error: `Withdrawal is ${withdrawal.status}` });
          withdrawal.status = 'processing';
        } else if (action === 'complete') {
          if (!['pending', 'processing'].includes(withdrawal.status)) return res.status(400).json({ error: `Withdrawal is ${withdrawal.status}` });
          withdrawal.status = 'completed';
          if (txHash) withdrawal.txHash = txHash;
        } else if (action === 'reject') {
          if (!['pending', 'processing'].includes(withdrawal.status)) return res.status(400).json({ error: `Withdrawal is ${withdrawal.status}` });
          await Profile.updateOne({ _id: withdrawal.userId }, { $inc: { balanceUSD: withdrawal.amountUSD } });
          withdrawal.status = 'rejected';
        }

        withdrawal.adminNote = note || withdrawal.adminNote;
        withdrawal.reviewedBy = admin._id;
        withdrawal.reviewedAt = new Date();
        await withdrawal.save();

        const _fmtW = (n) => Number(n||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
        const _isCrypto = withdrawal.method === 'crypto';
        const _destLabel = _isCrypto ? 'destination address' : 'destination account';
        const _settleNote = _isCrypto ? '' : ' Allow 1–3 business days for funds to appear in your destination account.';

        const msgMap = {
          approve:  `$${_fmtW(withdrawal.amountUSD)} withdrawal has been approved and is being released to your ${_destLabel}.`,
          complete: `$${_fmtW(withdrawal.amountUSD)} withdrawal is complete.${_settleNote}`,
          reject:   `$${_fmtW(withdrawal.amountUSD)} withdrawal could not be processed and has been returned to your APEX cash balance.${note ? ' Reason: ' + note : ''}`,
        };
        const titleMap = {
          approve:  'Withdrawal approved',
          complete: 'Withdrawal sent',
          reject:   'Withdrawal not accepted',
        };
        const typeMap = {
          approve:  'withdrawal',
          complete: 'withdrawal',
          reject:   'error',
        };

        await Notification.create({
          userId: withdrawal.userId,
          type: typeMap[action] || 'withdrawal',
          title: titleMap[action] || 'Withdrawal update',
          message: msgMap[action],
          link: '/activity',
        });
        // EMAIL withdrawal user
        try {
          const u = await Profile.findById(withdrawal.userId).lean();
          if (u?.email) {
            const tpl = action === 'approve'
              ? templates.withdrawalApproved(u.fullName, withdrawal.amountUSD, withdrawal.method, withdrawal.destination)
              : templates.withdrawalRejected(u.fullName, withdrawal.amountUSD, withdrawal.rejectionReason);
            sendEmail({ to: u.email, ...tpl }).catch(e => console.error('[email] withdrawal failed:', e));
          }
        } catch(e) { console.error('[email] withdrawal lookup failed:', e); }

        await AdminLog.create({
          adminId: admin._id, action: `withdrawal_${action}`, targetType: 'withdrawal',
          targetId: withdrawal._id, details: { amountUSD: withdrawal.amountUSD, note: note || '' },
        });

        return res.status(200).json({ ok: true, withdrawal });
      }

      return res.status(405).json({ error: 'Method not allowed' });
    }

    // ============ KYC ============
    if (resource === 'kyc') {
      if (req.method === 'GET') {
        const status = req.query.status;
        const filter = status ? { status } : {};
        const docs = await KycDocument.find(filter).sort({ createdAt: -1 }).limit(200)
          .populate('userId', 'email fullName').lean();
        return res.status(200).json({ ok: true, count: docs.length, documents: docs });
      }

      if (req.method === 'POST') {
        const body = await readJson(req);
        const { id, action, note } = body;
        if (!id || !['approve', 'reject'].includes(action)) return res.status(400).json({ error: 'Invalid request' });

        const doc = await KycDocument.findById(id);
        if (!doc) return res.status(404).json({ error: 'KYC document not found' });
        if (doc.status !== 'pending') return res.status(400).json({ error: `KYC already ${doc.status}` });

        doc.status = action === 'approve' ? 'approved' : 'rejected';
        doc.adminNote = note || '';
        doc.reviewedBy = admin._id;
        doc.reviewedAt = new Date();
        await doc.save();

        await Profile.updateOne({ _id: doc.userId }, { $set: { kycStatus: doc.status } });

        await Notification.create({
          userId: doc.userId,
          type: action === 'approve' ? 'kyc' : 'warning',
          title: action === 'approve' ? 'Identity verified' : 'Verification incomplete',
          message: action === 'approve'
            ? 'Identity verification is complete. Full account access is now enabled, including trading and withdrawals.'
            : `Identity verification could not be completed.${note ? ' ' + note : ' Please review and resubmit your documents.'}`,
          link: '/kyc',
        });
        // EMAIL kyc user
        try {
          const u = await Profile.findById(doc.userId).lean();
          if (u?.email) {
            const tpl = action === 'approve'
              ? templates.kycApproved(u.fullName)
              : templates.kycRejected(u.fullName, doc.rejectionReason);
            sendEmail({ to: u.email, ...tpl }).catch(e => console.error('[email] kyc failed:', e));
          }
        } catch(e) { console.error('[email] kyc lookup failed:', e); }

        await AdminLog.create({
          adminId: admin._id, action: `kyc_${action}`, targetType: 'kyc',
          targetId: doc._id, details: { note: note || '' },
        });

        return res.status(200).json({ ok: true, document: doc });
      }

      return res.status(405).json({ error: 'Method not allowed' });
    }

    // ============ WALLETS ============
    if (resource === 'wallets') {
      if (req.method === 'GET') {
        const wallets = await CryptoWallet.find({}).sort({ sortOrder: 1, createdAt: 1 }).lean();
        return res.status(200).json({ ok: true, count: wallets.length, wallets });
      }

      if (req.method === 'POST') {
        const body = await readJson(req);
        const label = (body.label || '').trim();
        const network = (body.network || '').trim();
        const asset = (body.asset || '').toUpperCase().trim();
        const address = (body.address || '').trim();
        const memo = (body.memo || '').trim();
        const qrUrl = body.qrUrl || '';
        const active = body.active !== false;
        const sortOrder = Number(body.sortOrder || 0);

        if (!label || !network || !asset || !address) return res.status(400).json({ error: 'label, network, asset, address required' });

        const wallet = await CryptoWallet.create({ label, network, asset, address, memo, qrUrl, active, sortOrder });
        await AdminLog.create({
          adminId: admin._id, action: 'wallet_create', targetType: 'wallet',
          targetId: wallet._id, details: { label, network, asset },
        });
        return res.status(201).json({ ok: true, wallet });
      }

      if (req.method === 'PUT') {
        const body = await readJson(req);
        const { id, ...updates } = body;
        if (!id) return res.status(400).json({ error: 'Wallet id required' });

        const allowed = ['label', 'network', 'asset', 'address', 'memo', 'qrUrl', 'active', 'sortOrder'];
        const cleanUpdates = {};
        for (const key of allowed) {
          if (updates[key] !== undefined) {
            cleanUpdates[key] = key === 'asset' ? String(updates[key]).toUpperCase().trim() : updates[key];
          }
        }

        const wallet = await CryptoWallet.findByIdAndUpdate(id, cleanUpdates, { new: true });
        if (!wallet) return res.status(404).json({ error: 'Wallet not found' });

        await AdminLog.create({
          adminId: admin._id, action: 'wallet_update', targetType: 'wallet',
          targetId: wallet._id, details: cleanUpdates,
        });
        return res.status(200).json({ ok: true, wallet });
      }

      if (req.method === 'DELETE') {
        const id = req.query.id;
        if (!id) return res.status(400).json({ error: 'Wallet id required' });
        const wallet = await CryptoWallet.findByIdAndDelete(id);
        if (!wallet) return res.status(404).json({ error: 'Wallet not found' });
        await AdminLog.create({
          adminId: admin._id, action: 'wallet_delete', targetType: 'wallet',
          targetId: wallet._id, details: { label: wallet.label },
        });
        return res.status(200).json({ ok: true, deleted: wallet._id });
      }

      return res.status(405).json({ error: 'Method not allowed' });
    }

    // ============ IMPERSONATE (admin -> user) ============
    if (resource === 'impersonate') {
      if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
      const body = await readJson(req);
      const { userId } = body;
      if (!userId) return res.status(400).json({ error: 'userId required' });

      const targetUser = await Profile.findById(userId);
      if (!targetUser) return res.status(404).json({ error: 'User not found' });
      if (targetUser.role === 'admin') return res.status(403).json({ error: 'Cannot impersonate another admin' });

      // Save admin's CURRENT token as backup cookie so they can return
      const adminCookieRaw = req.headers.cookie || '';
      const adminTokenMatch = adminCookieRaw.match(/apex_token=([^;]+)/);
      const adminBackup = adminTokenMatch ? adminTokenMatch[1] : '';

      // Sign new token for target user
      const userToken = signToken(targetUser);

      // Set TWO cookies: apex_token (now = user) and apex_admin_token (backup)
      const cookies = [
        serialize('apex_token', userToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 60 * 60 * 24 * 7,
        }),
        serialize('apex_admin_token', adminBackup, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 60 * 60 * 4, // 4 hours max impersonation window
        }),
        serialize('apex_impersonating', '1', {
          httpOnly: false, // readable by client JS so dashboard banner can show
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 60 * 60 * 4,
        }),
        serialize('apex_impersonating_email', encodeURIComponent(targetUser.email || ''), {
          httpOnly: false,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 60 * 60 * 4,
        }),
      ];
      res.setHeader('Set-Cookie', cookies);

      await AdminLog.create({
        adminId: admin._id,
        action: 'impersonate_start',
        targetType: 'user',
        targetId: targetUser._id,
        details: { email: targetUser.email },
      });

      return res.status(200).json({ ok: true, redirect: '/dashboard', user: { id: targetUser._id, email: targetUser.email } });
    }

    // ============ UNIMPERSONATE (return to admin) ============
    if (resource === 'unimpersonate') {
      if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
      const cookieRaw = req.headers.cookie || '';
      const adminTokMatch = cookieRaw.match(/apex_admin_token=([^;]+)/);
      const adminTok = adminTokMatch ? adminTokMatch[1] : '';
      if (!adminTok) return res.status(400).json({ error: 'No admin session to restore' });

      const cookies = [
        serialize('apex_token', adminTok, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 60 * 60 * 24 * 7,
        }),
        serialize('apex_admin_token', '', { path: '/', expires: new Date(0) }),
        serialize('apex_impersonating', '', { path: '/', expires: new Date(0) }),
        serialize('apex_impersonating_email', '', { path: '/', expires: new Date(0) }),
      ];
      res.setHeader('Set-Cookie', cookies);

      return res.status(200).json({ ok: true, redirect: '/adminprivate' });
    }


    // ============ ME (admin's own profile) ============
    if (resource === 'me') {
      if (req.method === 'GET') {
        const me = await Profile.findById(admin._id).lean();
        if (!me) return res.status(404).json({ error: 'Profile not found' });
        return res.status(200).json({
          ok: true,
          admin: {
            id: me._id,
            email: me.email,
            fullName: me.fullName || '',
            phone: me.phone || '',
            avatarUrl: me.avatarUrl || '',
            role: me.role,
            createdAt: me.createdAt,
            updatedAt: me.updatedAt,
          },
        });
      }

      if (req.method === 'PATCH' || req.method === 'PUT') {
        const body = await readJson(req);
        const { fullName, phone, avatarUrl, currentPassword, newPassword } = body;
        const updates = {};
        if (fullName !== undefined) updates.fullName = String(fullName).trim();
        if (phone !== undefined) updates.phone = String(phone).trim();
        if (avatarUrl !== undefined) updates.avatarUrl = String(avatarUrl).trim();

        // Password change — require currentPassword match
        if (newPassword) {
          if (!currentPassword) return res.status(400).json({ error: 'Current password required' });
          if (String(newPassword).length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters' });
          const me = await Profile.findById(admin._id).select('+passwordHash');
          if (!me) return res.status(404).json({ error: 'Profile not found' });
          const ok = await bcrypt.compare(currentPassword, me.passwordHash);
          if (!ok) return res.status(403).json({ error: 'Current password is incorrect' });
          updates.passwordHash = await bcrypt.hash(newPassword, 12);
        }

        if (!Object.keys(updates).length) return res.status(400).json({ error: 'No fields to update' });

        await Profile.updateOne({ _id: admin._id }, { $set: updates });

        await AdminLog.create({
          adminId: admin._id,
          action: 'admin_self_update',
          targetType: 'user',
          targetId: admin._id,
          details: { fields: Object.keys(updates).filter(k => k !== 'passwordHash'), passwordChanged: !!newPassword },
        });

        return res.status(200).json({ ok: true });
      }

      return res.status(405).json({ error: 'Method not allowed' });
    }


    // ============ COMPANIES (IPO catalog) ============
    if (resource === 'logs') {
      if (req.method === 'GET') {
        const page = Math.max(1, parseInt(req.query.page || '1', 10));
        const limit = Math.min(100, Math.max(10, parseInt(req.query.limit || '50', 10)));
        const skip = (page - 1) * limit;

        // Build filter
        const filter = {};
        if (req.query.action && req.query.action !== 'all') {
          filter.action = req.query.action;
        }
        if (req.query.targetType && req.query.targetType !== 'all') {
          filter.targetType = req.query.targetType;
        }
        if (req.query.adminId) {
          filter.adminId = req.query.adminId;
        }
        if (req.query.search) {
          // Search admin by email — need to lookup first
          const q = String(req.query.search).toLowerCase().trim();
          if (q) {
            const matchAdmins = await Profile.find({
              email: { $regex: q, $options: 'i' }
            }).select('_id').lean();
            const ids = matchAdmins.map(a => a._id);
            if (ids.length) filter.adminId = { $in: ids };
            else filter.adminId = null; // no match → empty result
          }
        }
        if (req.query.from || req.query.to) {
          filter.createdAt = {};
          if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
          if (req.query.to) {
            const end = new Date(req.query.to);
            end.setHours(23,59,59,999);
            filter.createdAt.$lte = end;
          }
        }

        const [logs, total, totalAll, todayCount, actionsAgg] = await Promise.all([
          AdminLog.find(filter)
            .populate('adminId', 'email fullName')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
          AdminLog.countDocuments(filter),
          AdminLog.countDocuments({}),
          AdminLog.countDocuments({
            createdAt: { $gte: new Date(new Date().setHours(0,0,0,0)) }
          }),
          AdminLog.aggregate([
            { $group: { _id: '$action', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 20 }
          ]),
        ]);

        const rows = logs.map(l => ({
          _id: l._id,
          adminId: l.adminId?._id || l.adminId,
          adminEmail: l.adminId?.email || '—',
          adminName: l.adminId?.fullName || '',
          action: l.action,
          targetType: l.targetType,
          targetId: l.targetId,
          details: l.details || {},
          ipAddress: l.ipAddress || '',
          createdAt: l.createdAt,
        }));

        return res.status(200).json({
          success: true,
          logs: rows,
          pagination: {
            page, limit, total,
            totalPages: Math.ceil(total / limit),
            hasMore: skip + rows.length < total,
          },
          stats: {
            totalAll,
            todayCount,
            filteredCount: total,
            topActions: actionsAgg.map(a => ({ action: a._id, count: a.count })),
          },
        });
      }
      return res.status(405).json({ error: 'Method not allowed' });
    }

    if (resource === 'broadcast') {
      // Helper: build user query from target spec
      const buildQuery = (target) => {
        const base = { role: { $ne: 'admin' } };
        if (!target || target.type === 'all') return base;
        if (target.type === 'kyc_verified') return { ...base, kycStatus: 'approved' };
        if (target.type === 'kyc_pending') return { ...base, kycStatus: { $in: ['pending','not_submitted'] } };
        if (target.type === 'active') return { ...base, status: 'active' };
        if (target.type === 'emails') {
          const emails = Array.isArray(target.emails) ? target.emails.map(e => String(e).toLowerCase().trim()).filter(Boolean) : [];
          return { ...base, email: { $in: emails } };
        }
        if (target.type === 'date_range') {
          const q = { ...base };
          const range = {};
          if (target.from) range.$gte = new Date(target.from);
          if (target.to) { const end = new Date(target.to); end.setHours(23,59,59,999); range.$lte = end; }
          if (Object.keys(range).length) q.createdAt = range;
          return q;
        }
        return base;
      };

      // GET preview — return count only
      if (req.method === 'GET') {
        const target = {
          type: req.query.targetType || 'all',
          emails: req.query.emails ? req.query.emails.split(',') : [],
          from: req.query.from || null,
          to: req.query.to || null,
        };
        const count = await Profile.countDocuments(buildQuery(target));
        return res.status(200).json({ success: true, count });
      }

      // POST send broadcast
      if (req.method === 'POST') {
        const body = await readJson(req);
        const { title, message, type, link, target } = body;
        if (!title || !message) return res.status(400).json({ error: 'Title and message required' });
        const validType = ['admin','system'].includes(type) ? type : 'admin';
        const q = buildQuery(target || { type: 'all' });
        const users = await Profile.find(q).select('_id').lean();
        if (!users.length) return res.status(400).json({ error: 'No users matched target' });
        const docs = users.map(u => ({
          userId: u._id,
          type: validType,
          title: String(title).trim().slice(0, 200),
          message: String(message).trim().slice(0, 2000),
          link: String(link || '').trim().slice(0, 500),
          read: false,
        }));
        await Notification.insertMany(docs);

        // Optional: also send via email
        if (body.sendEmail) {
          try {
            const userIds = users.map(u => u._id);
            const full = await Profile.find({ _id: { $in: userIds }, email: { $exists: true, $ne: '' } }).select('email fullName').lean();
            // Fire in parallel batches of 25 to avoid hammering Resend
            const batchSize = 25;
            for (let i = 0; i < full.length; i += batchSize) {
              const batch = full.slice(i, i + batchSize);
              await Promise.all(batch.map(u => sendEmail({
                to: u.email,
                ...templates.broadcast(u.fullName, title, message, link)
              }).catch(e => console.error('[broadcast email]', u.email, e?.message))));
            }
          } catch(e) { console.error('[broadcast email] batch failed:', e); }
        }
        try {
          await AdminLog.create({
            adminId: adminUser._id,
            action: 'broadcast.send',
            targetType: 'system',
            details: { count: docs.length, target: target?.type || 'all', title: docs[0].title },
          });
        } catch(e) {}
        return res.status(200).json({ success: true, sent: docs.length });
      }
      return res.status(405).json({ error: 'Method not allowed' });
    }

    if (resource === 'settings') {
      // GET — fetch (or create default) settings
      if (req.method === 'GET') {
        let doc = await Settings.findOne({ key: 'global' }).lean();
        if (!doc) {
          doc = await Settings.create({ key: 'global' });
          doc = doc.toObject();
        }
        return res.status(200).json({ success: true, settings: doc });
      }
      // PATCH — update settings (partial)
      if (req.method === 'PATCH') {
        const body = await readJson(req);
        const update = {};
        if (body.bank) update.bank = body.bank;
        if (body.system) update.system = body.system;
        update.updatedBy = adminUser._id;
        const doc = await Settings.findOneAndUpdate(
          { key: 'global' },
          { $set: update },
          { new: true, upsert: true }
        ).lean();
        // Audit log
        try {
          await AdminLog.create({
            adminId: adminUser._id,
            action: 'settings.update',
            targetType: 'system',
            details: { keys: Object.keys(update) },
          });
        } catch(e) {}
        return res.status(200).json({ success: true, settings: doc });
      }
      return res.status(405).json({ error: 'Method not allowed' });
    }

    if (resource === 'holdings') {
      // GET — list all holdings across all users (joined with profile)
      if (req.method === 'GET') {
        const holdings = await Holding.find({})
          .populate('userId', 'email fullName')
          .sort({ createdAt: -1 })
          .lean();
        const rows = holdings.map(h => ({
          _id: h._id,
          userId: h.userId?._id || h.userId,
          userEmail: h.userId?.email || '—',
          userName: h.userId?.fullName || '',
          ticker: h.symbol || h.ticker || '',
          companyName: h.companyName || '',
          shares: Number(h.shares) || 0,
          pricePerShare: Number(h.avgPriceUSD) || 0,
          currentPrice: Number(h.currentPriceUSD) || 0,
          totalValue: Number(h.totalInvestedUSD) || 0,
          currentValue: (Number(h.shares) || 0) * (Number(h.currentPriceUSD) || Number(h.avgPriceUSD) || 0),
          createdAt: h.createdAt,
        }));
        const totalUsd = rows.reduce((a, r) => a + r.totalValue, 0);
        return res.status(200).json({
          success: true,
          holdings: rows,
          stats: {
            totalHoldings: rows.length,
            totalUsd: Number(totalUsd.toFixed(2)),
            uniqueUsers: new Set(rows.map(r => String(r.userId))).size,
            uniqueCompanies: new Set(rows.map(r => r.ticker)).size,
          }
        });
      }

      // ─── POST — Admin actions ───
      if (req.method === 'POST') {
        const body = await readJson(req);
        const action = (body.action || '').toLowerCase();
        const holdingId = body.holdingId;
        const reason = (body.reason || '').trim();

        // Fetch holding first (all actions need it except 'create')
        let holding = null;
        if (holdingId) {
          holding = await Holding.findById(holdingId);
          if (!holding) return res.status(404).json({ error: 'Holding not found' });
        }
        if (action !== 'create' && !holding) {
          return res.status(400).json({ error: 'holdingId required' });
        }


        // ── ADJUST — edit any/all fields ──
        if (action === 'adjust') {
          const before = { shares: holding.shares, avgPriceUSD: holding.avgPriceUSD, currentPriceUSD: holding.currentPriceUSD, totalInvestedUSD: holding.totalInvestedUSD, companyName: holding.companyName };
          const updates = {};
          if (body.shares !== undefined)          updates.shares          = Number(body.shares);
          if (body.avgPriceUSD !== undefined)     updates.avgPriceUSD     = Number(body.avgPriceUSD);
          if (body.currentPriceUSD !== undefined) updates.currentPriceUSD = Number(body.currentPriceUSD);
          if (body.totalInvestedUSD !== undefined) updates.totalInvestedUSD = Number(body.totalInvestedUSD);
          if (body.companyName !== undefined)     updates.companyName     = String(body.companyName);

          // Auto-recompute totalInvestedUSD if shares+avg changed but not totalInvested
          if (body.shares !== undefined && body.avgPriceUSD !== undefined && body.totalInvestedUSD === undefined) {
            updates.totalInvestedUSD = Number(body.shares) * Number(body.avgPriceUSD);
          }

          Object.assign(holding, updates);
          await holding.save();

          await Notification.create({
            userId: holding.userId,
            type: 'holding',
            title: 'Holding updated by admin',
            message: `Your ${holding.symbol} holding was updated. Reason: ${reason}`,
            link: '/portfolio',
          });

          await AdminLog.create({
            adminId: admin._id, action: 'holding-adjust',
            targetType: 'holding', targetId: holding._id,
            details: { adminEmail: admin.email, symbol: holding.symbol, before, after: updates, reason },
          });
          return res.status(200).json({ success: true, holding });
        }

        // ── SET-PRICE — quick change to currentPriceUSD only ──
        if (action === 'set-price') {
          const newPrice = Number(body.currentPriceUSD);
          if (!newPrice || newPrice <= 0) return res.status(400).json({ error: 'valid currentPriceUSD required' });
          const before = { currentPriceUSD: holding.currentPriceUSD };
          const oldVal = (holding.currentPriceUSD || holding.avgPriceUSD) * holding.shares;
          const newVal = newPrice * holding.shares;
          const paperPnl = newVal - oldVal;

          const oldPrice = holding.currentPriceUSD || holding.avgPriceUSD || 0;
          const deltaAbs = newPrice - oldPrice;
          const deltaPct = oldPrice > 0 ? (deltaAbs / oldPrice) * 100 : 0;

          // No-op guard: skip if price essentially unchanged (< 1 cent)
          if (Math.abs(deltaAbs) < 0.01) {
            return res.status(200).json({ success: true, holding, paperPnl: 0, noop: true, message: 'Price unchanged, no snapshot recorded' });
          }

          holding.currentPriceUSD = newPrice;
          await holding.save();

          // ── Auto-snapshot every price change ──
          if (ValuationSnapshot) {
            try {
              await ValuationSnapshot.create({
                holdingId: holding._id,
                symbol: holding.symbol,
                userId: holding.userId,
                price: newPrice,
                oldPrice,
                deltaAbs,
                deltaPct,
                changeReason: reason || 'Admin adjustment',
                source: 'admin',
                changedBy: admin._id,
              });
            } catch(e) { console.error('[snapshot]', e.message); }
          }

          const pnlSign = paperPnl >= 0 ? '+' : '';
          const pnlEmoji = paperPnl >= 0 ? '📈' : '📉';
          await Notification.create({
            userId: holding.userId,
            type: 'holding',
            title: `${holding.symbol} price updated ${pnlEmoji}`,
            message: `New price: $${newPrice.toFixed(2)}. Unrealized change: ${pnlSign}$${Math.abs(paperPnl).toFixed(2)}.${reason ? ' Reason: ' + reason : ''}`,
            link: '/portfolio',
          });

          await AdminLog.create({
            adminId: admin._id, action: 'holding-set-price',
            targetType: 'holding', targetId: holding._id,
            details: { adminEmail: admin.email, symbol: holding.symbol, before, after: { currentPriceUSD: newPrice, paperPnl }, reason },
          });
          return res.status(200).json({ success: true, holding, paperPnl });
        }

        // ── REALIZE-PNL — CREDIT ONLY (payouts, dividends, refunds) ──
        // Admins should NEVER debit users through this — they already paid when reserving.
        // Use "Delete without refund" for penalties, or "Write Down" (set-price) for paper losses.
        if (action === 'realize-pnl') {
          const amount = Number(body.amount);
          if (!amount || isNaN(amount) || amount <= 0) {
            return res.status(400).json({ error: 'Amount must be POSITIVE. To reduce a user\'s cash use a manual withdrawal instead. Paper losses should use "Set Price".' });
          }

          const user = await Profile.findById(holding.userId);
          if (!user) return res.status(404).json({ error: 'User not found' });
          const beforeBalance = user.balanceUSD || 0;

          await Profile.updateOne({ _id: user._id }, { $inc: { balanceUSD: amount } });

          await Notification.create({
            userId: user._id,
            type: 'deposit',
            title: `${holding.symbol} · Payout received`,
            message: `$${amount.toFixed(2)} credited to your account from ${holding.symbol}. Reason: ${reason}. New balance: $${(beforeBalance + amount).toFixed(2)}.`,
            link: '/dashboard',
          });

          await AdminLog.create({
            adminId: admin._id, action: 'holding-realize-pnl',
            targetType: 'holding', targetId: holding._id,
            details: { adminEmail: admin.email, symbol: holding.symbol, amount, beforeBalance, afterBalance: beforeBalance + amount, reason },
          });
          return res.status(200).json({ success: true, delta: amount, beforeBalance, afterBalance: beforeBalance + amount });
        }

        // ── LIQUIDATE — sell all shares at admin price, credit user, delete holding ──
        if (action === 'liquidate') {
          const salePrice = Number(body.salePrice);
          if (!salePrice || salePrice <= 0) return res.status(400).json({ error: 'valid salePrice required' });
          const proceeds = salePrice * holding.shares;
          const pnl = proceeds - (holding.totalInvestedUSD || 0);

          await Profile.updateOne({ _id: holding.userId }, { $inc: { balanceUSD: proceeds } });
          const before = holding.toObject();
          await Holding.deleteOne({ _id: holding._id });

          const pnlSign = pnl >= 0 ? '+' : '';
          const pnlEmoji = pnl >= 0 ? '📈' : '📉';
          await Notification.create({
            userId: holding.userId,
            type: 'holding',
            title: `${holding.symbol} liquidated ${pnlEmoji}`,
            message: `Sold ${holding.shares} shares at $${salePrice.toFixed(2)}. Proceeds: $${proceeds.toFixed(2)}. P&L: ${pnlSign}$${Math.abs(pnl).toFixed(2)}. Reason: ${reason}`,
            link: '/dashboard',
          });

          await AdminLog.create({
            adminId: admin._id, action: 'holding-liquidate',
            targetType: 'holding', targetId: holding._id,
            details: { adminEmail: admin.email, symbol: holding.symbol, salePrice, proceeds, pnl, before, reason },
          });
          return res.status(200).json({ success: true, proceeds, pnl });
        }

        // ── DELETE — with optional refund ──
        if (action === 'delete') {
          const refund = !!body.refund;
          let refundAmount = 0;
          if (refund) {
            refundAmount = holding.totalInvestedUSD || 0;
            if (refundAmount > 0) {
              await Profile.updateOne({ _id: holding.userId }, { $inc: { balanceUSD: refundAmount } });
            }
          }
          const before = holding.toObject();
          await Holding.deleteOne({ _id: holding._id });

          if (refundAmount > 0) {
            await Notification.create({
              userId: holding.userId,
              type: 'holding',
              title: `${holding.symbol} removed`,
              message: `Your ${holding.symbol} holding was removed by admin. Refund: $${refundAmount.toFixed(2)}. Reason: ${reason}`,
              link: '/portfolio',
            });
          } else {
            await Notification.create({
              userId: holding.userId,
              type: 'holding',
              title: `${holding.symbol} removed`,
              message: `Your ${holding.symbol} holding was removed. Reason: ${reason}`,
              link: '/portfolio',
            });
          }

          await AdminLog.create({
            adminId: admin._id, action: 'holding-delete',
            targetType: 'holding', targetId: holding._id,
            details: { adminEmail: admin.email, symbol: holding.symbol, refund, refundAmount, before, reason },
          });
          return res.status(200).json({ success: true, deleted: true, refundAmount });
        }

        // ── CREATE — manually give a holding to a user ──
        if (action === 'create') {
          const targetUserId = body.userId;
          const symbol = (body.symbol || '').toUpperCase().trim();
          const shares = Number(body.shares);
          const avgPriceUSD = Number(body.avgPriceUSD);
          const companyName = body.companyName || '';
          const chargeUser = body.chargeUser !== false;

          if (!targetUserId) return res.status(400).json({ error: 'userId required' });
          if (!symbol)  return res.status(400).json({ error: 'symbol required' });
          if (!shares || shares <= 0) return res.status(400).json({ error: 'shares must be > 0' });
          if (!avgPriceUSD || avgPriceUSD <= 0) return res.status(400).json({ error: 'avgPriceUSD must be > 0' });

          const user = await Profile.findById(targetUserId);
          if (!user) return res.status(404).json({ error: 'User not found' });

          const totalInvestedUSD = shares * avgPriceUSD;
          if (chargeUser) {
            if ((user.balanceUSD || 0) < totalInvestedUSD) {
              return res.status(400).json({ error: 'User has insufficient balance ($' + (user.balanceUSD||0).toFixed(2) + ' vs required $' + totalInvestedUSD.toFixed(2) + ')' });
            }
            await Profile.updateOne({ _id: user._id }, { $inc: { balanceUSD: -totalInvestedUSD } });
          }

          const holding = await Holding.create({
            userId: user._id, symbol, companyName,
            shares, avgPriceUSD,
            totalInvestedUSD,
            currentPriceUSD: avgPriceUSD,
            lastPurchaseAt: new Date(),
          });

          await Notification.create({
            userId: user._id,
            type: 'holding',
            title: `${symbol} allocated`,
            message: `Admin allocated ${shares} shares of ${symbol} @ $${avgPriceUSD.toFixed(2)}${chargeUser ? ` (charged $${totalInvestedUSD.toFixed(2)})` : ' (free)'}. Reason: ${reason}`,
            link: '/portfolio',
          });

          await AdminLog.create({
            adminId: admin._id, action: 'holding-create',
            targetType: 'holding', targetId: holding._id,
            details: { adminEmail: admin.email, symbol, shares, avgPriceUSD, totalInvestedUSD, chargeUser, reason },
          });
          return res.status(201).json({ success: true, holding });
        }


        // ── HISTORY — get valuation snapshots for a holding ──
        if (action === 'history') {
          if (!ValuationSnapshot) return res.status(500).json({ error: 'ValuationSnapshot model not loaded' });
          const snapshots = await ValuationSnapshot.find({
            $or: [
              { holdingId: holding._id },
              { symbol: holding.symbol, userId: holding.userId },
            ]
          }).sort({ createdAt: -1 }).limit(50).lean();
          return res.status(200).json({ success: true, snapshots });
        }

        // ── SET-LOCKUP — set lockedUntil date on a holding ──
        if (action === 'set-lockup') {
          const lockedUntil = body.lockedUntil ? new Date(body.lockedUntil) : null;
          const lockupDays = Number(body.lockupDays) || 0;
          const before = { lockedUntil: holding.lockedUntil, lockupDays: holding.lockupDays };

          if (lockedUntil && isNaN(lockedUntil.getTime())) {
            return res.status(400).json({ error: 'Invalid lockedUntil date' });
          }

          holding.lockedUntil = lockedUntil;
          holding.lockupDays = lockupDays;
          if (body.notes !== undefined) holding.notes = String(body.notes || '');
          await holding.save();

          const dateStr = lockedUntil ? lockedUntil.toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric'}) : 'None';
          await Notification.create({
            userId: holding.userId,
            type: 'holding',
            title: `${holding.symbol} lock-up updated`,
            message: `Lock-up set until ${dateStr}. Shares cannot be liquidated before this date.${reason ? ' Reason: ' + reason : ''}`,
            link: '/portfolio',
          });

          await AdminLog.create({
            adminId: admin._id, action: 'holding-set-lockup',
            targetType: 'holding', targetId: holding._id,
            details: { adminEmail: admin.email, symbol: holding.symbol, before, after: { lockedUntil, lockupDays }, reason },
          });
          return res.status(200).json({ success: true, holding });
        }

        return res.status(400).json({ error: 'Unknown holdings action: ' + action });
      }

      return res.status(405).json({ error: 'Method not allowed' });
    }

    if (resource === 'companies') {
      if (req.method === 'GET') {
        const ticker = (req.query.ticker || '').toUpperCase().trim();
        if (ticker) {
          const c = await Company.findOne({ ticker }).lean();
          if (!c) return res.status(404).json({ error: 'Company not found' });
          return res.status(200).json({ ok: true, company: c });
        }
        const companies = await Company.find({}).sort({ sortOrder: 1, name: 1 }).lean();
        return res.status(200).json({ ok: true, count: companies.length, companies });
      }

      if (req.method === 'POST') {
        const body = await readJson(req);
        if (!body.ticker || !body.name) return res.status(400).json({ error: 'ticker and name required' });
        body.ticker = String(body.ticker).toUpperCase().trim();
        const exists = await Company.findOne({ ticker: body.ticker });
        if (exists) return res.status(409).json({ error: 'Ticker already exists' });
        const c = await Company.create(body);
        await AdminLog.create({ adminId: admin._id, action: 'company_create', targetType: 'company', targetId: c._id, details: { ticker: c.ticker, name: c.name } });
        return res.status(201).json({ ok: true, company: c });
      }

      if (req.method === 'PUT' || req.method === 'PATCH') {
        const body = await readJson(req);
        const { id, ticker, ...updates } = body;
        if (!id && !ticker) return res.status(400).json({ error: 'id or ticker required' });
        const query = id ? { _id: id } : { ticker: String(ticker).toUpperCase().trim() };
        const c = await Company.findOneAndUpdate(query, { $set: updates }, { new: true });
        if (!c) return res.status(404).json({ error: 'Company not found' });
        await AdminLog.create({ adminId: admin._id, action: 'company_update', targetType: 'company', targetId: c._id, details: { fields: Object.keys(updates) } });
        return res.status(200).json({ ok: true, company: c });
      }

      if (req.method === 'DELETE') {
        const id = req.query.id;
        const ticker = (req.query.ticker || '').toUpperCase().trim();
        if (!id && !ticker) return res.status(400).json({ error: 'id or ticker required' });
        const query = id ? { _id: id } : { ticker };
        const c = await Company.findOne(query);
        if (!c) return res.status(404).json({ error: 'Company not found' });
        await Company.deleteOne(query);
        await AdminLog.create({ adminId: admin._id, action: 'company_delete', targetType: 'company', targetId: c._id, details: { ticker: c.ticker, name: c.name } });
        return res.status(200).json({ ok: true });
      }

      return res.status(405).json({ error: 'Method not allowed' });
    }



    // ═══════════════════════════════════════════════════════════════

    // ═══════════════════════════════════════════════════════════════
    // ============ EVENTS (LiquidityEvent CRUD) ============
    // ═══════════════════════════════════════════════════════════════
    if (resource === 'events') {
      if (!LiquidityEvent) return res.status(500).json({ error: 'LiquidityEvent model not loaded' });

      // GET — list events, optionally filter by symbol
      if (req.method === 'GET') {
        const symbol = (req.query.symbol || '').toUpperCase().trim();
        const filter = {};
        if (symbol) filter.symbol = symbol;
        const events = await LiquidityEvent.find(filter).sort({ effectiveDate: -1 }).limit(200).lean();
        return res.status(200).json({ success: true, count: events.length, events });
      }

      // POST actions
      if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
      const body = await readJson(req);
      const action = (body.action || 'create').toLowerCase();

      // ── CREATE event ──
      if (action === 'create') {
        const symbol = (body.symbol || '').toUpperCase().trim();
        const eventType = (body.eventType || '').toLowerCase();
        const title = (body.title || '').trim();
        if (!symbol) return res.status(400).json({ error: 'symbol required' });
        if (!['funding','tender','ipo','acquisition','update','dividend','split'].includes(eventType)) {
          return res.status(400).json({ error: 'invalid eventType' });
        }
        if (!title) return res.status(400).json({ error: 'title required' });

        const evt = await LiquidityEvent.create({
          symbol,
          companyName: (body.companyName || '').trim(),
          eventType, title,
          description: (body.description || '').trim(),
          pricePerShare: body.pricePerShare != null ? Number(body.pricePerShare) : null,
          applyToHoldings: !!body.applyToHoldings,
          effectiveDate: body.effectiveDate ? new Date(body.effectiveDate) : new Date(),
          createdBy: admin._id,
        });

        // Auto-apply if requested
        if (evt.applyToHoldings && evt.pricePerShare) {
          const holdings = await Holding.find({ symbol }).lean();
          let affected = 0;
          for (const h of holdings) {
            const oldPrice = h.currentPriceUSD || h.avgPriceUSD || 0;
            const newPrice = evt.pricePerShare;
            if (Math.abs(oldPrice - newPrice) < 0.0001) continue;
            const deltaAbs = newPrice - oldPrice;
            const deltaPct = oldPrice > 0 ? (deltaAbs / oldPrice) * 100 : 0;

            await Holding.updateOne({ _id: h._id }, { $set: { currentPriceUSD: newPrice } });

            if (ValuationSnapshot) {
              try {
                await ValuationSnapshot.create({
                  holdingId: h._id, symbol, userId: h.userId,
                  price: newPrice, oldPrice, deltaAbs, deltaPct,
                  changeReason: title,
                  source: 'event',
                  eventId: evt._id,
                  changedBy: admin._id,
                });
              } catch(e) { console.error('[snapshot]', e.message); }
            }

            const pnlSign = deltaAbs >= 0 ? '+' : '';
            const pnlEmoji = deltaAbs >= 0 ? '📈' : '📉';
            try {
              await Notification.create({
                userId: h.userId,
                type: 'holding',
                title: `${symbol} · ${title} ${pnlEmoji}`,
                message: `New valuation: $${newPrice.toFixed(2)} (${pnlSign}${deltaPct.toFixed(2)}%). ${evt.description || ''}`,
                link: '/portfolio',
              });
            } catch(e) {}
            affected++;
          }
          evt.affectedHoldings = affected;
          evt.applied = true;
          evt.appliedAt = new Date();
          await evt.save();
        }

        await AdminLog.create({
          adminId: admin._id, action: 'event-create',
          targetType: 'holding', targetId: evt._id,
          details: { adminEmail: admin.email, symbol, eventType, title, price: evt.pricePerShare, applied: evt.applied, affected: evt.affectedHoldings },
        });
        return res.status(201).json({ success: true, event: evt });
      }

      // ── APPLY an existing event (if not already applied) ──
      if (action === 'apply') {
        const eventId = body.eventId;
        if (!eventId) return res.status(400).json({ error: 'eventId required' });
        const evt = await LiquidityEvent.findById(eventId);
        if (!evt) return res.status(404).json({ error: 'Event not found' });
        if (evt.applied) return res.status(400).json({ error: 'Event already applied' });
        if (!evt.pricePerShare) return res.status(400).json({ error: 'Event has no pricePerShare to apply' });

        const holdings = await Holding.find({ symbol: evt.symbol }).lean();
        let affected = 0;
        for (const h of holdings) {
          const oldPrice = h.currentPriceUSD || h.avgPriceUSD || 0;
          const newPrice = evt.pricePerShare;
          if (Math.abs(oldPrice - newPrice) < 0.0001) continue;
          const deltaAbs = newPrice - oldPrice;
          const deltaPct = oldPrice > 0 ? (deltaAbs / oldPrice) * 100 : 0;
          await Holding.updateOne({ _id: h._id }, { $set: { currentPriceUSD: newPrice } });
          if (ValuationSnapshot) {
            try {
              await ValuationSnapshot.create({
                holdingId: h._id, symbol: evt.symbol, userId: h.userId,
                price: newPrice, oldPrice, deltaAbs, deltaPct,
                changeReason: evt.title, source: 'event', eventId: evt._id, changedBy: admin._id,
              });
            } catch(e) {}
          }
          try {
            await Notification.create({
              userId: h.userId,
              type: 'holding',
              title: `${evt.symbol} · ${evt.title}`,
              message: `New valuation: $${newPrice.toFixed(2)} (${deltaAbs>=0?'+':''}${deltaPct.toFixed(2)}%). ${evt.description || ''}`,
              link: '/portfolio',
            });
          } catch(e) {}
          affected++;
        }
        evt.affectedHoldings = affected;
        evt.applied = true;
        evt.appliedAt = new Date();
        await evt.save();

        await AdminLog.create({
          adminId: admin._id, action: 'event-apply',
          targetType: 'holding', targetId: evt._id,
          details: { adminEmail: admin.email, symbol: evt.symbol, affected },
        });
        return res.status(200).json({ success: true, event: evt, affected });
      }

      // ── DELETE event ──
      if (action === 'delete') {
        const eventId = body.eventId;
        if (!eventId) return res.status(400).json({ error: 'eventId required' });
        const evt = await LiquidityEvent.findById(eventId);
        if (!evt) return res.status(404).json({ error: 'Event not found' });
        await LiquidityEvent.deleteOne({ _id: evt._id });
        await AdminLog.create({
          adminId: admin._id, action: 'event-delete',
          targetType: 'holding', targetId: evt._id,
          details: { adminEmail: admin.email, symbol: evt.symbol, title: evt.title },
        });
        return res.status(200).json({ success: true, deleted: true });
      }

      return res.status(400).json({ error: 'Unknown events action: ' + action });
    }


        // ============ TRADES (positions) ============
    // ═══════════════════════════════════════════════════════════════
    if (resource === 'trades') {
      const action = (req.query.action || (req.method === 'GET' ? 'list' : '')).toLowerCase();

      // ─── STATS ───
      if (req.method === 'GET' && req.query.stats === '1') {
        const [openCount, closedCount, positions] = await Promise.all([
          Position.countDocuments({ status: 'open' }),
          Position.countDocuments({ status: 'closed' }),
          Position.find({}).lean(),
        ]);
        let totalNotional = 0, totalCostBasis = 0, realizedPnlAll = 0, realizedPnlToday = 0, realizedPnl7d = 0;
        const tickerCounts = {};
        const now = Date.now();
        const dayMs = 86400000;
        positions.forEach(p => {
          if (p.status === 'open') {
            totalCostBasis += p.costBasis || 0;
            totalNotional  += (p.currentPrice || p.entryPrice) * (p.quantity || 0);
          } else {
            const pnl = p.realizedPnl || 0;
            realizedPnlAll += pnl;
            if (p.closedAt && (now - new Date(p.closedAt).getTime()) < dayMs) realizedPnlToday += pnl;
            if (p.closedAt && (now - new Date(p.closedAt).getTime()) < 7 * dayMs) realizedPnl7d += pnl;
          }
          tickerCounts[p.ticker] = (tickerCounts[p.ticker] || 0) + 1;
        });
        const topTickers = Object.entries(tickerCounts)
          .sort((a,b) => b[1] - a[1]).slice(0, 5)
          .map(([ticker, count]) => ({ ticker, count }));
        return res.status(200).json({
          ok: true,
          stats: {
            openCount, closedCount,
            totalNotional, totalCostBasis,
            realizedPnlAll, realizedPnlToday, realizedPnl7d,
            topTickers,
          }
        });
      }

      // ─── LIST ───
      if (req.method === 'GET') {
        const status = (req.query.status || 'open').toLowerCase();
        const ticker = (req.query.ticker || '').toUpperCase().trim();
        const userSearch = (req.query.user || '').trim();
        const assetType = (req.query.assetType || '').toLowerCase();
        const limit = Math.min(parseInt(req.query.limit || '100'), 500);

        const filter = {};
        if (status === 'open' || status === 'closed') filter.status = status;
        if (ticker) filter.ticker = ticker;
        if (assetType && ['stock', 'crypto'].includes(assetType)) filter.assetType = assetType;

        if (userSearch) {
          const users = await Profile.find({
            $or: [
              { email: { $regex: userSearch, $options: 'i' } },
              { fullName: { $regex: userSearch, $options: 'i' } },
            ]
          }).select('_id').lean();
          filter.userId = { $in: users.map(u => u._id) };
        }

        const positions = await Position.find(filter).sort({ openedAt: -1 }).limit(limit).lean();
        const userIds = [...new Set(positions.map(p => String(p.userId)))];
        const users = await Profile.find({ _id: { $in: userIds } }).select('email fullName').lean();
        const userMap = Object.fromEntries(users.map(u => [String(u._id), u]));

        // Fetch live prices for open positions
        const openTickers = [...new Set(positions.filter(p => p.status === 'open').map(p => p.ticker))];
        const livePrices = {};
        await Promise.all(openTickers.map(async t => {
          const q = await adminFillPrice(t);
          if (q) livePrices[t] = q.price;
        }));

        const enriched = positions.map(p => {
          const u = userMap[String(p.userId)] || {};
          const currentPrice = p.status === 'open' ? (livePrices[p.ticker] || p.entryPrice) : p.exitPrice;
          const currentValue = currentPrice * p.quantity;
          const pnl = p.status === 'open' ? (currentValue - p.costBasis) : (p.realizedPnl || 0);
          const pnlPct = p.costBasis > 0 ? (pnl / p.costBasis) * 100 : 0;
          return {
            id: p._id,
            userId: p.userId,
            userEmail: u.email || '?',
            userName: u.fullName || '',
            ticker: p.ticker,
            assetType: p.assetType,
            quantity: p.quantity,
            entryPrice: p.entryPrice,
            costBasis: p.costBasis,
            currentPrice, currentValue, pnl, pnlPct,
            status: p.status,
            openedAt: p.openedAt,
            closedAt: p.closedAt,
            exitPrice: p.exitPrice,
            realizedPnl: p.realizedPnl,
            companyName: p.companyName || '',
            logoUrl: p.logoUrl || '',
          };
        });
        return res.status(200).json({ ok: true, count: enriched.length, positions: enriched });
      }

      // ─── POST actions ───
      if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
      const body = await readJson(req);

      // ─── CLOSE (force close) ───
      if (action === 'close') {
        const positionId = body.positionId;
        if (!positionId) return res.status(400).json({ error: 'positionId required' });
        const p = await Position.findById(positionId);
        if (!p) return res.status(404).json({ error: 'Position not found' });
        if (p.status !== 'open') return res.status(400).json({ error: 'Position already closed' });

        let exitPrice = Number(body.exitPrice);
        if (!exitPrice || exitPrice <= 0) {
          const q = await adminFillPrice(p.ticker);
          if (!q) return res.status(400).json({ error: 'No live price for ' + p.ticker + ' — provide exitPrice manually' });
          exitPrice = q.bid;
        }

        const proceeds = exitPrice * p.quantity;
        const realizedPnl = proceeds - p.costBasis;
        const before = { entryPrice: p.entryPrice, quantity: p.quantity, costBasis: p.costBasis, status: p.status };

        p.exitPrice = exitPrice;
        p.closedAt = new Date();
        p.realizedPnl = realizedPnl;
        p.status = 'closed';
        await p.save();

        await Profile.updateOne({ _id: p.userId }, { $inc: { balanceUSD: proceeds } });

        await Notification.create({
          userId: p.userId,
          type: 'trade',
          title: 'Position closed by admin',
          message: `Your ${p.ticker} position was closed at $${exitPrice.toFixed(2)}. Proceeds: $${proceeds.toFixed(2)}.` + (body.reason ? ' Reason: ' + body.reason : ''),
          link: '/positions',
        });

        await adminLog(admin, 'trade-close', p.userId, 'trades', before,
          { exitPrice, proceeds, realizedPnl, status: 'closed' }, body.reason);

        return res.status(200).json({ ok: true, position: p, exitPrice, proceeds, realizedPnl });
      }

      // ─── ADJUST (edit position fields) ───
      if (action === 'adjust') {
        const positionId = body.positionId;
        if (!positionId) return res.status(400).json({ error: 'positionId required' });
        const p = await Position.findById(positionId);
        if (!p) return res.status(404).json({ error: 'Position not found' });

        const before = { entryPrice: p.entryPrice, quantity: p.quantity, costBasis: p.costBasis, companyName: p.companyName, logoUrl: p.logoUrl, realizedPnl: p.realizedPnl };
        const updates = {};
        if (body.entryPrice !== undefined) updates.entryPrice = Number(body.entryPrice);
        if (body.quantity !== undefined)   updates.quantity   = Number(body.quantity);
        if (body.costBasis !== undefined)  updates.costBasis  = Number(body.costBasis);
        if (body.companyName !== undefined) updates.companyName = String(body.companyName);
        if (body.logoUrl !== undefined)    updates.logoUrl = String(body.logoUrl);
        if (body.realizedPnl !== undefined && p.status === 'closed') updates.realizedPnl = Number(body.realizedPnl);
        if (body.exitPrice !== undefined && p.status === 'closed')   updates.exitPrice   = Number(body.exitPrice);

        // Auto-recompute costBasis if entry+qty changed but no explicit costBasis
        if (body.entryPrice !== undefined && body.quantity !== undefined && body.costBasis === undefined) {
          updates.costBasis = Number(body.entryPrice) * Number(body.quantity);
        }

        Object.assign(p, updates);
        await p.save();

        await Notification.create({
          userId: p.userId,
          type: 'trade',
          title: 'Position adjusted by admin',
          message: `Your ${p.ticker} position was updated.` + (body.reason ? ' Reason: ' + body.reason : ''),
          link: '/positions',
        });

        await adminLog(admin, 'trade-adjust', p.userId, 'trades', before, updates, body.reason);
        return res.status(200).json({ ok: true, position: p });
      }

      // ─── DELETE (with optional refund) ───
      if (action === 'delete') {
        const positionId = body.positionId;
        const refund = !!body.refund;
        if (!positionId) return res.status(400).json({ error: 'positionId required' });
        const p = await Position.findById(positionId);
        if (!p) return res.status(404).json({ error: 'Position not found' });

        let refundAmount = 0;
        if (refund && p.status === 'open') {
          const q = await adminFillPrice(p.ticker);
          const px = q ? q.bid : p.entryPrice;
          refundAmount = px * p.quantity;
          await Profile.updateOne({ _id: p.userId }, { $inc: { balanceUSD: refundAmount } });
        }

        const before = p.toObject();
        await Position.deleteOne({ _id: p._id });

        if (refundAmount > 0) {
          await Notification.create({
            userId: p.userId,
            type: 'trade',
            title: 'Position removed by admin',
            message: `Your ${p.ticker} position was removed. Refund: $${refundAmount.toFixed(2)}.` + (body.reason ? ' Reason: ' + body.reason : ''),
            link: '/positions',
          });
        }

        await adminLog(admin, 'trade-delete', p.userId, 'trades', before,
          { deleted: true, refundAmount }, body.reason);

        return res.status(200).json({ ok: true, deleted: true, refundAmount });
      }

      // ─── CREATE (manual trade for user) ───
      if (action === 'create') {
        const targetUserId = body.userId;
        const ticker = (body.ticker || '').toUpperCase().trim();
        const quantity = Number(body.quantity);
        const entryPrice = Number(body.entryPrice);
        const chargeUser = body.chargeUser !== false;  // default true
        const assetType = _CRYPTO_MAP[ticker] ? 'crypto' : 'stock';

        if (!targetUserId) return res.status(400).json({ error: 'userId required' });
        if (!ticker) return res.status(400).json({ error: 'ticker required' });
        if (!quantity || quantity <= 0) return res.status(400).json({ error: 'invalid quantity' });
        if (!entryPrice || entryPrice <= 0) return res.status(400).json({ error: 'invalid entryPrice' });

        const user = await Profile.findById(targetUserId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const costBasis = entryPrice * quantity;
        if (chargeUser) {
          if ((user.balanceUSD || 0) < costBasis) {
            return res.status(400).json({ error: 'User has insufficient balance ($' + (user.balanceUSD||0).toFixed(2) + ' available, needs $' + costBasis.toFixed(2) + ')' });
          }
          await Profile.updateOne({ _id: user._id }, { $inc: { balanceUSD: -costBasis } });
        }

        const position = await Position.create({
          userId: user._id,
          ticker, assetType,
          side: 'long',
          entryPrice, quantity, costBasis,
          status: 'open',
          openedAt: new Date(),
          companyName: body.companyName || '',
          logoUrl: body.logoUrl || '/images/logos/' + ticker.toLowerCase() + '.png',
        });

        await Notification.create({
          userId: user._id,
          type: 'trade',
          title: 'Position opened by admin',
          message: `Admin opened a ${ticker} position for you: ${quantity} shares @ $${entryPrice.toFixed(2)}.` + (body.reason ? ' Reason: ' + body.reason : ''),
          link: '/positions',
        });

        await adminLog(admin, 'trade-create', user._id, 'trades', null,
          { ticker, quantity, entryPrice, costBasis, chargeUser }, body.reason);

        return res.status(201).json({ ok: true, position });
      }

      // ─── MASS CLOSE all open positions for a user ───
      if (action === 'mass-close') {
        const targetUserId = body.userId;
        if (!targetUserId) return res.status(400).json({ error: 'userId required' });
        const positions = await Position.find({ userId: targetUserId, status: 'open' });
        if (!positions.length) return res.status(200).json({ ok: true, closed: 0 });

        let totalProceeds = 0;
        const closedIds = [];
        for (const p of positions) {
          const q = await adminFillPrice(p.ticker);
          const px = q ? q.bid : p.entryPrice;
          const proceeds = px * p.quantity;
          p.exitPrice = px;
          p.closedAt = new Date();
          p.realizedPnl = proceeds - p.costBasis;
          p.status = 'closed';
          await p.save();
          totalProceeds += proceeds;
          closedIds.push(p._id);
        }
        await Profile.updateOne({ _id: targetUserId }, { $inc: { balanceUSD: totalProceeds } });

        await Notification.create({
          userId: targetUserId,
          type: 'trade',
          title: 'All positions closed by admin',
          message: `${positions.length} position(s) closed. Total proceeds: $${totalProceeds.toFixed(2)}.` + (body.reason ? ' Reason: ' + body.reason : ''),
          link: '/positions',
        });

        await adminLog(admin, 'trade-mass-close', targetUserId, 'trades', null,
          { count: positions.length, totalProceeds, closedIds }, body.reason);

        return res.status(200).json({ ok: true, closed: positions.length, totalProceeds });
      }

      return res.status(400).json({ error: 'Unknown trade action: ' + action });
    }



    // ═══════════════════════════════════════════════════════════════
    // ============ ORDERS-ADMIN (pending limit/stop orders) ============
    // ═══════════════════════════════════════════════════════════════
    if (resource === 'orders-admin') {
      if (!Order) return res.status(500).json({ error: 'Order model not loaded' });
      const action = (req.query.action || (req.method === 'GET' ? 'list' : '')).toLowerCase();

      // ─── LIST all orders across users ───
      if (req.method === 'GET') {
        const status = (req.query.status || 'pending').toLowerCase();
        const ticker = (req.query.ticker || '').toUpperCase().trim();
        const userSearch = (req.query.user || '').trim();
        const limit = Math.min(parseInt(req.query.limit || '100'), 500);

        const filter = {};
        if (status === 'pending') filter.status = { $in: ['pending', 'partially_filled'] };
        else if (status !== 'all') filter.status = status;
        if (ticker) filter.ticker = ticker;

        if (userSearch) {
          const users = await Profile.find({
            $or: [
              { email: { $regex: userSearch, $options: 'i' } },
              { fullName: { $regex: userSearch, $options: 'i' } },
            ]
          }).select('_id').lean();
          filter.userId = { $in: users.map(u => u._id) };
        }

        const orders = await Order.find(filter).sort({ placedAt: -1 }).limit(limit).lean();
        const userIds = [...new Set(orders.map(o => String(o.userId)))];
        const users = await Profile.find({ _id: { $in: userIds } }).select('email fullName').lean();
        const userMap = Object.fromEntries(users.map(u => [String(u._id), u]));

        const enriched = orders.map(o => {
          const u = userMap[String(o.userId)] || {};
          return { ...o, userEmail: u.email || '?', userName: u.fullName || '' };
        });
        return res.status(200).json({ ok: true, count: enriched.length, orders: enriched });
      }

      // ─── POST actions ───
      if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
      const body = await readJson(req);

      // ─── CANCEL any order ───
      if (action === 'cancel') {
        const orderId = body.orderId;
        if (!orderId) return res.status(400).json({ error: 'orderId required' });
        const o = await Order.findById(orderId);
        if (!o) return res.status(404).json({ error: 'Order not found' });
        if (!['pending', 'partially_filled'].includes(o.status)) {
          return res.status(400).json({ error: 'Cannot cancel a ' + o.status + ' order' });
        }

        // Refund reserved buying power (for buy orders)
        let refund = 0;
        if (o.side === 'buy' && o.dollarAmount) {
          const filled = (o.filledShares || 0) * (o.filledPrice || 0);
          refund = (o.dollarAmount || 0) - filled;
          if (refund > 0) await Profile.updateOne({ _id: o.userId }, { $inc: { balanceUSD: refund } });
        }

        const before = { status: o.status };
        o.status = 'cancelled';
        o.cancelledAt = new Date();
        await o.save();

        await Notification.create({
          userId: o.userId,
          type: 'order',
          title: 'Order cancelled by admin',
          message: `Your ${o.orderType} order for ${o.ticker} was cancelled.` + (refund > 0 ? ` Refund: $${refund.toFixed(2)}.` : '') + (body.reason ? ' Reason: ' + body.reason : ''),
          link: '/orders',
        });

        await adminLog(admin, 'order-cancel', o.userId, 'orders-admin', before,
          { status: 'cancelled', refund }, body.reason);

        return res.status(200).json({ ok: true, order: o, refund });
      }

      return res.status(400).json({ error: 'Unknown orders-admin action: ' + action });
    }

    // ═══════════════════════════════════════════════════════════════
    // ============ CASH-ADJUST (add/remove balance from user) ============
    // ═══════════════════════════════════════════════════════════════
    if (resource === 'cash-adjust') {
      if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
      const body = await readJson(req);
      const targetUserId = body.userId;
      const amount = Number(body.amount);   // + = credit, - = debit
      const reason = body.reason || '';

      if (!targetUserId) return res.status(400).json({ error: 'userId required' });
      if (!amount || isNaN(amount)) return res.status(400).json({ error: 'valid amount required (positive to credit, negative to debit)' });
      if (!reason.trim()) return res.status(400).json({ error: 'reason required for audit' });

      const user = await Profile.findById(targetUserId);
      if (!user) return res.status(404).json({ error: 'User not found' });

      const before = user.balanceUSD || 0;
      if (amount < 0 && Math.abs(amount) > before) {
        return res.status(400).json({ error: 'Debit exceeds balance ($' + before.toFixed(2) + ')' });
      }

      await Profile.updateOne({ _id: user._id }, { $inc: { balanceUSD: amount } });
      const after = before + amount;

      const verb = amount >= 0 ? 'credited' : 'debited';
      const amtStr = '$' + Math.abs(amount).toFixed(2);
      await Notification.create({
        userId: user._id,
        type: amount >= 0 ? 'deposit' : 'withdrawal',
        title: `Balance ${verb} by admin`,
        message: `${amtStr} was ${verb} to your account. Reason: ${reason}. New balance: $${after.toFixed(2)}.`,
        link: '/dashboard',
      });

      await adminLog(admin, 'cash-adjust', user._id, 'cash-adjust',
        { balanceUSD: before }, { balanceUSD: after, delta: amount }, reason);

      return res.status(200).json({ ok: true, before, after, delta: amount });
    }




    // ═══════════════════════════════════════════════════════════════
    // TEMP: Seed TeraFab (TFAB) — admin-only, remove after use
    // ═══════════════════════════════════════════════════════════════
    if (resource === 'seed-terafab') {
      if (req.method !== 'POST') return res.status(405).json({ error: 'POST required' });
      const TFAB = {
        ticker: 'TFAB',
        name: 'TeraFab',
        sector: 'Semiconductor Infrastructure',
        stage: 'Construction JV',
        status: 'active',
        valuation: '$16.8B build-out',
        pricePerShare: 125.00,
        minInvestment: 500,
        maxInvestment: 250000,
        availableShares: 100000000,
        reservedShares: 0,
        successRate: 92,
        expectedReturn: 'Royalty on wafer output + convertible to JV equity in 2028',
        growthYoY: 'Pre-production',
        ipoWindow: 'Q1 2026 – Q4 2028 (construction phase)',
        foundedYear: 2025,
        hq: 'Grimes County, Texas',
        domain: 'terafab.com',
        logoUrl: '/assets/terafab-logo.png',
        description: 'Direct capital participation in the construction of a $16.8 billion captive semiconductor foundry. Investors fund the physical build-out alongside Tesla (TSLA), SpaceX (SPCX) and Intel (INTC) — earning returns through offtake royalties and eventual JV equity conversion when the fab reaches production in Q4 2028.',
        showOnHomepage: true,
        sortOrder: 1.5,
      };
      const existing = await Company.findOne({ ticker: 'TFAB' });
      let action, doc;
      if (existing) {
        Object.assign(existing, TFAB);
        doc = await existing.save();
        action = 'updated';
      } else {
        doc = await Company.create(TFAB);
        action = 'created';
      }
      const total = await Company.countDocuments({ status: 'active' });
      await adminLog(admin, 'seed-terafab-' + action, null, 'company',
        existing ? { ticker: 'TFAB' } : null,
        { ticker: 'TFAB', stage: 'Construction JV', price: 125 },
        'Manual TFAB seed via admin API');
      return res.status(200).json({
        ok: true,
        action,
        company: { ticker: doc.ticker, name: doc.name, stage: doc.stage, price: doc.pricePerShare, sortOrder: doc.sortOrder },
        totalActiveCompanies: total,
      });
    }

    // Fallback — no known resource matched
    return res.status(400).json({ error: 'Missing or invalid resource parameter' });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

