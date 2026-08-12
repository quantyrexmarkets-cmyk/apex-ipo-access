const jwt = require('jsonwebtoken');
const { serialize, parse } = require('cookie');

const COOKIE_NAME = 'apex_token';

function signToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
}

function verifyToken(token) {
  try { return jwt.verify(token, process.env.JWT_SECRET); }
  catch { return null; }
}

function setAuthCookie(res, token) {
  const cookie = serialize(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60, // 1 hour — sliding window via requireAuth
  });
  res.setHeader('Set-Cookie', cookie);
}

function clearAuthCookie(res) {
  const cookie = serialize(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: new Date(0),
  });
  res.setHeader('Set-Cookie', cookie);
}

function getTokenFromReq(req) {
  const cookies = parse(req.headers.cookie || '');
  return cookies[COOKIE_NAME];
}

async function requireAuth(req, res, Profile) {
  const token = getTokenFromReq(req);
  if (!token) {
    res.status(401).json({ error: 'Not authenticated' });
    return null;
  }
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Invalid token' });
    return null;
  }
  const user = await Profile.findById(payload.sub).lean();
  if (!user) {
    res.status(401).json({ error: 'User not found' });
    return null;
  }

  // Sliding refresh: re-issue a fresh 1h cookie on every authenticated request.
  // User active = cookie keeps renewing. User idle 1h = cookie expires.
  try {
    const freshToken = signToken(user);
    setAuthCookie(res, freshToken);
  } catch (e) { /* don't fail the request if refresh hiccups */ }

  return user;
}

module.exports = { signToken, verifyToken, setAuthCookie, clearAuthCookie, requireAuth };
