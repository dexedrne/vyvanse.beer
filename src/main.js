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
import { readOrder, writeOrder, arrange } from './order.js';
import { createSort, flip } from './sort.js';
import { createPwa } from './pwa.js';
import { gameUrl } from './device.js';
import { launchUrl } from './ask/actions.js';
import { createAsk } from './ask/menu.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const phone = matchMedia('(max-width: 760px), (hover: none) and (pointer: coarse) and (max-width: 960px) and (max-height: 500px)');

const screen = $('#screen');
const duoEl = $('#duo');
const hint = $('#duo-hint');
let stage = null; // src/stage.js, once it has loaded (the water and the duo)
let fresh = false; // a crew model has just come in (shell.castReady)
let freshT = 0;
let askUI = null;
let phoneNodes = null;
let phoneZone = 'shelf';
let phoneButton = 0;
let sheet = null;
let dim = null;
let sheetBack = null;
let probe = null;

// Move the existing controls, so desktop and the no-JS document retain their original markup.
function phoneMarkup() {
  if (phone.matches === !!phoneNodes) return;
  if (!phone.matches) {
    closeSheet();
    for (const entry of phoneNodes.items) {
      entry.info.replaceChildren(...entry.children);
      if (entry.act) entry.act.replaceChildren(...entry.actions);
      if (entry.kind) entry.kind.innerHTML = entry.kindHTML;
      if (entry.pitch) entry.pitch.textContent = entry.pitchText;
      if (entry.playLabel) entry.playLabel.textContent = entry.playText;
      if (entry.shot) entry.shot.src = entry.shotSrc;
      if (entry.monitorLabel) entry.monitorLabel.textContent = entry.monitorText;
    }
    for (const entry of phoneNodes.contact) {
      entry.label.replaceChildren(...entry.labelChildren);
      entry.mi.replaceChildren(...entry.children);
    }
    const { ask, parent, next, html, askLabel } = phoneNodes;
    parent.insertBefore(ask, next);
    $('button', ask).innerHTML = html;
    if (askLabel) $('button', ask).setAttribute('aria-label', askLabel);
    else $('button', ask).removeAttribute('aria-label');
    for (const node of phoneNodes.added) node.remove();
    $$('.row').forEach(row => row.classList.remove('shelf'));
    phoneNodes = null;
    screen.style.removeProperty('--view-height');
    return;
  }
  const ask = $('#menu-ask');
  phoneNodes = { items: [], contact: [], added: [], ask, parent: ask.parentElement,
    next: ask.nextSibling, html: $('button', ask).innerHTML, askLabel: $('button', ask).getAttribute('aria-label') };
  $('.top__right').prepend(ask);
  $('button', ask).innerHTML = '<svg class="i" aria-hidden="true"><use href="#i-ask"/></svg>';
  $('button', ask).setAttribute('aria-label', 'ask');
  for (const item of $$('.item')) {
    const info = $('.info', item);
    if (!info) continue;
    const kind = $('.kindline', info);
    const wm = $('.wm', info);
    const pitch = $('.pitch', info);
    const act = $('.act', info);
    phoneNodes.items.push({ info, children: [...info.childNodes], act, actions: act && [...act.childNodes],
      kind, kindHTML: kind?.innerHTML, pitch, pitchText: pitch?.textContent,
      playLabel: $('.play__label', info), playText: $('.play__label', info)?.textContent,
      shot: $('.visual--site img', item), shotSrc: $('.visual--site img', item)?.getAttribute('src'),
      monitorLabel: $('.monitor__bar span', item), monitorText: $('.monitor__bar span', item)?.textContent });
    const words = Object.assign(document.createElement('div'), { className: 'words' });
    const body = Object.assign(document.createElement('div'), { className: 'body' });
    if (kind) words.append(kind);
    words.append(wm);
    const p = projects.find(p => p.cmd === item.dataset.id);
    if (kind && p?.kindPhone) {
      kind.replaceChildren(...p.kindPhone.split(/(\S+-\S+)/g).map(text => {
        if (!/\S+-\S+/.test(text)) return document.createTextNode(text);
        return Object.assign(document.createElement('span'), { className: 'nb', textContent: text });
      }));
    }
    if (pitch && p?.blurbPhone) pitch.textContent = p.blurbPhone;
    const eds = $('.eds', info);
    const plays = $('.plays', info);
    if (eds) body.append(eds);
    if (pitch) body.append(pitch);
    if (plays) body.append(plays);
    if (act) {
      const status = $('.status', act);
      const more = $('[data-more]', info);
      if (more) act.append(more);
      body.append(act);
      if (status) body.append(status);
    }
    info.prepend(words, body);
    if (item.classList.contains('item--contact')) {
      const shelf = Object.assign(document.createElement('div'), { className: 'shelf' });
      shelf.append($('.menu', info), $('.fine', info));
      info.append(shelf);
    }
    if (p?.group === 'sites') {
      if (p.phoneImage) $('.visual--site img', item).src = p.phoneImage;
      if (p.boot) $('.monitor__bar span', item).textContent = p.boot;
      $('[data-act] .play__label', item).textContent = 'Open';
      const cap = Object.assign(document.createElement('p'), { className: 'site-cap' });
      const url = new URL(p.url);
      cap.innerHTML = '<b></b><span></span><span class="site-cap__tap">tap to open ↗</span>';
      $('b', cap).textContent = url.host + (url.pathname === '/' ? '' : url.pathname);
      $('span', cap).textContent = p.cmd === 'solscape' ? 'rev254 on Solana' : p.boot || p.kindPhone || p.kind;
      item.append(cap);
      phoneNodes.added.push(cap);
    }
  }
  for (const mi of LISTS.contact) {
    const label = $('.mi__label', mi);
    phoneNodes.contact.push({ mi, children: [...mi.childNodes], label, labelChildren: [...label.childNodes] });
    const icon = $('.i', label);
    const text = Object.assign(document.createElement('span'), { textContent: label.textContent });
    const phoneLabel = Object.assign(document.createElement('span'), { className: 'mi__label' });
    const detail = mi.hasAttribute('data-os')
      ? Object.assign(document.createElement('span'), { className: 'det', textContent: 'the terminal' })
      : $('.det', mi);
    phoneLabel.append(text, detail);
    mi.replaceChildren($('.cur', mi), icon, phoneLabel);
  }
  $$('.row').forEach(row => row.classList.add('shelf'));
  const floor = Object.assign(document.createElement('div'), { className: 'phone-floor' });
  floor.setAttribute('aria-hidden', 'true');
  screen.prepend(floor);
  phoneNodes.added.push(floor);
}

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

