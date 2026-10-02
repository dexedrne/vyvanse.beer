// Build-time HTML for the landing. Everything a crawler or a no-JS visitor needs (every
// project, every link) is plain HTML; the terminal and windows layer on top in src/main.js.
//
// `data-cmd` marks anything that runs a terminal command when clicked with JS on.

import { projects, shortUrl } from './projects.js';

const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );

const ext = (href) => `href="${esc(href)}" target="_blank" rel="noopener"`;
const icon = (id) => `<svg class="i" aria-hidden="true"><use href="#i-${id}"/></svg>`;
const newTab = `<span class="vh"> (opens in a new tab)</span>`;

function img(image, { eager = false, cls = '' } = {}) {
  return `<img${cls ? ` class="${cls}"` : ''} src="${esc(image.src)}" width="${image.width}" height="${image.height}" alt="${esc(image.alt)}" loading="${eager ? 'eager' : 'lazy'}" decoding="async">`;
}

export function renderHero(site, mascot) {
  const links = site.links
    .map(
      (l) =>
        `<li><a class="btn btn--ghost" ${ext(l.href).replace('rel="noopener"', 'rel="me noopener"')}>${icon(l.cmd)}<span>${esc(l.label)}</span>${newTab}</a></li>`,
    )
    .join('');
  const [host, ...tld] = site.name.split('.');
  const dot = tld.length ? `<span class="hero__tld">.${esc(tld.join('.'))}</span>` : '';
  const games = projects.filter((p) => p.group === 'games' && p.boot);
  const boot = games
    .map(
      (p, i) =>
        `<li style="--i:${i}"><a ${ext(p.url)}><span class="boot__caret" aria-hidden="true">&gt;</span><span class="boot__exe">${esc(p.cmd)}.exe</span><span class="boot__status">[ OK ]</span><span class="boot__what">${esc(p.boot)}</span>${newTab}</a></li>`,
    )
    .join('');
  // The stage is the neon sign and #4764, both standing on the waterline (its bottom edge).
  // Below it the puddle: src/water.js draws their rippling reflection there. Until it does, and
  // without WebGL (or JS), .hero__mirror and .hero__bro-mirror are a plain CSS reflection of the
  // sign and of his render instead.
  return `<header class="hero">
  <div class="hero__stage">
    <p class="hero__prompt" aria-hidden="true"><span class="hero__ps1">${esc(site.handle)}@vyvanse:~$</span> <span class="hero__cmd">./hello</span><span class="hero__cursor"></span></p>
    <h1 class="hero__title"><span class="hero__host">${esc(host)}</span>${dot}</h1>
    <p class="hero__mirror" aria-hidden="true"><span class="hero__host">${esc(host)}</span>${dot}</p>
    <figure class="hero__bro">
      <span class="hero__bubble" aria-hidden="true">gm</span>
      ${mascot.model ? bro3d(mascot) : img(mascot, { eager: true })}
      <span class="hero__bro-mirror" aria-hidden="true"><img src="${esc(mascot.src)}" width="${mascot.width}" height="${mascot.height}" alt="" decoding="async"></span>
    </figure>
  </div>
  <div class="hero__deck">
    <div class="hero__intro">
      <p class="hero__tag">${esc(site.tagline)}</p>
      <ul class="hero__links" role="list">${links}</ul>
      <p class="hero__hint js-only"><span class="only-wide">Click a project to open it in a new tab, or press <kbd>/</kbd> for Radbro OS.</span><span class="only-narrow">Tap any project to open it in a new tab.</span></p>
    </div>
    <div class="hero__boot" role="group" aria-label="Games online">
      <p class="boot__head"><span class="boot__os">radbro os</span> <span aria-hidden="true">//</span> <span class="boot__ok">${games.length} games online</span></p>
      <ul class="boot__list" role="list">${boot}</ul>
    </div>
  </div>
</header>`;
}

