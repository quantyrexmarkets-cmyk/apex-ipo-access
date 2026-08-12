const mongoose = require('mongoose');

const CryptoWalletSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      required: true,
      trim: true,
    },
    network: {
      type: String,
      required: true,
      trim: true,
    },
    asset: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    memo: {
      type: String,
      default: '',
      trim: true,
    },
    qrUrl: {
      type: String,
      default: '',
    },
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    collection: 'crypto_wallets',
  }
);

module.exports = mongoose.models.CryptoWallet || mongoose.model('CryptoWallet', CryptoWalletSchema);
