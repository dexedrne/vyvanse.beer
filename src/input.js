// Input for the menu: keyboard, gamepads (the standard mapping, as most pads report it) and
// the glyphs on screen, which follow whatever was used last: keys, Xbox buttons or PlayStation
// shapes. Mouse and touch are plain clicks on the page (src/main.js).
//
// Everything turns into one of a few actions, handed to `act(name, info)`:
//   left right up down   move the cursor (held: repeats)
//   ok                   A / Enter: play, open, pick
//   start                Start / Menu: play (on release, and not held with View)
//   back                 B / Esc: close what's open, else back to Games
//   prev next            LB RB / Q E: the tabs
//   edprev ednext        LT RT: the selected game's first / last edition (up / down flip it too)
//   details              Y / I: the whole blurb and every link
//   wave                 X / G: one of the duo waves
//   fullscreen           View / Select / F (on a pad: on release, and not held with Menu)
//   music sfx            M / L3, N / R3
//   os                   / (keyboard only)
//   grab                 hold Menu (Options) / R: pick up the selected cartridge to move it
//                        (src/main.js); a tap on Menu is still 'start'
//
// While a game is open (`mode() === 'play'`) the menu gets nothing; the player reads the pad
// itself through `pads()` for its hold-to-leave combo.

const STANDARD = {
  0: 'ok',
  1: 'back',
  2: 'wave',
  3: 'details',
  4: 'prev',
  5: 'next',
  6: 'edprev',
  7: 'ednext',
  10: 'music',
  11: 'sfx',
};
// View and Menu act when they're let go, and only if the other one wasn't held with them: held
// together they're the player's way back to the menu, not full screen plus play
const PAIR = { 8: 'fullscreen', 9: 'start' };
const DIRS = { 12: 'up', 13: 'down', 14: 'left', 15: 'right' };

// what each glyph reads as, per input
export const GLYPHS = {
  touch: { a: 'tap', b: 'back', x: 'tap', y: 'details', lb: 'swipe', rb: 'swipe', lt: '↑', rt: '↓', start: 'play', select: '⛶', move: 'swipe', vmove: 'tap', hold: 'Create + Options', grab: 'hold' },
  kb: { a: '↵', b: 'Esc', x: 'G', y: 'I', lb: 'Q', rb: 'E', lt: '↑', rt: '↓', start: 'Enter', select: 'F', move: '← →', vmove: '↑ ↓', hold: 'Esc', grab: 'R' },
  xbox: { a: 'A', b: 'B', x: 'X', y: 'Y', lb: 'LB', rb: 'RB', lt: 'LT', rt: 'RT', start: 'Menu', select: 'View', move: '✚', vmove: '✚', hold: 'View + Menu', grab: 'Menu' },
  ps: { a: '✕', b: '○', x: '□', y: '△', lb: 'L1', rb: 'R1', lt: 'L2', rt: 'R2', start: 'Options', select: 'Create', move: '✚', vmove: '✚', hold: 'Create + Options', grab: 'Options' },
};

// Sony pads report as "Wireless Controller" (vendor 054c); Xbox ones can say "Wireless Controller" too
const isPs = (id = '') => /054c|playstation|dualshock|dualsense|ps[345]/i.test(id) || (/wireless controller/i.test(id) && !/xbox|045e/i.test(id));

