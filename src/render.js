// Build-time HTML for the game-select screen (vite.config.js puts it into index.html).
//
// Everything a crawler or a no-JS visitor needs is plain HTML here: every game with its blurb
// and links, every crew member with his model download, every site, and the contact links.
// Without JS the panels simply stack down the page. With JS (src/main.js) the same markup
// becomes one full-screen menu: one panel at a time, one item of each panel at a time, picked
// from the cartridge row along the bottom.

import { shortUrl, shelf, playsIn } from './projects.js';

const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );

const ext = (href, rel = 'noopener') => `href="${esc(href)}" target="_blank" rel="${rel}"`;
const icon = (id, state) => `<svg class="i${state ? ` i--${state}` : ''}" aria-hidden="true"><use href="#i-${id}"/></svg>`;
const newTab = `<span class="vh"> (opens in a new tab)</span>`;
// a button glyph that follows the last input used: keyboard keys, Xbox or PlayStation buttons
const glyph = (name, fallback) => `<span class="g g--${name}" data-g="${name}" aria-hidden="true">${esc(fallback)}</span>`;

const TABS = [
  { id: 'games', label: 'Games', icon: 'cart' },
  { id: 'crew', label: 'Crew', icon: 'crew' },
  { id: 'sites', label: 'Sites', icon: 'site' },
  { id: 'contact', label: 'Contact', icon: 'dm' },
];

function img(image, { cls = '', eager = false, alt = image.alt } = {}) {
  const pos = image.position ? ` style="object-position:${esc(image.position)}"` : '';
  return `<img${cls ? ` class="${cls}"` : ''} src="${esc(image.src)}" width="${image.width}" height="${image.height}" alt="${esc(alt)}" loading="${eager ? 'eager' : 'lazy'}" decoding="async"${pos}>`;
}

function credit(p) {
  if (!p.credit) return '';
  const c = p.credit;
  return `<p class="credit">${esc(c.before)} <a ${ext(c.href)}>${esc(c.label)}${newTab}</a> ${esc(c.after)}</p>`;
}

// the other links (Source, Site, …), and the main one in a new tab when it plays in here
function moreLinks(p) {
  const [main, ...rest] = p.links;
  const items = rest.map((l) => `<a class="more-link" ${ext(l.href)}>${esc(l.label)} ${icon('ext')}${newTab}</a>`);
  if (p.frame) items.push(`<a class="more-link js-only" ${ext(main.href)} data-newtab>${esc(shortUrl(main.href))} in a new tab ${icon('ext')}${newTab}</a>`);
  return items.length ? `<p class="more">${items.join('')}</p>` : '';
}

// PLAY: a plain link to the game. With JS, a game that allows framing runs inside the page
// instead (src/player.js); one that doesn't still opens in a new tab, and says so.
function playButton(p, label, { small = false } = {}) {
  const tab = !p.frame;
  return `<a class="play${small ? ' play--sm' : ''}" ${ext(p.url)} data-act="play"${tab ? ' data-tab' : ''}>${glyph('a', 'A')}<span class="play__label">${esc(label)}</span>${tab ? `<span class="play__tab">new tab ${icon('ext')}</span>` : ''}<span class="vh"> ${esc(p.name)}${tab ? ' (opens in a new tab)' : ''}</span></a>`;
}

// Details (Y on a pad, I on a keyboard): the whole blurb, the credit and every link
const moreButton = `<button class="more-btn js-only" type="button" data-more aria-expanded="false">${glyph('y', 'I')}<span>details</span></button>`;

function status(cmd, line, ok = '[ OK ]') {
  return `<p class="status"><span class="cmd">&gt; ${esc(cmd)}</span> <span class="ok">${esc(ok)}</span><span class="status__more"><br><span data-type>${esc(line)}</span></span></p>`;
}

