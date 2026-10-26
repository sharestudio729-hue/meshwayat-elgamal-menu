// Builds the final, merged menu (base items + admin overrides + new items -
// deleted items) that both the public site and the admin panel read.

const { MENU, ITEM_IMAGES } = require('./_data.js');
const { readState, readStateFresh } = require('./_store.js');

function basePhoto(id) {
  const idx = Number(id) - 1;
  return idx >= 0 && idx < ITEM_IMAGES.length ? ITEM_IMAGES[idx] : null;
}

function buildMenu(state) {
  const deleted = new Set((state.deletedIds || []).map(String));
  const overrides = state.overrides || {};

  const baseItems = MENU.filter((it) => !deleted.has(String(it.id))).map((it) => {
    const ov = overrides[String(it.id)] || {};
    return {
      id: it.id,
      name: typeof ov.name === 'string' && ov.name.trim() ? ov.name : it.name,
      cat: typeof ov.cat === 'string' && ov.cat.trim() ? ov.cat : it.cat,
      price: typeof ov.price === 'number' ? ov.price : it.price,
      unit: typeof ov.unit === 'string' && ov.unit.trim() ? ov.unit : it.unit,
      alt: ov.alt === null || typeof ov.alt === 'number' ? ov.alt : (it.alt === undefined ? null : it.alt),
      photo: typeof ov.photo === 'string' && ov.photo ? ov.photo : basePhoto(it.id),
      available: typeof ov.available === 'boolean' ? ov.available : true,
      isNew: false,
    };
  });

  const newItems = (state.newItems || []).map((it) => ({
    id: it.id,
    name: it.name,
    cat: it.cat,
    price: it.price,
    unit: it.unit || 'واحد',
    alt: typeof it.alt === 'number' ? it.alt : null,
    photo: it.photo || null,
    available: typeof it.available === 'boolean' ? it.available : true,
    isNew: true,
  }));

  return baseItems.concat(newItems);
}

async function getMergedMenu(fresh) {
  const state = fresh ? await readStateFresh() : await readState();
  return { items: buildMenu(state), state };
}

module.exports = { buildMenu, getMergedMenu };
