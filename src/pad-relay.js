// The player calls tick each animation frame. Never broadcast to '*': only the selected game.
export function createPadRelay({ target, url, pads, device }) {
  const origin = new URL(url).origin;
  let lastDevice = '';
  function tick() {
    const live = pads().filter(p => p && p.connected !== false);
    const flags = device(live);
    const key = JSON.stringify(flags);
    if (key !== lastDevice) {
      target.postMessage(flags, origin);
      lastDevice = key;
    }
    target.postMessage({ type: 'vyvanse:pads', v: 1, pads: live.map(p => ({
      index: p.index, id: p.id, mapping: p.mapping, connected: true, timestamp: p.timestamp,
      axes: Array.from(p.axes),
      buttons: Array.from(p.buttons, b => [b.value, (b.pressed ? 1 : 0) | (b.touched ? 2 : 0)]),
    })) }, origin);
  }
  return {
    tick,
    refresh() { lastDevice = ''; tick(); },
    accepts: e => e.origin === origin && e.source === target,
  };
}