// #4764 as a <model-viewer> you can drag around. The render sits inside as the poster, so the
// first paint is the same picture, and without JS (or before the viewer loads) it's just the
// <img>. src/bro.js loads the viewer, and sets auto-rotate and the waves.
function bro3d(m) {
  const attrs = {
    class: 'bro3d',
    src: m.model,
    alt: m.alt,
    loading: 'lazy',
    reveal: 'auto',
    'camera-controls': '',
    'disable-zoom': '',
    'disable-pan': '',
    'disable-tap': '',
    'touch-action': 'pan-y',
    'interaction-prompt': 'none',
    'camera-orbit': BRO_CAMERA.orbit,
    'min-camera-orbit': BRO_CAMERA.min,
    'max-camera-orbit': BRO_CAMERA.max,
    'camera-target': BRO_CAMERA.target,
    'field-of-view': BRO_CAMERA.fov,
    'min-field-of-view': BRO_CAMERA.fov,
    'max-field-of-view': BRO_CAMERA.fov,
    'orbit-sensitivity': '0.7',
    'interpolation-decay': '120',
    'auto-rotate-delay': '4000',
    'rotation-per-second': '16deg',
    'animation-name': 'Idle',
    autoplay: '',
    'animation-crossfade-duration': '400',
    'tone-mapping': 'none',
    exposure: '1',
    'shadow-intensity': '0',
  };
  const a = Object.entries(attrs)
    .map(([k, v]) => (v === '' ? k : `${k}="${esc(v)}"`))
    .join(' ');
  return `<model-viewer ${a}>
      ${img(m, { eager: true }).replace('<img ', '<img slot="poster" ')}
    </model-viewer>`;
}

// Framing for the 719x1100 box: wide enough that his katana's scabbard tip (0.74 m out) stays in
// frame at every angle while he spins, and aimed high enough that his feet are near the bottom
// of the box (on the hero's waterline), with the room left over his head. Drag spins him all
// the way round; the tilt stays between a little below and a little above eye level.
const BRO_CAMERA = {
  orbit: '0deg 82deg 7.8m',
  min: '-Infinity 66deg 7.8m',
  max: 'Infinity 96deg 7.8m',
  target: '0m 1m 0m',
  fov: '17deg',
};

// Projects open in a new tab. The ones that allow framing also get this small opt-in: run it
// in an in-page window instead (`win <cmd>`). JS only, like the windows themselves.
function winButton(p, cls) {
  if (!p.frame) return '';
  return `<button class="${cls}" type="button" data-cmd="win ${esc(p.cmd)}" aria-label="Open ${esc(p.name)} in a window on this page" title="Open in a window on this page">${icon('win')}<span>In a window</span></button>`;
}

// Games are big panes stacked down the page, one per game in the order of src/projects.js:
// the cover art on one side (standing on a thin strip of water), the words and buttons on the
// other, swapping sides from one game to the next. Phones get the art on top.
function gameCard(p) {
  const [main, ...rest] = p.links;
  const shot = p.image
    ? `<div class="game__shot">${img(p.image)}</div>`
    : `<div class="game__shot game__shot--none" aria-hidden="true"><span>${esc(shortUrl(p.url))}</span></div>`;
  const more = rest
    .map((l) => `<a class="game__more" ${ext(l.href)}>${esc(l.label)}${icon('ext')}${newTab}</a>`)
    .join('');
  const credit = p.credit
    ? `<p class="game__note">${esc(p.credit.before)} <a ${ext(p.credit.href)}>${esc(p.credit.label)}</a> ${esc(p.credit.after)}</p>`
    : '';
  const note = p.note ? `<p class="game__note">${esc(p.note)}</p>` : '';
  return `<li class="game game--feature glass reveal" id="${esc(p.slug)}" data-project="${esc(p.cmd)}">
  ${shot}
  <div class="game__text">
    <p class="game__status"><span>[ OK ]</span> ${esc(p.cmd)}.exe</p>
    <h3 class="game__name">${esc(p.name)}</h3>
    <p class="game__kind">${esc(p.kind)}</p>
    <p class="game__blurb">${esc(p.blurb)}</p>
    <div class="game__actions">
      <a class="btn btn--primary game__main" ${ext(main.href)} data-cmd="open ${esc(p.cmd)}"><span>${esc(main.label)}</span><span class="vh"> ${esc(p.name)}</span>${newTab}</a>
      ${more}${winButton(p, 'game__more game__win js-only')}
    </div>
    ${credit}${note}
  </div>
</li>`;
}

