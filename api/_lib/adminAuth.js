const { requireAuth } = require('./auth');

async function requireAdmin(req, res, Profile) {
  const user = await requireAuth(req, res, Profile);
  if (!user) return null;

  if (user.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' });
    return null;
  }

  return user;
}

module.exports = { requireAdmin };