export function createInput({ act, mode, onScheme }) {
  const root = document.documentElement;
  let device = matchMedia('(pointer: coarse)').matches ? 'touch' : 'kb'; // kb | mouse | touch | xbox | ps
  let scheme = device;

  function setDevice(d) {
    if (d === device) return;
    device = d;
    root.dataset.input = d;
    const s = ['xbox', 'ps', 'touch'].includes(d) ? d : 'kb';
    if (s !== scheme) {
      scheme = s;
      paintGlyphs();
      onScheme?.(s);
    }
  }
  function paintGlyphs(el = document) {
    const map = GLYPHS[scheme];
    for (const g of el.querySelectorAll('[data-g]')) {
      const t = map[g.dataset.g];
      if (t != null && g.textContent !== t) g.textContent = t;
    }
  }
  root.dataset.input = device;
  paintGlyphs();

  // ---- keyboard ----
  const editable = (el) => el?.closest?.('input, textarea, select, [contenteditable=""], [contenteditable="true"]');
  const KEYS = {
    ArrowLeft: 'left',
    ArrowRight: 'right',
    ArrowUp: 'up',
    ArrowDown: 'down',
    a: 'left',
    d: 'right',
    w: 'up',
    s: 'down',
    q: 'prev',
    e: 'next',
    PageUp: 'prev',
    PageDown: 'next',
    Escape: 'back',
    Backspace: 'back',
    i: 'details',
    g: 'wave',
    f: 'fullscreen',
    m: 'music',
    n: 'sfx',
    r: 'grab',
    '/': 'os',
    '`': 'os',
  };
  addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (!['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) setDevice('kb');
    const m = mode();
    if (m === 'play' || m === 'os' || editable(e.target)) return;
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    let name = KEYS[k];
    if (m === 'modal') {
      // dialogs handle their own keys (Esc closes them); arrows walk their buttons
      if (!['left', 'right', 'up', 'down'].includes(name)) return;
      if (e.target.closest?.('input, [role="slider"]')) return;
    }
    if (!name && (k === 'Enter' || k === ' ')) {
      // a focused link or button does its own thing; otherwise Enter plays the selection
      const el = document.activeElement;
      if (el && el !== document.body && el.matches('a, button, summary, [tabindex]')) return;
      name = 'ok';
    }
    if (!name) return;
    if (e.repeat && !['left', 'right', 'up', 'down'].includes(name)) return;
    if (act(name, { from: 'kb', event: e }) !== false) e.preventDefault();
  });
  addEventListener('pointerdown', (e) => setDevice(e.pointerType === 'touch' ? 'touch' : 'mouse'), { passive: true, capture: true });

  // ---- gamepads ----
  // Read on a short timer, not on animation frames: frames can be slow (software WebGL, a busy
  // start-up), and a tap that comes and goes between two reads is lost.
  const prev = new Map(); // pad index -> pressed buttons last read
  const pair = new Map(); // pad index -> View and Menu were held together since both were up
  const menuHold = new Map(); // pad index -> { t: when Menu went down, done: the hold was used }
  const GRAB_MS = 450; // Menu held this long (alone) picks the cartridge up instead of playing it
  let held = { dir: null, next: 0 };
  let timer = 0;
  let rumbleOk = true;
  const EVERY = 16;

  const list = () => {
    try { return [...(navigator.getGamepads?.() || [])].filter(p => p && p.connected !== false); }
    catch { return []; } // policy denial or older WebKit: keyboard/touch keep working
  };

  function stick(gp) {
    const [x = 0, y = 0] = gp.axes;
    const ax = Math.abs(x);
    const ay = Math.abs(y);
    if (Math.max(ax, ay) < 0.55) return null;
    return ax > ay ? (x < 0 ? 'left' : 'right') : y < 0 ? 'up' : 'down';
  }

  function poll() {
    const pads = list();
    for (const i of prev.keys()) if (!pads.some(p => p.index === i)) {
      prev.delete(i);
      pair.delete(i);
      menuHold.delete(i);
    }
    if (!pads.length) {
      held = { dir: null, next: 0 };
      if (device === 'ps' || device === 'xbox') setDevice(matchMedia('(pointer: coarse)').matches ? 'touch' : 'kb');
      return;
    }
    const now = performance.now();
    const m = mode();
    let dir = null;
    for (const gp of pads) {
      const was = prev.get(gp.index) || [];
      const now2 = gp.buttons.map((b) => !!(b?.pressed || b?.value > 0.6));
      prev.set(gp.index, now2);
      const pressed = (i) => now2[i] && !was[i];
      const both = pair.get(gp.index) || (now2[8] && now2[9]);
      pair.set(gp.index, both && (now2[8] || now2[9]));
      if (now2.some((b, i) => b && !was[i]) || stick(gp)) {
        setDevice(isPs(gp.id) ? 'ps' : 'xbox');
        dispatchEvent(new Event('vyv:input'));
      }
      if (pressed(9)) menuHold.set(gp.index, { t: now, done: false });
      const mh = menuHold.get(gp.index);
      if (m === 'play') continue;
      for (const [i, name] of Object.entries(STANDARD)) if (pressed(+i)) act(name, { from: 'pad', pad: gp });
      // Menu held on its own: 'grab' (and its release is then not a 'start', if grab was taken)
      if (mh && now2[9] && !both && !mh.done && now - mh.t > GRAB_MS) mh.done = act('grab', { from: 'pad', pad: gp }) === false ? 'no' : 'yes';
      for (const [i, name] of Object.entries(PAIR)) {
        if (was[i] && !now2[i] && !both && !(+i === 9 && mh?.done === 'yes')) act(name, { from: 'pad', pad: gp });
      }
      for (const [i, name] of Object.entries(DIRS)) if (now2[i]) dir = name;
      dir ||= stick(gp);
    }
    if (m === 'play') {
      held = { dir: null, next: 0 };
      return;
    }
    if (dir !== held.dir) {
      held = { dir, next: now + 380 };
      if (dir) act(dir, { from: 'pad' });
    } else if (dir && now > held.next) {
      held.next = now + 120;
      act(dir, { from: 'pad', repeat: true });
    }
  }
  function start() {
    if (timer) return;
    timer = setInterval(poll, EVERY);
  }
  addEventListener('gamepadconnected', start);
  addEventListener('gamepaddisconnected', poll);
  // A paired pad may only become visible after its first press, without a fresh connection
  // event. Keep discovering it; never stop permanently after an empty WebKit snapshot.
  start();

  return {
    get scheme() {
      return scheme;
    },
    glyph: (name) => GLYPHS[scheme][name],
    paintGlyphs,
    pads: list,
    // a tiny bump on select, where the pad can
    rumble(gp) {
      const a = gp?.vibrationActuator;
      if (!a || !rumbleOk) return;
      try {
        a.playEffect?.(a.type || 'dual-rumble', { duration: 45, strongMagnitude: 0.12, weakMagnitude: 0.32 })?.catch?.(() => {});
      } catch {
        rumbleOk = false;
      }
    },
    start,
  };
}
