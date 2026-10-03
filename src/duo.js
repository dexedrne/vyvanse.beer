// #4764 and #85, live in 3D, standing on the water and vibing.
//
// Both web models (public/models/: Draco meshes, unlit materials, a shared
// Radbro rig) carry two clips, Idle and Big_Wave_Hello. On top of Idle each gets a small
// procedural groove on one shared beat: a head nod, a shoulder bounce, a hip sway and a little
// bob, with #85 a touch behind #4764 so they aren't in lockstep, and both turned in toward each
// other. Every so often one of them waves (Big_Wave_Hello), at you or at the other one;
// wave(i) does it on demand (a click). Reduced motion: they hold still unless you ask for a
// wave.
//
// The camera is framed so their feet (y = 0) land at FEET of the canvas height, whatever its
// shape; the page uses that to put their reflection's waterline in the right place.

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

export const FEET = 0.976; // where y = 0 sits, as a share of the canvas height
const FOV = 18;
const BPM = 92;
const WAVE_EVERY = [7, 12]; // seconds between waves they do on their own
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

export async function createDuo(box, { calm, onWave, auto = true, vibe = true } = {}) {
  const canvas = document.createElement('canvas');
  canvas.className = 'duo__gl';
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, premultipliedAlpha: true, powerPreference: 'low-power' });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.25));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.5, 40);

  // the Draco decoder is served from public/draco/ (it ships with three.js)
  const draco = new DRACOLoader().setDecoderPath('/draco/');
  const loader = new GLTFLoader().setDRACOLoader(draco);
  const [g4764, g85] = await Promise.all([
    loader.loadAsync('/models/radbro4764-hero.glb'),
    loader.loadAsync('/models/retardio85-hero.glb'),
  ]);
  draco.dispose();

  // x: where he stands (m). turn: how far he faces the other one. beat: his lag behind the beat.
  const crew = [rig(g4764, -0.62, 0.17, 0, 1), rig(g85, 0.62, -0.17, 0.55, 0.85)];
  for (const c of crew) scene.add(c.root);

  function rig(gltf, x, turn, beat, energy) {
    const root = gltf.scene;
    root.position.x = x;
    root.rotation.y = turn;
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
    idle.time = beat * 3.1; // not in lockstep
    const wave = mixer.clipAction(clip('Big_Wave_Hello'));
    wave.setLoop(THREE.LoopOnce, 1);
    wave.clampWhenFinished = true;
    // the bones the groove moves, and their pose as the mixer last left it: three's mixer only
    // writes a value when it changes, so the groove has to be taken off again before each update
    const groovy = GROOVY.map((n) => bones[n]).filter(Boolean);
    const clean = groovy.map((b) => ({ b, q: b.quaternion.clone(), p: b.position.clone() }));
    // the clips walk the hips sideways (the wave leans a long way out); keep them where they stand
    const rest = bones.Hips ? bones.Hips.position.clone() : null;
    const c = { root, bones, mixer, idle, wave, x, base: turn, turn, look: turn, beat, energy, waving: false, clean, rest };
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

  function wave(i, at = 'viewer') {
    const c = crew[i];
    if (!c || c.waving) return false;
    c.waving = true;
    c.look = at === 'other' ? c.base * 2.6 : 0;
    c.wave.reset().setEffectiveWeight(1).fadeIn(0.3).play();
    c.idle.fadeOut(0.3);
    onWave?.(i, at);
    return true;
  }

  let nextWave = 4 + Math.random() * 3;
  let t = 0;
  function tick(dt) {
    const still = calm();
    if (!still) {
      t += dt;
      if (auto && t > nextWave) {
        const i = Math.random() < 0.5 ? 0 : 1;
        wave(i, Math.random() < 0.45 ? 'other' : 'viewer');
        nextWave = t + WAVE_EVERY[0] + Math.random() * (WAVE_EVERY[1] - WAVE_EVERY[0]);
      }
    }
    for (const c of crew) {
      const live = !still || c.waving;
      c.turn += (c.look - c.turn) * (1 - Math.exp(-dt * 3.2));
      c.root.rotation.y = c.turn + (live ? Math.sin(t * 0.4 + c.beat * 2) * 0.05 : 0);
      c.root.position.x = c.x + (still ? 0 : Math.sin(((t * BPM) / 60) * Math.PI - c.beat) * 0.018);
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
      if (!still && vibe) groove(c, t);
    }
    renderer.render(scene, camera);
  }

  // frame both of them: feet at FEET of the height, room over their heads for a wave
  function resize(w, h) {
    w = Math.max(1, Math.round(w));
    h = Math.max(1, Math.round(h));
    renderer.setSize(w, h, false);
    const aspect = w / h;
    camera.aspect = aspect;
    const half = Math.max(1.06, 1.6 / aspect); // half the visible height at the duo (m); wide enough for a wave's lean
    const cy = half * (1 - (1 - FEET) * 2); // camera height that puts y = 0 at FEET
    const d = half / Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    camera.position.set(0, cy, d);
    camera.lookAt(0, cy, 0);
    camera.updateProjectionMatrix();
  }
  // where each one stands, as a share of the canvas width (for clicks and the poster)
  function spots() {
    const half = camera.position.z * Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * camera.aspect;
    return crew.map((c) => 0.5 + c.x / (2 * half));
  }

  box.append(canvas);
  return { canvas, tick, resize, wave, spots, renderer, crew };
}
