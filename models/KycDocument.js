const mongoose = require('mongoose');

const KycDocumentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Profile',
      required: true,
      index: true,
    },
    documentType: {
      type: String,
      enum: ['passport', 'drivers_license', 'national_id', 'proof_of_address', 'selfie', 'other'],
      required: true,
    },
    documentNumber: {
      type: String,
      default: '',
      trim: true,
    },
    fullName: {
      type: String,
      default: '',
      trim: true,
    },
    dateOfBirth: {
      type: Date,
      default: null,
    },
    country: {
      type: String,
      default: '',
      trim: true,
    },
    address: {
      type: String,
      default: '',
      trim: true,
    },
    city: {
      type: String,
      default: '',
      trim: true,
    },
    postalCode: {
      type: String,
      default: '',
      trim: true,
    },
    frontImageUrl: {
      type: String,
      default: '',
    },
    backImageUrl: {
      type: String,
      default: '',
    },
    selfieUrl: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
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
    collection: 'kyc_documents',
  }
);

module.exports = mongoose.models.KycDocument || mongoose.model('KycDocument', KycDocumentSchema);
