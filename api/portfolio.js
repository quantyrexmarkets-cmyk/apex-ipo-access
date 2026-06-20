const dbConnect = require('./_lib/db');
const { requireAuth } = require('./_lib/auth');
const Profile = require('../models/Profile');
const Holding = require('../models/Holding');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await dbConnect();
    const user = await requireAuth(req, res, Profile);
    if (!user) return;

    const holdings = await Holding.find({ userId: user._id })
      .sort({ totalInvestedUSD: -1 })
      .lean();

    let totalInvestedUSD = 0;
    let totalCurrentValueUSD = 0;

    const enriched = holdings.map(h => {
      const currentValue = (h.currentPriceUSD || h.avgPriceUSD) * h.shares;
      const pnlUSD = currentValue - h.totalInvestedUSD;
      const pnlPercent = h.totalInvestedUSD > 0
        ? (pnlUSD / h.totalInvestedUSD) * 100
        : 0;

      totalInvestedUSD += h.totalInvestedUSD;
      totalCurrentValueUSD += currentValue;

      return {
        id: h._id,
        symbol: h.symbol,
        companyName: h.companyName,
        shares: h.shares,
        avgPriceUSD: h.avgPriceUSD,
        currentPriceUSD: h.currentPriceUSD || h.avgPriceUSD,
        totalInvestedUSD: h.totalInvestedUSD,
        currentValueUSD: currentValue,
        pnlUSD,
        pnlPercent,
        lastPurchaseAt: h.lastPurchaseAt,
      };
    });

    const totalPnlUSD = totalCurrentValueUSD - totalInvestedUSD;
    const totalPnlPercent = totalInvestedUSD > 0
      ? (totalPnlUSD / totalInvestedUSD) * 100
      : 0;

    return res.status(200).json({
      ok: true,
      portfolio: {
        cashBalanceUSD: user.balanceUSD || 0,
        totalInvestedUSD,
        totalCurrentValueUSD,
        totalPnlUSD,
        totalPnlPercent,
        totalEquityUSD: (user.balanceUSD || 0) + totalCurrentValueUSD,
        holdings: enriched,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
