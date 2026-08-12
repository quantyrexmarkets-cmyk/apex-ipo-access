const mongoose = require('mongoose');

const DepositSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Profile',
      required: true,
      index: true,
    },
    method: {
      type: String,
      enum: ['crypto', 'wire', 'card', 'other'],
      required: true,
    },
    asset: {
      type: String,
      default: 'USD',
      uppercase: true,
      trim: true,
    },
    network: {
      type: String,
      default: '',
      trim: true,
    },
    amountUSD: {
      type: Number,
      required: true,
      min: 0,
    },
    amountAsset: {
      type: Number,
      default: 0,
    },
    txHash: {
      type: String,
      default: '',
      trim: true,
    },
    walletId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CryptoWallet',
      default: null,
    },
    proofUrl: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'cancelled'],
      default: 'pending',
      index: true,
    },
    adminNote: {
      type: String,
      default: '',
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Profile',
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'deposits',
  }
);

module.exports = mongoose.models.Deposit || mongoose.model('Deposit', DepositSchema);
