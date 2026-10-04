// The game-select screen. src/render.js already put every game, crew member, site and link in
// the HTML; this turns it into one full-screen menu you can drive with a mouse, touch, a
// keyboard or a controller (src/input.js), plays the games inside the page (src/player.js),
// and starts the rain, the puddle and the crew in 3D after the first paint (src/stage.js).

import { site, groups, projects, crew, contact, duo as DUO, shelf } from './projects.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { createPlayer } from './player.js';
import { createTicker } from './ticker.js';
import { openTip, loadTip } from './tip/open.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const phone = matchMedia('(max-width: 760px)');

const screen = $('#screen');
const duoEl = $('#duo');
const hint = $('#duo-hint');
let stage = null; // src/stage.js, once it has loaded (the water and the duo)
let fresh = false; // a crew model has just come in (shell.castReady)
let freshT = 0;

const TABS = ['games', 'crew', 'sites', 'contact'];
// Games: one cartridge per game, each a list of its editions (src/projects.js, `of`)
const SHELF = shelf(projects);
const LISTS = {
  games: SHELF,
  crew: crew.members,
  sites: projects.filter((p) => p.group === 'sites'),
  contact: $$('#contact .mi'),
};
const S = {
  tab: 'games',
  games: 0,
  crew: Math.max(0, crew.members.findIndex((m) => m.featured)),
  sites: 0,
  contact: 0,
};

// ---- editions: which one of each game is showing, remembered per game ----

const ED_KEY = 'vyv-editions';
const ED = {}; // game cmd -> the cmd of its edition last shown
try {
  Object.assign(ED, JSON.parse(localStorage.getItem(ED_KEY)));
} catch {
  /* blocked or broken storage: every game starts on its first edition */
}
const edOf = (i) => Math.max(0, SHELF[i].findIndex((e) => e.cmd === ED[SHELF[i][0].cmd]));
function setEd(i, k) {
  ED[SHELF[i][0].cmd] = SHELF[i][k].cmd;
  try {
    localStorage.setItem(ED_KEY, JSON.stringify(ED));
  } catch {
    /* it just won't be remembered */
  }
}
// what a tab's item i shows: on Games, that game's edition
const at = (tab, i) => (tab === 'games' ? SHELF[i]?.[edOf(i)] : LISTS[tab][i]);
const idOf = (tab, i) => (tab === 'crew' ? LISTS.crew[i]?.num : tab === 'contact' ? '' : at(tab, i)?.cmd);
// put the cursor on a game (its cartridge, and that edition) or a site; returns its tab
function locate(p) {
  if (p.group !== 'games') {
    S[p.group] = LISTS[p.group].indexOf(p);
    return p.group;
  }
  const i = SHELF.findIndex((eds) => eds.includes(p));
  S.games = i;
  if (SHELF[i].length > 1) setEd(i, SHELF[i].indexOf(p));
  return 'games';
}

// ---- little helpers: a toast, the announcer, new tabs ----

let toastEl;
let toastT = 0;
function toast(text, ms = 2200) {
  toastEl ||= Object.assign(document.createElement('p'), { className: 'toast', role: 'status' });
  if (!toastEl.isConnected) document.body.append(toastEl);
  toastEl.textContent = text;
  toastEl.hidden = false;
  clearTimeout(toastT);
  toastT = setTimeout(() => (toastEl.hidden = true), ms);
}
const announce = (t) => ($('#announce').textContent = t);

function openTab(url) {
  const w = window.open(url, '_blank');
  if (w) w.opener = null;
  return !!w;
}

// A pad press doesn't count as a click to the browser, so it may not be allowed to open a tab.
// Then ask: open it here (leaving the menu), or a real link to click.
let ask = null;
function askTab({ title, text, url }) {
  if (!ask) {
    ask = document.createElement('div');
    ask.className = 'ask';
    ask.hidden = true;
    ask.innerHTML = `<div class="ask__box" role="alertdialog" aria-modal="true" aria-labelledby="ask-title" aria-describedby="ask-text">
      <p class="ask__title" id="ask-title"></p><p class="ask__text" id="ask-text"></p>
      <div class="ask__acts"><button class="play" type="button" data-here><span class="g g--a" data-g="a">A</span>Open it here</button>
      <a class="play play--ghost" target="_blank" rel="noopener" data-tabby>New tab</a>
      <button class="play play--ghost" type="button" data-cancel><span class="g g--b" data-g="b">B</span>Back</button></div></div>`;
    ask.addEventListener('click', (e) => {
      if (e.target === ask || e.target.closest('[data-cancel]')) closeAsk();
      else if (e.target.closest('[data-here]')) location.assign(ask.dataset.url);
      else if (e.target.closest('[data-tabby]')) setTimeout(closeAsk, 0);
    });
    ask.addEventListener('keydown', (e) => e.key === 'Escape' && (e.preventDefault(), closeAsk()));
    document.body.append(ask);
  }
  ask.dataset.url = url;
  $('#ask-title').textContent = title;
  $('#ask-text').textContent = text;
  $('[data-tabby]', ask).href = url;
  input.paintGlyphs(ask);
  ask.hidden = false;
  ask.back = document.activeElement;
  $('[data-here]', ask).focus();
}
function closeAsk() {
  if (!ask || ask.hidden) return false;
  ask.hidden = true;
  ask.back?.focus?.({ preventScroll: true });
  return true;
}

