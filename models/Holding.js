const mongoose = require('mongoose');

const HoldingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Profile',
      required: true,
      index: true,
    },
    symbol: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    companyName: {
      type: String,
      default: '',
      trim: true,
    },
    shares: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    avgPriceUSD: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    totalInvestedUSD: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    currentPriceUSD: {
      type: Number,
      default: 0,
    },
    lastPurchaseAt: {
      type: Date,
      default: null,
    },
    lockedUntil: {
      type: Date,
      default: null,
    },
    lockupDays: {
      type: Number,
      default: 0,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
    collection: 'holdings',
  }
);

HoldingSchema.index({ userId: 1, symbol: 1 }, { unique: true });

module.exports = mongoose.models.Holding || mongoose.model('Holding', HoldingSchema);
