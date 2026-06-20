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

module.exports = async (req, res) => {
  try {
    await dbConnect();
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
            role: user.role,
            status: user.status,
            accountStatus: user.accountStatus,
            kycStatus: user.kycStatus,
            emailVerified: user.emailVerified,
            balanceUSD: user.balanceUSD || 0,
            createdAt: user.createdAt,
          },
          deposits, withdrawals, holdings, kycDocuments: kyc,
        });
      }

      if (req.method === 'PUT') {
        const body = await readJson(req);
        const { id, status, role, kycStatus, emailVerified, fullName, accountStatus } = body;
        if (!id) return res.status(400).json({ error: 'User id required' });

        const updates = {};
        if (status && ['active', 'disabled'].includes(status)) updates.status = status;
        if (role && ['user', 'admin'].includes(role)) updates.role = role;
        if (accountStatus && ['pending', 'approved', 'rejected'].includes(accountStatus)) updates.accountStatus = accountStatus;
        if (kycStatus && ['not_submitted', 'pending', 'approved', 'rejected'].includes(kycStatus)) updates.kycStatus = kycStatus;
        if (typeof emailVerified === 'boolean') updates.emailVerified = emailVerified;
        if (typeof fullName === 'string') updates.fullName = fullName.trim();

        if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No valid fields' });
        if (id === admin._id.toString() && updates.role && updates.role !== 'admin') {
          return res.status(400).json({ error: 'Cannot demote yourself' });
        }

        const user = await Profile.findByIdAndUpdate(id, updates, { new: true }).lean();
        if (!user) return res.status(404).json({ error: 'User not found' });

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

      await Notification.create({
        userId: targetUser._id, type: 'admin', title: 'Balance updated',
        message: `Your balance was ${adjustType === 'set' ? 'set to' : 'adjusted by'} $${numAmount}. ${reason || ''}`.trim(),
        link: '/account',
      });

      await AdminLog.create({
        adminId: admin._id, action: 'balance_adjust', targetType: 'user',
        targetId: targetUser._id,
        details: { type: adjustType, amount: numAmount, oldBalance, newBalance, reason: reason || '' },
      });

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

        await Notification.create({
          userId: deposit.userId, type: 'deposit',
          title: `Deposit ${deposit.status}`,
          message: action === 'approve'
            ? `Your deposit of $${deposit.amountUSD} has been approved and credited.`
            : `Your deposit of $${deposit.amountUSD} was rejected. ${note || ''}`.trim(),
          link: '/activity',
        });

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

        const msgMap = {
          approve: `Your withdrawal of $${withdrawal.amountUSD} is being processed.`,
          complete: `Your withdrawal of $${withdrawal.amountUSD} is complete.`,
          reject: `Your withdrawal of $${withdrawal.amountUSD} was rejected and refunded. ${note || ''}`.trim(),
        };

        await Notification.create({
          userId: withdrawal.userId, type: 'withdrawal',
          title: `Withdrawal ${withdrawal.status}`, message: msgMap[action], link: '/activity',
        });

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
          userId: doc.userId, type: 'kyc', title: `KYC ${doc.status}`,
          message: action === 'approve'
            ? 'Your identity has been verified. You can now trade and withdraw.'
            : `Your KYC was rejected. ${note || 'Please re-submit.'}`,
          link: '/kyc',
        });

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

    return res.status(400).json({ error: 'Missing or invalid resource parameter' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