// ---- backdrops: one <img> per picture, crossfaded; made when first needed ----

// art with its own lettering on the left (a share card): where the lettering ends on screen, from
// object-fit: cover and the object-position, so the page can fade it out up to there
function cutLettered(img) {
  const k = +img.dataset.lettered;
  if (!k) return;
  const [bw, bh, iw, ih] = [img.offsetWidth, img.offsetHeight, +img.dataset.w, +img.dataset.h];
  if (!bw || !bh || !iw || !ih) return;
  const s = Math.max(bw / iw, bh / ih);
  const px = parseFloat(img.style.objectPosition) / 100;
  img.style.setProperty('--cut', `${Math.round((bw - iw * s) * (isFinite(px) ? px : 0.5) + k * iw * s)}px`);
}

const BD = {};
for (const img of $$('#backdrops .bd')) BD[img.dataset.bd] = img;
function bdFor(tab, i) {
  if (tab === 'games') {
    const p = at('games', i);
    const { src, position: pos, lettered, width: w, height: h } = p.image;
    return { key: `games:${p.cmd}`, src, pos, lettered, w, h };
  }
  if (tab === 'sites') return { key: `sites:${LISTS.sites[i].cmd}`, src: LISTS.sites[i].image.src, soft: true };
  if (tab === 'crew') return { key: 'crew', src: '/img/art/vyvanse.webp', soft: true };
  return { key: 'contact', src: '/img/art/vyvanse.webp', pos: '60% 6%' };
}
function backdrop(tab, i) {
  const b = bdFor(tab, i);
  let img = BD[b.key];
  if (!img) {
    img = new Image();
    img.className = `bd${b.soft ? ' bd--soft' : ''}${b.lettered ? ' bd--lettered' : ''}`;
    if (b.lettered) Object.assign(img.dataset, { lettered: b.lettered, w: b.w, h: b.h });
    img.alt = '';
    img.decoding = 'async';
    img.src = b.src;
    if (b.pos) img.style.objectPosition = b.pos;
    $('#backdrops').append(img);
    BD[b.key] = img;
    cutLettered(img);
  }
  const show = () => {
    for (const k in BD) BD[k].classList.toggle('on', k === b.key);
    emit();
  };
  // crossfade once it's decoded, so there's never a blank frame
  if (img.complete) show();
  else (img.decode?.() || Promise.resolve()).then(show, show);
}
// the neighbours of what's showing, fetched while nothing else is going on
function warm(tab, i) {
  nextUp();
  const n = LISTS[tab]?.length;
  if (!n || tab === 'contact') return;
  const go = () => {
    [i - 1, i + 1].forEach((j) => {
      const b = bdFor(tab, (j + n) % n);
      if (!BD[b.key]) new Image().src = b.src;
    });
    // and this game's other editions, so a flip has its art at hand
    if (tab === 'games') for (const e of SHELF[i]) if (!BD[`games:${e.cmd}`]) new Image().src = e.image.src;
  };
  (window.requestIdleCallback || setTimeout)(go);
}
// on Crew, the 3D models of the cards either side (the stage fetches them once his is in)
function nextUp() {
  const n = LISTS.crew.length;
  const i = S.crew;
  stage?.prefetch(S.tab === 'crew' ? [LISTS.crew[(i + 1) % n].num, LISTS.crew[(i + n - 1) % n].num] : []);
}

// ---- painting ----

let typeTimer = 0;
function typeOut(item) {
  clearInterval(typeTimer);
  const el = item && $('[data-type]', item);
  if (!el) return;
  const full = (el.dataset.full ||= el.textContent);
  if (reduced.matches) {
    el.textContent = full;
    return;
  }
  let n = 0;
  el.textContent = '';
  el.classList.add('typed');
  typeTimer = setInterval(() => {
    el.textContent = full.slice(0, ++n);
    if (n >= full.length) {
      clearInterval(typeTimer);
      setTimeout(() => el.classList.remove('typed'), 900);
    }
  }, 22);
}

const panelOf = (tab) => $(`#${tab}`);
const itemsOf = (tab) => $$('.item', panelOf(tab));
const onItem = (tab) => $('.item.on', panelOf(tab));
const slotsOf = (tab) => $$(tab === 'crew' ? '.tslot' : '.slot', panelOf(tab));
const controlsOf = (tab) => (tab === 'contact' ? LISTS.contact : $$(tab === 'crew' ? '.tile' : '.cart', panelOf(tab)));

function paint(tab) {
  const i = S[tab];
  const panel = panelOf(tab);
  if (tab === 'contact') {
    LISTS.contact.forEach((el, j) => el.classList.toggle('sel', j === i));
  } else {
    const id = idOf(tab, i);
    const was = onItem(tab);
    itemsOf(tab).forEach((el) => {
      const on = el.dataset.id === id;
      el.classList.toggle('on', on);
      if (!on) {
        el.classList.remove('is-more', 'is-swap');
        $('[data-more]', el)?.setAttribute('aria-expanded', 'false');
      }
    });
    const now = onItem(tab);
    // the same game, another edition: crossfade instead of the wipe a new game gets
    if (was && now && was !== now && was.dataset.game && was.dataset.game === now.dataset.game) crossfade(was, now);
    slotsOf(tab).forEach((el, j) => el.classList.toggle('sel', j === i));
    if (tab === 'games') labels();
    controlsOf(tab).forEach((el, j) => (j === i ? el.setAttribute('aria-current', 'true') : el.removeAttribute('aria-current')));
    const count = $('.count', panel);
    if (count) count.textContent = `${i + 1} of ${LISTS[tab].length}`;
    keepInView(controlsOf(tab)[i]);
    typeOut(now);
  }
  backdrop(tab, i);
  warm(tab, i);
}

