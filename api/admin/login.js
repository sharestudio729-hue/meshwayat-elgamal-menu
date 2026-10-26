const { setAuthCookie } = require('./_auth.js');
const { readJson } = require('../_util.js');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  if (!process.env.ADMIN_PASSWORD) {
    res.status(500).json({ error: 'لوحة التحكم غير مهيأة بعد (ADMIN_PASSWORD غير موجود)' });
    return;
  }
  const body = await readJson(req);
  const password = body && body.password;
  if (!password || password !== process.env.ADMIN_PASSWORD) {
    res.status(401).json({ error: 'كلمة السر غير صحيحة' });
    return;
  }
  setAuthCookie(res);
  res.status(200).json({ ok: true });
};
