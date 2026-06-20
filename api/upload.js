const cloudinary = require('cloudinary').v2;
const dbConnect = require('./_lib/db');
const readJson = require('./_lib/readJson');
const { requireAuth } = require('./_lib/auth');
const Profile = require('../models/Profile');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

module.exports = async (req, res) => {
  try {
    await dbConnect();
    const user = await requireAuth(req, res, Profile);
    if (!user) return;

    const action = (req.query.action || '').toLowerCase();

    // ---- /api/upload?action=config ----
    if (action === 'config') {
      if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
      return res.status(200).json({
        ok: true,
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        uploadPreset: process.env.CLOUDINARY_UPLOAD_PRESET,
        folder: 'apex-ipo',
      });
    }

    // ---- /api/upload?action=sign ----
    if (action === 'sign') {
      if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
      const body = await readJson(req);
      const purpose = body.purpose || 'general';

      if (purpose === 'wallet_qr' && user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin only' });
      }

      const folderMap = {
        kyc: `apex-ipo/kyc/${user._id}`,
        deposit_proof: `apex-ipo/deposits/${user._id}`,
        wallet_qr: `apex-ipo/wallets`,
        general: `apex-ipo/general/${user._id}`,
      };

      const folder = folderMap[purpose] || folderMap.general;
      const timestamp = Math.round(Date.now() / 1000);
      const paramsToSign = { timestamp, folder };
      const signature = cloudinary.utils.api_sign_request(paramsToSign, process.env.CLOUDINARY_API_SECRET);

      return res.status(200).json({
        ok: true,
        signature, timestamp, folder,
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        apiKey: process.env.CLOUDINARY_API_KEY,
      });
    }

    return res.status(400).json({ error: 'Missing or invalid action parameter' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
