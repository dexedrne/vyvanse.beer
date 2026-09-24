// Renders the tap list and the bubbles into index.html at build time,
// so the shipped page is plain HTML with no client-side JS.

const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );

function capsule(p) {
  const halves = p.links
    .map((l) => `<a class="capsule__half" href="${esc(l.href)}">${esc(l.label)}</a>`)
    .join('');
  return `<div class="capsule" role="group" aria-label="${esc(p.name)} links">${halves}</div>`;
}

function project(p) {
  const classes = ['tap', p.featured && 'tap--featured', p.image && 'tap--has-label']
    .filter(Boolean)
    .join(' ');

  const label = p.image
    ? `<figure class="tap__label"><img src="${esc(p.image.src)}" width="${p.image.width}" height="${p.image.height}" alt="${esc(p.image.alt)}" loading="${p.featured ? 'eager' : 'lazy'}" decoding="async"></figure>`
    : '';

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

export function renderProjects(list) {
  return list.map(project).join('\n');
}

// Deterministic "random" bubbles so every build is identical.
function mulberry32(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function renderBubbles(count = 18, seed = 7) {
  const rand = mulberry32(seed);
  const out = [];
  for (let i = 0; i < count; i++) {
    const x = (2 + rand() * 96).toFixed(1);
    const s = (4 + rand() * 10).toFixed(1);
    const d = (10 + rand() * 14).toFixed(1);
    const delay = (-rand() * d).toFixed(1);
    out.push(
      `<span class="bubble" style="--x:${x}%;--s:${s}px;--d:${d}s;--delay:${delay}s"></span>`,
    );
  }
  return out.join('');
}
