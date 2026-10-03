// The rain-and-puddle canvas (src/water.js) and the live duo (src/duo.js), on one animation
// loop. Loaded after the first paint (src/main.js); without it, or without WebGL, the menu keeps
// its plain backdrops and the duo's poster pair.
//
// The loop draws at 60 fps while you're doing something, 30 after a few idle seconds, a few
// still frames with reduced motion, nothing while the tab is hidden, and nothing at all while a
// game is open (pause / resume, from the player).

import { createWater } from './water.js';

export function createStage(shell, { screen, duoBox }) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const calm = () => reduced.matches;
  let duo = null;
  let water = null;

  // ---- the water ----
  try {
    const canvas = document.createElement('canvas');
    canvas.className = 'water';
    canvas.setAttribute('aria-hidden', 'true');
    screen.querySelector('.scrim').before(canvas);
    water = createWater(canvas, screen, { calm });
    if (water) screen.classList.add('water-on');
    else canvas.remove();
  } catch (e) {
    console.warn('water off', e);
    water = null;
  }
  addEventListener('vyv:water-off', () => {
    water = null;
    shell.layout();
  });

  // the poster pair, drawn where it stands, so the water can mirror it before (or without) 3D
  let poster = null;
  function posterCanvas() {
    const imgs = [...duoBox.querySelectorAll('.duo__poster img')];
    if (imgs.some((i) => !i.complete || !i.naturalWidth)) return null;
    const b = duoBox.getBoundingClientRect();
    poster ||= document.createElement('canvas');
    poster.width = Math.max(1, Math.round(b.width));
    poster.height = Math.max(1, Math.round(b.height));
    const ctx = poster.getContext('2d');
    ctx.clearRect(0, 0, poster.width, poster.height);
    for (const img of imgs) {
      const r = img.getBoundingClientRect();
      ctx.drawImage(img, r.left - b.left, r.top - b.top, r.width, r.height);
    }
    return poster;
  }

  function sync() {
    if (!water || water.dead) return;
    const s = shell.scene();
    let figure = null;
    if (s.figure?.kind === 'duo') {
      const el = duo ? duo.canvas : posterCanvas();
      if (el) figure = { el, live: !!duo, feet: s.figure.feet };
    } else if (s.figure?.kind === 'img') {
      figure = { el: s.figure.el, live: false, feet: s.figure.feet };
    }
    try {
      water.measure();
      water.setScene({ ...s, figure });
    } catch (e) {
      console.warn('water off', e);
      water.fail();
    }
  }
  addEventListener('vyv:scene', sync);
  for (const img of duoBox.querySelectorAll('img')) img.addEventListener('load', sync, { once: true });
  shell.layout(); // the backdrop just got shorter: place everything again

  // ---- the duo: three.js and the two models, only now ----
  const resizeDuo = () => duo?.resize(duoBox.clientWidth, duoBox.clientHeight);
  new ResizeObserver(resizeDuo).observe(duoBox);
  // no WebGL at all (the water would have had it): don't fetch three.js for nothing
  const gl = () => {
    try {
      return !!document.createElement('canvas').getContext('webgl');
    } catch {
      return false;
    }
  };
  if (!navigator.connection?.saveData && (water || gl())) {
    import('./duo.js')
      .then((m) => m.createDuo(duoBox, { calm }))
      .then((d) => {
        duo = d;
        resizeDuo();
        duo.tick(0); // a first frame before it shows
        shell.setDuoLive(true);
        wake();
      })
      .catch((e) => console.warn('the duo stays a poster', e));
  }

  // ---- one loop ----
  let idleSince = performance.now();
  for (const ev of ['pointermove', 'pointerdown', 'keydown', 'touchstart', 'wheel', 'vyv:input']) {
    addEventListener(ev, () => (idleSince = performance.now()), { passive: true });
  }
  let lastDraw = 0;
  let raf = 0;
  let paused = false;
  function loop(now) {
    raf = 0;
    if (paused) return;
    raf = requestAnimationFrame(loop);
    const target = calm() ? 4 : now - idleSince > 6000 ? 30 : 60;
    if (lastDraw && now - lastDraw < 1000 / target - 2) return;
    const dt = lastDraw ? Math.min(0.1, (now - lastDraw) / 1000) : 1 / 60;
    lastDraw = now;
    if (duo && !duoBox.classList.contains('duo--off')) duo.tick(dt);
    if (water && !water.dead) water.frame(dt, now, target);
  }
  function wake() {
    lastDraw = 0;
    water?.wake?.();
    if (!raf && !paused) raf = requestAnimationFrame(loop);
  }
  wake();
  // a hidden tab gets no animation frames; coming back, the first step is capped
  document.addEventListener('visibilitychange', () => !document.hidden && wake());

  return {
    wave: (i, at) => duo?.wave(i, at) ?? false,
    get live() {
      return !!duo;
    },
    // a game is open: draw nothing at all
    pause() {
      paused = true;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    },
    resume() {
      paused = false;
      idleSince = performance.now();
      sync();
      wake();
    },
  };
}