// a cartridge with editions wears the shown one's label and glow, the next one's edge behind it
function labels() {
  slotsOf('games').forEach((slot, j) => {
    const eds = SHELF[j];
    if (eds.length < 2) return;
    const k = edOf(j);
    slot.style.setProperty('--accent', eds[k].accent);
    slot.style.setProperty('--accent2', eds[(k + 1) % eds.length].accent);
    for (const img of $$('[data-label]', slot)) img.classList.toggle('on', img.dataset.label === eds[k].cmd);
    // the name under the label follows the edition too (RetardioPayne, ZombieTardio)
    const name = $('.cart__name', slot);
    if (name) name.textContent = eds[k].name;
    $('.cart', slot).setAttribute('aria-controls', eds[k].slug);
  });
}

// (the new card keeps is-swap while it's showing: taking it off would start the wipe again)
function crossfade(was, now) {
  clearTimeout(now.fadeT);
  now.classList.remove('is-out');
  if (reduced.matches) return;
  was.classList.add('is-out');
  now.classList.add('is-swap');
  clearTimeout(was.fadeT);
  was.fadeT = setTimeout(() => was.classList.remove('is-out'), 300);
}

// flip the picked game to another edition: a step (+1 / -1, round and round), an edition's cmd,
// or a side ('first' / 'last': the pad's triggers, which flank the switch, point at its ends)
function edition(to) {
  if (S.tab !== 'games') return false;
  const eds = SHELF[S.games];
  if (eds.length < 2) return false;
  const cur = edOf(S.games);
  const k =
    to === 'first' ? 0
    : to === 'last' ? eds.length - 1
    : typeof to === 'string' ? eds.findIndex((e) => e.cmd === to)
    : (cur + to + eds.length) % eds.length;
  if (k < 0 || k === cur) return;
  // focus was on the switch: it goes along to the same pill on the new card
  const pill = document.activeElement?.closest?.('.ed');
  setEd(S.games, k);
  paint('games');
  save();
  layout();
  audio.blip('move');
  if (pill) $(`.ed[data-ed="${eds[k].cmd}"]`, onItem('games'))?.focus({ preventScroll: true });
  announce(`${eds[k].name}, the ${eds[k].edition?.label || eds[k].name} edition`);
}

// keep the picked cartridge in view in the phone's swipe row (scroll the row, not the page)
function keepInView(el) {
  const sc = el?.closest('.carts, .tgroups');
  if (!sc || sc.scrollWidth <= sc.clientWidth) return;
  const r = el.getBoundingClientRect();
  const sr = sc.getBoundingClientRect();
  sc.scrollTo({ left: sc.scrollLeft + (r.left + r.width / 2) - (sr.left + sr.width / 2), behavior: reduced.matches ? 'auto' : 'smooth' });
}

function show(tab, { sound = true, focus = false } = {}) {
  if (!TABS.includes(tab)) tab = 'games';
  const changed = tab !== S.tab;
  S.tab = tab;
  for (const t of $$('.tab')) {
    const on = t.dataset.tab === tab;
    t.setAttribute('aria-selected', String(on));
    t.tabIndex = on ? 0 : -1;
  }
  for (const p of $$('.panel')) p.classList.toggle('on', p.dataset.panel === tab);
  screen.dataset.tab = tab;
  paint(tab);
  hints();
  save();
  layout();
  if (changed) hello(tab === 'contact' ? [DUO[1], DUO[0]] : tab === 'crew' ? want() : []);
  if (sound && changed) audio.blip('tab');
  if (focus) controlsOf(tab)[S[tab]]?.focus({ preventScroll: true });
  announce(`${tab}: ${label(tab, S[tab])}`);
}
const tabStep = (d) => show(TABS[(TABS.indexOf(S.tab) + d + TABS.length) % TABS.length], { focus: focusInRow() });

function label(tab, i) {
  if (tab === 'crew') return `${LISTS.crew[i].name}, ${i + 1} of ${LISTS.crew.length}`;
  if (tab === 'contact') return LISTS.contact[i].querySelector('.mi__label').textContent;
  const p = at(tab, i);
  const ed = tab === 'games' && SHELF[i].length > 1 ? `, the ${p.edition?.label || p.name} edition` : '';
  return `${p.name}${ed}, ${i + 1} of ${LISTS[tab].length}`;
}

// focus was on the row: carry it along (keyboard users see the focus move with the cursor)
const focusInRow = () => !!document.activeElement?.matches('.cart, .tile, .mi');

