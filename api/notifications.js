const dbConnect = require('./_lib/db');
const readJson = require('./_lib/readJson');
const { requireAuth } = require('./_lib/auth');
const Profile = require('../models/Profile');
const Notification = require('../models/Notification');

module.exports = async (req, res) => {
  try {
    await dbConnect();
    const user = await requireAuth(req, res, Profile);
    if (!user) return;

    // GET /api/notifications → list user's notifications
    if (req.method === 'GET') {
      const notifications = await Notification.find({ userId: user._id })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();

      const unreadCount = await Notification.countDocuments({
        userId: user._id,
        read: false,
      });

      return res.status(200).json({
        ok: true,
        notifications,
        unreadCount,
      });
    }

    // POST /api/notifications → mark as read
    // Body: { id: "...", all: true (optional) }
    if (req.method === 'POST') {
      const body = await readJson(req);

      if (body.all === true) {
        await Notification.updateMany(
          { userId: user._id, read: false },
          { $set: { read: true, readAt: new Date() } }
        );
        return res.status(200).json({ ok: true, message: 'All marked as read' });
      }

      if (!body.id) {
        return res.status(400).json({ error: 'Notification id required' });
      }

      await Notification.updateOne(
        { _id: body.id, userId: user._id },
        { $set: { read: true, readAt: new Date() } }
      );

      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
