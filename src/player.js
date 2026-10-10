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
import { deviceFlags, isPhone } from './device.js';
import { launchUrl } from './ask/actions.js';
import { createPadRelay } from './pad-relay.js';

const HOLD_MS = 1000;
const SHOW_AFTER = 160; // the ring only shows once it's clearly a hold

export function createPlayer({ glyph, paintGlyphs, onOpen, onClose, pads, blip }) {
  let el = null;
  let frame = null;
  let current = null;
  let hold = { t: 0, by: null };
  let timer = 0;
  let relay = null;
  let relayFrame = 0;
  let readyTimer = 0;
  let frameLoaded = false;
  let controlsTimer = 0;
  let lastFocus = null;

  function build() {
    el = h('div', { class: 'player', id: 'player', role: 'dialog', 'aria-modal': 'true', hidden: true });
    el.innerHTML = `
      <div class="player__card">
        <img class="art-img" alt="" decoding="async">
        <div class="a2hs" hidden>
          <button class="a2hs__share" type="button"><span class="a2hs__ic" aria-hidden="true">⌂</span><span><b>Add to Home Screen</b> for the full screen · share ⇧ then “Add to Home Screen”</span></button>
          <button class="a2hs__x" type="button" aria-label="Dismiss Add to Home Screen hint">✕</button>
        </div>
        <p class="kindline"></p>
        <p class="wm"></p>
        <p class="status"><span class="cmd"></span> <span class="ok player__load">loading</span></p>
        <p class="player__how"></p>
      </div>
      <div class="player__bar">
        <button class="player__btn player__back" type="button"></button>
        <a class="player__btn player__btn--tab" target="_blank" rel="noopener"></a>
      </div>
      <button class="player__nub" type="button" aria-label="Show player menu"></button>
      <div class="player__rotate"><span class="ph" aria-hidden="true"></span><b>Turn your phone to play</b><span>landscape · controller ready</span></div>
      <div class="player__hold" hidden><span class="player__ring"></span><span>back to the menu</span></div>`;
    el.querySelector('.player__back').append(icon('back'), 'menu');
    el.querySelector('.player__nub').append(icon('back'));
    el.querySelector('.player__nub').addEventListener('click', () => {
      el.classList.add('is-controls');
      clearTimeout(controlsTimer);
      controlsTimer = setTimeout(() => el.classList.remove('is-controls'), 3000);
    });
    el.querySelector('.a2hs__x').addEventListener('click', () => {
      el.querySelector('.a2hs').hidden = true;
      try { localStorage.setItem('a2hs', '1'); } catch { /* private storage may be unavailable */ }
    });
    el.querySelector('.a2hs__share').addEventListener('click', () => {
      navigator.share?.({ title: 'vyvanse.beer', url: location.origin + '/' }).catch(() => {});
    });
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
    addEventListener('resize', sendViewport);
    addEventListener('orientationchange', sendViewport);
    addEventListener('vyv:input', sendViewport);
    globalThis.visualViewport?.addEventListener('resize', sendViewport);
    globalThis.visualViewport?.addEventListener('scroll', sendViewport);
  }

  function how() {
    if (isPhone()) return `back to the menu: hold <b>${['ps', 'xbox'].includes(document.documentElement.dataset.input) ? glyph('hold') : 'View + Menu'}</b> · <b>◀ menu</b> · the browser's <b>Back</b>`;
    const pad = `hold ${glyph('hold') === 'Esc' ? '<b>View + Menu</b> (Select + Start)' : `<b>${glyph('hold')}</b>`} on a controller`;
    return `Back to the menu: ${pad}, <b>◀ menu</b> in the corner, the browser’s <b>Back</b>, or hold <b>Esc</b> here. Esc and Start in the game are the game's own.`;
  }

  function viewport() {
    const height = globalThis.visualViewport?.height || innerHeight;
    const width = globalThis.visualViewport?.width || innerWidth;
    const landscape = width > height;
    const style = getComputedStyle(document.documentElement);
    const bottom = parseFloat(style.getPropertyValue('--safe-bottom')) || 0;
    el.style.setProperty('--view-height', `${height}px`);
    return { type: 'vyvanse:viewport',
      safe: { top: 0, right: 0, bottom: landscape ? bottom : 0, left: 0 },
      menu: { x: 8, y: 8, w: 32, h: 32 },
      standalone: !!navigator.standalone || matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches,
      orientation: landscape ? 'landscape' : 'portrait',
      input: ['ps', 'xbox'].includes(document.documentElement.dataset.input) ? 'ps' : 'touch' };
  }
  function sendViewport() {
    if (!current || !frame || !isPhone()) return;
    const data = viewport();
    frame.contentWindow?.postMessage(data, '*');
  }

  function open(p, { as } = {}) {
    if (!el) build();
    if (current) close({ quiet: true });
    current = p;
    lastFocus = document.activeElement;
    const card = el.querySelector('.player__card');
    const art = card.querySelector('img');
    art.src = p.image?.src || '';
    art.style.objectPosition = (isPhone() ? p.phone : p.image?.position) || '';
    card.style.setProperty('--accent', p.accent || '');
    card.querySelector('.kindline').textContent = p.kind;
    card.querySelector('.wm').textContent = p.name;
    card.querySelector('.cmd').textContent = `> ${p.cmd}.exe`;
    card.querySelector('.player__how').innerHTML = how();
    const tab = el.querySelector('.player__btn--tab');
    const url = launchUrl(p, as);
    tab.href = url;
    tab.title = `Open ${shortUrl(p.url)} in a new tab instead`;
    tab.setAttribute('aria-label', tab.title);
    el.querySelector('.player__back').setAttribute('aria-label', 'Back to the menu');
    el.setAttribute('aria-label', p.name);
    el.classList.remove('is-ready');
    el.classList.remove('is-controls');
    const phone = isPhone();
    let dismissed = false;
    try { dismissed = localStorage.getItem('a2hs') === '1'; } catch { /* show once storage permits */ }
    el.querySelector('.a2hs').hidden = !phone || !/iPhone|iPod/.test(navigator.userAgent) || viewport().standalone || dismissed;
    el.querySelector('.player__load').textContent = phone ? 'loading…' : 'loading';
    const src = new URL(url);
    if (phone) {
      const data = viewport();
      src.searchParams.set('vb', '1');
      src.searchParams.set('safe', [data.safe.top, data.safe.right, data.safe.bottom, data.safe.left].join(','));
      src.searchParams.set('menu', '8,8,32,32');
      src.searchParams.set('standalone', data.standalone ? '1' : '0');
    }

    frame = h('iframe', {
      class: 'player__frame',
      title: p.name,
      src: src.href,
      allow: 'gamepad; fullscreen; autoplay; accelerometer; clipboard-write; xr-spatial-tracking',
      allowfullscreen: true,
      referrerpolicy: 'strict-origin-when-cross-origin',
    });
    frameLoaded = false;
    let loaded = false;
    const openedFrame = frame;
    const t0 = performance.now();
    frame.addEventListener('load', () => {
      if (frame !== openedFrame || frame?.src === 'about:blank') return;
      sendViewport();
      if (loaded) return;
      loaded = true;
      frameLoaded = true;
      relay?.refresh();
      // keep the card up for a beat so it can be read, then hand the game the focus
      if (!el.classList.contains('is-ready')) {
        clearTimeout(readyTimer);
        readyTimer = setTimeout(() => ready(openedFrame), phone ? 2500 : Math.max(0, 1400 - (performance.now() - t0)));
      }
    });
    el.prepend(frame);
    // contentWindow exists only after attachment on WebKit.
    relay = createPadRelay({ target: frame.contentWindow, url, pads, device: live => deviceFlags(navigator, live) });
    const relayPads = () => {
      if (!current) return;
      relay.tick();
      relayFrame = requestAnimationFrame(relayPads);
    };
    relayFrame = requestAnimationFrame(relayPads);
    const landscape = (p.orientation ?? 'landscape') === 'landscape';
    el.classList.toggle('player--phone', isPhone());
    el.classList.toggle('player--landscape', landscape);
    el.hidden = false;
    sendViewport();
    paintGlyphs?.(el);
    if (!phone || document.documentElement.dataset.input === 'kb') el.querySelector('.player__back').focus({ preventScroll: true });
    onOpen?.(p);
    // iOS may decline orientation locking; the portrait player supplies a rotate hint.
    if (isPhone() && landscape) screen.orientation?.lock?.('landscape').catch(() => {});
    timer = setInterval(watchPads, 50);
    // an entry of its own, so the browser's Back (or a phone's back gesture) leaves the game
    // for the menu instead of leaving the site
    if (history.state?.vyvPlay) history.replaceState({ vyvPlay: p.cmd }, '', `#play/${p.cmd}`);
    else history.pushState({ vyvPlay: p.cmd }, '', `#play/${p.cmd}`);
  }

  function ready(openedFrame = frame) {
    if (!current || frame !== openedFrame) return;
    clearTimeout(readyTimer);
    // someone is holding Esc on the card: let them finish before the game takes the keys
    if (hold.by === 'key') {
      readyTimer = setTimeout(() => ready(openedFrame), 200);
      return;
    }
    el.classList.add('is-ready');
    clearTimeout(readyTimer);
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
    cancelAnimationFrame(relayFrame);
    relay = null;
    if (isPhone()) screen.orientation?.unlock?.();
    clearTimeout(readyTimer);
    clearTimeout(controlsTimer);
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
    message(e) {
      if (!current || !relay?.accepts(e)) return;
      if (e.data?.type === 'vyvanse:menu') close();
      else if (e.data?.type === 'vyvanse:ready') {
        relay.refresh();
        sendViewport();
        // The existing pad shim acknowledges before load; that is not a drawn game frame.
        if (isPhone() && frameLoaded) ready();
      }
    },
  };
}
