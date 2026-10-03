// The player: a game, full screen, inside the page, like launching it from a console's menu.
//
// PLAY puts the game in an <iframe> over everything, behind a loading card (its art, its
// wordmark, and how to get back). The menu stops drawing altogether and the music bows out,
// so the game gets the whole machine. Leaving it unloads the game and puts you back on the same
// cartridge.
//
// Getting back to the menu, without clashing with the games' own pause (Esc / Start):
//   - on a pad: hold View + Menu (Select + Start; Create + Options on a PlayStation pad) for a
//     second. The page reads the pad itself, so this works while the game has the focus.
//   - on a keyboard: hold Esc for a second while the page has the focus (the loading card, or
//     after a click on the corner button). Inside the game, keys go to the game only, so there
//     it's Esc (the game pauses and lets go of the mouse), then the ◀ menu button.
//   - the ◀ menu button in the top-left corner, always there.
//   - the browser's Back, or a phone's back gesture: the game has its own history entry.

import { h, icon } from './dom.js';
import { shortUrl } from './projects.js';

const HOLD_MS = 1000;
const SHOW_AFTER = 160; // the ring only shows once it's clearly a hold

export function createPlayer({ glyph, paintGlyphs, onOpen, onClose, pads, blip }) {
  let el = null;
  let frame = null;
  let current = null;
  let hold = { t: 0, by: null };
  let timer = 0;
  let readyTimer = 0;
  let lastFocus = null;

  function build() {
    el = h('div', { class: 'player', id: 'player', role: 'dialog', 'aria-modal': 'true', hidden: true });
    el.innerHTML = `
      <div class="player__card">
        <img alt="" decoding="async">
        <p class="kindline"></p>
        <p class="wm"></p>
        <p class="status"><span class="cmd"></span> <span class="ok player__load">loading</span></p>
        <p class="player__how"></p>
      </div>
      <div class="player__bar">
        <button class="player__btn player__back" type="button"></button>
        <a class="player__btn player__btn--tab" target="_blank" rel="noopener"></a>
      </div>
      <div class="player__hold" hidden><span class="player__ring"></span><span>back to the menu</span></div>`;
    el.querySelector('.player__back').append(icon('back'), 'menu');
    el.querySelector('.player__btn--tab').append(icon('ext'));
    el.querySelector('.player__back').addEventListener('click', () => close());
    // leaving for a new tab: close the player behind it, so the game isn't running twice
    el.querySelector('.player__btn--tab').addEventListener('click', () => setTimeout(close, 0));
    document.body.append(el);

    // the keyboard hold: Esc, while the page (not the game) has the focus
    addEventListener('keydown', (e) => {
      if (!current || e.key !== 'Escape') return;
      e.preventDefault();
      if (!e.repeat && !hold.by) startHold('key');
    });
    addEventListener('keyup', (e) => e.key === 'Escape' && hold.by === 'key' && stopHold());
    addEventListener('blur', () => hold.by === 'key' && stopHold());
    addEventListener('popstate', (e) => current && e.state?.vyvPlay !== current.cmd && close({ popped: true }));
  }

  function how() {
    const pad = `hold ${glyph('hold') === 'Esc' ? '<b>View + Menu</b> (Select + Start)' : `<b>${glyph('hold')}</b>`} on a controller`;
    return `Back to the menu: ${pad}, <b>◀ menu</b> in the corner, the browser’s <b>Back</b>, or hold <b>Esc</b> here. Esc and Start in the game are the game's own.`;
  }

  function open(p) {
    if (!el) build();
    if (current) close({ quiet: true });
    current = p;
    lastFocus = document.activeElement;
    const card = el.querySelector('.player__card');
    const art = card.querySelector('img');
    art.src = p.image?.src || '';
    art.style.objectPosition = p.image?.position || '';
    card.style.setProperty('--accent', p.accent || '');
    card.querySelector('.kindline').textContent = p.kind;
    card.querySelector('.wm').textContent = p.name;
    card.querySelector('.cmd').textContent = `> ${p.cmd}.exe`;
    card.querySelector('.player__how').innerHTML = how();
    const tab = el.querySelector('.player__btn--tab');
    tab.href = p.url;
    tab.title = `Open ${shortUrl(p.url)} in a new tab instead`;
    tab.setAttribute('aria-label', tab.title);
    el.querySelector('.player__back').setAttribute('aria-label', 'Back to the menu');
    el.setAttribute('aria-label', p.name);
    el.classList.remove('is-ready');

    frame = h('iframe', {
      class: 'player__frame',
      title: p.name,
      src: p.url,
      allow: 'gamepad; fullscreen; autoplay; clipboard-write; xr-spatial-tracking',
      allowfullscreen: true,
      referrerpolicy: 'strict-origin-when-cross-origin',
    });
    let loaded = false;
    const t0 = performance.now();
    frame.addEventListener('load', () => {
      if (loaded || frame?.src === 'about:blank') return;
      loaded = true;
      // keep the card up for a beat so it can be read, then hand the game the focus
      readyTimer = setTimeout(ready, Math.max(0, 1400 - (performance.now() - t0)));
    });
    el.prepend(frame);
    el.hidden = false;
    paintGlyphs?.(el);
    el.querySelector('.player__back').focus({ preventScroll: true });
    onOpen?.(p);
    timer = setInterval(watchPads, 50);
    // an entry of its own, so the browser's Back (or a phone's back gesture) leaves the game
    // for the menu instead of leaving the site
    if (history.state?.vyvPlay) history.replaceState({ vyvPlay: p.cmd }, '', `#play/${p.cmd}`);
    else history.pushState({ vyvPlay: p.cmd }, '', `#play/${p.cmd}`);
  }

  function ready() {
    if (!current) return;
    // someone is holding Esc on the card: let them finish before the game takes the keys
    if (hold.by === 'key') {
      readyTimer = setTimeout(ready, 200);
      return;
    }
    el.classList.add('is-ready');
    el.querySelector('.player__load').textContent = '[ OK ]';
    try {
      frame.focus();
      frame.contentWindow?.focus();
    } catch {
      /* cross-origin focus is the frame's to take */
    }
  }

  function close({ quiet = false, popped = false } = {}) {
    if (!current) return;
    const p = current;
    current = null;
    // take the game's entry back off the history (Back did that already when it closed it)
    if (!quiet && !popped && history.state?.vyvPlay) history.back();
    clearInterval(timer);
    clearTimeout(readyTimer);
    stopHold();
    // unload the game for real: its loop, its sound and its WebGL all go with the document
    frame?.remove();
    frame = null;
    el.hidden = true;
    el.querySelector('.player__load').textContent = 'loading';
    if (!quiet) {
      blip?.('back');
      onClose?.(p, lastFocus);
    }
  }

  // ---- the hold ----
  function startHold(by) {
    hold = { t: performance.now(), by };
    tickHold();
  }
  function stopHold() {
    hold = { t: 0, by: null };
    if (el) el.querySelector('.player__hold').hidden = true;
  }
  function tickHold() {
    if (!hold.by || !current) return;
    const k = (performance.now() - hold.t) / HOLD_MS;
    const box = el.querySelector('.player__hold');
    if (performance.now() - hold.t > SHOW_AFTER) {
      box.hidden = false;
      box.querySelector('.player__ring').style.setProperty('--p', Math.min(1, k).toFixed(3));
    }
    if (k >= 1) {
      close();
      return;
    }
    if (hold.by === 'key') requestAnimationFrame(tickHold);
  }
  // View + Menu (buttons 8 + 9 in the standard mapping), held on any pad
  function watchPads() {
    if (!current) return;
    const both = pads().some((gp) => gp.buttons[8]?.pressed && gp.buttons[9]?.pressed);
    if (both && !hold.by) startHold('pad');
    else if (!both && hold.by === 'pad') stopHold();
    else if (both) tickHold();
  }

  return {
    open,
    close,
    get current() {
      return current;
    },
    // what the games can't do yet: ask to go back (see README, "Games in the player")
    message(data, origin) {
      if (!current || new URL(current.url).origin !== origin) return;
      if (data?.type === 'vyvanse:menu') close();
    },
  };
}