function select(i, { sound = true } = {}) {
  const n = LISTS[S.tab].length;
  const next = ((i % n) + n) % n;
  if (next === S[S.tab]) return;
  const carry = focusInRow();
  S[S.tab] = next;
  paint(S.tab);
  save();
  layout();
  if (S.tab === 'crew') hello(want());
  if (S.tab === 'games') hints(); // the edition hint comes and goes with the game
  if (sound) audio.blip('move');
  if (carry) controlsOf(S.tab)[next]?.focus({ preventScroll: true });
  announce(label(S.tab, next));
}
const move = (d) => select(S[S.tab] + d);

// ---- doing things ----

function current() {
  if (S.tab === 'games' || S.tab === 'sites') return at(S.tab, S[S.tab]);
  return null;
}

function play(p, { from } = {}) {
  if (!p) return;
  audio.blip('ok');
  if (p.frame) return player.open(p);
  // it can't run inside the page: a new tab, which a pad press may not be allowed to open
  if (!openTab(p.url) && from === 'pad') {
    askTab({
      title: p.name,
      text: `${p.name} can’t run inside this page, and the browser only opens new tabs from a click or a key. Open it in this tab instead (Back in the browser brings you here), or click New tab.`,
      url: p.url,
    });
  }
}

function activate({ from, pad } = {}) {
  if (from === 'pad') input.rumble(pad);
  if (S.tab === 'contact') {
    const el = LISTS.contact[S.contact];
    if (el.matches('[data-tip]')) return openTipJar();
    if (el.matches('[data-os]')) return openOS();
    audio.blip('ok');
    if (from === 'pad' && !openTab(el.href)) askTab({ title: el.querySelector('.mi__label').textContent, text: 'The browser only opens new tabs from a click or a key. Open it in this tab instead, or click New tab.', url: el.href });
    else if (from !== 'pad') el.click();
    return;
  }
  const item = onItem(S.tab);
  const btn = $('[data-act]', item);
  btn?.classList.remove('is-hit');
  void btn?.offsetWidth;
  btn?.classList.add('is-hit');
  if (S.tab === 'crew') {
    audio.blip('ok');
    btn.click(); // the model download
    toast(`downloading ${LISTS.crew[S.crew].download.label} (${LISTS.crew[S.crew].download.size})`);
    return;
  }
  play(current(), { from });
}

function details() {
  if (S.tab === 'crew') return waveDuo(LISTS.crew[S.crew].num);
  const item = onItem(S.tab);
  if (!item) return;
  const open = item.classList.toggle('is-more');
  $('[data-more]', item)?.setAttribute('aria-expanded', String(open));
  audio.blip(open ? 'ok' : 'back');
  emit();
}

function back() {
  if (closeAsk()) return;
  const dlg = $('dialog[open]');
  if (dlg) return dlg.close();
  if (os?.isOpen()) return os.close();
  const item = S.tab !== 'contact' ? onItem(S.tab) : null;
  if (item?.classList.contains('is-more')) return details();
  if (S.tab !== 'games') {
    audio.blip('back');
    show('games', { focus: focusInRow() });
  }
}

// ---- fullscreen: the whole menu, like a console ----

const fsBtn = $('#fs');
function toggleFullscreen() {
  const d = document;
  if (d.fullscreenElement) return d.exitFullscreen?.().catch(() => {});
  const go = d.documentElement.requestFullscreen?.({ navigationUI: 'hide' });
  if (!go) return toast('full screen isn’t available here');
  go.catch(() => toast(`press ${input.scheme === 'kb' ? 'F' : 'F on a keyboard'} or click ⛶ for full screen: browsers only allow it from a key or a click`, 3600));
}
fsBtn?.addEventListener('click', toggleFullscreen);
document.addEventListener('fullscreenchange', () => fsBtn?.setAttribute('aria-pressed', String(!!document.fullscreenElement)));

// ---- the modal walk: arrows (or the d-pad) move through a dialog's buttons ----

function openModal() {
  return (ask && !ask.hidden && ask) || $('dialog[open]') || (os?.isOpen() && os.el) || null;
}
function walk(dir) {
  const m = openModal();
  if (!m) return;
  const list = $$('a[href], button:not([disabled]), input:not([disabled]), [tabindex="0"]', m).filter((el) => el.offsetParent || el.getClientRects().length);
  if (!list.length) return;
  const at = list.indexOf(document.activeElement);
  const step = dir === 'left' || dir === 'up' ? -1 : 1;
  list[at < 0 ? 0 : (at + step + list.length) % list.length].focus();
}

// ---- input ----

function mode() {
  if (player.current) return 'play';
  if (os?.isOpen() && os.el.contains(document.activeElement) && document.activeElement.matches('input')) return 'os';
  if (openModal()) return 'modal';
  return 'menu';
}

