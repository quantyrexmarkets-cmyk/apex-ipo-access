const dbConnect = require('./_lib/db');
const readJson = require('./_lib/readJson');
const { requireAuth } = require('./_lib/auth');
const Profile = require('../models/Profile');
const Withdrawal = require('../models/Withdrawal');
const Notification = require('../models/Notification');

module.exports = async (req, res) => {
  try {
    await dbConnect();
    const user = await requireAuth(req, res, Profile);
    if (!user) return;

    // GET /api/withdrawals → list user's withdrawals
    if (req.method === 'GET') {
      const withdrawals = await Withdrawal.find({ userId: user._id })
        .sort({ createdAt: -1 })
        .limit(100)
        .lean();

      return res.status(200).json({ ok: true, withdrawals });
    }

    // POST /api/withdrawals → create a withdrawal request
    if (req.method === 'POST') {
      const body = await readJson(req);

      const method = body.method;
      const asset = (body.asset || 'USD').toUpperCase();
      const network = body.network || '';
      const amountUSD = Number(body.amountUSD);
      const destinationAddress = body.destinationAddress || '';
      const destinationMemo = body.destinationMemo || '';
      const bankDetails = body.bankDetails || {};

      if (!method || !['crypto', 'wire', 'bank', 'other'].includes(method)) {
        return res.status(400).json({ error: 'Invalid withdrawal method' });
      }

      if (!amountUSD || amountUSD <= 0) {
        return res.status(400).json({ error: 'Invalid amount' });
      }

      // Check KYC
      if (user.kycStatus !== 'approved') {
        return res.status(403).json({ error: 'KYC approval required before withdrawals' });
      }

      // Check balance
      if (amountUSD > (user.balanceUSD || 0)) {
        return res.status(400).json({ error: 'Insufficient balance' });
      }

      if (method === 'crypto' && !destinationAddress) {
        return res.status(400).json({ error: 'Destination address required for crypto withdrawals' });
      }

      // Reserve balance immediately (deduct on submission)
      await Profile.updateOne(
        { _id: user._id },
        { $inc: { balanceUSD: -amountUSD } }
      );

      const withdrawal = await Withdrawal.create({
        userId: user._id,
        method,
        asset,
        network,
        amountUSD,
        destinationAddress,
        destinationMemo,
        bankDetails,
        status: 'pending',
      });

      await Notification.create({
        userId: user._id,
        type: 'withdrawal',
        title: 'Withdrawal submitted',
        message: `Your ${method} withdrawal of $${amountUSD} is pending review.`,
        link: '/activity',
      });

      return res.status(201).json({ ok: true, withdrawal });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
