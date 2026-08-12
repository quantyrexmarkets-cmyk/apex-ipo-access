const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema(
  {
    userId:      { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Profile', index: true },
    ticker:      { type: String, required: true, uppercase: true, trim: true, index: true },
    assetType:   { type: String, enum: ['stock', 'crypto'], required: true },

    // Order details
    side:        { type: String, enum: ['buy', 'sell'], required: true },
    orderType:   { type: String, enum: ['market', 'limit', 'stop'], required: true },
    timeInForce: { type: String, enum: ['gtc', 'day', 'ioc'], default: 'gtc' },

    // Sizing (one of these two)
    dollarAmount:  { type: Number, default: null },  // for buys sized in USD
    shares:        { type: Number, default: null },  // for sells or exact-share buys

    // Trigger price (for limit/stop)
    limitPrice:   { type: Number, default: null },

    // State
    status:       { type: String, enum: ['pending', 'filled', 'partially_filled', 'cancelled', 'rejected', 'expired'], default: 'pending', index: true },
    filledShares: { type: Number, default: 0 },
    filledPrice:  { type: Number, default: null },  // avg fill price
    filledAt:     { type: Date, default: null },
    rejectReason: { type: String, default: '' },

    // Links
    positionId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Position', default: null },

    // Display
    companyName:  { type: String, default: '' },
    logoUrl:      { type: String, default: '' },

    // Audit
    placedAt:     { type: Date, default: Date.now },
    cancelledAt:  { type: Date, default: null },
  },
  { timestamps: true, collection: 'orders' }
);

OrderSchema.index({ userId: 1, status: 1, placedAt: -1 });
OrderSchema.index({ status: 1, orderType: 1 });  // for cron

module.exports = mongoose.models.Order || mongoose.model('Order', OrderSchema);
