const mongoose = require('mongoose');

const WithdrawalSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Profile',
      required: true,
      index: true,
    },
    method: {
      type: String,
      enum: ['crypto', 'wire', 'bank', 'other'],
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
    destinationAddress: {
      type: String,
      default: '',
      trim: true,
    },
    destinationMemo: {
      type: String,
      default: '',
      trim: true,
    },
    bankDetails: {
      bankName: { type: String, default: '' },
      accountName: { type: String, default: '' },
      accountNumber: { type: String, default: '' },
      routingNumber: { type: String, default: '' },
      swiftCode: { type: String, default: '' },
      iban: { type: String, default: '' },
      country: { type: String, default: '' },
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'processing', 'completed', 'rejected', 'cancelled'],
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
    txHash: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
    collection: 'withdrawals',
  }
);

module.exports = mongoose.models.Withdrawal || mongoose.model('Withdrawal', WithdrawalSchema);
