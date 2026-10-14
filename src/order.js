// The viewer's own order of the cartridges (Games and Sites), kept in this browser only.
//
// Stored as { games: [cmd, …], sites: [cmd, …] } under one localStorage key, a game by the cmd of
// its first edition (so RadPayne and RetardioPayne, sharing a cartridge, are one entry). A row
// in its default order isn't stored at all. Storage can be blocked, full or broken: every read
// and write is guarded, and without it the rows simply keep the default order.

const KEY = 'vyv-order';

export function readOrder() {
  try {
    const o = JSON.parse(localStorage.getItem(KEY));
    return o && typeof o === 'object' && !Array.isArray(o) ? o : {};
  } catch {
    return {};
  }
}

export function writeOrder(o) {
  try {
    if (Object.keys(o).length) localStorage.setItem(KEY, JSON.stringify(o));
    else localStorage.removeItem(KEY);
  } catch {
    /* it just won't be remembered */
  }
}

// A row's old names for its keys: each item's aliases (a game renamed keeps its old cmd as one),
// mapped to that item's key today. `items` are a row's entries, or on Games its editions' lists.
export function renamed(items, keyOf) {
  const out = {};
  for (const x of items) for (const e of [x].flat()) for (const a of e.aliases || []) out[a] = keyOf(x);
  return out;
}

// Today's keys (the default order) laid out in a saved order. What was saved and still exists
// keeps its saved place, as does a key saved under an old name (`old`, from renamed()); anything
// new since (a game added later) goes where it sits by default: right after the one before it in
// the default order, or first if it's first there. Keys that no longer exist are dropped.
export function arrange(keys, saved, old = {}) {
  if (!Array.isArray(saved)) return keys.slice();
  const now = saved.map((k) => (!keys.includes(k) && Object.hasOwn(old, k) ? old[k] : k));
  const out = now.filter((k, j) => keys.includes(k) && now.indexOf(k) === j);
  keys.forEach((k, j) => {
    if (out.includes(k)) return;
    let at = 0;
    for (let p = j - 1; p >= 0; p--) {
      const q = out.indexOf(keys[p]);
      if (q >= 0) {
        at = q + 1;
        break;
      }
    }
    out.splice(at, 0, k);
  });
  return out;
}
