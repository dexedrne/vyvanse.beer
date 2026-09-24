// The terminal: output log, input line, history, tab completion, and typed-in commands
// for clicks on the page (so every click shows the command it maps to).

import { h, media, sleep } from './dom.js';

const HISTORY_KEY = 'vyv-history';

function loadHistory() {
  try {
    return JSON.parse(sessionStorage.getItem(HISTORY_KEY)) || [];
  } catch {
    return [];
  }
}

function saveHistory(list) {
  try {
    sessionStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(-100)));
  } catch {
    /* private mode or blocked storage: history just won't survive a reload */
  }
}

export function createTerminal(root, { exec, complete, onInputFocus }) {
  const out = root.querySelector('.term__out');
  const form = root.querySelector('.term__line');
  const input = root.querySelector('.term__input');
  const prompt = root.querySelector('.term__prompt').textContent;

  const hist = loadHistory();
  let cursor = hist.length;
  let draft = '';
  let typing = false;
  let queue = Promise.resolve();

  const scroll = () => {
    out.scrollTop = out.scrollHeight;
  };

  function print(node) {
    const el = node instanceof Node ? node : h('div', { class: 't-line' }, node);
    out.append(el);
    for (const img of el.querySelectorAll?.('img') || []) img.addEventListener('load', scroll, { once: true });
    scroll();
    return el;
  }

  function submit(raw, ctx = {}) {
    print(h('div', { class: 't-line t-echo' }, h('span', { class: 't-prompt', 'aria-hidden': 'true' }, prompt), ' ', raw));
    const cmd = raw.trim();
    if (cmd && hist[hist.length - 1] !== cmd) {
      hist.push(cmd);
      saveHistory(hist);
    }
    cursor = hist.length;
    draft = '';
    try {
      exec(cmd, ctx);
    } catch (e) {
      print(h('div', { class: 't-line t-err' }, `something broke: ${e.message}`));
    }
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (typing) return;
    const v = input.value;
    input.value = '';
    submit(v, { source: 'terminal' });
  });

  input.addEventListener('focus', () => onInputFocus?.());

  input.addEventListener('keydown', (e) => {
    if (typing) {
      e.preventDefault();
      return;
    }
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      if (!hist.length) return;
      e.preventDefault();
      if (cursor === hist.length) draft = input.value;
      cursor = Math.min(hist.length, Math.max(0, cursor + (e.key === 'ArrowUp' ? -1 : 1)));
      input.value = cursor === hist.length ? draft : hist[cursor];
      requestAnimationFrame(() => input.setSelectionRange(input.value.length, input.value.length));
    } else if (e.key === 'Tab' && !e.shiftKey && input.value.trim()) {
      // Tab only completes when there's something to complete, so it still moves focus out.
      e.preventDefault();
      const { value, options } = complete(input.value);
      input.value = value;
      if (options.length) {
        print(h('div', { class: 't-line t-echo' }, h('span', { class: 't-prompt', 'aria-hidden': 'true' }, prompt), ' ', input.value));
        print(h('div', { class: 't-line t-muted' }, options.join('  ')));
      }
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      out.replaceChildren();
    } else if (e.key === 'c' && e.ctrlKey && input.selectionStart === input.selectionEnd) {
      e.preventDefault();
      print(h('div', { class: 't-line t-echo' }, h('span', { class: 't-prompt', 'aria-hidden': 'true' }, prompt), ' ', input.value, '^C'));
      input.value = '';
      cursor = hist.length;
    }
  });

  // Keep the input focused when someone clicks empty space in the terminal (but not when
  // they're selecting text or clicking a link or button in the output).
  out.addEventListener('click', (e) => {
    if (e.target.closest('a, button') || getSelection().toString()) return;
    if (media.wide.matches) input.focus({ preventScroll: true });
  });

  return {
    print,
    clear: () => out.replaceChildren(),
    focus: () => input.focus({ preventScroll: true }),
    history: () => [...hist],
    fill(text) {
      input.value = text;
      input.focus({ preventScroll: true });
    },
    // Show `raw` being typed at the prompt, then run it. Queued, so rapid clicks run in order.
    type(raw, ctx = {}) {
      queue = queue.then(async () => {
        if (ctx.instant || media.reduced.matches) {
          submit(raw, ctx);
          return;
        }
        typing = true;
        const kept = input.value;
        input.value = '';
        for (const ch of raw) {
          input.value += ch;
          await sleep(14 + Math.random() * 20);
        }
        await sleep(110);
        input.value = kept;
        typing = false;
        submit(raw, ctx);
      });
      return queue;
    },
    rug() {
      if (media.reduced.matches) return;
      root.classList.remove('is-rugged');
      void root.offsetWidth;
      root.classList.add('is-rugged');
      setTimeout(() => root.classList.remove('is-rugged'), 1000);
    },
    // Boot: a few lines, one at a time. Queued like typed commands, so anything clicked
    // while it's booting runs after it.
    boot(lines, { instant = false } = {}) {
      queue = queue.then(async () => {
        for (const l of lines) {
          print(l);
          if (!instant && !media.reduced.matches) await sleep(90);
        }
      });
      return queue;
    },
  };
}
