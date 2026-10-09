// Sound: the background music (a chill piano loop, public/audio/) and the menu blips.
//
// Music is on unless the visitor turned it off (remembered). Browsers only let a page start
// sound after a click or a key, so it fades in on the first one; a pad press alone may not be
// enough, in which case it waits for the next click or key. It pauses while a game is open and
// while the tab is hidden. The blips (a short square wave on move / select) are off by default,
// with their own toggle.

const MUSIC_KEY = 'vyv-music';
const SFX_KEY = 'vyv-sfx';
const VOLUME = 0.3;

const store = {
  get(k) {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem(k, v);
    } catch {
      /* private mode or blocked storage: it lasts until the page closes */
    }
  },
};

export function createAudio({ musicBtn, sfxBtn, toast }) {
  const el = document.getElementById('bgm');
  let wantMusic = store.get(MUSIC_KEY) !== 'off';
  let sfx = store.get(SFX_KEY) === 'on';
  let ducked = false; // a game is open
  let unlocked = false; // a click or a key has happened
  let fade = 0;
  let ac = null;

  function ramp(to, ms, then) {
    cancelAnimationFrame(fade);
    const from = el.volume;
    const t0 = performance.now();
    const step = (now) => {
      const k = Math.min(1, (now - t0) / ms);
      el.volume = Math.max(0, Math.min(1, from + (to - from) * k));
      if (k < 1) fade = requestAnimationFrame(step);
      else then?.();
    };
    fade = requestAnimationFrame(step);
  }

  function shouldPlay() {
    return wantMusic && !ducked && !document.hidden;
  }

  function update() {
    musicBtn?.setAttribute('aria-pressed', String(wantMusic));
    sfxBtn?.setAttribute('aria-pressed', String(sfx));
    if (shouldPlay()) {
      if (!unlocked) return;
      if (el.paused) {
        el.volume = 0;
        const p = el.play();
        p?.catch?.(() => {
          // still blocked (a pad press isn't a click): wait for one
          unlocked = false;
        });
      }
      ramp(VOLUME, 1500);
    } else if (!el.paused) {
      ramp(0, ducked ? 350 : 500, () => el.pause());
    }
  }

  // the first click or key (anywhere, any kind) lets it start
  const unlock = () => {
    if (unlocked) return;
    unlocked = true;
    if (el.preload === 'none') el.preload = 'auto';
    update();
  };
  for (const ev of ['pointerdown', 'keydown']) addEventListener(ev, unlock, { capture: true, passive: true });
  addEventListener('vyv:input', () => {
    // a pad press: worth a try (some browsers count it), harmless when it isn't
    if (!unlocked && wantMusic && !ducked) {
      el.volume = 0;
      el.play()?.then?.(
        () => {
          unlocked = true;
          ramp(VOLUME, 1500);
        },
        () => {},
      );
    }
  });
  document.addEventListener('visibilitychange', update);

  function blip(kind) {
    if (!sfx) return;
    try {
      ac ||= new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === 'suspended') ac.resume();
      const t = ac.currentTime;
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = 'square';
      const f = { move: 740, tab: 494, ok: 880, back: 392 }[kind] || 660;
      o.frequency.setValueAtTime(f, t);
      if (kind === 'ok') o.frequency.setValueAtTime(f * 1.5, t + 0.06);
      const len = kind === 'ok' ? 0.16 : 0.055;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.03, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + len);
      o.connect(g).connect(ac.destination);
      o.start(t);
      o.stop(t + len + 0.02);
    } catch {
      /* no Web Audio: no blips */
    }
  }

  musicBtn?.addEventListener('click', () => api.toggleMusic());
  sfxBtn?.addEventListener('click', () => api.toggleSfx());

  const api = {
    blip,
    toggleMusic() {
      api.setMusic(!wantMusic);
    },
    setMusic(on) {
      wantMusic = on;
      store.set(MUSIC_KEY, wantMusic ? 'on' : 'off');
      unlock();
      update();
      toast?.(wantMusic ? 'music on' : 'music off');
    },
    toggleSfx() {
      sfx = !sfx;
      store.set(SFX_KEY, sfx ? 'on' : 'off');
      update();
      if (sfx) blip('ok');
      toast?.(sfx ? 'menu sounds on' : 'menu sounds off');
    },
    // a game is open: the music bows out, and comes back after
    duck(on) {
      ducked = on;
      update();
    },
  };
  update();
  return api;
}
