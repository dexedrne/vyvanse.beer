// Rearranging a row of cartridges by hand: drag one with the mouse, or long-press it on a touch
// screen and then drag. It lifts off the row and follows the pointer, the others slide out of
// its way, and on letting go it drops into its new place. Nothing in the page moves until then:
// the sliding is all transforms, and the row's data and DOM change once, on the drop
// (`commit`, src/main.js). Esc (or the browser taking the touch over) puts it back.
//
// The pad and keyboard have their own way, a move mode (src/main.js); both use `flip` to slide
// cartridges from where they were drawn to where they now are.

const EASE = 'cubic-bezier(0.2, 0.7, 0.2, 1)';
const LONG_PRESS = 360; // ms a finger rests on a cartridge before it comes up
const SLOP_MOUSE = 6; // px the mouse moves with the button down before it's a drag, not a click
const SLOP_TOUCH = 10; // px a finger may wander during the long-press (more is a scroll)

const center = (el) => {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
};
const stopFlips = (el) => el.getAnimations?.().forEach((a) => a.id === 'flip' && a.cancel());

// Run `mutate` (which moves things in the DOM), then slide each element from where it was drawn
// before to where it is now. `held` gets a drop instead: from its lifted pose, a little settle.
export function flip(els, mutate, { reduced = false, ms = 230, held = null, pose = '' } = {}) {
  const before = new Map(els.map((el) => [el, center(el)]));
  els.forEach(stopFlips);
  mutate();
  if (reduced) return;
  for (const el of els) {
    if (!el.isConnected) continue;
    const a = before.get(el);
    const b = center(el);
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    if (el === held) {
      const anim = el.animate(
        [
          { transform: `translate(${dx}px, ${dy}px) ${pose}`, easing: EASE },
          { transform: 'translate(0, 4px) scale(0.97)', offset: 0.72, easing: 'ease-out' },
          { transform: 'none' },
        ],
        { duration: ms + 90 },
      );
      anim.id = 'flip';
    } else if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
      const anim = el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: ms, easing: EASE });
      anim.id = 'flip';
    }
  }
}