// A game with editions (RadPayne and RetardioPayne): a switch under the wordmark, one pill per
// edition, the shown one marked. Each pill is a plain link to that edition's own card, so without
// JS it jumps down the page to it; with JS it flips the edition in place (src/main.js).
function editionSwitch(p, eds, faces) {
  if (eds.length < 2) return '';
  const pills = eds.map((e) => {
    const face = faces[e.edition?.face];
    return `<a class="ed" href="#${esc(e.slug)}" data-ed="${esc(e.cmd)}" style="--accent:${esc(e.accent)}"${e === p ? ' aria-current="true"' : ''}>${face ? `<img src="${esc(face)}" width="200" height="200" alt="" loading="lazy" decoding="async">` : ''}<span>${esc(e.edition?.label || e.name)}</span><span class="vh">: ${esc(e.name)}</span></a>`;
  });
  return `<div class="eds" role="group" aria-label="${esc(eds[0].name)}: ${eds.length} editions">${glyph('lt', '↑')}<span class="eds__seg">${pills.join('')}</span>${glyph('rt', '↓')}</div>`;
}

function gameItem(p, i, eds, faces) {
  const line = p.frame ? p.boot || p.kind : 'opens in a new tab: it can’t run inside this page';
  return `<article class="item item--game${eds.length > 1 ? ' item--eds' : ''}" id="${esc(p.slug)}" data-i="${i}" data-id="${esc(p.cmd)}" data-game="${esc(eds[0].cmd)}" style="--accent:${esc(p.accent)};--shell:${esc(p.shell)}" aria-labelledby="${esc(p.slug)}-name">
  <div class="info">
    <p class="kindline">${esc(p.kind)}</p>
    <h3 class="wm" id="${esc(p.slug)}-name">${esc(p.name)}</h3>
    ${editionSwitch(p, eds, faces)}
    <p class="pitch">${esc(p.blurb)}</p>
    ${moreButton}
    <div class="act">
      ${playButton(p, 'Play')}
      ${status(`${p.cmd}.exe`, line, p.frame ? '[ OK ]' : '[ TAB ]')}
    </div>
    <div class="extra">${credit(p)}${moreLinks(p)}</div>
  </div>
  ${p.image ? `<figure class="nojs-art">${img(p.image)}</figure>` : ''}
</article>`;
}

function siteItem(p, i) {
  const [main, ...rest] = p.links;
  const home = rest.find((l) => /^site$/i.test(l.label));
  const line = p.frame ? `plays here${home ? `. home: ${shortUrl(home.href)}` : ''}` : 'opens in a new tab';
  const shot = p.image
    ? `<figure class="visual visual--site"><figcaption class="monitor__bar"><b>${esc(shortUrl(p.url))}</b><span>${esc(p.kind)}</span></figcaption>${img(p.image)}</figure>`
    : '';
  return `<article class="item item--site" id="${esc(p.slug)}" data-i="${i}" data-id="${esc(p.cmd)}" style="--accent:${esc(p.accent)}" aria-labelledby="${esc(p.slug)}-name">
  ${shot}
  <div class="info">
    <p class="kindline">${esc(p.kind)}</p>
    <h3 class="wm wm--site" id="${esc(p.slug)}-name">${esc(p.name)}</h3>
    <p class="pitch">${esc(p.blurb)}</p>
    ${moreButton}
    <div class="act">
      ${playButton(p, main.label, { small: true })}
      ${status(`open ${shortUrl(p.url)}`, line, p.frame ? '[ OK ]' : '[ TAB ]')}
    </div>
    <div class="extra">${moreLinks(p)}</div>
  </div>
</article>`;
}

