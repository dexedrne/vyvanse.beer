import { h } from './dom.js';

export function createSettings({ audio }) {
  const music = h('button', { type:'button' });
  const sounds = h('button', { type:'button' });
  const el = h('dialog', { class:'settings', 'aria-labelledby':'settings-title' },
    h('h2', { id:'settings-title' }, 'settings'),
    h('p', {}, 'launcher sound & picture'), music, sounds,
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
  return { open() { paint(); el.showModal(); music.focus({preventScroll:true}); } };
}
