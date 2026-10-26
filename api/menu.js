const { getMergedMenu } = require('./_menu.js');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  try {
    const { items } = await getMergedMenu(false);
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=5, stale-while-revalidate=30');
    res.status(200).json({ items, updatedAt: Date.now() });
  } catch (err) {
    // If the state store isn't reachable for any reason, fail soft: the
    // public menu should never go down because of it. Returning items:null
    // tells the frontend to keep using its built-in static menu.
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ items: null, error: String((err && err.message) || err) });
  }
};
