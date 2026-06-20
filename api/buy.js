const dbConnect = require('./_lib/db');
const readJson = require('./_lib/readJson');
const { requireAuth } = require('./_lib/auth');
const Profile = require('../models/Profile');
const Holding = require('../models/Holding');
const Notification = require('../models/Notification');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await dbConnect();
    const user = await requireAuth(req, res, Profile);
    if (!user) return;

    const body = await readJson(req);
    const symbol = (body.symbol || '').toUpperCase().trim();
    const companyName = body.companyName || '';
    const shares = Number(body.shares);
    const pricePerShare = Number(body.pricePerShare);

    if (!symbol) {
      return res.status(400).json({ error: 'Symbol required' });
    }
    if (!shares || shares <= 0) {
      return res.status(400).json({ error: 'Invalid share quantity' });
    }
    if (!pricePerShare || pricePerShare <= 0) {
      return res.status(400).json({ error: 'Invalid price per share' });
    }

    const totalCost = shares * pricePerShare;

    // Check KYC
    if (user.kycStatus !== 'approved') {
      return res.status(403).json({ error: 'KYC approval required before trading' });
    }

    // Check balance
    if (totalCost > (user.balanceUSD || 0)) {
      return res.status(400).json({
        error: 'Insufficient balance',
        required: totalCost,
        available: user.balanceUSD || 0,
      });
    }

    // Deduct balance
    await Profile.updateOne(
      { _id: user._id },
      { $inc: { balanceUSD: -totalCost } }
    );

    // Upsert holding (create or update)
    const existing = await Holding.findOne({ userId: user._id, symbol });

    let holding;

    if (existing) {
      const newShares = existing.shares + shares;
      const newTotalInvested = existing.totalInvestedUSD + totalCost;
      const newAvgPrice = newTotalInvested / newShares;

      holding = await Holding.findOneAndUpdate(
        { userId: user._id, symbol },
        {
          $set: {
            shares: newShares,
            totalInvestedUSD: newTotalInvested,
            avgPriceUSD: newAvgPrice,
            currentPriceUSD: pricePerShare,
            lastPurchaseAt: new Date(),
            companyName: companyName || existing.companyName,
          },
        },
        { new: true }
      );
    } else {
      holding = await Holding.create({
        userId: user._id,
        symbol,
        companyName,
        shares,
        avgPriceUSD: pricePerShare,
        currentPriceUSD: pricePerShare,
        totalInvestedUSD: totalCost,
        lastPurchaseAt: new Date(),
      });
    }

    await Notification.create({
      userId: user._id,
      type: 'trade',
      title: 'Shares purchased',
      message: `You bought ${shares} shares of ${symbol} for $${totalCost.toFixed(2)}.`,
      link: '/portfolio',
    });

    return res.status(201).json({
      ok: true,
      holding,
      newBalanceUSD: (user.balanceUSD || 0) - totalCost,
      orderSummary: {
        symbol,
        shares,
        pricePerShare,
        totalCost,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
