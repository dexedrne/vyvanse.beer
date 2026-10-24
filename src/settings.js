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
