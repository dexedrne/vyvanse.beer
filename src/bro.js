// #4764 in the hero: turns the <model-viewer> rendered into index.html into a live model.
// The viewer (and three.js with it) is its own chunk, fetched once the hero is on screen, so
// the page and the terminal never wait on it. Until then, and if it never comes (no WebGL,
// Save-Data, an error), the poster render just stays put.
//
// He idles, waves now and then, and slowly turns once you've left him alone for a bit.
// Tap or click him to get a wave. Reduced motion: no turning and no waves he starts himself.

import { media } from './dom.js';

const IDLE = 'Idle';
const WAVE = 'Big_Wave_Hello';
const WAVE_EVERY = [8000, 12000]; // ms between waves he does on his own
const HINT_KEY = 'vyv-bro-hint';

export function createBro(mv) {
  const noop = { spin: () => 'missing', el: null };
  if (!mv || mv.localName !== 'model-viewer') return noop;

  const figure = mv.closest('figure') || mv.parentElement;
  let loaded = false;
  let failed = false;
  let waving = false;
  let spinning = false;
  let pendingSpin = false;
  let waveTimer = 0;
  let onScreen = true;

  const calm = () => media.reduced.matches;
  const settle = () => mv.updateComplete ?? Promise.resolve();

  // ---- load the viewer once the hero is (nearly) on screen ----

  const saveData = navigator.connection?.saveData;
  if (saveData) return noop;

  const io = new IntersectionObserver(
    (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      load();
    },
    { rootMargin: '200px' },
  );
  io.observe(mv);

  async function load() {
    // The Draco decoder is self-hosted in public/draco; model-viewer would otherwise fetch it
    // from a Google CDN. This has to be set before the element upgrades.
    self.ModelViewerElement = { ...(self.ModelViewerElement || {}), dracoDecoderLocation: '/draco/' };
    try {
      await import('@google/model-viewer');
    } catch {
      failed = true;
    }
  }

  mv.addEventListener('error', () => {
    failed = true;
  });

  mv.addEventListener('load', async () => {
    loaded = true;
    figure.classList.add('is-live');
    if (!mv.availableAnimations.includes(IDLE)) return;
    await settle();
    if (mv.paused) mv.play();
    hint();
    turn();
    scheduleWave();
    if (pendingSpin) {
      pendingSpin = false;
      spin();
    }
  });

  // ---- waving ----

  // model-viewer 4.3.1 never fires `finished` (it hooks the mixer events before a model has a
  // mixer), so the wave's end is watched from its clock instead. Being clock-driven, this also
  // waits properly while the viewer is off screen and its animation is paused.
  let waveWatch = 0;
  async function wave() {
    if (!loaded || waving || !mv.availableAnimations.includes(WAVE)) return;
    waving = true;
    clearTimeout(waveTimer);
    mv.animationName = WAVE;
    await settle(); // let the element switch clips first, or it restarts WAVE on a loop
    mv.play({ repetitions: 1 });
    const fade = Number(mv.getAttribute('animation-crossfade-duration') || 300) / 1000;
    clearInterval(waveWatch);
    waveWatch = setInterval(() => {
      if (mv.animationName !== WAVE || mv.currentTime >= mv.duration - fade) backToIdle();
    }, 100);
  }

  async function backToIdle() {
    clearInterval(waveWatch);
    if (!waving) return;
    waving = false;
    mv.animationName = IDLE;
    await settle();
    if (mv.paused) mv.play();
    scheduleWave();
  }

  function scheduleWave() {
    clearTimeout(waveTimer);
    if (calm()) return;
    const [lo, hi] = WAVE_EVERY;
    waveTimer = setTimeout(() => {
      // Only when someone could see it.
      if (document.hidden || !onScreen) return scheduleWave();
      wave();
    }, lo + Math.random() * (hi - lo));
  }

  new IntersectionObserver((entries) => {
    onScreen = entries.some((e) => e.isIntersecting);
  }).observe(mv);

  // ---- turning ----

  // With auto-rotate on, model-viewer waits auto-rotate-delay (4 s, set in the markup) before
  // it starts turning him, stops while you drag, and picks up again 4 s after you let go.
  function turn() {
    mv.autoRotate = !calm();
  }

  media.reduced.addEventListener('change', () => {
    if (!loaded) return;
    turn();
    scheduleWave();
  });

  // ---- tap or click: a wave. A drag is a spin, not a tap. ----

  let down = null;
  mv.addEventListener('pointerdown', (e) => {
    down = { x: e.clientX, y: e.clientY, t: performance.now() };
    dismissHint();
  });
  mv.addEventListener('pointerup', (e) => {
    if (!down) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    const quick = performance.now() - down.t < 500;
    down = null;
    if (moved < 6 && quick) wave();
  });
  mv.addEventListener('pointercancel', () => {
    down = null;
  });
  mv.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target === mv) {
      e.preventDefault();
      wave();
    }
  });

  // ---- "drag to spin", once a session, fading on its own ----

  let hintEl = null;
  function hint() {
    try {
      if (sessionStorage.getItem(HINT_KEY)) return;
      sessionStorage.setItem(HINT_KEY, '1');
    } catch {
      /* no storage: show it anyway */
    }
    hintEl = document.createElement('span');
    hintEl.className = 'bro3d__hint';
    hintEl.setAttribute('aria-hidden', 'true');
    hintEl.textContent = 'drag to spin';
    figure.append(hintEl);
    requestAnimationFrame(() => hintEl?.classList.add('is-on'));
    setTimeout(dismissHint, 4500);
  }
  function dismissHint() {
    if (!hintEl) return;
    const el = hintEl;
    hintEl = null;
    el.classList.remove('is-on');
    setTimeout(() => el.remove(), 600);
  }

  // ---- `spin`: a quick 360, then a wave ----

  function spin() {
    if (failed) return 'failed';
    if (!loaded) {
      pendingSpin = true;
      return 'loading';
    }
    if (spinning) return 'spinning';
    spinning = true;
    dismissHint();
    const auto = mv.autoRotate;
    mv.autoRotate = false;
    const from = mv.turntableRotation;
    const ms = 1100;
    const t0 = performance.now();
    const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
    const step = (now) => {
      const t = Math.min(1, (now - t0) / ms);
      mv.resetTurntableRotation(from + ease(t) * Math.PI * 2);
      if (t < 1) return requestAnimationFrame(step);
      mv.resetTurntableRotation(from);
      spinning = false;
      if (auto && !calm()) mv.autoRotate = true;
      wave();
    };
    requestAnimationFrame(step);
    return 'ok';
  }

  return { spin, el: mv, get loaded() { return loaded; } };
}
