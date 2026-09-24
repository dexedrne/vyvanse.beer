// Wires the landing, the terminal and the windows together. The landing works without any
// of this; everything here is progressive enhancement.

import { site, groups, projects, crew } from './projects.js';
import { h, media } from './dom.js';
import { createWindows } from './windows.js';
import { createTerminal } from './terminal.js';
import { createCommands } from './commands.js';

const termEl = document.getElementById('term');
const scrim = document.getElementById('scrim');
const toggle = termEl.querySelector('.term__toggle');
const bar = termEl.querySelector('.term__bar');
const chips = termEl.querySelector('.term__chips');

// ---- bottom sheet (below 1100px the terminal lives in a sheet you pull up) ----

const sheet = (() => {
  let open = false;
  const set = (v) => {
    if (media.wide.matches) v = false;
    open = v;
    termEl.classList.toggle('is-open', v);
    toggle.setAttribute('aria-expanded', String(v));
    scrim.hidden = !v;
    document.documentElement.classList.toggle('sheet-open', v);
  };
  const peek = () => {
    const px = bar.offsetHeight + chips.offsetHeight;
    document.documentElement.style.setProperty('--peek', `${px}px`);
  };

  toggle.addEventListener('click', () => set(!open));
  scrim.addEventListener('click', () => set(false));

  // Drag the bar to pull the sheet up or push it down; a tap toggles it.
  let drag = null;
  bar.addEventListener('pointerdown', (e) => {
    if (media.wide.matches || e.button !== 0) return;
    const closedY = termEl.offsetHeight - bar.offsetHeight - chips.offsetHeight;
    drag = { y: e.clientY, from: open ? 0 : closedY, closedY, moved: 0, onButton: !!e.target.closest('button') };
  });
  bar.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dy = e.clientY - drag.y;
    drag.moved = Math.max(drag.moved, Math.abs(dy));
    if (drag.moved < 6) return;
    // Capture only once it's really a drag, so a plain tap still clicks the toggle button.
    if (!bar.hasPointerCapture(e.pointerId)) bar.setPointerCapture(e.pointerId);
    termEl.classList.add('is-dragging');
    const y = Math.min(drag.closedY, Math.max(0, drag.from + dy));
    termEl.style.transform = `translateY(${y}px)`;
    drag.dy = dy;
  });
  const end = () => {
    if (!drag) return;
    const d = drag;
    drag = null;
    termEl.classList.remove('is-dragging');
    termEl.style.transform = '';
    if (d.moved >= 6) set(d.dy < 0 ? d.dy < -40 || open : !(d.dy > 40) && open);
    else if (!d.onButton) set(!open);
  };
  bar.addEventListener('pointerup', end);
  bar.addEventListener('pointercancel', end);

  media.wide.addEventListener('change', () => set(false));
  addEventListener('resize', peek);
  peek();
  document.fonts?.ready.then(peek);

  return { open: () => set(true), close: () => set(false), isOpen: () => open, peek };
})();

// ---- the page side: scroll to things, flash them, mark open projects ----

function flash(el) {
  el.classList.remove('is-flash');
  void el.offsetWidth;
  el.classList.add('is-flash');
  setTimeout(() => el.classList.remove('is-flash'), 1600);
}

const behavior = () => (media.reduced.matches ? 'auto' : 'smooth');

const page = {
  // `cd`: move the page. Below 1100px the sheet gets out of the way first.
  go(id) {
    if (!media.wide.matches) sheet.close();
    if (!id) return scrollTo({ top: 0, behavior: behavior() });
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: behavior(), block: 'start' });
    flash(el.querySelector('.sec__head') || el);
  },
  // `info` and friends: point at the thing on the page, only when the page is beside the terminal.
  show(id) {
    if (!media.wide.matches) return;
    const el = document.getElementById(id);
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.top < 0 || r.bottom > innerHeight) el.scrollIntoView({ behavior: behavior(), block: 'center' });
    flash(el.matches('.bro') ? el.querySelector('.bro__link') : el.querySelector('.sec__head') || el);
  },
  collapse: () => sheet.close(),
};

const wm = createWindows({
  layer: document.getElementById('wm'),
  dock: document.getElementById('dock'),
  termEl,
  onChange(open) {
    for (const el of document.querySelectorAll('[data-project]')) {
      if (el.closest('.wm')) continue;
      el.toggleAttribute('data-open', open.includes(el.dataset.project));
    }
  },
});

let commands;
const term = createTerminal(termEl, {
  exec: (cmd, ctx) => commands.run(cmd, ctx),
  complete: (value) => commands.complete(value),
  onInputFocus: () => sheet.open(),
});
commands = createCommands({ site, groups, projects, crew, wm, term, page });

// ---- clicks anywhere with data-cmd run that command in the terminal ----

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-cmd], [data-fill]');
  if (!el || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

  if (el.dataset.fill != null) {
    e.preventDefault();
    sheet.open();
    term.fill(el.dataset.fill);
    return;
  }

  const cmd = el.dataset.cmd;
  const fromTerminal = termEl.contains(el);
  const p = commands.project(cmd);
  const ctx = { source: fromTerminal ? 'terminal' : 'page' };

  if (p && !p.frame && el.tagName === 'A') ctx.alreadyOpened = true; // the link opens the tab itself
  else e.preventDefault();

  if (!fromTerminal && !media.wide.matches) {
    // Below 1100px the terminal is tucked away: windows and new tabs just happen, anything
    // that prints output pulls the sheet up so it can be read.
    if (p) ctx.instant = true;
    else sheet.open();
  }
  if (fromTerminal && el.closest('.term__chips')) sheet.open();
  term.type(cmd, ctx);
});

// ---- keyboard: / or ` jumps to the terminal, Esc puts the sheet away ----

const editable = (el) => el?.closest?.('input, textarea, select, [contenteditable=""], [contenteditable="true"]');

document.addEventListener('keydown', (e) => {
  if ((e.key === '/' || e.key === '`') && !e.ctrlKey && !e.metaKey && !e.altKey && !editable(e.target)) {
    e.preventDefault();
    sheet.open();
    term.focus();
  } else if (e.key === 'Escape' && sheet.isOpen()) {
    sheet.close();
    if (termEl.contains(document.activeElement)) document.activeElement.blur();
  }
});

// ---- boot ----

const muted = (t) => h('span', { class: 't-muted' }, t);
const today = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

term
  .boot([
    h('div', { class: 't-line' }, h('span', { class: 't-strong' }, 'vyvanse.beer'), muted(' tty1')),
    h('div', { class: 't-line' }, muted(`last login ${today.toLowerCase()} from the internet`)),
    h(
      'div',
      { class: 't-line' },
      'click anything on the page, or type ',
      h('button', { class: 't-cmd', type: 'button', 'data-cmd': 'help' }, 'help'),
      '.',
    ),
  ])
  .then(() => term.type('ls', { instant: !media.wide.matches }));
