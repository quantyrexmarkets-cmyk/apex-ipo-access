const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Profile',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['deposit', 'withdrawal', 'kyc', 'trade', 'system', 'admin', 'holding', 'order', 'error', 'warning', 'promo'],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
    },
    link: {
      type: String,
      default: '',
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'notifications',
  }
);

module.exports = mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);