function crewItem(b, i, { crew, projects, shell }) {
  const plays = playsIn(projects, b.num);
  const own = b.repo === false;
  const file = b.download.href.split('/').pop();
  const all = crew.downloadAll ? `<p class="fine"><a class="more-link" href="${esc(crew.downloadAll.href)}" download>${esc(crew.downloadAll.label)} (${esc(crew.downloadAll.size)})</a></p>` : '';
  const fine = own
    ? `<p class="credit">My own Retardio, built on the Radbro rig. Free to use under the <a ${ext(crew.repo.license.href)}>${esc(crew.repo.license.label)}${newTab}</a>, like the Radbros: use him, remix him, put him in your game.</p>`
    : `<p class="credit">Free to use under the <a ${ext(crew.repo.license.href)}>${esc(crew.repo.license.label)}${newTab}</a>: <a ${ext(crew.repo.href)}>models on GitHub${newTab}</a>. ${esc(crew.repo.line)}</p>`;
  return `<article class="item item--crew" id="${esc(b.slug)}" data-i="${i}" data-id="${esc(b.num)}" aria-labelledby="${esc(b.slug)}-name">
  <div class="visual visual--crew">
    <div class="bignum" aria-hidden="true">${esc(b.num)}</div>
    ${img(b.image, { cls: 'bro' })}
  </div>
  <div class="info">
    <p class="kindline">${esc(b.kind)}</p>
    <h3 class="wm" id="${esc(b.slug)}-name"><span class="vh">${esc(b.kind)} </span>#${esc(b.num)}</h3>
    <p class="pitch">${esc(b.line)} Rigged and animated.</p>
    <div class="plays"><span class="plays__label">in</span>${plays
      .map((g) => `<a class="spine" href="#${esc(g.slug)}" data-goto="${esc(g.cmd)}" style="--shell:${esc(shell(g))};--accent:${esc(g.accent)}">${esc(g.name)}</a>`)
      .join('')}</div>
    <div class="act">
      <a class="play play--sm" href="${esc(b.download.href)}" download data-act="download">${glyph('a', 'A')}<span class="play__label">Get the model</span><span class="vh"> of ${esc(b.name)} (${esc(b.download.label)}, ${esc(b.download.size)})</span></a>
      ${status(file, `${b.download.size}, rigged and animated`)}
    </div>
    <div class="extra">${fine}${all}</div>
  </div>
</article>`;
}

// One cartridge per game. A game with editions has one label per edition (the shown one on top,
// src/main.js) and the next one's edge peeking out behind it, so it reads as a two-in-one.
function cart(p, i, eds = [p]) {
  const two = eds.length > 1;
  const labels = eds
    .filter((e) => e.thumb)
    .map((e, k) => `<img${two ? ` class="${k ? '' : 'on'}" data-label="${esc(e.cmd)}"` : ''} src="${esc(e.thumb)}" width="420" height="236" alt="" loading="lazy" decoding="async">`)
    .join('');
  return `<li class="slot${two ? ' slot--eds' : ''}" style="--i:${i};--shell:${esc(p.shell || '#4b4855')};--accent:${esc(p.accent)}${two ? `;--accent2:${esc(eds[1].accent)}` : ''}" data-i="${i}">
      <button class="cart" type="button" data-i="${i}" aria-controls="${esc(p.slug)}"><span class="cart__label">${labels}</span><span class="cart__name">${esc(p.name)}</span>${two ? `<span class="vh">, ${eds.length} editions</span>` : ''}</button></li>`;
}

function tile(b, i) {
  return `<li class="tslot" style="--i:${i}" data-i="${i}"><button class="tile" type="button" data-i="${i}" aria-controls="${esc(b.slug)}" aria-label="${esc(b.kind)} #${esc(b.num)}"><img src="${esc(b.face)}" width="200" height="200" alt="" loading="lazy" decoding="async"><span class="tile__num">#${esc(b.num)}</span></button></li>`;
}

function row(head, items, cls, tag = 'ul') {
  return `<div class="row js-only">
      <p class="row__head"><span>${head}</span><span class="count" aria-hidden="true"></span></p>
      <${tag} class="carts ${cls}" role="list">${items}</${tag}>
    </div>`;
}