function act(name, info = {}) {
  const m = mode();
  if (m === 'modal' || m === 'os') {
    if (['left', 'right', 'up', 'down'].includes(name)) return walk(name);
    if (info.from !== 'pad') return false;
    if (name === 'ok' || name === 'start') document.activeElement?.click?.();
    else if (name === 'back') back();
    return;
  }
  const vert = S.tab === 'contact';
  // up / down on Games flip the edition, once per press (held, they don't run round and round)
  const flip = (d) => (S.tab !== 'games' ? false : info.repeat || info.event?.repeat ? undefined : edition(d));
  switch (name) {
    case 'left':
      return move(-1);
    case 'right':
      return move(1);
    case 'up':
      return vert ? move(-1) : flip(-1);
    case 'down':
      return vert ? move(1) : flip(1);
    case 'edprev':
      return flip('first');
    case 'ednext':
      return flip('last');
    case 'ok':
    case 'start':
      return activate(info);
    case 'back':
      return back();
    case 'prev':
      return tabStep(-1);
    case 'next':
      return tabStep(1);
    case 'details':
      return details();
    case 'wave': {
      const w = want();
      return waveDuo(w[Math.floor(Math.random() * w.length)], Math.random() < 0.4 ? 'other' : 'viewer');
    }
    case 'fullscreen':
      return toggleFullscreen();
    case 'music':
      return audio.toggleMusic();
    case 'sfx':
      return audio.toggleSfx();
    case 'os':
      return openOS({ focus: 'input' });
  }
  return false;
}

const input = createInput({ act, mode, onScheme: () => hints() });
const audio = createAudio({ musicBtn: $('#music'), sfxBtn: $('#sfx'), toast });

// ---- the player ----

let ticker = null;
const player = createPlayer({
  glyph: (n) => input.glyph(n),
  paintGlyphs: (el) => input.paintGlyphs(el),
  pads: () => input.pads(),
  blip: (k) => audio.blip(k),
  onOpen() {
    os?.close();
    closeAsk();
    screen.classList.add('is-away');
    screen.inert = true;
    stage?.pause();
    ticker?.pause();
    audio.duck(true);
  },
  onClose(p) {
    screen.classList.remove('is-away');
    screen.inert = false;
    audio.duck(false);
    const tab = locate(p);
    show(tab, { sound: false });
    stage?.resume();
    ticker?.resume();
    // back on the same cartridge
    controlsOf(tab)[S[tab]]?.focus({ preventScroll: true });
  },
});
addEventListener('message', (e) => player.message(e.data, e.origin));

// ---- mouse and touch ----

document.addEventListener('click', (e) => {
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const t = e.target.closest('.tab');
  if (t) {
    e.preventDefault();
    return show(t.dataset.tab);
  }
  const b = e.target.closest('.bump');
  if (b) return tabStep(+b.dataset.step);
  const go = e.target.closest('[data-goto]');
  if (go) {
    e.preventDefault();
    const p = projects.find((g) => g.cmd === go.dataset.goto);
    if (p) locate(p);
    return show('games');
  }
  const ed = e.target.closest('[data-ed]');
  if (ed) {
    e.preventDefault();
    return edition(ed.dataset.ed);
  }
  const c = e.target.closest('.cart, .tile');
  if (c) {
    const i = +c.dataset.i;
    if (i === S[S.tab]) activate({ from: 'mouse' });
    else select(i);
    return;
  }
  const more = e.target.closest('[data-more]');
  if (more) return details();
  const playLink = e.target.closest('.panel a[data-act="play"]');
  if (playLink) {
    const p = current();
    if (p?.frame) {
      e.preventDefault();
      play(p);
    } else audio.blip('ok'); // the link opens the new tab itself
    return;
  }
  if (e.target.closest('[data-newtab]')) return;
  const tip = e.target.closest('[data-tip]');
  if (tip) {
    e.preventDefault();
    return openTipJar();
  }
  if (e.target.closest('[data-os]')) return openOS();
  const mi = e.target.closest('.mi');
  if (mi) select(LISTS.contact.indexOf(mi), { sound: false });
});
// hovering a contact line moves the cursor, like a pause menu
$('#contact').addEventListener('pointerover', (e) => {
  const mi = e.target.closest('.mi');
  if (mi && e.pointerType === 'mouse') select(LISTS.contact.indexOf(mi));
});
// focus moving onto a row item with the keyboard (Tab) picks it too; a click picks it itself
document.addEventListener('focusin', (e) => {
  if (!e.target.matches?.(':focus-visible')) return;
  const c = e.target.closest?.('.cart, .tile');
  if (c && +c.dataset.i !== S[S.tab]) select(+c.dataset.i, { sound: false });
  const mi = e.target.closest?.('.mi');
  if (mi && S.tab === 'contact') select(LISTS.contact.indexOf(mi), { sound: false });
});

// swipe the art (phones) to move along the row
let sx = 0;
let sy = 0;
screen.addEventListener('touchstart', (e) => {
  sx = e.touches[0].clientX;
  sy = e.touches[0].clientY;
}, { passive: true });
screen.addEventListener('touchend', (e) => {
  if (e.target.closest('.row, .tabs, .menu, .tgroups, a, button')) return;
  const dx = e.changedTouches[0].clientX - sx;
  const dy = e.changedTouches[0].clientY - sy;
  if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.4 && S.tab !== 'contact') move(dx < 0 ? 1 : -1);
}, { passive: true });

// ---- the address bar keeps your place: #games/rbgo, #crew/85, #sites/sanic, #contact, #tip ----

