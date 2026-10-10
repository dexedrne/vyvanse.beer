// Whoever stands on the water, live in 3D: #4764 and #85 together on Games and Contact, and each
// of the crew alone, centre stage, on his own Crew card.
//
// One renderer, one scene, any number of characters. show([a, b]) puts two of them on the water,
// turned in toward each other; show([a]) puts one in the middle facing out; show([]) nobody.
// A model is fetched the first time it's shown (or prefetched, for the cards either side), then
// kept; past KEEP loaded, the ones that haven't been on screen for STALE give their GPU memory
// back. Until everyone asked for is in, nobody shows, and the page keeps the renders up.
//
// Every web model (public/models/: Draco meshes, unlit materials, the shared Radbro rig) carries
// two clips, Idle and Big_Wave_Hello. On top of Idle each gets a small procedural groove on one
// shared beat: a head nod, a shoulder bounce, a hip sway and a little bob, the second of a pair
// a touch behind the first so they aren't in lockstep. Every so often one of them waves
// (Big_Wave_Hello), at you or at the other one; wave(num) does it on demand (a click). Reduced
// motion: they hold still unless you ask for a wave.
//
// The camera is framed so their feet (y = 0) land at FEET of the canvas height, whatever its
// shape; the page uses that to put their reflection's waterline in the right place.

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

export const FEET = 0.976; // where y = 0 sits, as a share of the canvas height
const FOV = 18;
const PHONE_HEIGHT = 1.85; // include the models' head depth in the phone's perspective framing
const BPM = 92;
const WAVE_EVERY = [7, 12]; // seconds between waves they do on their own
const KEEP = 6; // models kept loaded; past that, the ones off screen for STALE ms are let go
const STALE = 30000;
// a pair: where each stands (m), how far he faces the other one, his lag behind the beat, his energy
const PAIR = [
  { x: -0.62, turn: 0.17, beat: 0, energy: 1 },
  { x: 0.62, turn: -0.17, beat: 0.55, energy: 0.85 },
];
const ALONE = { x: 0, turn: 0, beat: 0, energy: 1 };
const X = new THREE.Vector3(1, 0, 0);
const Y = new THREE.Vector3(0, 1, 0);
const Z = new THREE.Vector3(0, 0, 1);
const _q = new THREE.Quaternion();
const _pq = new THREE.Quaternion();
const _iq = new THREE.Quaternion();
const _rq = new THREE.Quaternion();
const _ax = new THREE.Vector3();
const _tw = new THREE.Quaternion();
const _id = new THREE.Quaternion();
const YAW_KEEP = 0.4; // how much of the clips' own body turn is kept (Idle looks around a lot)
const GROOVY = ['Hips', 'Spine01', 'Spine02', 'neck', 'Head', 'LeftShoulder', 'RightShoulder', 'LeftArm', 'RightArm'];

