// h('a', { href, class: 'x', onclick }, 'text', child) -> element
export function h(tag, props, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

// Icon from the sprite in index.html.
export function icon(id) {
  const ns = 'http://www.w3.org/2000/svg';
  const s = document.createElementNS(ns, 'svg');
  s.setAttribute('class', 'i');
  s.setAttribute('aria-hidden', 'true');
  const u = document.createElementNS(ns, 'use');
  u.setAttribute('href', `#i-${id}`);
  s.append(u);
  return s;
}

export const media = {
  wide: matchMedia('(min-width: 1100px)'),
  phone: matchMedia('(max-width: 759.98px)'),
  reduced: matchMedia('(prefers-reduced-motion: reduce)'),
};

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
