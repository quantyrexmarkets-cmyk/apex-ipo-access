const dbConnect = require('./_lib/db');
const Company = require('../models/Company');

const TERAFAB = {
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

module.exports = async (req, res) => {
  const token = req.headers['x-seed-token'] || req.query.token;
  if (!process.env.SEED_TOKEN || token !== process.env.SEED_TOKEN) {
    return res.status(403).json({ ok: false, error: 'forbidden' });
  }
  try {
    await dbConnect();
    const existing = await Company.findOne({ ticker: 'TFAB' });
    let action, doc;
    if (existing) {
      Object.assign(existing, TERAFAB);
      doc = await existing.save();
      action = 'updated';
    } else {
      doc = await Company.create(TERAFAB);
      action = 'created';
    }
    const total = await Company.countDocuments({ status: 'active' });
    return res.status(200).json({
      ok: true,
      action,
      company: { ticker: doc.ticker, name: doc.name, stage: doc.stage, price: doc.pricePerShare, sortOrder: doc.sortOrder },
      totalActive: total,
    });
  } catch (e) {
    console.error('[seed-terafab]', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
};
