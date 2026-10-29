// Games motion, ported from the approved wheel reference. One fixed-step animation clock.
const TAU = Math.PI * 2;
const DT = 1 / 120;
const clamp = (v,a,b) => Math.min(b,Math.max(a,v));
  // ---- a spring: x chases t; omega = speed (rad/s), zeta = damping (<1 overshoots, 1 does not) ----
export class Spring {
    constructor(x, omega, zeta) { this.x = x; this.t = x; this.v = 0; this.k = omega * omega; this.c = 2 * zeta * omega; }
    set(t) { this.t = t; return this; }
    snap(t) { this.x = this.t = t; this.v = 0; return this; }
    kick(v) { this.v += v; return this; }
    step(dt) { const a = -this.k * (this.x - this.t) - this.c * this.v; this.v += a * dt; this.x += this.v * dt; }
    get done() { return Math.abs(this.x - this.t) < 0.01 && Math.abs(this.v) < 0.01; }
  }
  // the springs in use (production: the same table in src/motion.js)
  const SP = {
    move: [17, 0.62],   // the wheel's x / scale / turn: overshoot ~8%, settle 0.5 s
    rise: [12, 0.6],    // the boot rise, the shelf switch sink, the insert bob: a slower overshoot, settle 0.7 s
    fade: [17, 1.0],    // opacity: never past 1
    tag: [12, 1.0],     // the tags follow their group
    cam: [7, 1.0],      // the camera following the focus on the current
    par: [5, 1.0],      // the parallax after the pointer
  };
  const spring = (name, x = 0) => new Spring(x, SP[name][0], SP[name][1]);

export function placeK(k, u, reach) {
    const a = Math.abs(k), sg = Math.sign(k);
    return {
      x: sg * u * (a - 0.035 * a * a),                        // at ±1 the shells just clear the apex, then a little air each step
      s: Math.max(0.3, 1 - 0.15 * a + 0.008 * a * a),
      r: sg * Math.min(30, 7 * a),                            // turned to face the apex, like a wheel's rim
      o: a > reach ? 0 : a <= 2 ? 1 : Math.max(0, 1 - (a - 2) * 0.3),
      hidden: a > reach + 0.5,
    };
  }
  const floatY = (u, k, i, T) => u * 0.014 * (k === 0 ? 0.6 : 1) * Math.sin(TAU * T / 3.6 + 0.9 * k);
  const rollZ = (i, T) => 0.5 * Math.sin(TAU * T / 5.3 + 1.3 * i);

export function nearestNeighbour(items, focus, dir, fu) {
  if (!focus) return null;
  const [vx,vy] = {left:[-1,0],right:[1,0],up:[0,-1],down:[0,1]}[dir];
  let best=null, score=Infinity;
  for (const it of items) {
    if (it===focus) continue;
    const dx=it.bx-focus.bx, dy=it.by-focus.by, along=dx*vx+dy*vy;
    if (along <= .2*fu) continue;
    const next=along+1.4*Math.abs(dx*vy-dy*vx);
    if(next<score) {score=next;best=it;}
  }
  return best;
}

export class InsertState {
  state = 'idle';
  press() { if(this.state !== 'idle') return false; this.state='pressed';return true; }
  cancel() { if(this.state !== 'pressed') return false; this.state='idle';return true; }
  release() { if(this.state !== 'pressed') return false; this.state='lifting';return true; }
  advance(next) { const order=['lifting','dropping','seated','playing']; if(order.indexOf(next)!==order.indexOf(this.state)+1)return false; this.state=next;return true; }
  eject() { this.state='idle'; }
}

