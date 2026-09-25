// In-page windows for projects that allow framing, opt-in (projects open in a new tab unless a
// window is asked for: `win <cmd>`, `open <cmd> --window`, or `set windows on`). Desktop and
// tablet: draggable, resizable, stackable windows with a dock. Phones: each window is a
// full-screen sheet.
// The iframe is only created when a window opens, and dropped when it closes.

import { h, icon, media } from './dom.js';
import { shortUrl } from './projects.js';

const SLOW_MS = 12000;
const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), Math.max(lo, hi));

export function createWindows({ layer, dock, termEl, onChange }) {
  const wins = new Map(); // project cmd -> window state
  let z = 1;
  let active = null;
  let placed = 0;

  // Where new windows go: the page column when the terminal is docked beside it, else the viewport.
  function area() {
    const docked = media.wide.matches && document.documentElement.classList.contains('term-open');
    const right = docked ? termEl.getBoundingClientRect().left : innerWidth;
    return { w: right, h: innerHeight };
  }

  function apply(w) {
    const s = w.el.style;
    s.setProperty('--x', `${Math.round(w.x)}px`);
    s.setProperty('--y', `${Math.round(w.y)}px`);
    s.setProperty('--w', `${Math.round(w.w)}px`);
    s.setProperty('--h', `${Math.round(w.h)}px`);
  }

  function keepOnScreen(w) {
    w.w = clamp(w.w, 320, innerWidth - 16);
    w.h = clamp(w.h, 220, innerHeight - 16);
    w.x = clamp(w.x, 96 - w.w, innerWidth - 96);
    w.y = clamp(w.y, 0, innerHeight - 48);
    apply(w);
  }

  function place(w) {
    const a = area();
    w.w = Math.min(1080, a.w - 64);
    w.h = Math.min(700, a.h - 128);
    const step = (placed++ % 5) * 28;
    w.x = Math.max(16, (a.w - w.w) / 2) + step;
    w.y = Math.max(16, (a.h - w.h) / 2 - 24) + step;
    keepOnScreen(w);
  }

  function changed() {
    renderDock();
    const visible = [...wins.values()].some((w) => !w.min);
    document.documentElement.classList.toggle('wm-visible', visible);
    onChange?.([...wins.keys()]);
  }

  function focus(w) {
    if (!w) return;
    if (w.min) w.min = false;
    w.el.classList.remove('is-min');
    w.el.style.zIndex = String(++z);
    active = w;
    for (const o of wins.values()) o.el.classList.toggle('is-active', o === w);
    changed();
  }

  function topmost() {
    let best = null;
    for (const w of wins.values()) {
      if (!w.min && (!best || +w.el.style.zIndex > +best.el.style.zIndex)) best = w;
    }
    return best;
  }

  function minimise(w) {
    w.min = true;
    w.el.classList.add('is-min');
    w.el.classList.remove('is-active');
    if (active === w) active = null;
    const next = topmost();
    if (next) focus(next);
    else changed();
  }

  function close(w) {
    clearTimeout(w.slow);
    w.el.remove();
    wins.delete(w.p.cmd);
    if (active === w) active = null;
    const next = topmost();
    if (next) focus(next);
    else changed();
  }

  function toggleMax(w) {
    w.max = !w.max;
    w.el.classList.toggle('is-max', w.max);
    w.el.querySelector('[data-act="max"]')?.setAttribute('aria-pressed', String(w.max));
  }

  function drag(w, handle, onMove) {
    handle.addEventListener('pointerdown', (e) => {
      if (media.phone.matches || e.button !== 0 || e.target.closest('button, a')) return;
      if (w.max && handle.classList.contains('win__bar')) return;
      e.preventDefault();
      focus(w);
      const start = { x: e.clientX, y: e.clientY, wx: w.x, wy: w.y, ww: w.w, wh: w.h };
      handle.setPointerCapture(e.pointerId);
      document.documentElement.classList.add('wm-dragging');
      const move = (ev) => {
        onMove(start, ev.clientX - start.x, ev.clientY - start.y);
        keepOnScreen(w);
      };
      const up = () => {
        handle.removeEventListener('pointermove', move);
        handle.removeEventListener('pointerup', up);
        handle.removeEventListener('pointercancel', up);
        document.documentElement.classList.remove('wm-dragging');
      };
      handle.addEventListener('pointermove', move);
      handle.addEventListener('pointerup', up);
      handle.addEventListener('pointercancel', up);
    });
  }

  function build(p) {
    const id = `win-${p.cmd}`;
    const host = shortUrl(p.url);
    const w = { p, min: false, max: false, x: 0, y: 0, w: 0, h: 0, slow: 0 };

    const status = h(
      'div',
      { class: 'win__status', role: 'status' },
      h('span', { class: 'win__spinner', 'aria-hidden': 'true' }),
      h('span', { class: 'win__status-text' }, `Loading ${host}`),
    );
    const iframe = h('iframe', {
      title: p.name,
      src: p.url,
      allow: 'fullscreen; autoplay; gamepad; clipboard-write; accelerometer; gyroscope',
      allowfullscreen: true,
      referrerpolicy: 'strict-origin-when-cross-origin',
    });
    iframe.addEventListener('load', () => {
      clearTimeout(w.slow);
      w.el.classList.add('is-loaded');
    });
    w.slow = setTimeout(() => {
      status.querySelector('.win__status-text').replaceChildren(
        h('span', {}, `${host} is taking a while. If this stays blank, it may not allow embedding.`),
        h('a', { class: 'btn btn--primary', href: p.url, target: '_blank', rel: 'noopener' }, 'Open in a new tab'),
      );
      w.el.classList.add('is-slow');
    }, SLOW_MS);

    const btn = (act, label, ic) =>
      h('button', { class: 'win__btn', type: 'button', 'data-act': act, 'aria-label': `${label} ${p.name}`, title: label }, icon(ic));

    const bar = h(
      'div',
      { class: 'win__bar' },
      h('span', { class: 'win__title', id }, p.name, h('span', { class: 'win__host' }, host)),
      h(
        'a',
        { class: 'win__btn win__btn--tab', href: p.url, target: '_blank', rel: 'noopener', title: 'Open in a new tab', 'aria-label': `Open ${p.name} in a new tab` },
        icon('ext'),
        h('span', { class: 'win__tab-label' }, 'New tab'),
      ),
      btn('min', 'Minimise', 'min'),
      btn('max', 'Maximise', 'max'),
      btn('close', 'Close', 'close'),
    );
    const grip = h('div', { class: 'win__grip', 'aria-hidden': 'true' });

    w.el = h(
      'section',
      { class: 'win', role: 'dialog', 'aria-labelledby': id, 'data-project': p.cmd },
      bar,
      h('div', { class: 'win__body' }, iframe, status),
      grip,
    );
    w.iframe = iframe;

    bar.addEventListener('click', (e) => {
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (act === 'min') minimise(w);
      else if (act === 'max') toggleMax(w);
      else if (act === 'close') close(w);
    });
    bar.addEventListener('dblclick', (e) => {
      if (!e.target.closest('button, a') && !media.phone.matches) toggleMax(w);
    });
    w.el.addEventListener('pointerdown', () => active !== w && focus(w));
    w.el.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        minimise(w);
      }
    });

    drag(w, bar, (s, dx, dy) => {
      w.x = s.wx + dx;
      w.y = s.wy + dy;
    });
    drag(w, grip, (s, dx, dy) => {
      w.w = s.ww + dx;
      w.h = s.wh + dy;
    });
    return w;
  }

  function renderDock() {
    const list = dock.querySelector('ul');
    list.replaceChildren(
      ...[...wins.values()].map((w) =>
        h(
          'li',
          { class: `dock__item${w === active ? ' is-active' : ''}${w.min ? ' is-min' : ''}` },
          h(
            'button',
            {
              class: 'dock__btn',
              type: 'button',
              title: w.min ? 'Restore' : w === active ? 'Minimise' : 'Bring to front',
              onclick: () => (w.min || w !== active ? focus(w) : minimise(w)),
            },
            w.p.name,
            h('span', { class: 'vh' }, w.min ? ' (minimised)' : w === active ? ' (active)' : ''),
          ),
          h(
            'button',
            { class: 'dock__x', type: 'button', 'aria-label': `Close ${w.p.name}`, title: 'Close', onclick: () => close(w) },
            icon('close'),
          ),
        ),
      ),
    );
    dock.hidden = wins.size === 0;
  }

  // A click inside an iframe never reaches this document, but it does blur our window.
  addEventListener('blur', () =>
    setTimeout(() => {
      const el = document.activeElement;
      if (el?.tagName !== 'IFRAME') return;
      for (const w of wins.values()) if (w.iframe === el && w !== active) focus(w);
    }),
  );
  addEventListener('resize', () => {
    for (const w of wins.values()) keepOnScreen(w);
  });

  return {
    // Returns 'opened' or 'focused'.
    open(p, { focusFrame = false } = {}) {
      let w = wins.get(p.cmd);
      let result = 'focused';
      if (!w) {
        w = build(p);
        wins.set(p.cmd, w);
        place(w);
        layer.append(w.el);
        result = 'opened';
      }
      focus(w);
      if (focusFrame || media.phone.matches) w.el.querySelector('[data-act="close"]').focus({ preventScroll: true });
      return result;
    },
    close(cmd) {
      const w = wins.get(cmd);
      if (w) close(w);
      return !!w;
    },
    closeAll() {
      const n = wins.size;
      for (const w of [...wins.values()]) close(w);
      return n;
    },
    active: () => active?.p.cmd ?? null,
    list: () => [...wins.values()].map((w) => ({ cmd: w.p.cmd, name: w.p.name, min: w.min, active: w === active })),
  };
}
