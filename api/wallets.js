const dbConnect = require('./_lib/db');
const CryptoWallet = require('../models/CryptoWallet');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await dbConnect();

    const wallets = await CryptoWallet.find({ active: true })
      .sort({ sortOrder: 1, createdAt: 1 })
      .lean();

    const cleaned = wallets.map(w => ({
      id: w._id,
      label: w.label,
      network: w.network,
      asset: w.asset,
      address: w.address,
      memo: w.memo,
      qrUrl: w.qrUrl,
    }));

    return res.status(200).json({ ok: true, wallets: cleaned });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