function save() {
  if (player.current) return;
  const id = idOf(S.tab, S[S.tab]);
  history.replaceState(null, '', `#${S.tab}${id ? `/${id}` : ''}`);
}
function load() {
  const [t, id] = decodeURIComponent(location.hash.slice(1)).split('/');
  // the old page's anchors (#radrun, #radbro-4764, #bulk-os) still land somewhere sensible
  const bySlug = projects.find((p) => p.slug === t || p.cmd === t || p.aliases?.includes(t));
  const bro = crew.members.find((m) => m.slug === t);
  const named = (x) => x.cmd === id || x.aliases?.includes(id);
  let tab = TABS.includes(t) ? t : 'games';
  // (a game's edition, #games/retardiopayne or #retardiopayne, lands on its game, that edition)
  if (bySlug) tab = locate(bySlug);
  else if (bro) {
    tab = 'crew';
    S.crew = LISTS.crew.indexOf(bro);
  } else if (id && t === 'crew') {
    const j = LISTS.crew.findIndex((x) => x.num === id);
    if (j >= 0) S.crew = j;
  } else if (id && (t === 'games' || t === 'sites')) {
    const p = projects.find((x) => x.group === t && named(x));
    if (p) locate(p);
  }
  if (t === 'play' && id) {
    const p = projects.find(named);
    if (p) tab = locate(p);
  }
  show(tab, { sound: false });
  if (t === 'tip') openTipJar();
  if (t === 'play' && id) {
    const p = projects.find(named);
    if (p?.frame) player.open(p);
  }
}

// ---- hints in the strip, in the glyphs of whatever was used last ----
// Each has a rank: when the strip is short, the lowest go first, so "play" and "back" stay.

function hints() {
  const hintsEl = $('#hints');
  const k = (n) => `<span class="g g--${n}">${input.glyph(n)}</span>`;
  const pad = input.scheme !== 'kb';
  const verb = { games: 'play', crew: 'get model', sites: 'open', contact: 'pick' }[S.tab];
  const nav = S.tab === 'contact' ? 'vmove' : 'move';
  const hint = (rank, html) => `<span class="hint" data-rank="${rank}">${html}</span>`;
  const out = [
    hint(4, `${pad ? k(nav) : input.glyph(nav).split(' ').map((g) => `<span class="g">${g}</span>`).join('')} select`),
    // only on a game with editions, and low: the switch shows its own buttons, right by it
    S.tab === 'games' && SHELF[S.games].length > 1 ? hint(2.5, `${k('lt')}${k('rt')} edition`) : '',
    hint(9, `${k('a')} ${verb}`),
    pad ? hint(8, `${k('b')} back`) : '',
    hint(6, `${k('lb')}${k('rb')} sections`),
    S.tab === 'games' || S.tab === 'sites' ? hint(5, `${k('y')} details`) : '',
    hint(2, `${k('x')} wave`),
    hint(3, `${k('select')} full screen`),
    pad ? '' : hint(1, '<span class="g">M</span> music'),
    pad ? '' : hint(0, '<span class="g">/</span> terminal'),
  ];
  hintsEl.innerHTML = out.join('');
  fitHints();
}
// the strip gives the hints what the ticker leaves; drop the lowest ranks until the rest fit whole
function fitHints() {
  const hintsEl = $('#hints');
  const all = $$('.hint', hintsEl);
  for (const el of all) el.hidden = false;
  if (!hintsEl.clientWidth) return;
  const order = all.slice().sort((a, b) => a.dataset.rank - b.dataset.rank);
  while (hintsEl.scrollWidth > hintsEl.clientWidth + 1 && order.length > 1) order.shift().hidden = true;
}

// ---- the stage: the waterline, who stands on it, what the water mirrors ----