// The rows a viewer can rearrange, each in its default order (src/projects.js) by key: a game by
// its first edition's cmd, so a cartridge with editions is one key and moves as one.
const ROWS = ['games', 'sites'];
const keyOf = (tab, x) => (tab === 'games' ? x[0].cmd : x.cmd);
const keysOf = (tab) => LISTS[tab].map((x) => keyOf(tab, x));
const DEFAULT = { games: keysOf('games'), sites: keysOf('sites') };
const ORDER = readOrder(); // this browser's own order, if it has one (src/order.js)
const custom = (tab) => keysOf(tab).some((k, j) => k !== DEFAULT[tab][j]);

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
    return { key: `games:${p.cmd}`, src, pos: phone.matches ? p.phone || '50% 22%' : pos, lettered, w, h };
  }
  if (tab === 'sites') {
    const p = LISTS.sites[i];
    const portrait = phone.matches && screen.clientWidth < screen.clientHeight;
    return { key: `sites:${p.cmd}`, src: portrait ? p.phoneImage || p.image.src : p.image.src, soft: !portrait, pos: phone.matches ? '50% 42%' : undefined };
  }
  if (tab === 'crew') return { key: 'crew', src: phone.matches ? '/img/art/radrun-cast2.webp' : '/img/art/vyvanse.webp', soft: true };
  return { key: 'contact', src: '/img/art/vyvanse.webp', pos: phone.matches ? screen.clientWidth > screen.clientHeight ? '50% 100%' : '50% 30%' : '60% 6%' };
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
  if (img.getAttribute('src') !== b.src) img.src = b.src;
  img.style.objectPosition = b.pos || '';
  img.classList.toggle('bd--soft', !!b.soft);
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

// the row's marks: the cursor, the labels, "3 of 9", and "reset order" when the order is yours
function rowMarks(tab) {
  const i = S[tab];
  const panel = panelOf(tab);
  slotsOf(tab).forEach((el, j) => el.classList.toggle('sel', j === i));
  if (tab === 'games') labels();
  controlsOf(tab).forEach((el, j) => (j === i ? el.setAttribute('aria-current', 'true') : el.removeAttribute('aria-current')));
  const count = $('.count', panel);
  if (count) count.textContent = `${i + 1} of ${LISTS[tab].length}`;
  const reset = $('.row__reset', panel);
  if (reset) reset.hidden = !custom(tab);
}

function paint(tab) {
  const i = S[tab];
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
    if (tab === 'games' || tab === 'sites') for (const link of $$('a[data-act="play"], a[data-newtab]', now)) link.href = gameUrl(at(tab, i).url);
    // the same game, another edition: crossfade instead of the wipe a new game gets
    if (was && now && was !== now && was.dataset.game && was.dataset.game === now.dataset.game) crossfade(was, now);
    rowMarks(tab);
    keepInView(controlsOf(tab)[i]);
    typeOut(now);
  }
  backdrop(tab, i);
  warm(tab, i);
}

