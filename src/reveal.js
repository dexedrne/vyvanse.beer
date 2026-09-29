// Two small touches for the page, both progressive: without JS (or with reduced motion) every
// section is simply there.
//
// createReveal: section heads, game panes, site cards, the crew and contact surface as they
// scroll into view (they rise out of a blur, like something coming up through water). As a
// section head surfaces, a drop lands in the stream at its marker (src/water.js listens, and
// takes the position in document px).
//
// createSheen: glass panes catch a soft highlight that follows the pointer.

import { media, docBox } from './dom.js';

export function createReveal() {
  const els = document.querySelectorAll('.reveal');
  if (!els.length || !('IntersectionObserver' in window)) return;
  document.documentElement.classList.add('reveals');

  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const el = e.target;
        io.unobserve(el);
        el.classList.add('is-in');
        const drop = el.querySelector(':scope > .sec__drop');
        if (drop && !media.reduced.matches) {
          // where the marker will be once the head has risen into place, in document px; the
          // drop lands as the CSS ring starts
          const b = docBox(drop);
          const detail = { x: b.x + b.w / 2, y: b.y + b.h / 2, size: 1 };
          setTimeout(() => dispatchEvent(new CustomEvent('water:drop', { detail })), 150);
        }
      }
    },
    { rootMargin: '0px 0px -6% 0px', threshold: 0.08 },
  );
  for (const el of els) io.observe(el);
}

export function createSheen() {
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  let el = null;
  let x = 0;
  let y = 0;
  let queued = false;
  const paint = () => {
    queued = false;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${Math.round(x - r.left)}px`);
    el.style.setProperty('--my', `${Math.round(y - r.top)}px`);
  };
  document.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType !== 'mouse') return;
      const g = e.target.closest?.('.glass') || null;
      if (g !== el) {
        el?.classList.remove('is-lit');
        el = g;
        el?.classList.add('is-lit');
      }
      if (!el) return;
      x = e.clientX;
      y = e.clientY;
      if (!queued) {
        queued = true;
        requestAnimationFrame(paint);
      }
    },
    { passive: true },
  );
  document.documentElement.addEventListener('pointerleave', () => {
    el?.classList.remove('is-lit');
    el = null;
  });
}
