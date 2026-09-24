// Renders the menu, the sections and the bubbles into index.html at build time,
// so the shipped page is plain HTML with no client-side JS.

const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );

// Shown under each bottle: the site's host without "www.", allowed to wrap after a dot.
const host = (href) => new URL(href).host.replace(/^www\./, '');

function capsule(p) {
  const halves = p.links
    .map(
      (l) =>
        `<a class="capsule__half" href="${esc(l.href)}" rel="noopener">${esc(l.label)}</a>`,
    )
    .join('');
  return `<div class="capsule" role="group" aria-label="${esc(p.name)} links">${halves}</div>`;
}

function img(image, eager) {
  return `<img src="${esc(image.src)}" width="${image.width}" height="${image.height}" alt="${esc(image.alt)}" loading="${eager ? 'eager' : 'lazy'}" decoding="async">`;
}

function tap(p, i) {
  const classes = ['tap', p.featured && 'tap--featured', p.image && 'tap--has-label']
    .filter(Boolean)
    .join(' ');

  // Only the first card of the page is above the fold.
  const label = p.image ? `<figure class="tap__label">${img(p.image, i === 0)}</figure>` : '';

  const notes = (p.notes || []).map((n) => `<p class="tap__note">${n}</p>`).join('');

  return `<article class="${classes}" id="${esc(p.slug)}">
  ${label}
  <div class="tap__head">
    <h3 class="tap__name">${esc(p.name)}</h3>
    <p class="tap__style">${esc(p.style)}</p>
  </div>
  <div class="tap__body">
    <p class="tap__blurb">${esc(p.blurb)}</p>
    ${capsule(p)}
    ${notes}
  </div>
</article>`;
}

function bottle(p) {
  return `<li class="bottle" id="${esc(p.slug)}">
  <a class="bottle__link" href="${esc(p.href)}" rel="noopener">
    ${img(p.image, false)}
    <h3 class="bottle__name">${esc(p.name)}</h3>
    <p class="bottle__line">${esc(p.line)}</p>
    <span class="bottle__host">${esc(host(p.href)).replaceAll('.', '.<wbr>')}&nbsp;<span aria-hidden="true">↗</span></span>
  </a>
</li>`;
}

function bro(b) {
  return `<li class="bro" id="${esc(b.slug)}">
  <figure class="bro__card">
    ${img(b.image, false)}
    <figcaption>
      <span class="bro__name">${esc(b.name)}</span>
      <span class="bro__line">${esc(b.line)}</span>
    </figcaption>
  </figure>
</li>`;
}

function crew(s) {
  const cta = s.cta
    ? `<p class="crew__cta"><span class="capsule"><a class="capsule__half" href="${esc(s.cta.href)}" rel="noopener">${esc(s.cta.label)}</a></span></p>`
    : '';
  return `<ul class="crew" role="list">\n${s.items.map(bro).join('\n')}\n</ul>\n  ${cta}`;
}

function section(s, first) {
  const body =
    s.kind === 'bottles'
      ? `<ul class="shelf" role="list">\n${s.items.map(bottle).join('\n')}\n</ul>`
      : s.kind === 'crew'
        ? crew(s)
        : s.items.map((p, i) => tap(p, first ? i : -1)).join('\n');

  return `<section class="wrap menu-section menu-section--${esc(s.kind)}" id="${esc(s.id)}" aria-labelledby="${esc(s.id)}-title">
  <header class="menu-section__head">
    <h2 class="menu-section__title" id="${esc(s.id)}-title">${esc(s.title)}</h2>
    <p class="menu-section__kicker">${esc(s.kicker)}</p>
  </header>
  ${body}
</section>`;
}

export function renderSections(list) {
  return list.map((s, i) => section(s, i === 0)).join('\n');
}

// Jump links in the foam head, one per section.
export function renderMenu(list) {
  return list
    .map(
      (s) =>
        `<a href="#${esc(s.id)}">${esc(s.title)} <span class="jump__count">${s.items.length}</span></a>`,
    )
    .join('');
}

// Deterministic "random" bubbles so every build is identical. Each bubble rides a track as
// tall as the whole beer, so a longer page wants more bubbles and slower rides.
function mulberry32(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function renderBubbles(count = 40, seed = 7) {
  const rand = mulberry32(seed);
  const out = [];
  for (let i = 0; i < count; i++) {
    const x = (2 + rand() * 96).toFixed(1);
    const s = (4 + rand() * 10).toFixed(1);
    const d = (30 + rand() * 30).toFixed(1);
    const delay = (-rand() * d).toFixed(1);
    out.push(
      `<span class="bubble" style="--x:${x}%;--s:${s}px;--d:${d}s;--delay:${delay}s"></span>`,
    );
  }
  return out.join('');
}
