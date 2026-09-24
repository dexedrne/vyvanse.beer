// `neofetch` for Radbro OS: #4764 in text on the left, "system" info on the right, the site
// palette underneath. Stacks art-over-info when the terminal is too narrow for both.

import { h } from './dom.js';

// Radbro #4764: shaggy hair, skull-lens shades, a smirk with a drip, the scribbled hoodie.
const ART = [
  '     _.,;;;;;;,._',
  '   ,;////||||\\\\\\\\;,',
  '  ///////    \\\\\\\\\\\\\\',
  '|/////// /||\\ \\\\\\\\\\\\\\|',
  '|/////  / || \\  \\\\\\\\\\|',
  "|///    '    '    \\\\\\|",
  '|=.=====.====.=====.=|',
  '| |(o.o)|    |(o.o)| |',
  '| | |=| |    | |=| | |',
  "| '-----'    '-----' |",
  ' \\        __        /',
  "  \\      '--'.     /",
  "   '._       :  _.'",
  "  .-'`-.______.-`'-.",
  ' / ~ #  \\    / ? @  \\',
  '/ ?? ~ | \\  / | ## ~ \\',
  '| @  ~ o  \\/  o #  ~ |',
].join('\n');

// The two rows of colour blocks, in the site's own tokens: the purples dark to light, then the
// accents and the brights.
const PALETTE = [
  ['--surface', '--surface-2', '--line', '--line-2', '--faint', '--amethyst', '--muted', '--lilac'],
  ['--rose', '--amber', '--amethyst', '--muted', '--lilac', '--lilac-hi', '--text', '--rose'],
];

function uptime() {
  const s = Math.floor(performance.now() / 1000);
  const hr = Math.floor(s / 3600);
  const min = Math.floor((s % 3600) / 60);
  const out = [];
  if (hr) out.push(`${hr} hour${hr > 1 ? 's' : ''}`);
  if (min) out.push(`${min} min${min > 1 ? 's' : ''}`);
  if (!out.length) out.push(`${s} sec${s === 1 ? '' : 's'}`);
  return out.join(', ');
}

export function neofetch({ site, projects, crew }) {
  const host = site.name.split('.')[0];
  const rows = [
    ['OS', 'Radbro OS 4764 (Midnight Ube) x86_64'],
    ['Host', site.name],
    ['Kernel', '6.9.420-rugged'],
    ['Uptime', uptime()],
    ['Packages', `${projects.length} projects (rugpm), ${crew.members.length} radbros`],
    ['Shell', 'rugsh 0.0.113'],
    ['Resolution', `${innerWidth}x${innerHeight}`],
    ['DE', 'landing + terminal'],
    ['WM', 'yoinkwm'],
    ['Theme', 'midnight-ube [dark]'],
    ['Terminal', 'radbro-term'],
    ['CPU', 'Radbro #4764 (8) @ 4.764GHz'],
    ['GPU', 'react-three-game WebGPU (WebGL2 fallback)'],
    ['Memory', '420MiB / 690MiB'],
  ];
  const title = `${site.handle}@${host}`;

  return h(
    'div',
    { class: 't-fetch' },
    h('pre', { class: 't-fetch__art', role: 'img', 'aria-label': 'Radbro #4764 drawn in text: shaggy hair, skull-lens shades and a hoodie' }, ART),
    h(
      'div',
      { class: 't-fetch__info' },
      h('div', { class: 't-fetch__row' }, h('span', { class: 't-fetch__k' }, site.handle), h('span', { class: 't-muted' }, '@'), h('span', { class: 't-fetch__k' }, host)),
      h('div', { class: 't-fetch__row t-muted', 'aria-hidden': 'true' }, '-'.repeat(title.length)),
      rows.map(([k, v]) => h('div', { class: 't-fetch__row' }, h('span', { class: 't-fetch__k' }, k), ': ', v)),
      h(
        'div',
        { class: 't-fetch__swatches', 'aria-hidden': 'true' },
        PALETTE.map((row) => h('div', {}, row.map((c) => h('span', { style: `background: var(${c})` })))),
      ),
    ),
  );
}
