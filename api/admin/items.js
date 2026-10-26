const { requireAuth } = require('./_auth.js');
const { readJson } = require('../_util.js');
const { readStateFresh, writeState } = require('../_store.js');
const { buildMenu } = require('../_menu.js');

function nextNewId(state) {
  const baseMax = 100000; // new items start at a high range, clear of base item ids (1-33)
  const ids = (state.newItems || []).map((it) => Number(it.id)).filter((n) => !Number.isNaN(n));
  const max = ids.length ? Math.max(...ids) : baseMax - 1;
  return Math.max(baseMax, max + 1);
}

function clampPrice(v) {
  const n = Number(v);
  return Number.isNaN(n) ? 0 : n;
}

function clampAlt(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

module.exports = async (req, res) => {
  if (!requireAuth(req, res)) return;

  try {
    if (req.method === 'GET') {
      const state = await readStateFresh();
      res.status(200).json({ items: buildMenu(state) });
      return;
    }

    if (req.method === 'POST') {
      // Add a new item.
      const body = await readJson(req);
      const name = (body.name || '').toString().trim();
      const cat = (body.cat || '').toString().trim();
      if (!name || !cat) {
        res.status(400).json({ error: 'الاسم والتصنيف مطلوبان' });
        return;
      }
      const state = await readStateFresh();
      const id = nextNewId(state);
      const item = {
        id,
        name,
        cat,
        price: clampPrice(body.price),
        unit: (body.unit || 'واحد').toString().trim() || 'واحد',
        alt: clampAlt(body.alt),
        photo: typeof body.photo === 'string' && body.photo ? body.photo : null,
        available: body.available === false ? false : true,
      };
      state.newItems = [...(state.newItems || []), item];
      await writeState(state);
      res.status(200).json({ ok: true, item });
      return;
    }

    if (req.method === 'PUT' || req.method === 'PATCH') {
      // Update (partial) an existing item, base or new.
      const body = await readJson(req);
      const id = body.id;
      if (id === undefined || id === null) {
        res.status(400).json({ error: 'id مطلوب' });
        return;
      }
      const state = await readStateFresh();
      const idStr = String(id);

      const newIdx = (state.newItems || []).findIndex((it) => String(it.id) === idStr);
      const fields = {};
      if (typeof body.name === 'string' && body.name.trim()) fields.name = body.name.trim();
      if (typeof body.cat === 'string' && body.cat.trim()) fields.cat = body.cat.trim();
      if (body.price !== undefined) fields.price = clampPrice(body.price);
      if (typeof body.unit === 'string' && body.unit.trim()) fields.unit = body.unit.trim();
      if (body.alt !== undefined) fields.alt = clampAlt(body.alt);
      if (typeof body.photo === 'string' && body.photo) fields.photo = body.photo;
      if (typeof body.available === 'boolean') fields.available = body.available;

      if (newIdx !== -1) {
        state.newItems[newIdx] = { ...state.newItems[newIdx], ...fields };
      } else {
        const overrides = state.overrides || {};
        overrides[idStr] = { ...(overrides[idStr] || {}), ...fields };
        state.overrides = overrides;
      }
      await writeState(state);
      res.status(200).json({ ok: true });
      return;
    }

    if (req.method === 'DELETE') {
      const body = await readJson(req);
      const idParam = (req.query && req.query.id) || body.id;
      if (idParam === undefined || idParam === null) {
        res.status(400).json({ error: 'id مطلوب' });
        return;
      }
      const state = await readStateFresh();
      const idStr = String(idParam);
      const newIdx = (state.newItems || []).findIndex((it) => String(it.id) === idStr);
      if (newIdx !== -1) {
        state.newItems.splice(newIdx, 1);
      } else {
        const deletedIds = new Set((state.deletedIds || []).map(String));
        deletedIds.add(idStr);
        state.deletedIds = Array.from(deletedIds).map((v) => (Number.isNaN(Number(v)) ? v : Number(v)));
        if (state.overrides && state.overrides[idStr]) delete state.overrides[idStr];
      }
      await writeState(state);
      res.status(200).json({ ok: true });
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    res.status(500).json({ error: String((err && err.message) || err) });
  }
};
