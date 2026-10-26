const crypto = require('crypto');

const COOKIE_NAME = 'elgamal_admin';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

function secret() {
  return `${process.env.ADMIN_PASSWORD || ''}:elgamal-admin-salt-v1`;
}

function sign(ts) {
  return crypto.createHmac('sha256', secret()).update(String(ts)).digest('hex');
}

function makeToken() {
  const ts = Date.now();
  return `${ts}.${sign(ts)}`;
}

function parseCookies(req) {
  const header = (req.headers && req.headers.cookie) || '';
  const out = {};
  header.split(';').forEach((part) => {
    const idx = part.indexOf('=');
    if (idx === -1) return;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  });
  return out;
}

function isAuthed(req) {
  if (!process.env.ADMIN_PASSWORD) return false;
  const cookies = parseCookies(req);
  const token = cookies[COOKIE_NAME];
  if (!token) return false;
  const dotIdx = token.indexOf('.');
  if (dotIdx === -1) return false;
  const tsStr = token.slice(0, dotIdx);
  const sig = token.slice(dotIdx + 1);
  const ts = Number(tsStr);
  if (!ts || Date.now() - ts > MAX_AGE_SECONDS * 1000) return false;
  const expected = sign(ts);
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch (e) {
    return false;
  }
}

function setAuthCookie(res) {
  const token = makeToken();
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=${token}; Path=/; Max-Age=${MAX_AGE_SECONDS}; HttpOnly; Secure; SameSite=Lax`,
  );
}

function clearAuthCookie(res) {
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`);
}

function requireAuth(req, res) {
  if (!isAuthed(req)) {
    res.status(401).json({ error: 'الرجاء تسجيل الدخول أولاً' });
    return false;
  }
  return true;
}

module.exports = { isAuthed, setAuthCookie, clearAuthCookie, requireAuth, parseCookies };
