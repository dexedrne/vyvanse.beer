// Wires the landing, the terminal and the windows together. The landing works without any
// of this; everything here is progressive enhancement.

import { site, groups, projects, crew } from './projects.js';
import { h, media } from './dom.js';
import { createWindows } from './windows.js';
import { createTerminal } from './terminal.js';
import { createCommands } from './commands.js';
import { createBro } from './bro.js';

const root = document.documentElement;
const termEl = document.getElementById('term');
const scrim = document.getElementById('scrim');
const launcher = document.getElementById('launcher');
const closeBtn = termEl.querySelector('.term__close');
const bar = termEl.querySelector('.term__bar');
const coarse = matchMedia('(pointer: coarse)');

// Open/closed and "has seen the neofetch" last for the tab session only, so every new visit
// starts on the plain landing. Blocked storage just means nothing is remembered.
const OPEN_KEY = 'vyv-term-open';
const FETCHED_KEY = 'vyv-fetched';
const session = {
  get(k) {
    try {
      return sessionStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set(k, v) {
    try {
      sessionStorage.setItem(k, v);
    } catch {
      /* private mode or blocked storage */
    }
  },
};

let term;

// ---- Radbro OS: hidden until asked for ----
// The launcher, / or `, or clicking something on the page that prints output opens it. From
// 1100px up it docks beside the page; below that it's a bottom sheet over a scrim.

const panel = (() => {
  let open = false;
  let greeted = false;
  let back = null; // where focus goes back to when it closes

  function layout() {
    const sheet = open && !media.wide.matches;
    root.classList.toggle('term-open', open);
    root.classList.toggle('sheet-open', sheet);
    scrim.hidden = !sheet;
  }

  // Keyboard openings go to the prompt. A tap on a phone lands on the close button instead, so
  // the on-screen keyboard doesn't jump up over the output.
  function focusIn(where) {
    if (where === 'input' || !coarse.matches) term.focus();
    else closeBtn.focus({ preventScroll: true });
  }

  function set(v, { focus } = {}) {
    if (v !== open) {
      open = v;
      termEl.inert = !v;
      launcher.setAttribute('aria-expanded', String(v));
      layout();
      session.set(OPEN_KEY, v ? '1' : '0');
      if (v) {
        back = document.activeElement;
        greet();
      } else if (termEl.contains(document.activeElement)) {
        const to = back && back !== document.body && back.isConnected && !termEl.contains(back) ? back : launcher;
        to.focus({ preventScroll: true });
      }
    }
    if (v && focus) focusIn(focus);
  }

  // First time it's needed: boot lines, then neofetch on the first open of the session (a plain
  // `ls` after that). While it's still closed (a click on the page ran something) it all prints
  // at once, so nothing waits on it.
  function greet() {
    if (greeted) return;
    greeted = true;
    const quiet = !open || !media.wide.matches;
    const fetched = session.get(FETCHED_KEY);
    session.set(FETCHED_KEY, '1');
    const muted = (t) => h('span', { class: 't-muted' }, t);
    const today = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    term.boot(
      [
        h(
          'div',
          { class: 't-line' },
          h('span', { class: 't-strong' }, 'Radbro OS v4.7.64'),
          muted(' (midnight ube)'),
          ' — type ',
          h('button', { class: 't-cmd', type: 'button', 'data-cmd': 'help' }, 'help'),
        ),
        h('div', { class: 't-line' }, muted(`last login ${today.toLowerCase()} from the internet. click anything on the page, too.`)),
      ],
      { instant: quiet },
    );
    term.type(fetched ? 'ls' : 'neofetch', { instant: quiet }).then(() => {
      // Show the greeting from its first line: on a phone the neofetch is taller than the sheet.
      if (!fetched) termEl.querySelector('.term__out').scrollTop = 0;
    });
  }

  launcher.addEventListener('click', () => set(!open, { focus: 'auto' }));
  closeBtn.addEventListener('click', () => set(false));
  scrim.addEventListener('click', () => set(false));
  media.wide.addEventListener('change', layout);

  // Below 1100px: drag the bar down to put the sheet away.
  let drag = null;
  bar.addEventListener('pointerdown', (e) => {
    if (!open || media.wide.matches || e.button !== 0 || e.target.closest('button')) return;
    drag = { y: e.clientY, dy: 0 };
  });
  bar.addEventListener('pointermove', (e) => {
    if (!drag) return;
    drag.dy = Math.max(0, e.clientY - drag.y);
    if (drag.dy < 6) return;
    if (!bar.hasPointerCapture(e.pointerId)) bar.setPointerCapture(e.pointerId);
    termEl.classList.add('is-dragging');
    termEl.style.transform = `translateY(${drag.dy}px)`;
  });
  const end = () => {
    if (!drag) return;
    const { dy } = drag;
    drag = null;
    termEl.classList.remove('is-dragging');
    termEl.style.transform = '';
    if (dy > 60) set(false);
  };
  bar.addEventListener('pointerup', end);
  bar.addEventListener('pointercancel', end);

  return {
    open: (opts) => set(true, opts),
    close: () => set(false),
    isOpen: () => open,
    greet,
    restore() {
      if (session.get(OPEN_KEY) === '1') set(true);
    },
  };
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
    if (!media.wide.matches) panel.close();
    if (!id) return scrollTo({ top: 0, behavior: behavior() });
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: behavior(), block: 'start' });
    flash(el.querySelector('.sec__head') || el);
  },
  // `info` and friends: point at the thing on the page, only when the page is beside the terminal.
  show(id) {
    if (!media.wide.matches || !panel.isOpen()) return;
    const el = document.getElementById(id);
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.top < 0 || r.bottom > innerHeight) el.scrollIntoView({ behavior: behavior(), block: 'center' });
    flash(el.matches('.bro') ? el.querySelector('.bro__link') : el.querySelector('.sec__head') || el);
  },
  collapse: () => panel.close(),
  // `spin`: bring the hero into view so the spin can be seen.
  hero() {
    if (!media.wide.matches) panel.close();
    const el = bro.el;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.top < 0 || r.bottom > innerHeight) el.scrollIntoView({ behavior: behavior(), block: 'center' });
  },
};

