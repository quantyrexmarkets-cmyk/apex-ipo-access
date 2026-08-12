const mongoose = require('mongoose');

const ProfileSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      index: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    fullName: {
      type: String,
      default: '',
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    status: {
      type: String,
      enum: ['active', 'disabled'],
      default: 'active',
    },
    accountStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    bannedReason: {
      type: String,
      default: '',
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerifyToken: { type: String, default: null, index: true },
    emailVerifyExpires: { type: Date, default: null },
    passwordResetToken: { type: String, default: null, index: true },
    passwordResetExpires: { type: Date, default: null },
    kycStatus: {
      type: String,
      enum: ['not_submitted', 'pending', 'approved', 'rejected'],
      default: 'not_submitted',
    },
    balanceUSD: {
      type: Number,
      default: 0,
    },
    // Extended profile from multi-step signup
    phone: { type: String, default: '' },
    addressLine1: { type: String, default: '' },
    addressLine2: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    zip: { type: String, default: '' },
    country: { type: String, default: '' },
    dob: { type: Date, default: null },
    ssn: { type: String, default: '', select: false },
    idNumber: { type: String, default: '' },
    idType: { type: String, default: '' },
    citizenship: { type: String, default: '' },
    occupation: { type: String, default: '' },
    employer: { type: String, default: '' },
    avatarUrl: { type: String, default: '' },
    accountTypes: { type: [String], default: [] },
    lastLoginAt: { type: Date, default: null },
    lastLoginIp: { type: String, default: '' },
    twoFactorEnabled: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    collection: 'profiles',
  }
);

module.exports = mongoose.models.Profile || mongoose.model('Profile', ProfileSchema);
