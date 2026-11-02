import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import vm from 'node:vm';
import { site, groups, projects, crew, contact, duo, shelf, playsIn } from '../src/projects.js';
import { renderShell } from '../src/render.js';
import { ACTIONS, plainAction, launchUrl } from '../src/ask/actions.js';
import { makePayload } from '../server/ask.js';

const sanko = projects.find(p => p.cmd === 'sanko');
const games = projects.filter(p => p.group === 'games');
const html = renderShell({ site, groups, projects, crew, contact, duo });
const card = html.match(/<article class="item item--game" id="sanko"[^]*?<\/article>/)?.[0];

// width and height from a WebP header (lossy VP8, lossless VP8L or extended VP8X)
function webpSize(buf) {
  assert.equal(buf.toString('ascii', 0, 4), 'RIFF');
  assert.equal(buf.toString('ascii', 8, 12), 'WEBP');
  const kind = buf.toString('ascii', 12, 16);
  if (kind === 'VP8 ') return [buf.readUInt16LE(26) & 0x3fff, buf.readUInt16LE(28) & 0x3fff];
  if (kind === 'VP8L') { const b = buf.readUInt32LE(21); return [(b & 0x3fff) + 1, ((b >> 14) & 0x3fff) + 1]; }
  if (kind === 'VP8X') return [buf.readUIntLE(24, 3) + 1, buf.readUIntLE(27, 3) + 1];
  throw Error(`unknown WebP chunk ${kind}`);
}

test('SankoQuest Survivors sits second, right after SHITBOX, which still opens the menu', () => {
  assert.ok(sanko);
  assert.equal(games[0].cmd, 'shitbox');
  assert.equal(games[1], sanko);
  assert.equal(shelf(projects)[1][0], sanko);
  assert.deepEqual(shelf(projects)[1], [sanko]); // a cartridge of its own, no editions
  assert.deepEqual(games.filter(p => p.featured).map(p => p.cmd), ['shitbox']);
  assert.ok(!sanko.featured && !sanko.of && !sanko.edition);
  assert.equal(sanko.name, 'SankoQuest Survivors');
  assert.equal(sanko.group, 'games');
  // a survivors-style game, filed like RADBONK
  assert.equal(sanko.section, projects.find(p => p.cmd === 'radbonk').section);
  // the menu still paints SHITBOX's art first
  assert.match(html, /<img class="bd on" data-bd="games:shitbox"/);
});

