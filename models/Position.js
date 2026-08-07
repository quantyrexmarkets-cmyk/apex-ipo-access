const mongoose = require('mongoose');

const PositionSchema = new mongoose.Schema(
  {
    userId:      { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Profile', index: true },
    ticker:      { type: String, required: true, uppercase: true, trim: true, index: true },
    assetType:   { type: String, enum: ['stock', 'crypto'], required: true, index: true },

    // Entry
    side:        { type: String, enum: ['long'], default: 'long' },
    entryPrice:  { type: Number, required: true },
    quantity:    { type: Number, required: true },
    costBasis:   { type: Number, required: true },  // entryPrice × quantity

    // Exit (populated when closed)
    exitPrice:    { type: Number, default: null },
    closedAt:     { type: Date, default: null },
    realizedPnl:  { type: Number, default: null },

    // State
    status:      { type: String, enum: ['open', 'closed'], default: 'open', index: true },
    openedAt:    { type: Date, default: Date.now },

    // For display convenience
    companyName: { type: String, default: '' },
    logoUrl:     { type: String, default: '' },
  },
  { timestamps: true, collection: 'positions' }
);

PositionSchema.index({ userId: 1, status: 1 });
PositionSchema.index({ userId: 1, ticker: 1, status: 1 });

module.exports = mongoose.models.Position || mongoose.model('Position', PositionSchema);
