// The rain-and-puddle canvas (src/water.js) and whoever stands on it in 3D (src/duo.js), on one
// animation loop. Loaded after the first paint (src/main.js); without it, or without WebGL, the
// menu keeps its plain backdrops, the duo's poster pair and the crew's renders.
//
// The loop draws at 60 fps while you're doing something, 30 after a few idle seconds, a few
// still frames with reduced motion, nothing while the tab is hidden, and nothing at all while a
// game is open (pause / resume, from the player).

import { createWater } from './water.js';

export function createStage(shell, { screen, duoBox, models }) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const calm = () => reduced.matches;
  let cast = null;
  let want = []; // who the page wants on the water (show)
  let soon = []; // and who's likely next (prefetch)
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
      const live = !!cast?.live;
      const el = live ? cast.canvas : posterCanvas();
      if (el) figure = { el, live, feet: s.figure.feet };
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

  // ---- the cast: three.js only now, each model when it's first wanted ----
  const resizeCast = () => cast?.resize(duoBox.clientWidth, duoBox.clientHeight);
  new ResizeObserver(resizeCast).observe(duoBox);
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
      .then((m) => {
        cast = m.createCast(duoBox, {
          calm,
          models,
          // everyone the page asked for is in: it swaps the renders out for them
          onReady() {
            shell.castReady();
            resizeCast();
            cast.tick(0); // a first frame before they show
            sync();
            wake();
          },
        });
        cast.show(want);
        cast.prefetch(soon);
        resizeCast();
      })
      .catch((e) => console.warn('the crew stay renders', e));
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
    shell.heroStep(now);
    if (cast?.live && !duoBox.classList.contains('duo--off')) cast.tick(dt);
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
    wave: (num, at) => cast?.wave(num, at) ?? false,
    // who stands on the water: [a, b] a pair, [a] one alone, [] nobody (src/duo.js)
    show(nums) {
      want = nums;
      // someone else stepped on: draw him now, so the canvas never shows who was there before
      if (cast?.show(nums) && cast.live) {
        resizeCast();
        cast.tick(0);
      }
    },
    // who's likely next (the crew cards either side): fetched when nothing else is
    prefetch(nums) {
      soon = nums;
      cast?.prefetch(nums);
    },
    // are these loaded, so they can stand there now?
    ready: (nums) => !!cast?.ready(nums),
    get live() {
      return !!cast;
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
