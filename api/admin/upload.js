const { requireAuth } = require('./_auth.js');
const { readJson } = require('../_util.js');

function parseDataUrl(dataUrl) {
  const match = /^data:([^;]+);base64,(.+)$/s.exec(dataUrl || '');
  if (!match) return null;
  return { contentType: match[1], buffer: Buffer.from(match[2], 'base64') };
}

function extFromContentType(ct) {
  if (!ct) return 'jpg';
  if (ct.includes('png')) return 'png';
  if (ct.includes('webp')) return 'webp';
  if (ct.includes('gif')) return 'gif';
  return 'jpg';
}

module.exports = async (req, res) => {
  if (!requireAuth(req, res)) return;
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const body = await readJson(req);
    const parsed = parseDataUrl(body.dataUrl);
    if (!parsed) {
      res.status(400).json({ error: 'صورة غير صالحة' });
      return;
    }
    if (parsed.buffer.length > 8 * 1024 * 1024) {
      res.status(400).json({ error: 'حجم الصورة كبير جداً (الحد الأقصى 8 ميجا)' });
      return;
    }

    const { put } = require('@vercel/blob');
    const safeName = (body.itemId || Date.now()).toString().replace(/[^a-zA-Z0-9_-]/g, '');
    const filename = `menu-photos/${safeName}-${Date.now()}.${extFromContentType(parsed.contentType)}`;

    const blob = await put(filename, parsed.buffer, {
      access: 'public',
      addRandomSuffix: true,
      contentType: parsed.contentType,
    });

    res.status(200).json({ ok: true, url: blob.url });
  } catch (err) {
    res.status(500).json({ error: String((err && err.message) || err) });
  }
};