test('Play opens sankosurvivors.quest in its own tab, where the game keeps its saves', () => {
  assert.equal(sanko.url, 'https://sankosurvivors.quest');
  assert.deepEqual(sanko.links, [{ label: 'Play', href: sanko.url }]);
  assert.equal(sanko.frame, false);
  assert.match(sanko.tabNote, /saves/);
  assert.ok(card);
  assert.match(card, /<a class="play" href="https:\/\/sankosurvivors\.quest" target="_blank" rel="noopener" data-act="play" data-tab>/);
  assert.match(card, /<span class="play__tab">new tab /);
  assert.match(card, /SankoQuest Survivors \(opens in a new tab\)/);
  assert.match(card, /<span class="ok">\[ TAB \]<\/span>/);
  assert.ok(card.includes(`opens in a new tab: ${sanko.tabNote}`));
  assert.doesNotMatch(card, /can’t run inside this page/);
  assert.doesNotMatch(card, /data-newtab/); // that extra link is only for games that play in here
  // no crew preselection: the URL goes out as it is, with only the phone flag on phones
  assert.equal(launchUrl(sanko, '4764', { userAgent: 'Mozilla/5.0 (X11; Linux x86_64)' }), 'https://sankosurvivors.quest/');
  assert.equal(launchUrl(sanko, undefined, { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) Mobile' }), 'https://sankosurvivors.quest/?device=phone');
});

test('the copy calls it a fan game made with the SankoQuest team’s permission, never unofficial or official', () => {
  assert.match(sanko.blurb, /^A fan game made for the Sanko community, with the SankoQuest team’s permission\./);
  // Greentown's bosses are the Lesser Giant, Ogre Warlord, Pumpkin Reaper and Rime Colossus, then the Dragon
  assert.match(sanko.blurb, /four bosses lead up to the Dragon/);
  // the staff climbs through shards, the bow through woods, the two-handed and short swords stop at Adamantite: no "Runite" promise
  assert.match(sanko.blurb, /Eight weapons level up through SankoQuest’s tiers/);
  assert.doesNotMatch(sanko.blurb, /Runite|five bosses/);
  const words = [sanko.name, sanko.kind, sanko.kindPhone, sanko.boot, sanko.blurb, sanko.tabNote, sanko.image.alt].join(' ');
  assert.doesNotMatch(words, /official/i);
  assert.doesNotMatch(card, /official/i);
  assert.match(sanko.kind, /fan game/i);
  // it stars its own adventurers: none of the crew is in it
  assert.deepEqual(sanko.cast, []);
  for (const m of crew.members) assert.ok(!playsIn(projects, m.num).includes(sanko), m.num);
  assert.ok(!ACTIONS.some(a => a.id.startsWith('play:sanko:')));
});

test('its key art and textless cartridge label are on disk at the games’ sizes', () => {
  assert.deepEqual([sanko.image.width, sanko.image.height], [1600, 900]);
  assert.equal(sanko.image.src, '/img/art/sanko.webp');
  assert.equal(sanko.thumb, '/img/thumb/sanko.webp');
  assert.ok(!sanko.image.lettered && !sanko.image.position);
  assert.match(sanko.image.alt, /^SankoQuest Survivors: /);
  for (const [src, size] of [[sanko.image.src, [1600, 900]], [sanko.thumb, [420, 315]]]) {
    const file = new URL(`../public${src}`, import.meta.url);
    assert.ok(existsSync(file), src);
    assert.deepEqual(webpSize(readFileSync(file)), size, src);
  }
  assert.ok(card.includes('src="/img/art/sanko.webp" width="1600" height="900"'));
  assert.ok(html.includes('<img src="/img/thumb/sanko.webp" width="420" height="315"'));
});

test('its long name: two lines on the wordmark, SankoQuest on the cartridge, every other game as it was', () => {
  assert.equal(sanko.twoLines, true);
  assert.equal(sanko.cartName, 'SankoQuest');
  assert.ok(sanko.name.startsWith(`${sanko.cartName} `));
  assert.match(card, /<h3 class="wm wm--two" data-text="SankoQuest Survivors" id="sanko-name">SankoQuest Survivors<\/h3>/);
  // the wheel's cartridge, its reflection and the All games wall show the short name; the button reads the full one
  assert.equal(html.match(/<button class="cart" style="--shell:#2f251b" type="button" data-i="1" aria-controls="sanko" aria-label="SankoQuest Survivors">/g)?.length, 2);
  assert.equal(html.match(/<span class="cart__name">SankoQuest<\/span>/g)?.length, 4); // wheel + mirror, wall + mirror
  assert.doesNotMatch(html, /<span class="cart__name">SankoQuest Survivors<\/span>/);
  for (const p of games.filter(p => p !== sanko)) {
    assert.ok(!p.twoLines && !p.cartName, p.cmd);
    assert.match(html, new RegExp(`<h3 class="wm" data-text="${p.name}" id="${p.slug}-name">`), p.cmd);
  }
  for (const m of html.matchAll(/<button class="cart"[^>]*>/g)) assert.equal(/aria-label=/.test(m[0]), m[0].includes('aria-controls="sanko"'), m[0]);
  const css = readFileSync(new URL('../src/wheel.css', import.meta.url), 'utf8');
  assert.match(css, /\.js \.screen\[data-tab='games'\] \.wm--two \{ white-space: normal; text-wrap: balance; \}/);
  // a phone under 760px tall keeps it on one line (fitted smaller), so PLAY stays clear of the wheel
  assert.match(css, /\.js \.screen\[data-tab='games'\]\.short \.wm--two \{ white-space: nowrap; \}/);
});

test('every project name is its own: the terminal, deep links and Ask each find one project', () => {
  const names = projects.flatMap(p => [p.cmd, ...(p.aliases || [])]);
  assert.equal(new Set(names).size, names.length);
  assert.equal(new Set(projects.map(p => p.slug)).size, projects.length);
  for (const name of ['sanko', 'sankoquest', 'sankosurvivors', 'sankoquest-survivors', 'sanko-survivors'])
    assert.equal(plainAction(name), 'play:sanko', name);
  assert.equal(plainAction('play sankoquest'), 'play:sanko');
  assert.equal(plainAction('SankoQuest Survivors'), 'play:sanko');
  assert.equal(plainAction('survivors'), 'play:radbonk');
  const payload = makePayload('the sanko game').state.projects.find(p => p.cmd === 'sanko');
  assert.deepEqual(payload, { name: sanko.name, cmd: 'sanko', of: undefined, kind: sanko.kind, description: sanko.blurb, cast: [] });
});

test('deep links land on its cartridge without trying to frame it', () => {
  const source = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  const idOf = source.slice(source.indexOf('const idOf ='), source.indexOf('// put the cursor'));
  const hashFns = source.slice(source.indexOf('function save()'), source.indexOf('// ---- hints'));
  const located = [], opened = [];
  const S = { tab: 'games', games: 0 };
  const location = { hash: '' };
  const ctx = vm.createContext({ LISTS: { crew: [...crew.members] }, S, location, crew, projects, TABS: ['games', 'crew', 'sites', 'contact'],
    player: { open: p => opened.push(p.cmd) }, pwa: { canPlay: () => true },
    history: { replaceState: (_a, _b, hash) => { location.hash = hash; } },
    show: tab => { S.tab = tab; }, at() {}, locate: p => { located.push(p.cmd); return 'games'; }, openTipJar() {} });
  vm.runInContext(`${idOf}\n${hashFns}`, ctx);
  for (const hash of ['#sanko', '#games/sanko', '#games/sankoquest', '#play/sanko']) {
    location.hash = hash;
    vm.runInContext('load()', ctx);
    assert.equal(located.at(-1), 'sanko', hash);
    assert.equal(S.tab, 'games', hash);
  }
  assert.deepEqual(opened, []);
  location.hash = '#play/radbonk';
  vm.runInContext('load()', ctx);
  assert.deepEqual(opened, ['radbonk']);
});

// Only the terminal's DOM boundary is stubbed; command parsing and output stay real.
class Element {
  children = [];
  attributes = {};
  className = '';
  constructor(tag = '') { this.tag = tag; }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  append(...kids) { this.children.push(...kids); }
  addEventListener() {}
  get textContent() { return this.children.map(c => c instanceof Element ? c.textContent : c).join(''); }
}

test('the terminal describes it and opens it in a new tab, saying why', async () => {
  globalThis.Node = Element;
  globalThis.matchMedia = () => ({ matches: false });
  globalThis.document = { createElement: tag => new Element(tag), createTextNode: text => text };
  const opened = [];
  globalThis.window = { open: url => { opened.push(url); return {}; } };
  const { createCommands } = await import('../src/os/commands.js');
  const output = [], revealed = [], played = [];
  const commands = createCommands({ site, groups, projects, crew, contact,
    term: { print: el => output.push(el) },
    shell: { reveal: slug => revealed.push(slug), go() {}, play: p => played.push(p.cmd) }, close() {} });
  commands.run('info sankoquest survivors');
  let text = output.map(el => el.textContent).join(' ');
  assert.match(text, /SankoQuest Survivors/);
  assert.match(text, /A fan game made for the Sanko community/);
  assert.ok(text.includes(`opens in a new tab: ${sanko.tabNote}`));
  assert.deepEqual(revealed, ['sanko']);
  output.length = 0;
  commands.run('open sanko --here');
  text = output.map(el => el.textContent).join(' ');
  assert.deepEqual(opened, ['https://sankosurvivors.quest/']);
  assert.deepEqual(played, []);
  assert.ok(text.includes(`SankoQuest Survivors opened in a new tab: ${sanko.tabNote}.`));
  assert.doesNotMatch(text, /doesn't allow embedding/);
});
