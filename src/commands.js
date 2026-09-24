// Terminal commands. Each entry: { usage, desc, run(args, ctx), args?() , hidden? }.
// `help` lists every entry that isn't hidden, in this order.

import { h } from './dom.js';
import { shortUrl } from './projects.js';

const norm = (s) => s.toLowerCase().replace(/^[#$]+/, '').trim();

function distance(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

function closest(word, options) {
  let best = null;
  let bestD = 3;
  for (const o of options) {
    const dd = distance(word, o);
    if (dd < bestD) [best, bestD] = [o, dd];
  }
  return best;
}

// Output building blocks.
const line = (...kids) => h('div', { class: 't-line' }, ...kids);
const muted = (...kids) => h('span', { class: 't-muted' }, ...kids);
const strong = (...kids) => h('span', { class: 't-strong' }, ...kids);
const err = (...kids) => h('div', { class: 't-line t-err' }, ...kids);
const run = (cmd, label = cmd) => h('button', { class: 't-cmd', type: 'button', 'data-cmd': cmd }, label);
const fill = (text, label) => h('button', { class: 't-cmd', type: 'button', 'data-fill': text }, label);
const link = (href, label = shortUrl(href), rel = 'noopener') =>
  h('a', { href, target: '_blank', rel }, label, h('span', { class: 'vh' }, ' (opens in a new tab)'));
const grid = (...cells) => h('div', { class: 't-grid' }, ...cells);

function openTab(url) {
  const w = window.open(url, '_blank');
  if (w) w.opener = null;
  return !!w;
}

export function createCommands({ site, groups, projects, crew, wm, term, page }) {
  const byName = new Map();
  for (const p of projects) for (const n of [p.cmd, ...(p.aliases || [])]) byName.set(n, p);
  const findProject = (args) => byName.get(norm(args.join('-')));
  const findBro = (args) => {
    const n = norm(args.join('')).replace(/^radbro-?/, '').replace(/^#/, '');
    return crew.members.find((b) => b.num === n);
  };
  const sections = [...groups.map((g) => g.id), 'crew'];
  const playIn = projects.find((p) => p.cmd === crew.playIn);

  function launch(p, ctx) {
    if (p.frame) {
      const how = wm.open(p, { focusFrame: ctx.source === 'page' });
      term.print(
        line(
          how === 'opened' ? 'opening ' : 'bringing ',
          strong(p.name),
          how === 'opened' ? ' in a window ' : ' to the front ',
          muted(`(${shortUrl(p.url)})`),
        ),
      );
      return;
    }
    const ok = ctx.alreadyOpened || openTab(p.url);
    if (ok) {
      term.print(line(strong(p.name), ` opened in a new tab. ${shortUrl(p.url)} doesn't allow embedding.`));
    } else {
      term.print(line('your browser blocked the new tab. open it here: ', link(p.url)));
    }
  }

  function describe(p) {
    const rows = p.links.flatMap((l) => [muted(l.label.toLowerCase()), link(l.href)]);
    term.print(
      h(
        'div',
        { class: 't-block' },
        line(strong(p.name)),
        line(muted(p.kind)),
        line(p.blurb),
        grid(...rows),
        p.credit ? line(muted(`${p.credit.before} `), link(p.credit.href, p.credit.label), muted(` ${p.credit.after}`)) : null,
        p.note ? line(muted(p.note)) : null,
        line(run(`open ${p.cmd}`), muted(p.frame ? '  opens in a window' : '  opens in a new tab')),
      ),
    );
    page.show(p.slug);
  }

  function describeBro(b) {
    term.print(
      h(
        'div',
        { class: 't-block t-bro-card' },
        h('img', { src: b.image.src, alt: b.image.alt, width: b.image.width, height: b.image.height }),
        h(
          'div',
          {},
          line(strong(b.name), b.featured ? muted('  the mascot') : null),
          line(muted(b.line)),
          playIn ? line(b.soon ? 'coming soon to ' : 'playable in ', run(`open ${playIn.cmd}`)) : null,
        ),
      ),
    );
    page.show(b.slug);
  }

  const table = {
    help: {
      desc: 'this list',
      run() {
        const rows = [];
        for (const [name, c] of Object.entries(table)) {
          if (c.hidden) continue;
          const usage = c.usage || name;
          rows.push(c.usage && c.usage.includes('<') ? fill(`${name} `, usage) : run(name, usage), muted(c.desc));
        }
        term.print(line(strong('commands')));
        term.print(grid(...rows));
        term.print(line(muted('tab completes, ↑ and ↓ walk history, / jumps here from anywhere.')));
      },
    },
    ls: {
      usage: 'ls [section]',
      desc: 'list games, crew or older',
      args: () => sections,
      run(args) {
        const want = args[0] ? norm(args[0]).replace(/\/$/, '') : null;
        if (want && !sections.includes(want) && want !== '~' && want !== '.') {
          term.print(err(`ls: no such section: ${args[0]}`));
          term.print(line(muted('sections: '), ...sections.flatMap((s, i) => [i ? ' ' : '', run(`ls ${s}`, s)])));
          return;
        }
        const show = (id) => !want || want === '~' || want === '.' || want === id;
        for (const g of groups) {
          if (!show(g.id)) continue;
          term.print(h('div', { class: 't-dir' }, `${g.id}/`));
          const rows = projects
            .filter((p) => p.group === g.id)
            .flatMap((p) => [
              run(`open ${p.cmd}`, p.cmd),
              h('span', { class: 't-ell' }, p.name, muted(`  ${p.kind}`)),
            ]);
          term.print(grid(...rows));
          // The crew is listed right after the games, same as on the page.
          if (g.id === 'games' && show('crew')) printCrewDir();
        }
        if (want === 'crew') printCrewDir();
        if (!want) term.print(line(muted('click a name to open it, or try '), 'info <name>'));
      },
    },
    open: {
      usage: 'open <name>',
      desc: 'open a project',
      args: () => projects.map((p) => p.cmd),
      run(args, ctx) {
        if (!args.length) {
          term.print(line('usage: open <name>. try ', run('ls'), ' to see names.'));
          return;
        }
        const p = findProject(args);
        if (p) return launch(p, ctx);
        const social = site.links.find((l) => l.cmd === norm(args[0]));
        if (social) return table[social.cmd].run([], ctx);
        if (findBro(args)) {
          term.print(line("radbros aren't websites, but they're playable in ", run('open rugrun'), '.'));
          return;
        }
        const guess = closest(norm(args.join('')), [...byName.keys()]);
        term.print(err(`open: no such project: ${args.join(' ')}`));
        term.print(line(guess ? ['did you mean ', run(`open ${byName.get(guess).cmd}`), '? '] : '', 'try ', run('ls'), '.'));
      },
    },
    info: {
      usage: 'info <name>',
      desc: 'details and links',
      args: () => [...projects.map((p) => p.cmd), ...crew.members.map((b) => b.num)],
      run(args) {
        if (!args.length) {
          term.print(line('usage: info <name>. names are in ', run('ls'), '.'));
          return;
        }
        const p = findProject(args);
        if (p) return describe(p);
        const b = findBro(args);
        if (b) return describeBro(b);
        term.print(err(`info: nothing called ${args.join(' ')}`));
      },
    },
    crew: {
      desc: 'meet the Radbros',
      run() {
        term.print(line(strong('the crew'), muted(`  ${crew.line}`)));
        term.print(
          h(
            'div',
            { class: 't-crew' },
            crew.members.map((b) =>
              h(
                'button',
                { class: 't-bro', type: 'button', 'data-cmd': `info ${b.num}`, 'aria-label': `${b.name}: ${b.line}` },
                h('img', { src: b.image.src, alt: '', width: b.image.width, height: b.image.height }),
                h('span', {}, `#${b.num}`),
              ),
            ),
          ),
        );
        if (playIn) term.print(line('play them: ', run(`open ${playIn.cmd}`)));
        page.show('crew');
      },
    },
    cd: {
      usage: 'cd <section>',
      desc: 'scroll the page to a section',
      args: () => sections,
      run(args) {
        const to = args[0] ? norm(args[0]).replace(/\/$/, '') : '~';
        if (to === '~' || to === '/' || to === '') return page.go(null);
        if (to === '..') return term.print(line(muted("you're already at the top. there's nothing above vyvanse.beer.")));
        if (!sections.includes(to)) return term.print(err(`cd: no such section: ${args[0]}`));
        page.go(to);
      },
    },
    whoami: {
      desc: 'who makes this',
      run() {
        term.print(line(strong(site.handle)));
        term.print(line('makes browser games, meme sites and small worlds.'));
        term.print(grid(...site.links.flatMap((l) => [muted(l.label.toLowerCase()), link(l.href, shortUrl(l.href), 'me noopener')])));
      },
    },
    links: {
      desc: 'GitHub and X',
      run() {
        term.print(grid(...site.links.flatMap((l) => [muted(l.label.toLowerCase()), link(l.href, shortUrl(l.href), 'me noopener')])));
      },
    },
    ...Object.fromEntries(
      site.links.map((l) => [
        l.cmd,
        {
          desc: `open ${l.label} in a new tab`,
          run() {
            if (openTab(l.href)) term.print(line(`opening ${shortUrl(l.href)} in a new tab`));
            else term.print(line('your browser blocked the new tab. here: ', link(l.href, shortUrl(l.href), 'me noopener')));
          },
        },
      ]),
    ),
    windows: {
      desc: 'list open windows',
      run() {
        const list = wm.list();
        if (!list.length) return term.print(line(muted('no windows open. try '), run('open rugrun')));
        term.print(
          grid(
            ...list.flatMap((w) => [
              run(`open ${w.cmd}`, w.cmd),
              muted(w.min ? 'minimised' : w.active ? 'in front' : 'open'),
            ]),
          ),
        );
      },
    },
    close: {
      usage: 'close <name|all>',
      desc: 'close windows',
      args: () => [...wm.list().map((w) => w.cmd), 'all'],
      run(args) {
        const want = args[0] ? norm(args[0]) : wm.active();
        if (!want) return term.print(line(muted('no window to close.')));
        if (want === 'all') {
          const n = wm.closeAll();
          return term.print(line(muted(n ? `closed ${n} window${n > 1 ? 's' : ''}` : 'no windows open.')));
        }
        const p = findProject([want]);
        if (p && wm.close(p.cmd)) return term.print(line(muted(`closed ${p.name}`)));
        term.print(err(`close: no open window called ${args[0] || want}`));
      },
    },
    history: {
      desc: 'what you typed',
      run() {
        const hs = term.history();
        if (!hs.length) return term.print(line(muted('nothing yet.')));
        term.print(grid(...hs.slice(-20).flatMap((c, i) => [muted(String(hs.length - Math.min(20, hs.length) + i + 1)), run(c)])));
      },
    },
    clear: {
      desc: 'clear the screen',
      run() {
        term.clear();
      },
    },

    // Small things that don't need to be in help.
    pwd: { hidden: true, run: () => term.print(line('/srv/vyvanse.beer')) },
    echo: { hidden: true, run: (args) => term.print(line(args.join(' '))) },
    exit: {
      hidden: true,
      run() {
        term.print(line(muted("there's no leaving. you can close the tab though.")));
        page.collapse();
      },
    },
    radbros: { hidden: true, run: (a, c) => table.crew.run(a, c) },
    ps: { hidden: true, run: (a, c) => table.windows.run(a, c) },
    man: { hidden: true, run: (a, c) => table.help.run(a, c) },

    // Easter eggs.
    beer: {
      hidden: true,
      run() {
        term.print(
          h(
            'pre',
            { class: 't-pint', 'aria-label': 'A pint of beer drawn in text' },
            '   .-~~~~~~~-.\n  (~ ~ ~ ~ ~ ~)\n   |  °   °  |__\n   |    °    |  \\\n   | °   °   |  |\n   |    °  ° |__/\n   |  °      |\n   \'---------\'',
          ),
        );
        term.print(line(muted("not a brewery. not a pharmacy. this one's a root beer.")));
      },
    },
    sudo: {
      hidden: true,
      run(args) {
        term.print(line(muted('[sudo] password for guest:')));
        term.print(err(`guest is not in the sudoers file. ${args.length ? `"${args.join(' ')}" was` : 'this incident will be'} reported.`));
      },
    },
    rug: {
      hidden: true,
      run() {
        term.rug();
        term.print(line('the rug has been pulled. your bag is somewhere on the rooftops.'));
        term.print(line('go get it: ', run('open rugrun')));
      },
    },
  };

  function printCrewDir() {
    term.print(h('div', { class: 't-dir' }, 'crew/'));
    term.print(
      line(...crew.members.flatMap((b, i) => [i ? '  ' : '', run(`info ${b.num}`, `#${b.num}`)])),
    );
  }

  const names = Object.keys(table);

  return {
    names,
    project: (cmd) => {
      const [verb, ...rest] = cmd.trim().split(/\s+/);
      return verb === 'open' ? findProject(rest) : null;
    },
    run(raw, ctx = {}) {
      const [first, ...args] = raw.trim().split(/\s+/);
      if (!first) return;
      const name = first.toLowerCase();
      const c = table[name];
      if (c) return c.run(args, ctx);
      // A bare project name opens it.
      const p = findProject([first, ...args]);
      if (p) return launch(p, ctx);
      const guess = closest(name, names.filter((n) => !table[n].hidden));
      term.print(err(`command not found: ${first}`));
      term.print(line(guess ? ['did you mean ', run(guess), '? '] : '', 'type ', run('help'), ' for commands.'));
    },
    // Tab completion: returns { value, options }.
    complete(value) {
      const parts = value.replace(/^\s+/, '').split(/\s+/);
      let pool;
      if (parts.length <= 1) pool = [...names.filter((n) => !table[n].hidden), ...projects.map((p) => p.cmd)];
      else pool = table[parts[0].toLowerCase()]?.args?.() || [];
      const word = parts[parts.length - 1].toLowerCase();
      const hits = [...new Set(pool)].filter((o) => o.startsWith(word)).sort();
      if (!hits.length) return { value, options: [] };
      let common = hits[0];
      for (const hit of hits) while (!hit.startsWith(common)) common = common.slice(0, -1);
      const head = parts.slice(0, -1).join(' ');
      const done = hits.length === 1 ? `${hits[0]} ` : common;
      return { value: (head ? `${head} ` : '') + done, options: hits.length > 1 && common === word ? hits : [] };
    },
  };
}

