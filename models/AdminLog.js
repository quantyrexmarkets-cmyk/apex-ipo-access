const mongoose = require('mongoose');

const AdminLogSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Profile',
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      trim: true,
    },
    targetType: {
      type: String,
      enum: ['user', 'deposit', 'withdrawal', 'kyc', 'wallet', 'holding', 'system', 'trade', 'order', 'cash'],
      required: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ipAddress: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
    collection: 'admin_log',
  }
);

module.exports = mongoose.models.AdminLog || mongoose.model('AdminLog', AdminLogSchema);
