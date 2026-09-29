// The games shelf (src/render.js): the arrows, a meter showing where along the shelf you are,
// and dragging it sideways with a mouse. Touch and trackpads scroll it natively, and cards
// snap into place. Without JS it's a plain sideways scroller.

import { media } from './dom.js';

export function createShelf(root) {
  if (!root) return;
  const track = root.querySelector('.shelf__track');
  const thumb = root.querySelector('.shelf__thumb');
  const btns = root.querySelectorAll('.shelf__btn');
  const behavior = () => (media.reduced.matches ? 'auto' : 'smooth');

  // What one arrow press moves: a card plus the gap.
  const step = () => {
    const [a, b] = track.children;
    return b ? b.offsetLeft - a.offsetLeft : track.clientWidth;
  };

  function update() {
    const max = track.scrollWidth - track.clientWidth;
    const x = track.scrollLeft;
    const start = x <= 2;
    const end = x >= max - 2;
    root.toggleAttribute('data-start', start);
    root.toggleAttribute('data-end', end);
    root.toggleAttribute('data-fits', max <= 2);
    // aria-disabled rather than disabled, so a keyboard user pressing an arrow to the end
    // keeps focus on it
    btns[0].setAttribute('aria-disabled', String(start));
    btns[1].setAttribute('aria-disabled', String(end));
    const w = max > 2 ? track.clientWidth / track.scrollWidth : 1;
    thumb.style.width = `${w * 100}%`;
    thumb.style.left = `${max > 2 ? (x / max) * (1 - w) * 100 : 0}%`;
  }

  for (const b of btns) {
    b.addEventListener('click', () => {
      if (b.getAttribute('aria-disabled') === 'true') return;
      track.scrollBy({ left: Number(b.dataset.step) * step(), behavior: behavior() });
    });
  }

  // ---- drag with a mouse ----
  // Snapping is off while dragging, and on letting go it glides to the nearest card. A drag
  // never opens a game: the click that ends it is eaten.
  let drag = null;
  let eat = false;

  track.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    drag = { id: e.pointerId, x: e.clientX, left: track.scrollLeft, moved: false };
  });

  track.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x;
    if (!drag.moved) {
      if (Math.abs(dx) < 6) return;
      drag.moved = true;
      track.setPointerCapture(e.pointerId);
      root.classList.add('is-dragging');
      getSelection()?.removeAllRanges();
    }
    track.scrollLeft = drag.left - dx;
  });

  const settle = () => {
    root.classList.remove('is-dragging');
    update();
  };

  const end = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const { moved } = drag;
    drag = null;
    if (!moved) return;
    eat = true;
    setTimeout(() => (eat = false), 0);
    const s = step();
    const max = track.scrollWidth - track.clientWidth;
    const to = Math.min(max, Math.max(0, Math.round(track.scrollLeft / s) * s));
    if (Math.abs(to - track.scrollLeft) < 1) return settle();
    track.scrollTo({ left: to, behavior: behavior() });
    // snapping comes back once the glide is over (scrollend, or a timer where there's none)
    let done = false;
    const once = () => {
      if (done) return;
      done = true;
      settle();
    };
    track.addEventListener('scrollend', once, { once: true });
    setTimeout(once, 600);
  };
  track.addEventListener('pointerup', end);
  track.addEventListener('pointercancel', end);

  track.addEventListener(
    'click',
    (e) => {
      if (!eat) return;
      eat = false;
      e.preventDefault();
      e.stopPropagation();
    },
    { capture: true },
  );

  // links and images would start the browser's own drag-and-drop instead
  track.addEventListener('dragstart', (e) => e.preventDefault());

  track.addEventListener('scroll', update, { passive: true });
  new ResizeObserver(update).observe(track);
  update();
}
