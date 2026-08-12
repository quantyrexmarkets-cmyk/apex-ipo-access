/**
 * Seed TeraFab (TFAB) — captive JV between Tesla, SpaceX & Intel
 * Run: node scripts/seed-terafab.js
 * Re-run safe: uses upsert.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Company = require('../models/Company');

const TERAFAB = {
  ticker: 'TFAB',
  name: 'TeraFab',
  sector: 'Semiconductor Manufacturing',
  stage: 'Live IPO',
  status: 'active',
  valuation: '$12.5B pre-money',
  pricePerShare: 125.00,
  minInvestment: 500,
  maxInvestment: 250000,
  availableShares: 100_000_000,
  reservedShares: 0,
  successRate: 92,
  expectedReturn: '3.5× – 6× by 2030',
  growthYoY: 'Pre-revenue',
  ipoWindow: 'Q3 2029 – Q1 2030',
  foundedYear: 2025,
  hq: 'Grimes County, Texas',
  domain: 'terafab.com',
  logoUrl: '/assets/terafab-logo.png',
  description: 'TeraFab is a captive joint venture funded and operated exclusively by Tesla (TSLA) and SpaceX (SPCX), alongside technical partner Intel (INTC). The three founders are pooling internal corporate resources to build a $16.8 billion advanced-node semiconductor facility in Grimes County, Texas — securing sovereign silicon supply for EV powertrains, Dojo AI compute, Starlink phased-array radios, and Optimus neural processors.',
  showOnHomepage: true,
  sortOrder: 2, // right after SPCX (assumed sortOrder 1)
};

(async () => {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) { console.error('❌ MONGODB_URI env var missing'); process.exit(1); }
  await mongoose.connect(uri);
  console.log('✅ Connected to MongoDB');

  const existing = await Company.findOne({ ticker: 'TFAB' });
  if (existing) {
    console.log('ℹ️  TFAB already exists — updating fields');
    Object.assign(existing, TERAFAB);
    await existing.save();
    console.log('✅ TFAB updated:', existing._id);
  } else {
    const doc = await Company.create(TERAFAB);
    console.log('✅ TFAB created:', doc._id);
  }

  const total = await Company.countDocuments({ status: 'active' });
  console.log(`📊 Total active companies: ${total}`);
  await mongoose.disconnect();
  console.log('✅ Done');
})().catch(e => { console.error('❌', e); process.exit(1); });