// models: { num: '/models/….glb' }. onReady(): everyone asked for by show() is now standing there.
export function createCast(box, { calm, models, onReady, framing }) {
  const canvas = document.createElement('canvas');
  canvas.className = 'duo__gl';
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, premultipliedAlpha: true, powerPreference: 'low-power' });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.25));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.5, 40);

  const cast = new Map(); // num -> character, loaded
  const loading = new Map(); // num -> promise
  const bad = new Set(); // failed once: his render stays
  let want = []; // who show() asked for
  let soon = []; // who's likely next (prefetched when nothing else is loading)
  let on = []; // who's on the water now (want, once all of them are in)

  // ---- loading: the Draco decoder (public/draco/, it ships with three.js) runs while there's
  // something to decode, and its workers go a while after the last one ----
  let draco = null;
  let dracoT = 0;
  let order = 0;
  function load(num) {
    if (cast.has(num)) return Promise.resolve(cast.get(num));
    if (loading.has(num)) return loading.get(num);
    clearTimeout(dracoT);
    draco ||= new DRACOLoader().setDecoderPath('/draco/').setWorkerLimit(2);
    const p = new GLTFLoader()
      .setDRACOLoader(draco)
      .loadAsync(models[num])
      .then((g) => {
        const c = rig(num, g);
        c.root.visible = false; // until show() puts him on
        cast.set(num, c);
        scene.add(c.root);
        return c;
      })
      .catch((e) => {
        bad.add(num);
        console.warn(`#${num} stays a render`, e);
      })
      .finally(() => {
        loading.delete(num);
        if (!loading.size) {
          dracoT = setTimeout(() => {
            draco?.dispose();
            draco = null;
          }, 15000);
        }
      });
    loading.set(num, p);
    return p;
  }
  const can = (n) => models[n] && !cast.has(n) && !bad.has(n);

  // fetch whoever's wanted (after a beat, so running the d-pad along the row doesn't fetch everyone
  // it passes), and once that's done and the pick has held a moment, with the page idle, whoever's
  // likely next, one at a time
  let pumpT = 0;
  const idle = (f) => (window.requestIdleCallback ? requestIdleCallback(f, { timeout: 2000 }) : setTimeout(f, 200));
  function pump() {
    clearTimeout(pumpT);
    if (want.some(can)) {
      pumpT = setTimeout(() => want.filter(can).forEach((n) => load(n).then(settle)), 120);
      return;
    }
    if (loading.size || !soon.some(can)) return;
    pumpT = setTimeout(() => idle(() => {
      const next = soon.find(can);
      if (next && !loading.size && !want.some(can)) load(next).then(settle);
    }), 700);
  }
  // a model came in (wanted, or fetched ahead and then picked): if that completes who's wanted, on
  // they go
  function settle() {
    if (want.length && !on.length && place()) onReady?.();
    pump();
  }

  // the pose they're placed in: two turned in toward each other, or one in the middle facing out
  function place() {
    const ok = want.length > 0 && want.every((n) => cast.has(n));
    const was = on;
    on = ok ? want.map((n) => cast.get(n)) : [];
    const now = performance.now();
    for (const c of cast.values()) c.root.visible = false;
    on.forEach((c, k) => {
      const s = on.length > 1 ? PAIR[k] : ALONE;
      c.root.visible = true;
      Object.assign(c, { x: s.x, base: s.turn, beat: s.beat, energy: s.energy, seen: now });
      const f = framing?.();
      if (f) c.x = (f.spots[k] - 0.5) * (PHONE_HEIGHT / f.tall) * camera.aspect;
      if (c.waving) return;
      c.look = c.base;
      if (!was.includes(c)) c.turn = c.base; // just stepped on: already facing the right way
    });
    gc(now);
    return ok;
  }
  // returns whether who's standing there changed
  function show(nums) {
    want = nums.slice(0, 2);
    const was = on.map((c) => c.num).join();
    place();
    pump();
    return on.map((c) => c.num).join() !== was;
  }
  function prefetch(nums) {
    soon = nums;
    pump();
  }

  // past KEEP models, let go of the ones off screen longest (never who's on, wanted or next)
  function gc(now) {
    if (cast.size <= KEEP) return;
    const old = [...cast.values()]
      .filter((c) => !on.includes(c) && !want.includes(c.num) && !soon.includes(c.num) && now - c.seen > STALE)
      .sort((a, b) => a.seen - b.seen);
    while (cast.size > KEEP && old.length) drop(old.shift());
  }
  function drop(c) {
    c.mixer.stopAllAction();
    c.mixer.uncacheRoot(c.root);
    scene.remove(c.root);
    c.root.traverse((o) => {
      if (o.isSkinnedMesh) o.skeleton.dispose();
      o.geometry?.dispose();
      for (const m of [].concat(o.material || [])) {
        for (const v of Object.values(m)) {
          if (!v?.isTexture) continue;
          v.dispose();
          v.image?.close?.(); // an ImageBitmap holds its pixels until closed
        }
        m.dispose();
      }
    });
    cast.delete(c.num);
  }

  function rig(num, gltf) {
    const root = gltf.scene;
    root.traverse((o) => {
      if (o.isMesh) o.frustumCulled = false;
    });
    const bones = {};
    root.traverse((o) => {
      if (o.isBone) bones[o.name] = o;
    });
    const mixer = new THREE.AnimationMixer(root);
    const clip = (n) => gltf.animations.find((a) => a.name === n);
    const idle = mixer.clipAction(clip('Idle'));
    idle.play();
    idle.time = (order++ * 1.7) % 3.1; // not in lockstep with whoever loaded with him
    const wave = mixer.clipAction(clip('Big_Wave_Hello'));
    wave.setLoop(THREE.LoopOnce, 1);
    wave.clampWhenFinished = true;
    // the bones the groove moves, and their pose as the mixer last left it: three's mixer only
    // writes a value when it changes, so the groove has to be taken off again before each update
    const groovy = GROOVY.map((n) => bones[n]).filter(Boolean);
    const clean = groovy.map((b) => ({ b, q: b.quaternion.clone(), p: b.position.clone() }));
    // the clips walk the hips sideways (the wave leans a long way out); keep them where they stand
    const rest = bones.Hips ? bones.Hips.position.clone() : null;
    const c = { num, root, bones, mixer, idle, wave, x: 0, base: 0, turn: 0, look: 0, beat: 0, energy: 1, waving: false, clean, rest, seen: performance.now() };
    mixer.addEventListener('finished', (e) => {
      if (e.action !== wave) return;
      idle.reset().fadeIn(0.45).play();
      wave.fadeOut(0.45);
      c.waving = false;
      c.look = c.base;
    });
    return c;
  }

  // rotate a bone about an axis of the character's own frame, through its pivot
  function rot(c, name, axis, ang) {
    const b = c.bones[name];
    if (!b || !ang) return;
    c.root.getWorldQuaternion(_rq);
    _ax.copy(axis).applyQuaternion(_rq);
    b.parent.getWorldQuaternion(_pq);
    _iq.copy(_pq).invert();
    _q.setFromAxisAngle(_ax, ang).premultiply(_iq).multiply(_pq);
    b.quaternion.premultiply(_q);
  }

  // the groove, on top of whatever the mixer just posed
  function groove(c, t) {
    const ph = (t * BPM) / 60 * Math.PI * 2 - c.beat;
    const bounce = Math.pow(0.5 - 0.5 * Math.cos(ph), 1.6); // 0..1 every beat
    const sway = Math.sin(ph / 2); // one side per bar-half
    const k = c.energy;
    c.bones.Hips && (c.bones.Hips.position.y -= 0.014 * bounce * k);
    rot(c, 'Hips', Y, 0.08 * sway * k);
    rot(c, 'Hips', Z, 0.035 * sway * k);
    rot(c, 'Spine01', Z, -0.03 * sway * k);
    rot(c, 'Spine02', X, 0.03 * bounce * k);
    rot(c, 'neck', X, 0.05 * bounce * k);
    rot(c, 'Head', X, 0.12 * bounce * k);
    rot(c, 'Head', Z, -0.05 * sway * k);
    if (!c.waving) {
      rot(c, 'LeftShoulder', Z, 0.09 * Math.max(0, sway) * k);
      rot(c, 'RightShoulder', Z, -0.09 * Math.max(0, -sway) * k);
      rot(c, 'LeftArm', Z, -0.06 * bounce * k);
      rot(c, 'RightArm', Z, 0.06 * bounce * k);
    }
  }

  function wave(num, at = 'viewer') {
    const c = cast.get(num);
    if (!c || c.waving || !on.includes(c)) return false;
    c.waving = true;
    c.look = at === 'other' && on.length > 1 ? c.base * 2.6 : 0;
    c.wave.reset().setEffectiveWeight(1).fadeIn(0.3).play();
    c.idle.fadeOut(0.3);
    return true;
  }

  let nextWave = 4 + Math.random() * 3;
  let t = 0;
  let gcAt = 0;
  function tick(dt) {
    const still = calm();
    if (!still) {
      t += dt;
      if (t > nextWave && on.length) {
        wave(on[Math.floor(Math.random() * on.length)].num, Math.random() < 0.45 ? 'other' : 'viewer');
        nextWave = t + WAVE_EVERY[0] + Math.random() * (WAVE_EVERY[1] - WAVE_EVERY[0]);
      }
    }
    const now = performance.now();
    for (const c of on) {
      c.seen = now;
      const live = !still || c.waving;
      c.turn += (c.look - c.turn) * (1 - Math.exp(-dt * 3.2));
      c.root.position.x = c.x + (still ? 0 : Math.sin(((t * BPM) / 60) * Math.PI - c.beat) * 0.018);
      c.root.rotation.y = c.turn + (live ? Math.sin(t * 0.4 + c.beat * 2) * 0.05 : 0);
      for (const k of c.clean) {
        k.b.quaternion.copy(k.q);
        k.b.position.copy(k.p);
      }
      c.mixer.update(live ? dt : 0);
      for (const k of c.clean) {
        k.q.copy(k.b.quaternion);
        k.p.copy(k.b.position);
      }
      if (c.rest) {
        const h = c.bones.Hips;
        h.position.x = c.rest.x;
        h.position.z = c.rest.z;
        // swing-twist: keep the lean, damp the turn about the vertical, so they stay facing out
        const q = h.quaternion;
        _tw.set(0, q.y, 0, q.w).normalize();
        q.multiply(_tw.clone().invert()).multiply(_id.slerp(_tw, YAW_KEEP));
        _id.identity();
      }
      if (!still) groove(c, t);
    }
    if (now > gcAt) {
      gcAt = now + 5000;
      gc(now);
    }
    renderer.render(scene, camera);
  }

  // frame them: feet at FEET of the height, room over their heads for a wave
  function resize(w, h) {
    w = Math.max(1, Math.round(w));
    h = Math.max(1, Math.round(h));
    renderer.setSize(w, h, false);
    const aspect = w / h;
    camera.aspect = aspect;
    const f = framing?.();
    const half = f ? PHONE_HEIGHT / (2 * f.tall) : Math.max(1.06, 1.6 / aspect);
    const cy = half * (1 - (1 - (f?.feet ?? FEET)) * 2); // camera height that puts y = 0 at the waterline
    const d = half / Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    camera.position.set(0, cy, d);
    camera.lookAt(0, cy, 0);
    camera.updateProjectionMatrix();
    if (f) on.forEach((c, k) => { c.x = (f.spots[k] - 0.5) * 2 * half * aspect; });
  }

  box.append(canvas);
  return {
    canvas,
    tick,
    resize,
    wave,
    show,
    prefetch,
    // are all of these loaded (and so, once shown, standing there)?
    ready: (nums) => nums.length > 0 && nums.every((n) => cast.has(n)),
    get live() {
      return on.length > 0;
    },
    get loaded() {
      return [...cast.keys()];
    },
    renderer,
  };
}
