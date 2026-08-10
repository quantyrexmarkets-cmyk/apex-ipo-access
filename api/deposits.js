const dbConnect = require('./_lib/db');
const readJson = require('./_lib/readJson');
const { requireAuth } = require('./_lib/auth');
const Profile = require('../models/Profile');
const Deposit = require('../models/Deposit');
const Notification = require('../models/Notification');

module.exports = async (req, res) => {
  try {
    await dbConnect();
    const user = await requireAuth(req, res, Profile);
    if (!user) return;

    // GET /api/deposits → list user's deposits
    if (req.method === 'GET') {
      const deposits = await Deposit.find({ userId: user._id })
        .sort({ createdAt: -1 })
        .limit(100)
        .lean();

      return res.status(200).json({ ok: true, deposits });
    }

    // POST /api/deposits → create a new deposit
    if (req.method === 'POST') {
      const body = await readJson(req);

      const method = body.method;
      const asset = (body.asset || 'USD').toUpperCase();
      const network = body.network || '';
      const amountUSD = Number(body.amountUSD);
      const amountAsset = Number(body.amountAsset || 0);
      const txHash = body.txHash || '';
      const walletId = body.walletId || null;
      const proofUrl = body.proofUrl || '';

      if (!method || !['crypto', 'wire', 'card', 'other'].includes(method)) {
        return res.status(400).json({ error: 'Invalid deposit method' });
      }

      if (!amountUSD || amountUSD <= 0) {
        return res.status(400).json({ error: 'Invalid amount' });
      }

      const deposit = await Deposit.create({
        userId: user._id,
        method,
        asset,
        network,
        amountUSD,
        amountAsset,
        txHash,
        walletId,
        proofUrl,
        status: 'pending',
      });

      // Notify user
      const _fmt = (n) => Number(n||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
      const _methodLabel = method === 'crypto' ? `${asset} deposit` : (method === 'wire' ? 'wire deposit' : `${method} deposit`);
      await Notification.create({
        userId: user._id,
        type: 'deposit',
        title: 'Deposit received',
        message: `$${_fmt(amountUSD)} ${_methodLabel} is pending verification. Funds will reflect in your balance once confirmed.`,
        link: '/activity',
      });

      return res.status(201).json({ ok: true, deposit });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