// a cartridge with editions wears the shown one's label and glow
function labels() {
  slotsOf('games').forEach((slot, j) => {
    const eds = SHELF[j];
    if (eds.length < 2) return;
    const k = edOf(j);
    slot.style.setProperty('--accent', eds[k].accent);
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
  closeSheet();
  if (!TABS.includes(tab)) tab = 'games';
  if (moving && tab !== moving.tab) dropMove();
  const changed = tab !== S.tab;
  S.tab = tab;
  if (changed) { phoneZone = 'shelf'; phoneButton = 0; }
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
  closeSheet();
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

// ---- rearranging the cartridges: the viewer's own order, kept in this browser ----
// Games and Sites. With the mouse, drag one; on a touch screen, long-press it, then drag
// (src/sort.js). With a pad, hold Menu (Options) on the selected one, or R on a keyboard: it
// lifts, the d-pad (arrows) moves it along, A (Enter) or Menu again drops it, B (Esc) puts it
// back, Y (I) resets the row. "reset order" in the row's head does that too.

// lay a row out in the order of `keys` (src/order.js keys); the selected one stays selected
function arrangeRow(tab, keys) {
  const list = LISTS[tab];
  const slots = slotsOf(tab);
  const by = new Map(list.map((x, j) => [keyOf(tab, x), [x, slots[j]]]));
  const next = keys.map((k) => by.get(k)).filter(Boolean);
  if (next.length !== list.length || !slots.length) return;
  const cur = list[S[tab]];
  const had = document.activeElement;
  const ul = slots[0].parentElement;
  list.splice(0, list.length, ...next.map(([x]) => x));
  next.forEach(([, slot], j) => {
    if (ul.children[j] !== slot) ul.insertBefore(slot, ul.children[j]);
    slot.dataset.i = j;
    slot.style.setProperty('--i', j);
    $('.cart', slot).dataset.i = j;
  });
  S[tab] = Math.max(0, list.indexOf(cur));
  // (moving a focused cartridge in the DOM drops its focus: give it back)
  if (had?.isConnected && had !== document.activeElement && ul.contains(had)) had.focus({ preventScroll: true });
}
function moveItem(tab, from, to) {
  const keys = keysOf(tab);
  keys.splice(to, 0, ...keys.splice(from, 1));
  arrangeRow(tab, keys);
}
// remembered only when it differs from the default, so a row left as it is follows any change to it
function keep(tab) {
  if (custom(tab)) ORDER[tab] = keysOf(tab);
  else delete ORDER[tab];
  writeOrder(ORDER);
}
const nameAt = (tab, i) => at(tab, i)?.name || '';

function resetOrder(tab = S.tab) {
  if (!ROWS.includes(tab)) return false;
  if (moving) endMove();
  if (!custom(tab)) {
    keep(tab);
    rowMarks(tab);
    hints();
    return toast('already in the default order');
  }
  flip(slotsOf(tab), () => arrangeRow(tab, DEFAULT[tab]), { reduced: reduced.matches, ms: 320 });
  keep(tab);
  rowMarks(tab);
  hints();
  keepInView(controlsOf(tab)[S[tab]]);
  emit();
  audio.blip('back');
  toast(`${tab === 'games' ? 'games' : 'sites'} back in the default order`);
  announce(`Default order. ${label(tab, S[tab])}`);
}

// move mode (pad, keyboard): the selected cartridge is in hand; left / right move it along
let moving = null; // { tab, keys: the order before, for putting it back }
const nudge = Object.assign(document.createElement('span'), { className: 'nudge', innerHTML: '<i>◀</i><i>▶</i>' });
nudge.setAttribute('aria-hidden', 'true');
function grab() {
  if (moving) return dropMove();
  if (!ROWS.includes(S.tab) || mode() !== 'menu' || sorter.active) return false;
  const tab = S.tab;
  const i = S[tab];
  moving = { tab, keys: keysOf(tab) };
  const slot = slotsOf(tab)[i];
  slot.classList.add('is-moving');
  slot.append(nudge);
  $('.row', panelOf(tab)).classList.add('is-moving');
  hints();
  keepInView(controlsOf(tab)[i]);
  emit();
  audio.blip('ok');
  const kb = input.scheme === 'kb';
  announce(`Moving ${nameAt(tab, i)}. ${kb ? 'Left and right arrows' : 'Left and right'} move it, ${kb ? 'Enter' : 'A'} drops it, ${kb ? 'Escape' : 'B'} puts it back.`);
}
function nudgeMove(d) {
  const { tab } = moving;
  const i = S[tab];
  const j = i + d;
  const slots = slotsOf(tab);
  if (j < 0 || j >= slots.length) {
    // the end of the row: a little bump against it
    if (!reduced.matches) slots[i].animate([{ transform: 'none' }, { transform: `translateX(${d * 7}px)` }, { transform: 'none' }], { duration: 180, easing: 'ease-out' });
    return;
  }
  flip(slots, () => moveItem(tab, i, j), { reduced: reduced.matches, ms: 170 });
  rowMarks(tab);
  keepInView(controlsOf(tab)[S[tab]]);
  emit();
  audio.blip('move');
  announce(`${S[tab] + 1} of ${slots.length}`);
}
function endMove() {
  const { tab } = moving;
  moving = null;
  for (const el of $$('.is-moving', panelOf(tab))) el.classList.remove('is-moving');
  nudge.remove();
  return tab;
}
// drop it where it is, or (put) back where it was
function dropMove({ put = false } = {}) {
  if (!moving) return false;
  const { keys } = moving;
  const tab = endMove();
  if (put) flip(slotsOf(tab), () => arrangeRow(tab, keys), { reduced: reduced.matches });
  keep(tab);
  rowMarks(tab);
  hints();
  emit();
  audio.blip(put ? 'back' : 'ok');
  announce(put ? `Put back. ${label(tab, S[tab])}` : `Dropped. ${label(tab, S[tab])}`);
}

// ---- doing things ----

function current() {
  if (S.tab === 'games' || S.tab === 'sites') return at(S.tab, S[S.tab]);
  return null;
}

function play(p, { from, as } = {}) {
  if (!p) return;
  if (!pwa.canPlay()) return;
  audio.blip('ok');
  if (p.frame) return player.open(p, { as });
  // it can't run inside the page: a new tab, which a pad press may not be allowed to open
  const url = launchUrl(p, as);
  if (!openTab(url)) {
    askTab({
      title: p.name,
      text: `${p.name} can’t run inside this page, and the browser only opens new tabs from a click or a key. Open it in this tab instead (Back in the browser brings you here), or click New tab.`,
      url,
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
  if (phone.matches) return sheet && !sheet.hidden ? closeSheet() : openSheet();
  const item = onItem(S.tab);
  if (!item) return;
  const open = item.classList.toggle('is-more');
  $('[data-more]', item)?.setAttribute('aria-expanded', String(open));
  audio.blip(open ? 'ok' : 'back');
  emit();
}

function sheetMore() {
  if (!sheet || sheet.hidden) return;
  const body = $('.sheet__body', sheet);
  sheet.classList.toggle('is-more', body.scrollHeight - body.scrollTop - body.clientHeight > 8);
}
function closeSheet() {
  if (!sheet || sheet.hidden) return false;
  sheet.hidden = dim.hidden = true;
  for (const el of $$('.panels, .top, .strip', screen)) el.inert = false;
  $('[data-more]', onItem(S.tab))?.setAttribute('aria-expanded', 'false');
  sheetBack?.focus({ preventScroll: true });
  return true;
}
function openSheet() {
  const p = current();
  if (!p) return;
  if (!sheet) {
    dim = Object.assign(document.createElement('div'), { className: 'dim', hidden: true });
    sheet = Object.assign(document.createElement('aside'), { className: 'sheet', hidden: true });
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-modal', 'true');
    sheet.setAttribute('aria-labelledby', 'sheet-title');
    sheet.innerHTML = '<div class="sheet__head"><h3 id="sheet-title"></h3><span class="kind">details</span></div><div class="sheet__body"></div><span class="sheet__more">▽ more</span><div class="sheet__foot"></div>';
    screen.append(dim, sheet);
    dim.addEventListener('click', closeSheet);
    $('.sheet__body', sheet).addEventListener('scroll', sheetMore, { passive: true });
    let startY = 0;
    sheet.addEventListener('touchstart', e => { startY = e.touches[0].clientY; }, { passive: true });
    sheet.addEventListener('touchend', e => {
      if (e.changedTouches[0].clientY - startY > 64 && $('.sheet__body', sheet).scrollTop <= 0) closeSheet();
    }, { passive: true });
    sheet.addEventListener('keydown', e => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeSheet(); }
      if (e.key !== 'Tab') return;
      const list = $$('a[href], button', sheet);
      if (e.shiftKey && document.activeElement === list[0]) { e.preventDefault(); list.at(-1).focus(); }
      else if (!e.shiftKey && document.activeElement === list.at(-1)) { e.preventDefault(); list[0].focus(); }
    });
  }
  sheetBack = document.activeElement;
  $('#sheet-title', sheet).textContent = p.name;
  const body = $('.sheet__body', sheet);
  const pitch = Object.assign(document.createElement('p'), { textContent: p.blurbPhone || p.blurb });
  const credit = $('.credit', onItem(S.tab))?.cloneNode(true);
  const links = Object.assign(document.createElement('ul'), { className: 'links' });
  for (const link of p.links.slice(1).concat({ label: `${new URL(p.url).host} in a new tab`, href: gameUrl(p.url), main: true })) {
    const li = document.createElement('li');
    const a = Object.assign(document.createElement('a'), { href: link.href, target: '_blank', rel: 'noopener', textContent: link.label });
    a.append(Object.assign(document.createElement('span'), { textContent: '↗', ariaHidden: 'true' }));
    if (!link.main) a.append(Object.assign(document.createElement('span'), { className: 'url', textContent: new URL(link.href).host + new URL(link.href).pathname.replace(/\/$/, '') }));
    li.append(a); links.append(li);
  }
  body.replaceChildren(pitch, ...(credit ? [credit] : []), links);
  const playBtn = $('[data-act]', onItem(S.tab)).cloneNode(true);
  playBtn.addEventListener('click', e => { e.preventDefault(); if (!pwa.canPlay()) return; closeSheet(); play(p); });
  const close = Object.assign(document.createElement('button'), { className: 'ghost', type: 'button', innerHTML: '<span class="g g--b" data-g="b">○</span>close' });
  close.addEventListener('click', closeSheet);
  $('.sheet__foot', sheet).replaceChildren(playBtn, close);
  input.paintGlyphs(sheet);
  sheet.hidden = dim.hidden = false;
  for (const el of $$('.panels, .top, .strip', screen)) el.inert = true;
  $('[data-more]', onItem(S.tab))?.setAttribute('aria-expanded', 'true');
  playBtn.focus({ preventScroll: true });
  body.scrollTop = 0;
  sheetMore();
  audio.blip('ok');
}

function back() {
  if (closeSheet()) return;
  if (!pwa.card.hidden) return pwa.dismiss();
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
  return (sheet && !sheet.hidden && sheet) || (ask && !ask.hidden && ask) || (!pwa.card.hidden && pwa.card) || $('dialog[open]') || (os?.isOpen() && os.el) || null;
}
function walk(dir) {
  const m = openModal();
  if (!m) return;
  if (m === sheet) {
    const links = $$('a[href]', $('.sheet__body', sheet));
    const buttons = $$('a, button', $('.sheet__foot', sheet));
    const focused = document.activeElement;
    if (dir === 'left' || dir === 'right') {
      if (buttons.includes(focused)) buttons[1 - buttons.indexOf(focused)].focus();
    } else {
      const zones = [...links, buttons[0]];
      const at = buttons.includes(focused) ? zones.length - 1 : zones.indexOf(focused);
      zones[(at + (dir === 'up' ? -1 : 1) + zones.length) % zones.length]?.focus();
    }
    return;
  }
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
  if (phone.matches && info.from === 'pad' && name === 'music') return audio.toggleMusic();
  const m = mode();
  if (m === 'modal' || m === 'os') {
    if (['left', 'right', 'up', 'down'].includes(name)) return walk(name);
    if (info.from !== 'pad') return false;
    if (name === 'ok' || name === 'start') document.activeElement?.click?.();
    else if (name === 'back') back();
    return;
  }
  if (moving) {
    if (name === 'left' || name === 'right') return nudgeMove(name === 'left' ? -1 : 1);
    if (['up', 'down', 'edprev', 'ednext'].includes(name)) return;
    if (name === 'ok' || name === 'start' || name === 'grab') return dropMove();
    if (name === 'back') return dropMove({ put: true });
    if (name === 'details') return resetOrder(moving.tab);
    dropMove(); // anything else (sections, the terminal…): it's dropped here first
  }
  if (phone.matches && info.from === 'pad') {
    const zones = S.tab === 'games' && SHELF[S.games].length > 1 ? ['editions', 'actions', 'shelf'] : ['actions', 'shelf'];
    if (S.tab === 'contact') {
      if (name === 'up' || name === 'down') return move(name === 'up' ? -1 : 1);
      if (name === 'left' || name === 'right') return screen.clientWidth > screen.clientHeight ? move(name === 'left' ? -1 : 1) : undefined;
      if (name === 'back') return;
    } else {
      if (!zones.includes(phoneZone)) phoneZone = 'shelf';
      if (name === 'up' || name === 'down') {
        phoneZone = zones[(zones.indexOf(phoneZone) + (name === 'up' ? -1 : 1) + zones.length) % zones.length];
        phoneButton = 0; phoneFocus(); hints(); return;
      }
      if (name === 'left' || name === 'right') {
        const d = name === 'left' ? -1 : 1;
        if (phoneZone === 'editions') return edition(d);
        if (phoneZone === 'actions') {
          if (S.tab === 'crew') {
            if (info.repeat) $('.plays', onItem('crew')).scrollBy({ left: d * 100, behavior: 'smooth' });
          } else phoneButton = 1 - phoneButton;
          phoneFocus(); return;
        }
      }
      if (name === 'ok' && phoneZone === 'editions') return edition(1);
      if (name === 'ok' && phoneZone === 'actions' && phoneButton && S.tab !== 'crew') return details();
    }
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
    case 'ask':
      return askUI.open({ from: info.from });
    case 'grab':
      return grab();
  }
  return false;
}

function phoneFocus() {
  if (!phone.matches) return;
  screen.dataset.zone = phoneZone;
  screen.dataset.button = String(phoneButton);
  $$('.panel .play, .panel .more-btn').forEach(el => el.classList.remove('is-focus'));
  if (input.scheme !== 'ps' && input.scheme !== 'xbox') return;
  const item = onItem(S.tab);
  if (!item || S.tab === 'contact') return;
  if (phoneZone === 'actions' || phoneZone === 'shelf') (phoneButton && phoneZone === 'actions' ? $('[data-more]', item) : $('[data-act]', item))?.classList.add('is-focus');
}

const input = createInput({ act, mode, phone: () => phone.matches, onScheme: scheme => {
  hints();
  phoneFocus();
  askUI?.setPad(scheme === 'ps' || scheme === 'xbox');
  dispatchEvent(new Event('vyv:input'));
} });
const audio = createAudio({ musicBtn: $('#music'), sfxBtn: $('#sfx'), toast });

// ---- the player ----

let ticker = null;
const player = createPlayer({
  glyph: (n) => input.glyph(n),
  paintGlyphs: (el) => input.paintGlyphs(el),
  pads: () => input.pads(),
  blip: (k) => audio.blip(k),
  onOpen() {
    closeSheet();
    if (moving) dropMove();
    sorter.cancel();
    os?.close();
    closeAsk();
    askUI?.close();
    screen.classList.add('is-away');
    screen.inert = true;
    stage?.pause();
    ticker?.pause();
    audio.duck(true);
  },
  onClose(p) {
    screen.classList.remove('is-away');
    screen.inert = false;
    const tab = locate(p);
    show(tab, { sound: false });
    // history.back() is asynchronous. Save the menu URL before a deferred update reloads.
    if (pwa.resume()) return;
    audio.duck(false);
    stage?.resume();
    ticker?.resume();
    // back on the same cartridge
    controlsOf(tab)[S[tab]]?.focus({ preventScroll: true });
  },
});
addEventListener('message', (e) => player.message(e));
const pwa = createPwa({ playing: () => !!player.current, toast });
$('#menu-back').addEventListener('click', back);

const launcher = {
  play,
  canPlay: () => pwa.canPlay(),
  playing: () => player.current,
  stop: () => player.close(),
  go: tab => show(tab || 'games', { sound: false }),
  tip: openTipJar,
  music: on => audio.setMusic(on),
  reveal(slug) {
    const p = projects.find(x => x.slug === slug);
    const b = crew.members.find(x => x.slug === slug);
    if (p) show(locate(p), { sound: false });
    else if (b) {
      S.crew = LISTS.crew.indexOf(b);
      show('crew', { sound: false });
    } else if (TABS.includes(slug)) show(slug, { sound: false });
  },
  wave: () => (!want().length ? 'none' : live() ? (want().forEach((n, k) => setTimeout(() => waveDuo(n), 600 * k)), 'ok') : stage?.live ? 'loading' : 'missing'),
};
askUI = createAsk({ shell: launcher, pad: () => input.scheme === 'ps' || input.scheme === 'xbox' });
$('#menu-ask').addEventListener('submit', e => {
  e.preventDefault();
  os?.close();
  const field = $('#menu-ask-text');
  const text = field.value.trim();
  askUI.open({ text, typing: !text });
  if (text) { field.blur(); askUI.submit(text); }
});

// ---- mouse and touch ----

document.addEventListener('click', (e) => {
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  if (moving) {
    // a click (or Enter on the focused cartridge) while one is in hand drops it
    const onCart = e.target.closest('.cart');
    dropMove();
    if (onCart) return e.preventDefault();
  }
  const reset = e.target.closest('.row__reset');
  if (reset) return resetOrder(reset.closest('.panel').dataset.panel);
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
    if (!pwa.canPlay()) return e.preventDefault();
    const p = current();
    if (p?.frame) {
      e.preventDefault();
      play(p);
    } else audio.blip('ok'); // the link opens the new tab itself
    return;
  }
  if (e.target.closest('[data-newtab]')) {
    if (!pwa.canPlay()) e.preventDefault();
    return;
  }
  const tip = e.target.closest('[data-tip]');
  if (tip) {
    e.preventDefault();
    return openTipJar();
  }
  if (e.target.closest('[data-os]')) return openOS();
  const mi = e.target.closest('.mi');
  if (mi) select(LISTS.contact.indexOf(mi), { sound: false });
  if (phone.matches && S.tab === 'sites' && mode() === 'menu' && !e.target.closest('a, button, .body, .shelf, .top, .tabs, .strip')) {
    if (performance.now() - swipedAt < 500) return;
    const y = e.clientY - screen.getBoundingClientRect().top;
    if (y >= $('.top').getBoundingClientRect().bottom && y < $('.words', onItem('sites')).getBoundingClientRect().top) play(current());
  }
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
let swipeTab = false;
let swipeBlocked = false;
let swipedAt = -Infinity;
screen.addEventListener('touchstart', (e) => {
  swipeBlocked = e.touches.length !== 1 || mode() !== 'menu' || !!e.target.closest('dialog, .ask, .offline-card');
  swipeTab = !!e.target.closest('.tabs');
  sx = e.touches[0].clientX;
  sy = e.touches[0].clientY;
}, { passive: true });
screen.addEventListener('touchend', (e) => {
  if (swipeBlocked || sorter.active || !e.changedTouches.length) return;
  if (!swipeTab && e.target.closest('.row, .menu, .tgroups, a, button, input')) return;
  const dx = e.changedTouches[0].clientX - sx;
  const dy = e.changedTouches[0].clientY - sy;
  if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.4) {
    swipedAt = performance.now();
    if (swipeTab) tabStep(dx < 0 ? 1 : -1);
    else if (S.tab !== 'contact') move(dx < 0 ? 1 : -1);
  }
}, { passive: true });
screen.addEventListener('touchcancel', () => { swipeBlocked = true; }, { passive: true });
// Only the menu suppresses pinch/double-tap/callouts; the game's document owns its gestures.
for (const ev of ['touchstart', 'touchmove']) screen.addEventListener(ev, e => {
  if (mode() === 'menu' && e.touches.length > 1 && e.cancelable) e.preventDefault();
}, { passive: false });
screen.addEventListener('gesturestart', e => mode() === 'menu' && e.preventDefault());
screen.addEventListener('contextmenu', e => mode() === 'menu' && !e.target.closest('input, textarea') && e.preventDefault());

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
    if (p?.frame && pwa.canPlay()) player.open(p);
  }
}

// ---- hints in the strip, in the glyphs of whatever was used last ----
// Each has a rank: when the strip is short, the lowest go first, so "play" and "back" stay.

function hints() {
  const hintsEl = $('#hints');
  const k = (n) => `<span class="g g--${n}">${input.glyph(n)}</span>`;
  const pad = input.scheme === 'ps' || input.scheme === 'xbox';
  const verb = { games: 'play', crew: 'get model', sites: 'open', contact: 'pick' }[S.tab];
  const nav = S.tab === 'contact' ? 'vmove' : 'move';
  const hint = (rank, html) => `<span class="hint" data-rank="${rank}">${html}</span>`;
  if (phone.matches && !moving) {
    const landscape = screen.clientWidth > screen.clientHeight;
    hintsEl.innerHTML = pad ? [hint(9, `${k('a')} ${verb}`),
      ['games', 'sites'].includes(S.tab) ? hint(8, `${k('y')} details`) : '',
      hint(7, S.tab === 'contact' ? '△ ▽ select' : S.tab === 'crew' && phoneZone === 'actions' ? '◁ ▷ games' : '◁ ▷ select'),
      ['games', 'crew'].includes(S.tab) ? hint(6, `${k('x')} wave`) : '',
      landscape ? hint(5, `${k('lb')}${k('rb')} sections`) : ''].join('') : '';
    return fitHints();
  }
  if (input.scheme === 'touch' && !moving) {
    hintsEl.innerHTML = [hint(9, `tap to ${verb}`), hint(6, 'swipe to select'), hint(4, 'swipe tabs for sections')].join('');
    return fitHints();
  }
  if (moving) {
    const arrows = pad ? k('move') : '<span class="g">←</span><span class="g">→</span>';
    hintsEl.innerHTML = [hint(9, `${arrows} move it`), hint(8, `${k('a')} drop`), hint(7, `${k('b')} put back`), hint(5, `${k('y')} reset order`)].join('');
    return fitHints();
  }
  const out = [
    hint(4, `${pad ? k(nav) : input.glyph(nav).split(' ').map((g) => `<span class="g">${g}</span>`).join('')} select`),
    // only on a game with editions, and low: the switch shows its own buttons, right by it
    S.tab === 'games' && SHELF[S.games].length > 1 ? hint(2.5, `${k('lt')}${k('rt')} edition`) : '',
    hint(9, `${k('a')} ${verb}`),
    pad ? hint(8, `${k('b')} back`) : '',
    hint(6, `${k('lb')}${k('rb')} sections`),
    S.tab === 'games' || S.tab === 'sites' ? hint(5, `${k('y')} details`) : '',
    ROWS.includes(S.tab) ? hint(3.5, `${pad ? 'hold ' : ''}${k('grab')} move`) : '',
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
    if (phone.matches) return DUO;
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
  if (phone.matches) {
    if (S.tab === 'crew') return { spots: [screen.clientWidth > screen.clientHeight ? 0.5 : 0.62], tall: (h - 16) / h, feet: (h - 4) / h };
    const imgs = $$('.duo__poster img', duoEl);
    const widths = imgs.map((img, i) => h * (i ? 0.94 : 1) * (+img.getAttribute('width') / +img.getAttribute('height')));
    const left = w - widths[0] - widths[1] - 6;
    return { spots: [(left + widths[0] / 2) / w, (left + widths[0] + 6 + widths[1] / 2) / w], tall: FEET, feet: FEET, width: widths[0] + widths[1] + 6 };
  }
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
  if (phone.matches && wm.lastChild.nodeType === Node.TEXT_NODE) r.selectNode(wm.lastChild);
  else r.selectNodeContents(wm);
  const tw = r.getBoundingClientRect().width;
  let cw = wm.clientWidth;
  if (phone.matches) {
    const row = wm.closest('.words');
    const style = getComputedStyle(row);
    const inner = row.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    // The 1.5:1 canvas includes transparent space; fit to the pair drawn at its right edge.
    const left = box.b && duoMode() === 'side' ? box.b.x + box.b.w - framing(box.b.w, box.b.h).width : Infinity;
    cw = screen.clientWidth > screen.clientHeight ? inner : Math.min(inner * 0.64, left - rel(row).x - parseFloat(style.paddingLeft) - 12);
  }
  if (cw > 0 && tw > cw) wm.style.fontSize = `${Math.max(phone.matches ? 40 : 0, Math.floor((parseFloat(getComputedStyle(wm).fontSize) * cw) / tw))}px`;
}
function layout() {
  phoneMarkup();
  if (phone.matches) screen.style.setProperty('--view-height', `${globalThis.visualViewport?.height || innerHeight}px`);
  const W = screen.clientWidth;
  const H = phone.matches ? screen.clientHeight : innerHeight;
  const ph = phone.matches;
  const compact = ph && W > H;
  screen.classList.toggle('short', ph && H < 760);
  screen.classList.toggle('short-land', compact && H < 380);
  const panel = panelOf(S.tab);
  box.wl = ph ? Math.round(compact ? rel($('.shelf', panel)).y + 14 : rel($('.words', onItem(S.tab))).y + rel($('.words', onItem(S.tab))).h + 2) : Math.round(H * 0.655);
  screen.style.setProperty('--band', `${box.wl}px`);
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
    let w = Math.round(Math.min(W * (big ? 0.38 : 0.34), big ? 560 : 500));
    let h = Math.round(Math.min(H * (big ? 0.56 : 0.48), big ? 520 : 430));
    // feet just past the waterline, so there's floor below them for the whole reflection
    const feet = ph ? box.wl : box.wl + H * (big ? 0.05 : 0.045);
    const pad = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--pad')) || 48;
    const safeRight = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--safe-right')) || 0;
    if (ph) {
      const top = $('.top').offsetHeight + (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--safe-top')) || 0);
      h = Math.min(compact ? 136 : H < 760 ? 124 : 150, Math.max(0, feet - top));
      w = h * 1.5;
      if (!compact) {
        const wm = $('.wm', onItem(S.tab));
        wm.style.fontSize = '40px';
        const range = document.createRange(); range.selectNodeContents(wm);
        if (range.getBoundingClientRect().width > W - safeRight - 16 - framing(w, h).width - 28) {
          h = Math.min(h, 110); w = h * 1.5;
        }
      }
      b = { x: W - 16 - safeRight - w, y: Math.max(top + h * (1 - FEET), feet - h * FEET), w, h };
    } else b = { x: W - w - pad * 0.4 - safeRight, y: feet - h * FEET, w, h };
  }
  box.b = b;
  fitWm();
  if (ph) {
    const band = Math.round(compact ? rel($('.shelf', panel)).y + 14 : rel($('.words', onItem(S.tab))).y + rel($('.words', onItem(S.tab))).h + 2);
    if (b && m === 'side') {
      const top = $('.top').offsetHeight + (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--safe-top')) || 0);
      if (band - top < b.h) { b.h = Math.max(0, band - top); b.w = b.h * 1.5; b.x = W - 16 - (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--safe-right')) || 0) - b.w; }
      b.y = band - b.h * FEET;
    }
    box.wl = band;
    screen.style.setProperty('--band', `${band}px`);
    screen.style.setProperty('--wl', `${band}px`);
    screen.style.setProperty('--floor-art', `url("${bdFor(S.tab, S[S.tab]).src}")`);
    phoneFocus();
    sheetMore();
  }
  backdrop(S.tab, S[S.tab]);
  if (probe) {
    const style = getComputedStyle(document.documentElement);
    probe.textContent = JSON.stringify({ ih: innerHeight, iw: innerWidth,
      vv: [visualViewport.width, visualViewport.height], sb: style.getPropertyValue('--safe-bottom'),
      st: style.getPropertyValue('--safe-top'), standalone: !!navigator.standalone });
  }
  if (b) {
    Object.assign(duoEl.style, { left: `${b.x}px`, top: `${b.y}px`, width: `${b.w}px`, height: `${b.h}px` });
    box.feet = b.y + b.h * FEET;
    const f = framing(b.w, b.h);
    if (ph) duoEl.style.setProperty('--pair-left', `${f.width ? b.w - f.width : 0}px`);
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
  framing: () => phone.matches && box.b ? framing(box.b.w, box.b.h) : null,
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
globalThis.visualViewport?.addEventListener('resize', () => requestAnimationFrame(layout));
globalThis.visualViewport?.addEventListener('scroll', () => requestAnimationFrame(layout));
phone.addEventListener('change', () => { layout(); hints(); });
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
        shell: launcher,
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
// each rearrangeable row: this browser's order (games added since land in their default place),
// "reset order" and the move mode's buttons in its head, and the first cartridge picked
for (const tab of ROWS) {
  if (Array.isArray(ORDER[tab])) {
    arrangeRow(tab, arrange(DEFAULT[tab], ORDER[tab]));
    S[tab] = 0;
  }
  const count = $('.row__head .count', panelOf(tab));
  count?.insertAdjacentHTML(
    'beforebegin',
    `<span class="row__tip" aria-hidden="true"><span class="g" data-g="move">✚</span>move<span class="g g--a" data-g="a">A</span>drop<span class="g g--b" data-g="b">B</span>put back<span class="g g--y" data-g="y">Y</span>reset</span><button class="row__reset" type="button" hidden>reset order</button>`,
  );
}
input.paintGlyphs();
const sorter = createSort({
  rows: ROWS.map((tab) => ({ tab, el: $('.carts', panelOf(tab)) })),
  reduced: () => reduced.matches,
  begin(tab) {
    if (mode() !== 'menu' || tab !== S.tab) return false;
    if (moving) dropMove();
    return true;
  },
  pick(tab, i) {
    audio.blip('ok');
    announce(`Picked up ${nameAt(tab, i)}`);
  },
  over: () => audio.blip('move'),
  moved: () => dispatchEvent(new Event('vyv:scene')),
  commit(tab, from, to) {
    moveItem(tab, from, to);
    keep(tab);
    rowMarks(tab);
  },
  drop(tab, moved) {
    emit();
    if (moved) announce(`${label(tab, S[tab])}. Order saved.`);
  },
});
load();
hints();
if (new URLSearchParams(location.search).has('probe')) {
  probe = Object.assign(document.createElement('span'), { className: 'viewport-probe' });
  $('.strip').append(probe);
  screen.classList.add('is-probe');
  layout();
  setTimeout(() => { probe.remove(); probe = null; screen.classList.remove('is-probe'); }, 5000);
}
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
