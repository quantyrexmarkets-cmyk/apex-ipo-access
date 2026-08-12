const mongoose = require('mongoose');

const SettingsSchema = new mongoose.Schema(
  {
    // Singleton key — only one settings doc exists
    key: {
      type: String,
      default: 'global',
      unique: true,
      required: true,
      index: true,
    },

    // Bank wire info (shown to users for wire deposits)
    bank: {
      bankName: { type: String, default: '' },
      accountHolder: { type: String, default: '' },
      accountNumber: { type: String, default: '' },
      routingNumber: { type: String, default: '' },
      swiftCode: { type: String, default: '' },
      iban: { type: String, default: '' },
      bankAddress: { type: String, default: '' },
      beneficiaryAddress: { type: String, default: '' },
      instructions: { type: String, default: '' },
      referenceFormat: { type: String, default: 'APEX-{userId}' },
    },

    // System toggles (used in Task F)
    system: {
      maintenanceMode: { type: Boolean, default: false },
      signupEnabled: { type: Boolean, default: true },
      maintenanceMessage: { type: String, default: 'We are performing scheduled maintenance. Please check back soon.' },
    },

    // Last update tracking
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Profile',
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'settings',
  }
);

module.exports = mongoose.models.Settings || mongoose.model('Settings', SettingsSchema);
