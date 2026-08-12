const mongoose = require('mongoose');

const LiquidityEventSchema = new mongoose.Schema(
  {
    // Which company
    symbol:        { type: String, required: true, uppercase: true, trim: true, index: true },
    companyName:   { type: String, default: '', trim: true },

    // Event details
    eventType:     { type: String, enum: ['funding', 'tender', 'ipo', 'acquisition', 'update', 'dividend', 'split'], required: true },
    title:         { type: String, required: true, trim: true },
    description:   { type: String, default: '', trim: true },

    // Optional price impact — if set, all holdings for this symbol get updated
    pricePerShare: { type: Number, default: null },
    applyToHoldings: { type: Boolean, default: false },

    // Timing
    effectiveDate: { type: Date, default: Date.now, index: true },

    // Metadata
    createdBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'Profile', default: null },

    // Track how many holdings were affected when applied
    affectedHoldings: { type: Number, default: 0 },
    applied:       { type: Boolean, default: false },
    appliedAt:     { type: Date, default: null },
  },
  {
    timestamps: true,
    collection: 'liquidity_events',
  }
);

LiquidityEventSchema.index({ symbol: 1, effectiveDate: -1 });

module.exports = mongoose.models.LiquidityEvent || mongoose.model('LiquidityEvent', LiquidityEventSchema);
