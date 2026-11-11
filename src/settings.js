import { h } from './dom.js';
import { readQuality, setQuality } from './quality.js';

export function createSettings({ audio }) {
  const music = h('button', { type:'button' });
  const sounds = h('button', { type:'button' });
  const quality = h('select', { id:'quality', 'aria-label':'Picture quality' },
    ...[['auto','Auto'],['battery','Battery'],['detail','Detail']].map(([value,label]) => h('option', { value }, label)));
  quality.addEventListener('change', () => setQuality(quality.value));
  const el = h('dialog', { class:'settings', 'aria-labelledby':'settings-title' },
    h('h2', { id:'settings-title' }, 'settings'),
    h('p', {}, 'launcher sound & picture'), music, sounds,
    h('label', { for:'quality' }, 'picture'), quality,
    h('button', { type:'button', onclick:() => el.close() }, 'close'));
  // A click on the backdrop closes it, like the tip jar. This dialog has its own padding, and a click
  // there lands on the dialog element too, so the point decides: only outside the panel's box. The
  // press has to start out there as well, so a press on a button dragged off the panel keeps it open.
  const outside = (e) => {
    if (e.target !== el) return false;
    const r = el.getBoundingClientRect();
    return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
  };
  let pressedOutside = false;
  el.addEventListener('pointerdown', (e) => { pressedOutside = outside(e); });
  el.addEventListener('click', (e) => {
    const from = pressedOutside;
    pressedOutside = false;
    if (from && outside(e)) el.close();
  });
  document.body.append(el);
  function paint() {
    for (const [button, source, label] of [[music,'music','music'],[sounds,'sfx','menu sounds']]) {
      const on = document.getElementById(source).getAttribute('aria-pressed') === 'true';
      button.textContent = `${label} · ${on ? 'on' : 'off'}`;
      button.setAttribute('aria-pressed', String(on));
    }
  }
  music.addEventListener('click', () => { audio.toggleMusic(); paint(); });
  sounds.addEventListener('click', () => { audio.toggleSfx(); paint(); });
  return { open() { paint(); quality.value = readQuality(); el.showModal(); music.focus({preventScroll:true}); } };
}