// Sites get a picture card: screenshot on top, then name, host, kind and links. Same parts
// as a game row, stacked, two to a row. No screenshot = a plain tile with the host on it.
function siteCard(p) {
  const [main, ...rest] = p.links;
  const host = shortUrl(p.url);
  const shot = p.image
    ? `<div class="game__shot">${img(p.image)}</div>`
    : `<div class="game__shot game__shot--none" aria-hidden="true"><span>${esc(host)}</span></div>`;
  const more = rest
    .map((l) => `<a class="game__more" ${ext(l.href)}>${esc(l.label)}${icon('ext')}${newTab}</a>`)
    .join('');
  return `<li class="game game--card glass reveal" id="${esc(p.slug)}" data-project="${esc(p.cmd)}">
  ${shot}
  <div class="game__text">
    <p class="game__status"><span>[ OK ]</span> ${esc(p.cmd)}.exe</p>
    <h3 class="game__name">${esc(p.name)}</h3>
    <p class="game__host">${esc(host)}</p>
    <p class="game__kind">${esc(p.kind)}</p>
    <div class="game__actions">
      <a class="btn btn--primary game__main" ${ext(main.href)} data-cmd="open ${esc(p.cmd)}"><span>${esc(main.label)}</span><span class="vh"> ${esc(p.name)}</span>${newTab}</a>
      ${more}${winButton(p, 'game__more game__win js-only')}
    </div>
  </div>
</li>`;
}

function sectionHead(id, title, line, cmd = `ls ${id}`) {
  return `<header class="sec__head reveal">
    <span class="sec__drop" aria-hidden="true"></span>
    <p class="sec__prompt" aria-hidden="true"><span>~/${esc(id)} $</span> ${esc(cmd)}</p>
    <h2 class="sec__title" id="${esc(id)}-title">${esc(title)}</h2>
    <a class="cmd-hint js-only" href="#${esc(id)}" data-cmd="${esc(cmd)}" aria-label="Run ${esc(cmd)} in the terminal">${esc(cmd)}</a>
    <p class="sec__line">${esc(line)}</p>
  </header>`;
}

function crewSection(crew, projects) {
  const play = projects.find((p) => p.cmd === crew.playIn);
  const bros = crew.members
    .map(
      (b) => `<li class="bro${b.featured ? ' bro--featured' : ''}" id="${esc(b.slug)}">
    <span class="bro__status" aria-hidden="true"><span>[ OK ]</span> #${esc(b.num)}</span>
    <a class="bro__link" href="#${esc(b.slug)}" data-cmd="info ${esc(b.num)}">
      <span class="bro__stage">${img(b.image)}</span>
      <span class="bro__name">${esc(b.name)}</span>
      <span class="bro__line">${esc(b.line)}</span>
    </a>${b.download ? `
    <a class="bro__dl" href="${esc(b.download.href)}" download rel="noopener">↓ ${esc(b.download.label)} <span class="bro__dl-size">${esc(b.download.size)}</span></a>` : ''}
  </li>`,
    )
    .join('\n');
  const all = crew.downloadAll
    ? ` <a class="bro__dl bro__dl--all" href="${esc(crew.downloadAll.href)}" download rel="noopener">↓ ${esc(crew.downloadAll.label)} <span class="bro__dl-size">${esc(crew.downloadAll.size)}</span></a>`
    : '';
  const cta = play
    ? `<p class="crew__cta"><a class="btn btn--ghost" ${ext(play.url)} data-cmd="open ${esc(play.cmd)}">Play them in ${esc(play.name)}${newTab}</a>${all}</p>`
    : '';
  const r = crew.repo;
  const repo = r
    ? `<div class="crew__free">
    <p class="crew__links"><a class="crew__repo" ${ext(r.href)}>${icon('github')}${esc(r.label)}${newTab}</a><a class="crew__lic" ${ext(r.license.href)}>${esc(r.license.label)}${newTab}</a></p>
    <p class="crew__use">${esc(r.line)}</p>
  </div>`
    : '';
  return `<section class="sec sec--crew" id="crew" aria-labelledby="crew-title">
  ${sectionHead('crew', crew.title, crew.line)}
  <ul class="crew reveal" role="list">
  ${bros}
  </ul>
  ${cta}
  ${repo}
</section>`;
}

