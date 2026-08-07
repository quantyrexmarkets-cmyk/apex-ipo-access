const mongoose = require('mongoose');

const ValuationSnapshotSchema = new mongoose.Schema(
  {
    holdingId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Holding', default: null, index: true },
    symbol:       { type: String, required: true, uppercase: true, trim: true, index: true },
    userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Profile', default: null, index: true },

    // Price data
    price:        { type: Number, required: true },  // new price
    oldPrice:     { type: Number, default: 0 },      // previous price
    deltaAbs:     { type: Number, default: 0 },      // price - oldPrice
    deltaPct:     { type: Number, default: 0 },      // % change

    // Context
    changeReason: { type: String, default: '', trim: true },
    source:       { type: String, enum: ['admin', 'event', 'system'], default: 'admin' },
    eventId:      { type: mongoose.Schema.Types.ObjectId, ref: 'LiquidityEvent', default: null },

    // Metadata
    changedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'Profile', default: null },
  },
  {
    timestamps: true,
    collection: 'valuation_snapshots',
  }
);

ValuationSnapshotSchema.index({ symbol: 1, createdAt: -1 });
ValuationSnapshotSchema.index({ holdingId: 1, createdAt: -1 });

module.exports = mongoose.models.ValuationSnapshot || mongoose.model('ValuationSnapshot', ValuationSnapshotSchema);
