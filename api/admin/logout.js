const { clearAuthCookie } = require('./_auth.js');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  clearAuthCookie(res);
  res.status(200).json({ ok: true });
};