const FEET = 0.976; // src/duo.js: their feet sit at this share of the box height
const MODELS = Object.fromEntries(crew.members.map((m) => [m.num, m.model]));
function rel(el) {
  const h = screen.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  return { x: r.left - h.left, y: r.top - h.top, w: r.width, h: r.height };
}
// who stands on the water in 3D: #4764 and #85 on Games and Contact, on Crew the picked one alone
function want() {
  // a game shown in one of its editions: that edition's own (RadPayne's and RadZombies' Radbros edition
  // #4764 alone, their Retardios edition the two Retardios); every other game, and Contact, the pair
  if (S.tab === 'games') {
    const ed = at('games', S.games)?.edition?.label;
    if (ed === 'Radbros') return ['4764'];
    if (ed === 'Retardios') return ['555', '85'];
    return DUO;
  }
  if (S.tab === 'contact') return DUO;
  if (S.tab === 'crew') return [LISTS.crew[S.crew].num];
  return [];
}
// are they in (three.js and their models loaded)? Until then their renders stand there
const live = () => !!stage?.ready(want());
function duoMode() {
  if (S.tab === 'games' || S.tab === 'contact') return 'side';
  if (S.tab === 'crew' && live()) return 'stage';
  return null;
}
// the same framing as src/duo.js: where each one stands across the box (a pair, or one in the
// middle), and how tall
function framing(w, h) {
  const a = w / h;
  const half = Math.max(1.06, 1.6 / a);
  const spots = want().length > 1 ? [0.5 - 0.62 / (2 * half * a), 0.5 + 0.62 / (2 * half * a)] : [0.5];
  return { spots, tall: 1.7 / (2 * half) };
}
const box = { wl: 0, feet: 0, b: null };
const m0 = () => (duoEl.classList.contains('duo--side') ? 'side' : null);
// a long name (RetardioPayne) comes down in size to fit its column instead of running off it
function fitWm() {
  const wm = $('.item.on .wm', panelOf(S.tab));
  if (!wm) return;
  wm.style.fontSize = '';
  const r = document.createRange();
  r.selectNodeContents(wm);
  const tw = r.getBoundingClientRect().width;
  const cw = wm.clientWidth;
  if (cw > 0 && tw > cw) wm.style.fontSize = `${Math.floor((parseFloat(getComputedStyle(wm).fontSize) * cw) / tw)}px`;
}
function layout() {
  fitWm();
  const W = screen.clientWidth;
  const H = innerHeight;
  const ph = phone.matches;
  box.wl = ph ? $('#backdrops').offsetHeight : Math.round(H * 0.655);
  screen.style.setProperty('--wl', `${box.wl}px`);
  for (const img of $$('.bd--lettered')) cutLettered(img);
  const m = duoMode();
  screen.classList.toggle('duo-live', live());
  const vis = $('.item.on .visual--crew', panelOf('crew'));
  $$('.visual--crew').forEach((v) => {
    v.classList.toggle('is-duo', m === 'stage' && v === vis);
    v.classList.toggle('is-fresh', fresh && v === vis);
  });
  duoEl.classList.toggle('duo--off', !m);
  duoEl.classList.toggle('duo--side', m === 'side');
  let b = null;
  if (m === 'stage' && vis) {
    b = rel(vis);
  } else if (m === 'side') {
    const big = S.tab === 'contact';
    const w = ph ? Math.round(W * 0.56) : Math.round(Math.min(W * (big ? 0.38 : 0.34), big ? 560 : 500));
    const h = ph ? Math.round(w * 0.98) : Math.round(Math.min(H * (big ? 0.56 : 0.48), big ? 520 : 430));
    // feet just past the waterline, so there's floor below them for the whole reflection
    const feet = ph ? box.wl + 16 : box.wl + H * (big ? 0.05 : 0.045);
    const pad = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--pad')) || 48;
    b = { x: ph ? W - w : W - w - pad * 0.4, y: feet - h * FEET, w, h };
  }
  box.b = b;
  if (b) {
    Object.assign(duoEl.style, { left: `${b.x}px`, top: `${b.y}px`, width: `${b.w}px`, height: `${b.h}px` });
    box.feet = b.y + b.h * FEET;
    const f = framing(b.w, b.h);
    f.spots.forEach((x, k) => duoEl.style.setProperty(`--s${k}`, `${x * 100}%`));
    duoEl.style.setProperty('--ph', `${f.tall * 100}%`);
  }
  stage?.show(want()); // on Crew, his model loads while his render stands in
  placeHint();
  emit();
}

// "click them to wave": under their feet, until the first wave
let waved = false;
function placeHint() {
  // (on a phone, only on Crew: on Games it would sit on the words)
  const on = live() && box.b && !duoEl.classList.contains('duo--off') && !waved && !reduced.matches && !(phone.matches && S.tab !== 'crew');
  hint.hidden = !on;
  if (!on) return;
  hint.style.left = `${box.b.x + box.b.w / 2}px`;
  hint.style.top = `${Math.min(screen.clientHeight - 60, box.feet + 18)}px`;
}

const hexRgb = (hx) => {
  const n = parseInt(String(hx).trim().slice(1), 16);
  return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};
// what the water needs to know, read off the page
function scene() {
  const panel = panelOf(S.tab);
  const lights = [];
  for (const el of $$('.slot', panel)) {
    const k = el.classList.contains('sel') ? 0.8 : 0.26;
    lights.push([$('.cart', el), hexRgb(el.style.getPropertyValue('--accent')).map((v) => v * k)]);
  }
  const playBtn = $('.item.on [data-act]', panel);
  if (playBtn) lights.push([playBtn, [0.3, 0.2, 0.68]]);
  const tile = $('.tslot.sel .tile', panel);
  if (tile) lights.push([tile, [0.64, 0.54, 0.34]]);
  const mi = $('.mi.sel', panel);
  if (mi) lights.push([mi, [0.5, 0.42, 0.26]]);
  const ink = [$('.item.on .info', panel), $('.row__head', panel), $('.item.on .visual--site', panel)].filter((x) => x && x.offsetParent);
  const art = Object.values(BD).find((i) => i.classList.contains('on'));
  let figure = null;
  let halo = null;
  if (box.b && !duoEl.classList.contains('duo--off')) {
    figure = { kind: 'duo', feet: box.feet };
    if (m0() === 'side') {
      const b = box.b;
      halo = [b.x - b.w * 0.08, b.y + b.h * 0.02, b.w * 1.16, (box.feet - b.y) * 1.02];
    }
  } else if (S.tab === 'crew') {
    const bro = $('.item.on .bro', panel);
    if (bro) {
      const r = rel(bro);
      figure = { kind: 'img', el: bro, feet: r.y + r.h * 0.985 };
    }
  }
  const lettered = art && !phone.matches ? +art.dataset.lettered || 0 : 0;
  return { water: box.wl, art, soft: art?.classList.contains('bd--soft'), lettered, lights, ink, figure, halo };
}
let emitT = 0;
function emit() {
  dispatchEvent(new Event('vyv:scene'));
  // once things have settled (the lifted cartridge, a render sliding in), once more
  clearTimeout(emitT);
  emitT = setTimeout(() => dispatchEvent(new Event('vyv:scene')), 460);
}
// one of them waves (by crew num), if he's standing there
function waveDuo(num, at = 'viewer') {
  if (!live() || duoEl.classList.contains('duo--off') || !want().includes(num)) return false;
  if (stage.wave(num, at)) {
    waved = true;
    placeHint();
  }
}
// arriving on Contact, or picking a crew card: they wave, as soon as they're standing there
let greet = null;
function hello(nums) {
  greet = null;
  if (!nums.length) return;
  if (!live()) return void (greet = nums);
  nums.forEach((n, k) => (k ? setTimeout(() => waveDuo(n), 700 * k) : waveDuo(n)));
}
const shell = {
  scene,
  layout,
  // the models just asked for are in: they take over from the renders (and say hello)
  castReady() {
    // (his render lingers a moment only now, as his model first comes in; switching between cards whose
    // models are in already swaps at once, so he is never there twice)
    fresh = true;
    clearTimeout(freshT);
    freshT = setTimeout(() => {
      fresh = false;
      $$('.visual--crew.is-fresh').forEach((v) => v.classList.remove('is-fresh'));
    }, 400);
    layout();
    const g = greet;
    if (g && g.every((n) => want().includes(n))) hello(g);
  },
};
addEventListener('resize', () => requestAnimationFrame(layout));
document.fonts?.ready.then(() => layout());