// The last section: one clear way to reach me (a DM on X), and GitHub beside it.
function contactSection(c) {
  const rel = ext(c.dm.href).replace('rel="noopener"', 'rel="me noopener"');
  const gh = ext(c.code.href).replace('rel="noopener"', 'rel="me noopener"');
  return `<section class="sec sec--contact" id="contact" aria-labelledby="contact-title">
  ${sectionHead('contact', c.title, c.line, 'contact')}
  <div class="contact glass reveal">
    <p class="contact__status"><span>[ OK ]</span> connection ready</p>
    <a class="btn btn--primary contact__dm" ${rel}>${icon('x')}<span>${esc(c.dm.label)}</span>${newTab}</a>
    <span class="contact__handle">${esc(c.dm.handle)}</span>
    <a class="contact__gh" ${gh}>${icon('github')}<span>${esc(c.code.label)}</span>${newTab}</a>
    <button class="contact__tip js-only" type="button" data-tip aria-haspopup="dialog"><svg class="contact__coin" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.6" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M5.4 5.9h5.6l-.8.9H4.6zm0 2.6h5.6l-.8.9H4.6zm.8 2.6h5.6l-.8.9H5.4z" fill="currentColor" transform="translate(.4 -1.2)"/></svg><span>tip vyvanse.sol</span></button>
  </div>
</section>`;
}

export function renderContent({ groups, projects, crew, contact }) {
  const out = [];
  for (const g of groups) {
    const items = projects.filter((p) => p.group === g.id);
    const body =
      g.id === 'games'
        ? `<ul class="games games--feature" role="list">${items.map(gameCard).join('\n')}</ul>`
        : `<ul class="games games--grid" role="list">${items.map(siteCard).join('\n')}</ul>`;
    out.push(`<section class="sec sec--${esc(g.id)}" id="${esc(g.id)}" aria-labelledby="${esc(g.id)}-title">
  ${sectionHead(g.id, g.title, g.line)}
  ${body}
</section>`);
    // The crew sits between the games and the sites.
    if (g.id === 'games') out.push(crewSection(crew, projects));
  }
  if (contact) out.push(contactSection(contact));
  return out.join('\n');
}

export function renderFooter(site) {
  const to = (cmd) => {
    const l = site.links.find((x) => x.cmd === cmd);
    return `<a ${ext(l.href).replace('rel="noopener"', 'rel="me noopener"')}>${esc(shortUrl(l.href))}${newTab}</a>`;
  };
  return `<footer class="foot">
  <p class="foot__status">radbro os <span>//</span> <strong>online</strong> <span>//</span> © ${esc(site.handle)}</p>
  <p>Made by ${esc(site.handle)}. DMs open at ${to('x')}, code at ${to('github')}.</p>
  <p class="foot__small">Site code MIT, Radbro models VPL. Not a pharmacy. Not a brewery.</p>
</footer>`;
}
