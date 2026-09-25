// Build-time HTML for the landing. Everything a crawler or a no-JS visitor needs (every
// project, every link) is plain HTML; the terminal and windows layer on top in src/main.js.
//
// `data-cmd` marks anything that runs a terminal command when clicked with JS on.

import { shortUrl } from './projects.js';

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
  return `<header class="hero">
  <h1 class="hero__title">${esc(site.name)}</h1>
  <p class="hero__tag">${esc(site.tagline)}</p>
  <ul class="hero__links" role="list">${links}</ul>
  <p class="hero__hint js-only"><span class="only-wide">Click a project to open it in a new tab, or press <kbd>/</kbd> for Radbro OS.</span><span class="only-narrow">Tap any project to open it in a new tab.</span></p>
  <figure class="hero__bro">
    ${mascot.model ? bro3d(mascot) : img(mascot, { eager: true })}
  </figure>
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

// Framing for the 719x1100 box: he fills it about the way he fills the render. Drag spins him
// all the way round; the tilt stays between a little below and a little above eye level.
const BRO_CAMERA = {
  orbit: '0deg 82deg 6.2m',
  min: '-Infinity 66deg 6.2m',
  max: 'Infinity 96deg 6.2m',
  target: '0m 0.86m 0m',
  fov: '17deg',
};

// Projects open in a new tab. The ones that allow framing also get this small opt-in: run it
// in an in-page window instead (`win <cmd>`). JS only, like the windows themselves.
function winButton(p, cls, { iconOnly = false } = {}) {
  if (!p.frame) return '';
  const label = `Open ${esc(p.name)} in a window on this page`;
  return `<button class="${cls}" type="button" data-cmd="win ${esc(p.cmd)}" aria-label="${label}" title="${iconOnly ? label : 'Open in a window on this page'}">${icon('max')}${iconOnly ? '' : '<span>In a window</span>'}</button>`;
}

function gameRow(p, i) {
  const [main, ...rest] = p.links;
  const shot = p.image
    ? `<div class="game__shot">${img(p.image, { eager: i === 0 })}</div>`
    : '';
  const more = rest
    .map((l) => `<a class="game__more" ${ext(l.href)}>${esc(l.label)}${icon('ext')}${newTab}</a>`)
    .join('');
  const credit = p.credit
    ? `<p class="game__note">${esc(p.credit.before)} <a ${ext(p.credit.href)}>${esc(p.credit.label)}</a> ${esc(p.credit.after)}</p>`
    : '';
  const note = p.note ? `<p class="game__note">${esc(p.note)}</p>` : '';
  return `<article class="game" id="${esc(p.slug)}" data-project="${esc(p.cmd)}">
  ${shot}
  <div class="game__text">
    <h3 class="game__name">${esc(p.name)}</h3>
    <p class="game__kind">${esc(p.kind)}</p>
    <p class="game__blurb">${esc(p.blurb)}</p>
    <div class="game__actions">
      <a class="btn btn--primary game__main" ${ext(main.href)} data-cmd="open ${esc(p.cmd)}"><span>${esc(main.label)}</span><span class="vh"> ${esc(p.name)}</span>${newTab}</a>
      ${more}${winButton(p, 'game__more game__win js-only')}
      <code class="cmd-hint js-only" aria-hidden="true">open ${esc(p.cmd)}</code>
    </div>
    ${credit}${note}
  </div>
</article>`;
}

function olderRow(p) {
  return `<li class="older__item" id="${esc(p.slug)}" data-project="${esc(p.cmd)}">
  <a class="older__link" ${ext(p.url)} data-cmd="open ${esc(p.cmd)}">
    <span class="older__name">${esc(p.name)}</span>
    <span class="older__kind">${esc(p.kind)}</span>
    <span class="older__host">${esc(shortUrl(p.url))}${icon('ext')}</span>${newTab}
  </a>
  <span class="older__side js-only">${winButton(p, 'older__win', { iconOnly: true })}</span>
</li>`;
}

function sectionHead(id, title, line) {
  return `<header class="sec__head">
    <h2 class="sec__title" id="${esc(id)}-title">${esc(title)}</h2>
    <a class="cmd-hint js-only" href="#${esc(id)}" data-cmd="ls ${esc(id)}" aria-label="Run ls ${esc(id)} in the terminal">ls ${esc(id)}</a>
    <p class="sec__line">${esc(line)}</p>
  </header>`;
}

function crewSection(crew, projects) {
  const play = projects.find((p) => p.cmd === crew.playIn);
  const bros = crew.members
    .map(
      (b) => `<li class="bro${b.featured ? ' bro--featured' : ''}" id="${esc(b.slug)}">
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
  return `<section class="sec sec--crew" id="crew" aria-labelledby="crew-title">
  ${sectionHead('crew', crew.title, crew.line)}
  <ul class="crew" role="list">
  ${bros}
  </ul>
  ${cta}
</section>`;
}

export function renderContent({ groups, projects, crew }) {
  const out = [];
  for (const g of groups) {
    const items = projects.filter((p) => p.group === g.id);
    const body =
      g.id === 'games'
        ? `<div class="games">${items.map(gameRow).join('\n')}</div>`
        : `<ul class="older" role="list">${items.map(olderRow).join('\n')}</ul>`;
    out.push(`<section class="sec sec--${esc(g.id)}" id="${esc(g.id)}" aria-labelledby="${esc(g.id)}-title">
  ${sectionHead(g.id, g.title, g.line)}
  ${body}
</section>`);
    // The crew sits between the games and the older things.
    if (g.id === 'games') out.push(crewSection(crew, projects));
  }
  return out.join('\n');
}

export function renderFooter(site) {
  const links = site.links
    .map((l) => `<a ${ext(l.href).replace('rel="noopener"', 'rel="me noopener"')}>${esc(shortUrl(l.href))}${newTab}</a>`)
    .join(' and ');
  return `<footer class="foot">
  <p>Made by ${esc(site.handle)}. Find me at ${links}.</p>
  <p class="foot__small">Not a pharmacy. Not a brewery.</p>
</footer>`;
}