// click (or tap) one of them: he waves
document.addEventListener('pointerdown', (e) => {
  if (!live() || !box.b || duoEl.classList.contains('duo--off') || e.target.closest('a, button, dialog, .ask, .player')) return;
  const h = screen.getBoundingClientRect();
  const x = e.clientX - h.left;
  const y = e.clientY - h.top;
  const b = box.b;
  if (x < b.x || x > b.x + b.w || y > box.feet + 6) return;
  const f = framing(b.w, b.h);
  if (y < box.feet - b.h * f.tall * 1.05) return;
  const u = (x - b.x) / b.w;
  const near = f.spots.map((s) => Math.abs(u - s));
  const i = near.indexOf(Math.min(...near));
  if (near[i] > 0.16 * (b.h / b.w) + 0.05) return;
  audio.blip('ok');
  waveDuo(want()[i]);
});

// ---- the tip jar (src/tip/): fetched on first hover, opened from the pill or #tip ----

function openTipJar() {
  audio.blip('ok');
  openTip();
}
addEventListener('hashchange', () => location.hash === '#tip' && openTipJar());
for (const ev of ['pointerover', 'focusin']) {
  document.addEventListener(ev, (e) => e.target.closest?.('[data-tip]') && loadTip().catch(() => {}), { passive: true });
}

// ---- Radbro OS: the terminal, a hidden extra on / (src/os/, its own chunk) ----

let os = null;
function openOS(opts = {}) {
  audio.blip('ok');
  import('./os/index.js')
    .then((m) => {
      os ||= m.createOS({
        site,
        groups,
        projects,
        crew,
        contact,
        shell: {
          play: (p) => play(p),
          playing: () => player.current,
          stop: () => player.close(),
          go: (tab) => show(tab || 'games', { sound: false }),
          reveal(slug) {
            const p = projects.find((x) => x.slug === slug);
            const b = crew.members.find((x) => x.slug === slug);
            if (p) {
              const tab = locate(p);
              show(tab, { sound: false });
              paint(tab);
            } else if (b) {
              S.crew = LISTS.crew.indexOf(b);
              show('crew', { sound: false });
              paint('crew');
              layout();
            } else if (TABS.includes(slug)) show(slug, { sound: false });
          },
          wave: () => (!want().length ? 'none' : live() ? (want().forEach((n, k) => setTimeout(() => waveDuo(n), 600 * k)), 'ok') : stage?.live ? 'loading' : 'missing'),
        },
      });
      os.open(opts);
    })
    .catch(() => toast('couldn’t load radbro os. check your connection.'));
}

// ---- go ----

// with JS the section links become tabs (without it they're plain links down the page)
$('.tabs__list').setAttribute('role', 'tablist');
$('.tabs__list').setAttribute('aria-label', 'Sections');
for (const t of $$('.tab')) t.setAttribute('role', 'tab');
for (const p of $$('.panel')) p.setAttribute('role', 'tabpanel');
load();
hints();
if ('ResizeObserver' in window) new ResizeObserver(() => fitHints()).observe($('#hints'));
document.fonts?.ready.then(fitHints);
ticker = createTicker($('#ticker-host'));
if (player.current) ticker.pause();
setTimeout(() => screen.classList.remove('boot'), 1800);

// The rain, the puddle and the duo: their own chunks, started right after the first paint.
// Save-Data, no WebGL or a failure: the plain backdrops and the poster pair stay.
requestAnimationFrame(() =>
  setTimeout(() => {
    import('./stage.js')
      .then((m) => {
        stage = m.createStage(shell, { screen, duoBox: duoEl, models: MODELS });
        layout(); // who stands on the water, now that there's a stage to ask
        nextUp();
        if (player.current) stage.pause();
      })
      .catch((e) => console.warn('stage off', e));
  }, 0),
);
