// Radbro OS: the terminal, a hidden extra. `/` (or `) opens it from the menu, and so does
// "Radbro OS" on Contact. It reads the same data as the menu (src/projects.js): `ls`, `info
// <name>`, `open <name>` (plays it here), `crew`, `cd sites`, `neofetch`, `help`… Its own chunk,
// with its own stylesheet, loaded the first time it's asked for.

import { h, icon } from '../dom.js';
import { createTerminal } from './terminal.js';
import { createCommands } from './commands.js';
import './term.css';

const FETCHED_KEY = 'vyv-fetched';

export function createOS({ site, groups, projects, crew, contact, shell }) {
  const el = h('aside', { class: 'term os', id: 'term', role: 'dialog', 'aria-label': 'Radbro OS terminal', hidden: true });
  el.innerHTML = `
    <div class="term__bar">
      <span class="term__title"><span class="term__os">radbro os</span> <span class="term__who">${site.handle}@vyvanse <span class="term__cwd">~</span></span></span>
      <span class="term__keys" aria-hidden="true"><kbd>esc</kbd> to close</span>
      <button class="term__close" type="button" aria-label="Close terminal"></button>
    </div>
    <div class="term__chips" role="group" aria-label="Quick commands">
      <button type="button" data-cmd="help">help</button>
      <button type="button" data-cmd="ls">ls</button>
      <button type="button" data-cmd="neofetch">neofetch</button>
      <button type="button" data-cmd="open radrun">open radrun</button>
      <button type="button" data-cmd="crew">crew</button>
      <button type="button" data-cmd="whoami">whoami</button>
      <button type="button" data-cmd="clear">clear</button>
    </div>
    <div class="term__body">
      <div class="term__out" role="log" aria-live="polite" aria-label="Terminal output"></div>
      <form class="term__line" autocomplete="off">
        <span class="term__prompt" aria-hidden="true">vyvanse:~$</span>
        <input class="term__input" type="text" name="cmd" aria-label="Terminal command. Type help for a list." autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="go" />
      </form>
    </div>`;
  const closeBtn = el.querySelector('.term__close');
  closeBtn.append(icon('close'));
  document.body.append(el);

  let open = false;
  let greeted = false;
  let back = null;
  let commands;
  const term = createTerminal(el, {
    exec: (cmd, ctx) => commands.run(cmd, ctx),
    complete: (value) => commands.complete(value),
  });
  commands = createCommands({ site, groups, projects, crew, contact, term, shell, close: () => api.close() });

  function greet() {
    if (greeted) return;
    greeted = true;
    let fetched = null;
    try {
      fetched = sessionStorage.getItem(FETCHED_KEY);
      sessionStorage.setItem(FETCHED_KEY, '1');
    } catch {
      /* blocked storage: neofetch every time */
    }
    const muted = (t) => h('span', { class: 't-muted' }, t);
    const today = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    term.boot([
      h('div', { class: 't-line' }, h('span', { class: 't-strong' }, 'Radbro OS v4.7.64'), muted(' (midnight ube)'), ' — type ', h('button', { class: 't-cmd', type: 'button', 'data-cmd': 'help' }, 'help')),
      h('div', { class: 't-line' }, muted(`last login ${today.toLowerCase()} from the internet.`)),
    ]);
    term.type(fetched ? 'ls' : 'neofetch').then(() => {
      if (!fetched) el.querySelector('.term__out').scrollTop = 0;
    });
  }

  // clicks on commands in the output (and the chips) type them in
  el.addEventListener('click', (e) => {
    const c = e.target.closest('[data-cmd], [data-fill]');
    if (!c || e.button !== 0) return;
    e.preventDefault();
    if (c.dataset.fill != null) return term.fill(c.dataset.fill);
    term.type(c.dataset.cmd, { source: 'click' });
  });
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      api.close();
    }
  });
  closeBtn.addEventListener('click', () => api.close());

  const api = {
    el,
    isOpen: () => open,
    open({ focus } = {}) {
      if (!open) {
        open = true;
        back = document.activeElement;
        el.hidden = false;
        greet();
      }
      if (focus === 'input' || !matchMedia('(pointer: coarse)').matches) term.focus();
      else closeBtn.focus({ preventScroll: true });
    },
    close() {
      if (!open) return;
      open = false;
      el.hidden = true;
      if (back?.isConnected && back !== document.body) back.focus({ preventScroll: true });
    },
  };
  return api;
}
