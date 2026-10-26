// Shared helpers for reading/writing the live menu state for مشويات الجمال.
//
// Unlike basilico-menu-2 (which uses Vercel Global/Edge Config), this project
// stores its admin-driven state as a single small JSON file in Vercel Blob,
// because this Vercel account's Hobby plan only allows one Global Config
// store (already used by basilico-menu-2). Vercel Blob has no such limit and
// needs only the BLOB_READ_WRITE_TOKEN env var (created once when the Blob
// store is connected to this project), so no extra API token is required.
//
// The state JSON shape is identical to basilico-menu-2's:
//
//   {
//     overrides:  { "<baseItemId>": { name?, cat?, price?, unit?, alt?, photo?, available? }, ... },
//     newItems:   [ { id, name, cat, price, unit, alt, photo, available }, ... ],
//     deletedIds: [ <baseItemId>, ... ]
//   }
//
// Base item data (the original 33 menu items + their original AI photos)
// lives in ./_data.js and is bundled with the function - it never changes at
// runtime. Only admin-driven changes go through this Blob-backed state file.
// New/edited item photos uploaded via the admin panel are stored as separate
// Blob objects; only their URLs are kept in this state file, so it stays
// tiny.

const STATE_PATHNAME = 'state/menu-state.json';

const EMPTY_STATE = { overrides: {}, newItems: [], deletedIds: [] };

function normalizeState(state) {
  if (!state || typeof state !== 'object') return { ...EMPTY_STATE };
  return {
    overrides: state.overrides && typeof state.overrides === 'object' ? state.overrides : {},
    newItems: Array.isArray(state.newItems) ? state.newItems : [],
    deletedIds: Array.isArray(state.deletedIds) ? state.deletedIds : [],
  };
}

// Cached between invocations of the same warm serverless instance only - a
// cold start always re-resolves it, which is cheap (a single list() call).
let cachedUrl = null;

async function resolveUrl() {
  const { list } = require('@vercel/blob');
  const { blobs } = await list({ prefix: STATE_PATHNAME, limit: 1 });
  return blobs && blobs[0] ? blobs[0].url : null;
}

async function readState() {
  try {
    if (!cachedUrl) cachedUrl = await resolveUrl();
    if (!cachedUrl) return { ...EMPTY_STATE };
    const resp = await fetch(cachedUrl, { cache: 'no-store' });
    if (!resp.ok) return { ...EMPTY_STATE };
    return normalizeState(await resp.json());
  } catch (e) {
    return { ...EMPTY_STATE };
  }
}

// Always-fresh read. Used by the admin panel right after a write so the
// dashboard never shows stale data (Blob reads have no edge cache lag like
// Edge Config does, but we still re-resolve the URL to be safe).
async function readStateFresh() {
  cachedUrl = null;
  return readState();
}

async function writeState(state) {
  const { put } = require('@vercel/blob');
  const body = JSON.stringify(normalizeState(state));
  const blob = await put(STATE_PATHNAME, body, {
    access: 'public',
    contentType: 'application/json; charset=utf-8',
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 0,
  });
  cachedUrl = blob.url;
  return blob;
}

module.exports = { readState, readStateFresh, writeState, normalizeState, EMPTY_STATE };