// #4764 in the hero: loads the 3D viewer once he's on screen (see src/bro.js).
const bro = createBro(document.querySelector('.hero__bro model-viewer'));

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
term = createTerminal(termEl, {
  exec: (cmd, ctx) => commands.run(cmd, ctx),
  complete: (value) => commands.complete(value),
  onInputFocus: () => panel.open(),
});
commands = createCommands({ site, groups, projects, crew, wm, term, page, bro });

// ---- clicks anywhere with data-cmd run that command in the terminal ----

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-cmd], [data-fill]');
  if (!el || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

  if (el.dataset.fill != null) {
    e.preventDefault();
    panel.open();
    term.fill(el.dataset.fill);
    return;
  }

  const cmd = el.dataset.cmd;
  const fromTerminal = termEl.contains(el);
  const p = commands.project(cmd);
  const ctx = { source: fromTerminal ? 'terminal' : 'page' };

  if (p && !p.frame && el.tagName === 'A') ctx.alreadyOpened = true; // the link opens the tab itself
  else e.preventDefault();

  if (!fromTerminal && (!panel.isOpen() || !media.wide.matches)) {
    // The terminal is out of sight: windows and new tabs just happen (the command still lands
    // in its log), and anything that prints output opens it so it can be read.
    if (p) ctx.instant = true;
    else panel.open();
  }
  panel.greet();
  term.type(cmd, ctx);
});

// ---- keyboard: / or ` opens Radbro OS at the prompt, Esc puts it away ----

const editable = (el) => el?.closest?.('input, textarea, select, [contenteditable=""], [contenteditable="true"]');

document.addEventListener('keydown', (e) => {
  if ((e.key === '/' || e.key === '`') && !e.ctrlKey && !e.metaKey && !e.altKey && !editable(e.target)) {
    e.preventDefault();
    panel.open({ focus: 'input' });
  } else if (e.key === 'Escape' && panel.isOpen()) {
    panel.close();
  }
});

// ---- boot: closed, unless it was left open earlier in this tab ----

panel.restore();