function panel(id, title, body) {
  return `<section class="panel panel--${id}" id="${id}" data-panel="${id}" aria-labelledby="tab-${id}">
    <h2 class="vh">${esc(title)}</h2>
    ${body}
  </section>`;
}

export function renderShell({ site, groups, projects, crew, contact, duo }) {
  const games = projects.filter((p) => p.group === 'games');
  const carts = shelf(projects);
  const edsOf = (p) => carts.find((eds) => eds.includes(p));
  const faces = Object.fromEntries(crew.members.map((m) => [m.num, m.face]));
  // an edition's spine on Crew is its cartridge's plastic, with its own glow
  const shell = (p) => edsOf(p)?.[0].shell || p.shell;
  const sites = projects.filter((p) => p.group === 'sites');
  const g = Object.fromEntries(groups.map((x) => [x.id, x]));
  const [host, ...tld] = site.name.split('.');
  const lead = games[0];
  const pair = duo.map((n) => crew.members.find((m) => m.num === n));

  const tabs = TABS.map(
    (t) =>
      `<a class="tab" id="tab-${t.id}" href="#${t.id}" aria-controls="${t.id}" data-tab="${t.id}">${icon(t.icon)}<span>${esc(t.label)}</span></a>`,
  ).join('');

  const radbros = crew.members.filter((m) => !m.kind.startsWith('Retardio'));
  const retardios = crew.members.filter((m) => m.kind.startsWith('Retardio'));
  const idx = (m) => crew.members.indexOf(m);
  const tiles = `<div class="tgroup"><p class="tgroup__label">radbros</p><ul class="tiles" role="list">${radbros.map((m) => tile(m, idx(m))).join('')}</ul></div><div class="tgroup"><p class="tgroup__label">retardios</p><ul class="tiles" role="list">${retardios.map((m) => tile(m, idx(m))).join('')}</ul></div>`;

  const menu = [
    `<li><a class="mi" data-i="0" ${ext(contact.dm.href, 'me noopener')}><span class="cur" aria-hidden="true">▶</span><span class="mi__label">${icon('x')}${esc(contact.dm.label)}</span><span class="det">${esc(contact.dm.handle)}</span>${newTab}</a></li>`,
    `<li><a class="mi" data-i="1" ${ext(contact.code.href, 'me noopener')}><span class="cur" aria-hidden="true">▶</span><span class="mi__label">${icon('github')}${esc(contact.code.label)}</span><span class="det">${esc(shortUrl(contact.code.href))}: source and the 3D models</span>${newTab}</a></li>`,
    `<li class="js-only"><button class="mi" type="button" data-i="2" data-tip aria-haspopup="dialog"><span class="cur" aria-hidden="true">▶</span><span class="mi__label">${icon('coin')}Tip jar</span><span class="det">SOL to vyvanse.sol, or ETH</span></button></li>`,
    `<li><a class="mi" data-i="3" ${ext(contact.axiom.href, 'noopener')}><span class="cur" aria-hidden="true">▶</span><span class="mi__label">${icon('chart')}${esc(contact.axiom.label)}</span><span class="det">${esc(shortUrl(contact.axiom.href))}: ${esc(contact.axiom.note)}</span>${newTab}</a></li>`,
    `<li class="js-only"><button class="mi" type="button" data-i="4" data-os aria-haspopup="dialog"><span class="cur" aria-hidden="true">▶</span><span class="mi__label">${icon('term')}Radbro OS</span><span class="det">the terminal, or <kbd>/</kbd></span></button></li>`,
  ].join('');

  return `<div class="screen boot" id="screen">
  <div class="backdrops" id="backdrops" aria-hidden="true"><img class="bd on" data-bd="games:${esc(lead.cmd)}" src="${esc(lead.image.src)}" alt="" fetchpriority="high" decoding="async"></div>
  <div class="scrim" aria-hidden="true"></div>
  <div class="duo duo--off" id="duo" aria-hidden="true">
    <div class="duo__poster">${pair.map((m) => `<img src="${esc(m.image.src)}" width="${m.image.width}" height="${m.image.height}" alt="" decoding="async">`).join('')}</div>
  </div>
  <p class="duo__hint js-only" id="duo-hint" hidden><span class="duo__hint-mouse">click them to wave</span><span class="duo__hint-pad">${glyph('x', 'G')} wave</span></p>

  <header class="top">
    <h1 class="sign"><a href="/" aria-label="${esc(site.name)}, games, 3D Radbros and websites by ${esc(site.handle)}"><span class="host">${esc(host)}</span><span class="tld">.${esc(tld.join('.'))}</span></a></h1>
    <nav class="tabs" aria-label="Sections">
      <button class="bump js-only" type="button" data-step="-1" aria-label="Previous section" tabindex="-1">${glyph('lb', 'Q')}</button>
      <div class="tabs__list">${tabs}</div>
      <button class="bump js-only" type="button" data-step="1" aria-label="Next section" tabindex="-1">${glyph('rb', 'E')}</button>
    </nav>
    <div class="top__right js-only">
      <button class="tog" id="music" type="button" aria-pressed="false" title="Music (M)">${icon('note', 'on')}${icon('note-off', 'off')}<span class="tog__label">music</span></button>
      <button class="tog" id="sfx" type="button" aria-pressed="false" title="Menu sounds (N)">${icon('sfx', 'on')}${icon('sfx-off', 'off')}<span class="tog__label">sfx</span></button>
      <button class="tog tog--fs" id="fs" type="button" aria-pressed="false" title="Full screen (F)">${icon('fs')}<span class="vh">Full screen</span></button>
      <button class="tip-pill" type="button" data-tip aria-haspopup="dialog"><span class="coin" aria-hidden="true">◎</span><span><span class="tip-pill__what">tip </span><b>vyvanse.sol</b></span></button>
    </div>
  </header>

  <main id="main" class="panels">
    ${panel(
      'games',
      g.games.title,
      `<div class="items">${games.map((p) => gameItem(p, carts.indexOf(edsOf(p)), edsOf(p), faces)).join('\n')}</div>
    ${row(`my games<span class="cap-long">. free, in the browser, keyboard or controller</span>`, carts.map((eds, i) => cart(eds[0], i, eds)).join(''), 'carts--games')}`,
    )}
    ${panel(
      'crew',
      crew.title,
      `<p class="panel__line">${esc(crew.line)}</p>
    <div class="items">${crew.members.map((m, i) => crewItem(m, i, { crew, projects, shell })).join('\n')}</div>
    <div class="row js-only"><div class="tgroups">${tiles}</div></div>`,
    )}
    ${panel(
      'sites',
      g.sites.title,
      `<div class="items">${sites.map(siteItem).join('\n')}</div>
    ${row(`sites I built<span class="cap-long">: my own, and for other people’s projects</span>`, sites.map((p, i) => cart(p, i)).join(''), 'carts--sites')}`,
    )}
    ${panel(
      'contact',
      contact.title,
      `<div class="items"><div class="item item--contact on">
      <div class="info">
        <p class="wm wm--contact" aria-hidden="true">${esc(contact.title)}</p>
        <p class="pitch">${esc(contact.line)}</p>
        <ul class="menu" role="list">${menu}</ul>
        <p class="fine">Made by ${esc(site.handle)}. Site code MIT, Radbro models VPL. Not a pharmacy. Not a brewery.</p>
      </div>
    </div></div>`,
    )}
  </main>

  <footer class="strip">
    <p class="hints js-only" id="hints" aria-hidden="true"></p>
    <div class="strip__ticker" id="ticker-host"></div>
  </footer>
  <p class="vh" id="announce" aria-live="polite"></p>
</div>
<audio id="bgm" loop preload="none"><source src="/audio/vyvanse-bg.webm" type='audio/webm; codecs="opus"'><source src="/audio/vyvanse-bg.m4a" type="audio/mp4"></audio>`;
}
