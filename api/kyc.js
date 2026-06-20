const dbConnect = require('./_lib/db');
const readJson = require('./_lib/readJson');
const { requireAuth } = require('./_lib/auth');
const Profile = require('../models/Profile');
const KycDocument = require('../models/KycDocument');
const Notification = require('../models/Notification');

module.exports = async (req, res) => {
  try {
    await dbConnect();
    const user = await requireAuth(req, res, Profile);
    if (!user) return;

    // GET /api/kyc → fetch user's KYC submission
    if (req.method === 'GET') {
      const doc = await KycDocument.findOne({ userId: user._id })
        .sort({ createdAt: -1 })
        .lean();

      return res.status(200).json({
        ok: true,
        kycStatus: user.kycStatus,
        document: doc || null,
      });
    }

    // POST /api/kyc → submit KYC
    if (req.method === 'POST') {
      const body = await readJson(req);

      const documentType = body.documentType;
      const fullName = (body.fullName || '').trim();
      const documentNumber = (body.documentNumber || '').trim();
      const dateOfBirth = body.dateOfBirth ? new Date(body.dateOfBirth) : null;
      const country = (body.country || '').trim();
      const address = (body.address || '').trim();
      const city = (body.city || '').trim();
      const postalCode = (body.postalCode || '').trim();
      const frontImageUrl = body.frontImageUrl || '';
      const backImageUrl = body.backImageUrl || '';
      const selfieUrl = body.selfieUrl || '';

      const validTypes = ['passport', 'drivers_license', 'national_id', 'proof_of_address', 'selfie', 'other'];
      if (!validTypes.includes(documentType)) {
        return res.status(400).json({ error: 'Invalid document type' });
      }

      if (!fullName || !country) {
        return res.status(400).json({ error: 'Full name and country required' });
      }

      if (user.kycStatus === 'approved') {
        return res.status(400).json({ error: 'KYC already approved' });
      }

      if (user.kycStatus === 'pending') {
        return res.status(400).json({ error: 'KYC submission already pending review' });
      }

      const doc = await KycDocument.create({
        userId: user._id,
        documentType,
        fullName,
        documentNumber,
        dateOfBirth,
        country,
        address,
        city,
        postalCode,
        frontImageUrl,
        backImageUrl,
        selfieUrl,
        status: 'pending',
      });

      await Profile.updateOne(
        { _id: user._id },
        { $set: { kycStatus: 'pending', fullName } }
      );

      await Notification.create({
        userId: user._id,
        type: 'kyc',
        title: 'KYC submitted',
        message: 'Your identity verification is pending review.',
        link: '/kyc',
      });

      return res.status(201).json({ ok: true, document: doc });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