// rows: [{ tab, el: the <ul class="carts"> }]
// begin(tab): may a drag start now? (no game open, no dialog)
// pick(tab, i): one came up. over(tab, to): it's over another place now. moved(): it moved
// (the water's reflections follow). commit(tab, from, to): dropped somewhere new; reorder.
export function createSort({ rows, reduced, begin, pick, over, moved, commit, drop }) {
  let pend = null; // a press that may turn into a drag
  let drag = null;
  let eatUntil = 0; // the click that ends a drag isn't a click

  const tabOf = (ul) => rows.find((r) => r.el === ul)?.tab;

  for (const { el: ul } of rows) {
    ul.addEventListener('pointerdown', (e) => {
      if (drag) return;
      if (pend) return clearPend(); // a second finger: it's a pinch or a scroll, not a pick-up
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      const slot = e.target.closest('.slot');
      const tab = tabOf(ul);
      if (!slot || !begin(tab)) return;
      pend = { id: e.pointerId, mouse: e.pointerType === 'mouse', ul, tab, slot, sx: e.clientX, sy: e.clientY, x: e.clientX, y: e.clientY, timer: 0 };
      if (!pend.mouse) pend.timer = setTimeout(() => pend && start(), LONG_PRESS);
    });
    // once one is up, the finger drags it instead of scrolling the row or the page
    // (non-passive, so the browser waits to hear that before it scrolls)
    ul.addEventListener('touchmove', (e) => drag && e.cancelable && e.preventDefault(), { passive: false });
    // a long-press would open the image's menu or start selecting text
    ul.addEventListener('contextmenu', (e) => (drag || (pend && !pend.mouse)) && e.preventDefault());
    ul.addEventListener('dragstart', (e) => e.preventDefault());
  }

  function clearPend() {
    clearTimeout(pend?.timer);
    pend = null;
  }

  function start() {
    const p = pend;
    clearPend();
    const { ul, slot, tab } = p;
    const slots = [...ul.children];
    slots.forEach(stopFlips);
    const from = slots.indexOf(slot);
    if (from < 0) return;
    drag = { ...p, slots, from, to: from, cx: slots.map((s) => center(s).x), scroll0: ul.scrollLeft, t0: performance.now(), pose: '', emitT: 0, raf: 0 };
    try {
      slot.setPointerCapture(p.id);
    } catch {
      /* the pointer is already gone; pointerup will end it */
    }
    slot.classList.add('is-held');
    ul.classList.add('is-sorting');
    if (!p.mouse) {
      try {
        navigator.vibrate?.(12);
      } catch {
        /* no buzz */
      }
    }
    pick(tab, from);
    frame();
  }

  function frame() {
    const d = drag;
    if (!d) return;
    const now = performance.now();
    // near either end of a row that scrolls (the phone's): scroll it along
    const { ul } = d;
    if (ul.scrollWidth > ul.clientWidth + 1) {
      const r = ul.getBoundingClientRect();
      const edge = Math.min(64, r.width / 5);
      const v = d.x < r.left + edge ? -(r.left + edge - d.x) / edge : d.x > r.right - edge ? (d.x - (r.right - edge)) / edge : 0;
      if (v) ul.scrollLeft += Math.max(-1, Math.min(1, v)) * 12;
    }
    const dx = d.x - d.sx + (ul.scrollLeft - d.scroll0);
    const dy = Math.max(-90, Math.min(40, d.y - d.sy));
    // the lift: up off the row, a bit bigger, tilted, over 140 ms
    const k = reduced() ? 1 : 1 - (1 - Math.min(1, (now - d.t0) / 140)) ** 3;
    d.pose = `scale(${1 + 0.08 * k}) rotate(${reduced() ? 0 : -2.5 * k}deg)`;
    d.slot.style.transform = `translate(${dx}px, ${dy - 10 * k}px) ${d.pose}`;
    // the place it's over: the nearest slot centre; the ones in between make room
    const c = d.cx[d.from] + dx;
    let to = 0;
    d.cx.forEach((x, j) => Math.abs(x - c) < Math.abs(d.cx[to] - c) && (to = j));
    if (to !== d.to) {
      d.to = to;
      d.slots.forEach((s, j) => {
        if (s === d.slot) return;
        const shift = d.from < to && j > d.from && j <= to ? d.cx[j - 1] - d.cx[j] : to < d.from && j >= to && j < d.from ? d.cx[j + 1] - d.cx[j] : 0;
        s.style.transform = shift ? `translateX(${shift}px)` : '';
      });
      over(d.tab, to);
    }
    if (now - d.emitT > 90) {
      d.emitT = now;
      moved();
    }
    d.raf = requestAnimationFrame(frame);
  }

  // keep = false: put it back where it came from
  function end(keep) {
    const d = drag;
    if (!d) return;
    drag = null;
    cancelAnimationFrame(d.raf);
    eatUntil = performance.now() + 350;
    const to = keep ? d.to : d.from;
    flip(
      d.slots,
      () => {
        d.slots.forEach((s) => (s.style.transform = ''));
        d.ul.classList.remove('is-sorting');
        d.slot.classList.remove('is-held');
        if (to !== d.from) commit(d.tab, d.from, to);
      },
      { reduced: reduced(), held: d.slot, pose: d.pose },
    );
    drop(d.tab, to !== d.from);
  }

  addEventListener('pointermove', (e) => {
    if (pend && e.pointerId === pend.id) {
      pend.x = e.clientX;
      pend.y = e.clientY;
      const far = Math.hypot(e.clientX - pend.sx, e.clientY - pend.sy);
      if (pend.mouse && far > SLOP_MOUSE) start();
      else if (!pend.mouse && far > SLOP_TOUCH) clearPend(); // it's a scroll or a swipe
    }
    if (drag && e.pointerId === drag.id) {
      drag.x = e.clientX;
      drag.y = e.clientY;
    }
  });
  addEventListener('pointerup', (e) => {
    if (pend && e.pointerId === pend.id) clearPend();
    if (drag && e.pointerId === drag.id) end(true);
  });
  addEventListener('pointercancel', (e) => {
    if (pend && e.pointerId === pend.id) clearPend();
    if (drag && e.pointerId === drag.id) end(false);
  });
  addEventListener('blur', () => {
    clearPend();
    end(false);
  });
  // Esc while dragging: put it back (and nothing else hears that Esc)
  addEventListener(
    'keydown',
    (e) => {
      if (!drag || e.key !== 'Escape') return;
      e.preventDefault();
      e.stopImmediatePropagation();
      end(false);
    },
    true,
  );
  addEventListener(
    'click',
    (e) => {
      if (performance.now() > eatUntil) return;
      eatUntil = 0;
      e.preventDefault();
      e.stopImmediatePropagation();
    },
    true,
  );

  return {
    get active() {
      return !!(drag || pend);
    },
    cancel: () => {
      clearPend();
      end(false);
    },
  };
}
