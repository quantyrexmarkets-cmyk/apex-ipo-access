const mongoose = require('mongoose');

const CompanySchema = new mongoose.Schema(
  {
    ticker: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    name: { type: String, required: true, trim: true },
    sector: { type: String, default: '' },
    stage: { type: String, default: 'IPO' }, // 'Live IPO' | 'IPO' | 'Public' | 'Closed'
    status: { type: String, enum: ['active', 'paused', 'closed'], default: 'active', index: true },
    valuation: { type: String, default: '' },
    pricePerShare: { type: Number, required: true, default: 0 },
    minInvestment: { type: Number, default: 0 },
    maxInvestment: { type: Number, default: 0 },
    availableShares: { type: Number, default: 0 },
    reservedShares: { type: Number, default: 0 },
    successRate: { type: Number, default: 0 },
    expectedReturn: { type: String, default: '' },
    growthYoY: { type: String, default: '' },
    ipoWindow: { type: String, default: '' },
    foundedYear: { type: Number, default: null },
    hq: { type: String, default: '' },
    domain: { type: String, default: '' },
    logoUrl: { type: String, default: '' },
    description: { type: String, default: '' },
    showOnHomepage: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true, collection: 'companies' }
);

module.exports = mongoose.models.Company || mongoose.model('Company', CompanySchema);