export function createMotion({ screen: screenEl, arc, wheel, deck, wall, backdrop, onSelect, onPlay, onWall }) {
  const root = document.documentElement;
  const CALM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let LITE = localStorage.getItem('vyv-quality') === 'battery';
  let PHONE = matchMedia('(max-width: 760px) and (orientation: portrait)').matches;
  const $ = (s,r=screenEl) => r.querySelector(s);
  const $$ = (s,r=screenEl) => [...r.querySelectorAll(s)];
  const n = +arc.dataset.n;
  let sel = +arc.dataset.sel, lastTurn = -10, inserting = false, wallOpen = false, moving = false;
  let t=0;
  const timers=[];
  const after = (delay,fn) => timers.push({at:t+delay,fn});
  const mark = fn => fn();
  function fireTimers() { timers.sort((a,b)=>a.at-b.at); while(timers.length && timers[0].at <= t+1e-9) timers.shift().fn(); }
  function writeSlot(el, x, y, s, r, o, rz, i, T, mirror = true) {
    el.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) scale(${s.toFixed(4)}) rotateY(${r.toFixed(2)}deg) rotateZ(${rz.toFixed(3)}deg)`;
    el.style.opacity = o.toFixed(3);
    if (mirror) {
      const m = el.querySelector(':scope > .slot__mirror');
      if (m && !CALM) {
        m.style.transform = `skewX(${(1.3 * Math.sin(TAU * T / 2.3 + 0.7 * i)).toFixed(2)}deg)`;
        m.style.opacity = (0.86 + 0.12 * Math.sin(TAU * T / 1.9 + i)).toFixed(3);
      }
    }
  }
  // geometry (re-read on resize)
  let u, wl, lift, reach, mirrorH, cx, W, H;
  function measure() {
    PHONE = matchMedia('(max-width: 760px) and (orientation: portrait)').matches;
    const s0 = arc.querySelector('.slot');
    u = s0.offsetWidth; wl = arc.offsetHeight; lift = u * 0.08; mirrorH = s0.querySelector('.slot__mirror').offsetHeight;
    reach = parseFloat(arc.dataset.reach) || parseFloat(getComputedStyle(root).getPropertyValue('--reach')) || 4;
    cx = s0.offsetLeft + u / 2; W = screenEl.clientWidth; H = screenEl.clientHeight;
  }
  measure();

  // ---- the wheel ----
  const kof = (i) => ((i - sel + n + Math.floor(n / 2)) % n) - Math.floor(n / 2);
  const slots = $$('.slot', arc).map((el) => ({
    el, i: +el.dataset.i, sec: el.dataset.sec, k: 0, hidden: false,
    sx: spring('move'), ss: spring('move', 1), sr: spring('move'), so: spring('fade', 1), sdy: spring('rise'),
  }));
  const byI = (i) => slots.find((s) => s.i === i);
  function select(i, { snap = false } = {}) {
    idleSince = performance.now();
    sel = ((i % n) + n) % n;
    lastTurn = t;
    for (const s of slots) {
      s.i = +s.el.dataset.i;
      const k = kof(s.i), p = placeK(k, u, reach);
      s.k = k;
      if (snap || CALM) { s.sx.snap(p.x); s.ss.snap(p.s); s.sr.snap(p.r); s.so.snap(p.hidden ? 0 : p.o); }
      else if (s.el.hidden || s.so.x < 0.03) {
        // out past the reach: it slides in from one step further out (never pops into place)
        const q = placeK(k + (Math.sign(k) || 1), u, reach);
        s.sx.snap(q.x); s.ss.snap(q.s); s.sr.snap(q.r); s.so.snap(0);
        s.sx.set(p.x); s.ss.set(p.s); s.sr.set(p.r); s.so.set(p.hidden ? 0 : p.o);
      }
      else { s.sx.set(p.x); s.ss.set(p.s); s.sr.set(p.r); s.so.set(p.o); }
      s.target = p;
      mark(() => { s.el.classList.toggle('sel', s.i === sel); s.el.classList.toggle('far', Math.abs(k) >= 2.5); }, snap && t === 0 ? -10 : t);
    }
    onSelect?.(sel);
    const tagEl = $$('.tag', wheel);
    for (const el of tagEl) el.classList.toggle('cur', el.dataset.sec === byI(sel).sec);
  }
  const move = (d) => { if (!inserting && !moving) select(sel + d); };
  const sections = [...new Set(slots.map((s) => s.sec))];
  const firstOf = (sec) => slots.filter((s) => s.sec === sec).map((s) => s.i).sort((a, b) => a - b)[0];
  function jumpSection(d) {
    const cur = sections.indexOf(byI(sel).sec);
    select(firstOf(sections[(cur + d + sections.length) % sections.length]));
  }


  // the genre tags above the wheel
  const tags = $$('.tag', wheel).map((el, j) => ({ el, j, sec: el.dataset.sec, sx: spring('tag'), sy: spring('tag', wl * 0.7), so: spring('fade', 0), fresh: true }));


  // ---- boot: every slot starts 0.9u under the waterline, rises 55 ms apart from the apex outwards ----
  let booting = false;
  function boot() {
    booting = true;
    arc.classList.add('is-booting');
    for (const s of slots) {
      s.sdy.snap(0.9 * u); s.so.snap(0);
      after(0.25 + 0.055 * Math.abs(s.k), () => { s.sdy.set(0); s.so.set(s.target.o); });
    }
    after(0.25 + 0.055 * Math.floor(n / 2) + 0.55, () => { booting = false; arc.classList.remove('is-booting'); lastTurn = t; });
  }

  // ---- insert: ✕ down presses it. The release lifts it off the water while a console rises under it, it drops
  // into the slot with a click (the seam flashes, a rumble, rings on the water, the rest of the wheel dims and
  // sinks), then the screen comes on and the loading card is there. Cut A lasts 1.05 s. The timing lives here and the console styling in wheel.css. ----
  const INS = {
    //        lift (u)  tilt     scale  drop at  drop dur  dip (u)  fade  rings  screen on
    a: { lift: 1.05, tilt: -8,  scale: 1,    drop: 0.30, dropDur: 0.20, dip: 0.08, fade: 0.35, rings: 2, on: 0.62 },
  };
  let ins = null;
  const insertState = new InsertState();
  function press() { idleSince = performance.now(); if (!insertState.press()) return; mark(() => byI(sel).el.classList.add('is-pressed')); }
  function cancel() { insertState.cancel(); mark(() => byI(sel).el.classList.remove('is-pressed')); }
  function release(v = 'a') {
    if (!insertState.release()) return;
    v = 'a';
    if (wallOpen) closeWall();
    inserting = true;
    const c = INS[v] || INS.a;
    const apex = byI(sel);
    // the seat: the feet a hair above the waterline, the top 0.6u of the cartridge standing out of the console
    ins = { v, c, t0: t, apex, seat: -0.02 * u, lift: new Spring(0, 14, 0.7), click: new Spring(0, 30, 0.45), dropAt: -1, from: 0, y: 0 };
    ins.lift.set(-c.lift * u);
    mark(() => {
      apex.el.classList.remove('is-pressed');
      apex.el.classList.add('is-inserting');
      apex.el.style.setProperty('--tx', `${c.tilt}deg`); apex.el.style.setProperty('--sc', String(c.scale));
      screenEl.classList.add('is-inserting', `ins-${v}`);
      deck.classList.add('on');

    });
    // the drop: straight, face-on, accelerating into the slot
    after(c.drop, () => { insertState.advance('dropping'); ins.dropAt = t; ins.from = ins.lift.x; mark(() => { apex.el.style.setProperty('--tx', '0deg'); apex.el.style.setProperty('--sc', '1'); }); });
    const seatAt = c.drop + c.dropDur;
    after(seatAt, () => {
      insertState.advance('seated');
      ins.click.kick(260); // the click: 6 px past the seat and back
      mark(() => {
        deck.classList.add('lit');
        screenEl.classList.add('is-rumble');
        const rings = document.createElement('li');
        rings.className = 'rings'; rings.setAttribute('aria-hidden', 'true');
        rings.style.transform = `translateX(${(apex.sx.x + px.x * 0.25).toFixed(1)}px)`;
        const ws = [[1.6, 0.05], [2.4, 0.16], [3.4, 0.3]].slice(0, c.rings);
        rings.innerHTML = ws.map(([w, dl]) => `<i style="--dl:${dl}s;width:calc(var(--u)*${w});height:calc(var(--u)*${(w * 0.22).toFixed(3)})"></i>`).join('')
         ;
        arc.append(rings);
      });
      for (const s of slots) if (s !== apex && !s.el.hidden) { s.sdy.set(c.dip * u); s.so.set(s.target.o * c.fade); }
    });
    after(seatAt + 0.22, () => mark(() => screenEl.classList.remove('is-rumble')));
    after(c.on, () => mark(() => { deck.classList.add('bloom'); insertState.advance('playing'); onPlay?.(); }));
  }
  // the apex's y during the insert (the loop reads it every frame)
  function insertY() {
    const c = ins.c;
    if (ins.dropAt < 0) return ins.lift.x;
    const k = clamp((t - ins.dropAt) / c.dropDur, 0, 1);
    return ins.from + (ins.seat - ins.from) * k * k + ins.click.x;
  }

  const head = $('.wall__head');
  const field = $('.field');
  let items = [], clusters = [], fu = 0, focus = null, rowH = 0, fieldTop = 0, availH = 0, contentH = 0;
  const cam = spring('cam');
  const ftags = $$('.tag', field).map((el) => ({ el, sec: el.dataset.sec, sx: spring('tag'), sy: spring('tag'), so: spring('fade', 0) }));
  const hash = (i) => ((Math.sin(i * 12.9898 + 78.233) * 43758.5453) % 1 + 1) % 1;
  // the grid: one cartridge size (0.78u, stepping down to 0.5u when the rows would not fit the height; past
  // that the field scrolls to keep the focus in view). The groups go left to right in wheel order, left-aligned
  // under the head; a group stays whole on a row when it fits, otherwise it opens the next row (on a phone the
  // cells just flow, so no row is half empty). A group's tag stands over its first cartridge.
  function layoutField() {
    items = $$('.fl', wall).map((el) => ({ el, i: +el.dataset.i, sec: el.dataset.sec, cl: el.closest('.cl'), pair: el.classList.contains('fl--eds') }));
    const cls = $$('.cl', wall);
    clusters = cls.map((el) => ({ el, sec: el.dataset.sec, items: items.filter((x) => x.cl === el) }));
    const pad = head.offsetLeft;
    const stripEl = $('.strip');
    fieldTop = head.offsetTop + head.offsetHeight + (PHONE ? 22 : 34);
    const fieldBot = (stripEl ? stripEl.offsetTop : H - 32) - (PHONE ? 10 : 16);
    const availW = W - 2 * pad; availH = fieldBot - fieldTop;
    const LABEL = PHONE ? 22 : 26;
    fu = u * 0.78;
    let cw, gw;
    for (let tries = 0; tries < 9; tries++) {
      cw = fu * (PHONE ? 1.1 : 1.16); gw = PHONE ? 0 : 0.42 * fu;
      rowH = fu * 1.52 + LABEL + (PHONE ? 14 : 0.2 * fu);
      let row = 0, x = 0;
      for (const c of clusters) {
        const need = c.items.length * cw;
        if (x > 0) {
          if (!PHONE && x + gw + need > availW && need <= availW) { row++; x = 0; }
          else x += gw;
        }
        c.items.forEach((it) => {
          if (x > 0 && x + cw > availW) { row++; x = 0; }
          it.col = x; it.row = row; x += cw;
        });
      }
      contentH = (row + 1) * rowH - (PHONE ? 14 : 0.2 * fu);
      if (contentH <= availH || fu <= 0.5 * u) break;
      fu = Math.max(0.5 * u, fu * Math.sqrt(availH / contentH) * 0.98);
    }
    wall.style.setProperty('--fu', `${fu.toFixed(1)}px`);
    const top = fieldTop + (contentH < availH ? (availH - contentH) * 0.32 : 0);
    for (const it of items) {
      it.bx = pad + it.col + cw / 2;
      it.by = top + it.row * rowH + LABEL + 1.22 * fu;   // the feet
      it.el.style.setProperty('--z', String(10 + it.row));
    }
    for (const c of clusters) { const f = c.items[0]; c.tx = f.bx - cw / 2 + 2; c.ty = top + f.row * rowH + LABEL - 5; }
  }
  function camTarget() {
    if (!focus || contentH <= availH) return 0;
    const rowTop = focus.by - 1.22 * fu - (PHONE ? 22 : 26);
    return clamp(-(rowTop - fieldTop - (availH - rowH) / 2), -(contentH - availH), 0);
  }
  function focusItem(it, { snap = false } = {}) {
    if (!it) return;
    focus = it;
    onSelect?.(it.i);
    for (const x of items) mark(() => x.el.classList.toggle('sel', x === it));
    if (snap) cam.snap(camTarget()); else cam.set(camTarget());
  }
  // the d-pad: the nearest cartridge in that direction (distance along it, plus 1.4 × the sideways offset)
  function nearest(dir) { return nearestNeighbour(items,focus,dir,fu); }

  function openWall() {
    idleSince = performance.now();
    if (wallOpen || inserting) return;
    wallOpen = true;
    wall.hidden = false;
    if (CALM) wall.classList.add('wall--calm');
    layoutField();
    focusItem(items.find((x) => x.i === sel) || items[0], { snap: true });
    tagTargets();
    for (const tg of ftags) { tg.sx.snap(tg.sx.t); tg.sy.snap(tg.sy.t); tg.so.snap(tg.so.t); }
    render();
    mark(() => { wall.classList.add('is-open'); screenEl.classList.add('wall-open'); });
    onWall?.(true);
  }
  function closeWall() {
    if (!wallOpen) return;
    const pick = focus ? focus.i % n : sel;
    mark(() => { wall.classList.remove('is-open'); screenEl.classList.remove('wall-open'); });
    onWall?.(false);
    select(pick, { snap: true });
    wallOpen = false;
    after(0.32, () => { if (!wallOpen) wall.hidden = true; });
  }


  const px = spring('par'), py = spring('par');
  function tagTargets() {
    const active = t - lastTurn < 2.2;
    const curSec = byI(sel).sec;
    for (const tg of tags) {
      let vis = slots.filter((s) => s.sec === tg.sec && s.so.x > 0.15 && Math.abs(s.k) <= reach);
      // a group that wraps round the wheel shows at both ends: the tag goes with the brighter end
      if (vis.some((s) => s.k < 0) && vis.some((s) => s.k > 0)) {
        const sum = (sg) => vis.filter((s) => Math.sign(s.k) === sg).reduce((a, s) => a + s.so.x, 0);
        const side = sum(1) >= sum(-1) ? 1 : -1;
        vis = vis.filter((s) => Math.sign(s.k) === side || s.k === 0);
      }
      const cur = tg.sec === curSec;
      let o = 0;
      if (vis.length && !booting && !inserting) o = cur ? (active ? 1 : 0.7) : active && !PHONE ? 0.42 : 0;
      if (vis.length) {
        const x = vis.reduce((a, s) => a + s.sx.x, 0) / vis.length;
        const top = Math.min(...vis.map((s) => wl - 1.22 * u * s.ss.x - (s.i === sel ? lift : 0) + s.sdy.x));
        // above the apex's brackets (on a phone: centred on their top edge, the words are close above)
        const y = PHONE ? top - 0.2 * u + 11 : top - (cur ? 0.2 * u + 10 : 0.08 * u + 6);
        const side = Math.sign(vis.reduce((a, s) => a + s.k, 0));
        if (tg.fresh || (tg.side && side && side !== tg.side)) { tg.sx.snap(x); tg.sy.snap(y); tg.fresh = false; } else { tg.sx.set(x); tg.sy.set(y); }
        tg.side = side;
      }
      tg.so.set(o);
    }
    if (!wallOpen) return;
    for (const tg of ftags) {
      const c = clusters.find((c) => c.sec === tg.sec);
      if (!c) continue;
      tg.sx.set(c.tx); tg.sy.set(c.ty);
      tg.so.set(focus && focus.cl === c.el ? 1 : 0.6);
    }
  }
  function step(dt) {
    t += dt;
    fireTimers();
    tagTargets();
    for (const s of slots) { s.sx.step(dt); s.ss.step(dt); s.sr.step(dt); s.so.step(dt); s.sdy.step(dt); }
    for (const tg of tags) { tg.sx.step(dt); tg.sy.step(dt); tg.so.step(dt); }
    px.step(dt); py.step(dt);
    if (ins) { ins.lift.step(dt); ins.click.step(dt); }
    if (wallOpen) { cam.step(dt); for (const tg of ftags) { tg.sx.step(dt); tg.sy.step(dt); tg.so.step(dt); } }
  }
  function render() {
    const T = t;
    // the wheel
    for (const s of slots) {
      if (s.el.classList.contains('is-held') || arc.classList.contains('is-sorting')) continue;
      const p = s.target;
      const hide = p.hidden && s.so.x < 0.03;
      if (s.el.hidden !== hide) s.el.hidden = hide;
      if (hide) continue;
      const mine = ins && s === ins.apex;
      const fy = CALM || LITE || mine ? 0 : floatY(u, s.k, s.i, T);
      const rz = CALM || LITE || mine ? 0 : rollZ(s.i, T);
      writeSlot(s.el, s.sx.x + px.x * 0.25, mine ? insertY() : s.sdy.x + fy, s.ss.x, mine ? 0 : s.sr.x, clamp(s.so.x, 0, 1), rz, s.i, T);
      s.el.style.zIndex = String(s.i === sel ? 60 : 40 - Math.round(Math.abs(s.k) * 4));
    }
    // the tags
    for (const tg of tags) {
      const fl = CALM || LITE ? 0 : 3 * Math.sin(TAU * T / 4.4 + 1.1 * tg.j);
      tg.el.style.transform = `translate(${tg.sx.x.toFixed(1)}px, ${(tg.sy.x + fl).toFixed(1)}px) translate(-50%, -100%)`;
      tg.el.style.opacity = clamp(tg.so.x, 0, 1).toFixed(3);
    }
    // the console under the apex
    if (ins && deck) deck.style.transform = `translateX(${(ins.apex.sx.x + px.x * 0.25).toFixed(1)}px)`;
    // the art after the pointer
    backdrop.style.setProperty('--px', `${px.x.toFixed(2)}px`); backdrop.style.setProperty('--py', `${py.x.toFixed(2)}px`);
    // the library: every cartridge floats exactly like the wheel (y ±0.014u / 3.6 s, roll ±0.5° / 5.3 s, its reflection rippling)
    if (wallOpen) {
      field.style.transform = `translateY(${cam.x.toFixed(1)}px)`;
      for (const it of items) {
        const fy = CALM || LITE ? 0 : floatY(fu, 1, it.i, T);
        const rz = CALM || LITE ? 0 : rollZ(it.i, T);
        writeSlot(it.el, it.bx, it.by - 1.22 * fu + fy, 1, 0, 1, rz, it.i, T);
      }
      for (const tg of ftags) {
        const c = clusters.find((c) => c.sec === tg.sec);
        if (!c) continue;
        tg.el.classList.toggle('cur', !!focus && focus.cl === c.el);
        tg.el.style.transform = `translate(${tg.sx.x.toFixed(1)}px, ${tg.sy.x.toFixed(1)}px) translate(0, -100%)`;
        tg.el.style.opacity = clamp(tg.so.x, 0, 1).toFixed(3);
      }
    }
  }


  function flip(swap) {
    const els = [byI(sel)?.el, ...$$('.fl', wall).filter(el => +el.dataset.i === sel)].filter(Boolean);
    if (els.some(el => el.classList.contains('is-flipping'))) return;
    els.forEach(el => el.classList.add('is-flipping'));
    after(0.21, () => swap?.());
    after(0.42, () => els.forEach(el => el.classList.remove('is-flipping')));
  }
  function eject() {
    timers.length=0; insertState.eject();
    screenEl.classList.remove('is-inserting','ins-a','is-rumble');
    deck.classList.remove('lit','bloom');
    $$('.rings',arc).forEach(el=>el.remove());
    for(const s of slots) { s.el.classList.remove('is-pressed'); s.sdy.set(0); }
    if(ins) {
      ins.lift.snap(insertY()).set(-1.05*u); ins.dropAt=-1;
      after(.34,()=>{deck.classList.remove('on');
        const apex=ins.apex;apex.sdy.snap(ins.lift.x).set(0);apex.el.classList.remove('is-inserting');
        ins=null;inserting=false;select(sel);
      });
    } else {inserting=false;deck.classList.remove('on');select(sel);}
    resume();
  }
  function sinkWheel() {
    if (wallOpen) closeWall();
    for (const s of slots) after(0.028 * Math.abs(s.k), () => { s.sdy.set(0.55*u); s.so.set(0); });
  }
  let last = 0, acc = 0, raf = 0, frame = 0, idleSince = performance.now(), paused = false, external = false;
  function loop(now) {
    if (paused || document.hidden) { raf = 0; return; }
    if (!external) raf = requestAnimationFrame(loop);
    const dt = last ? Math.min(0.1, (now-last)/1000) : 1/60; last=now; acc+=dt;
    while (acc >= DT) { step(DT); acc-=DT; }
    if (now-idleSince > 6000 && ++frame % 2) return;
    render();
  }
  function pause() { paused = true; cancelAnimationFrame(raf); raf=0; }
  function resume() { paused = false; last=0; if (!external && !raf && !document.hidden) raf=requestAnimationFrame(loop); }
  document.addEventListener('visibilitychange', () => {
    root.classList.toggle('is-hidden', document.hidden);
    if (document.hidden) { cancelAnimationFrame(raf); raf=0; } else if (!paused) resume();
  });
  addEventListener('pointermove', e => { if (CALM || paused) return; px.set((e.clientX/W-0.5)*16); py.set((e.clientY/H-0.5)*10); }, {passive:true});
  const remeasure = () => { const before = [W,H,u,wl].join(); measure(); if (before === [W,H,u,wl].join()) return; select(sel, {snap:true}); if (wallOpen) { layoutField(); focusItem(items.find(x => x.i === sel)); } };
  addEventListener('resize', remeasure);
  addEventListener('vyv:quality', () => { LITE = localStorage.getItem('vyv-quality') === 'battery'; screenEl.classList.toggle('is-lite', LITE); remeasure(); });
  select(sel, {snap:true}); tagTargets();
  for (const tg of tags) { tg.sx.snap(tg.sx.t); tg.sy.snap(tg.sy.t); tg.so.snap(tg.so.t); }
  render(); resume();
  return { tick: loop, external() { external = true; cancelAnimationFrame(raf); raf=0; }, select, move, jumpSection, press, cancel, release, eject, flip, openWall, closeWall, nearest, focusItem, boot, sinkWheel, measure: remeasure, pause, resume,
    cue: on => byI(sel)?.el.classList.toggle('wall-cue',on),
    get wallOpen() { return wallOpen; }, get inserting() { return inserting; },
    get pressed() { return byI(sel)?.el.classList.contains('is-pressed'); },
    get items() { return items; },
  };
}
