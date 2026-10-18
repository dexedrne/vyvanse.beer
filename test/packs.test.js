import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import vm from 'node:vm';
import { site, groups, projects, crew, contact, duo } from '../src/projects.js';
import { renderShell } from '../src/render.js';
import { shellFile } from '../src/pwa/build.js';

const packs = crew.assets?.packs ?? [];
const render = () => renderShell({ site, groups, projects, crew, contact, duo });

test('six downloadable packs have unique ids, numeric file counts and valid credits and art', () => {
  assert.equal(packs.length, 6);
  const used = new Set([...crew.members.flatMap(m => [m.num, m.slug]), ...projects.flatMap(p => [p.cmd, p.slug])]);
  for (const p of packs) {
    assert.ok(!used.has(p.id), p.id);
    used.add(p.id);
    assert.equal(p.slug, `pack-${p.id}`);
    assert.ok(p.name.length <= 12);
    assert.match(p.download.href, /^https:\/\/github\.com\/dexedrne\/vyvanse\.beer\/releases\/download\/[^/]+\/[^/]+\.zip$/);
    assert.match(p.download.size, /^\d+ MB$/);
    assert.equal(typeof p.download.files, 'number');
    assert.ok(Number.isInteger(p.download.files) && p.download.files > 0);
    assert.ok(p.contents.filter(c => !c.more).length <= 4);
    for (const cmd of p.games) assert.ok(projects.some(g => g.cmd === cmd), cmd);
    for (const num of p.crew) assert.ok(crew.members.some(m => m.num === num), num);
    for (const src of [p.tile, p.cover.src, p.cover.phone, p.backdrop]) {
      assert.ok(existsSync(new URL(`../public${src}`, import.meta.url)), src);
    }
    assert.deepEqual([p.cover.width, p.cover.height], [960, 720]);
  }
  assert.equal(packs.find(p => p.id === 'radbro-sticker-pack').big, '22');
  assert.equal(packs.find(p => p.id === 'retardio-sticker-pack').big, '49');
  // owner 10/18: all the sticker packs sit together, the Retardio ones first, then the Radbro ones
  const ids = packs.map(p => p.id);
  assert.equal(ids.indexOf('radbro-sticker-pack'), ids.indexOf('retardio-sticker-pack') + 1);
  assert.deepEqual(packs.filter(p => p.lite).map(p => p.id), ['shitbox-garage-pack']);
  assert.equal(packs.at(-1).lite.size, '25 MB');
  assert.equal(packs.at(-1).download.size, '204 MB');
});

test('rendered packs follow the nine members with a third assets group and working plain downloads', () => {
  const html = render();
  const cards = [...html.matchAll(/<article class="item item--pack"[^]*?<\/article>/g)].map(m => m[0]);
  assert.equal(cards.length, 6);
  assert.equal([...html.matchAll(/<article class="item item--crew"/g)].length, 9);
  assert.ok(html.indexOf('id="retardio-268"') < html.indexOf('id="pack-saloon-card-pack"'));
  assert.match(html, /<p class="panel__line">Art from the games/);
  const row = html.match(/<div class="tgroups">[^]*?<\/section>/)?.[0];
  assert.equal([...row.matchAll(/class="tgroup(?: tgroup--packs)?"/g)].length, 3);
  assert.match(row, /retardios[^]*?tgroup--packs[^]*?tgroup__label">assets</);
  assert.deepEqual(cards.map(card => +card.match(/data-i="(\d+)"/)[1]), [9, 10, 11, 12, 13, 14]);
  assert.deepEqual([...row.matchAll(/<button class="tile tile--pack"[^]*?data-i="(\d+)"/g)].map(m => +m[1]), [9, 10, 11, 12, 13, 14]);
  for (const card of cards) {
    assert.match(card, /class="visual visual--crew visual--pack"/);
    assert.match(card, /<picture><source[^]*?<img class="bro"/);
    assert.match(card, /<a class="play play--sm" href="[^"]+\.zip" download data-act="download"/);
    assert.match(card, /data-more[^]*?<span>contents<\/span>/);
    assert.match(card, /Viral Public License/);
  }
  const garage = cards.at(-1);
  const act = garage.match(/<div class="act">([^]*?)<\/div>/)?.[1];
  assert.match(act, /class="status"[^]*?<p class="lite"><a href="[^"]+\/shitbox-garage-pack-lite\.zip" download>same art as webp, one \.zip \(25 MB\)<\/a><\/p>/);
  assert.equal([...act.matchAll(/data-act=/g)].length, 1);
  assert.doesNotMatch(act.match(/<p class="lite">[^]*?<\/p>/)[0], /data-act/);
});

test('pack hash ids and legacy pack slugs round trip through the menu save and load functions', () => {
  // Execute the actual menu functions without starting its browser-only stage or audio.
  const source = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  const idOf = source.slice(source.indexOf('const idOf ='), source.indexOf('// put the cursor'));
  const hashFns = source.slice(source.indexOf('function save()'), source.indexOf('// ---- hints'));
  const LISTS = { crew: [...crew.members, ...packs] };
  const S = { tab: 'crew', crew: 0 };
  const location = { hash: '' };
  const ctx = vm.createContext({ LISTS, S, location, crew, projects, player: {}, TABS: ['games', 'crew', 'sites', 'contact'],
    history: { replaceState: (_a, _b, hash) => { location.hash = hash; } },
    show: tab => { S.tab = tab; }, at() {}, locate() {}, openTipJar() {} });
  vm.runInContext(`${idOf}\n${hashFns}`, ctx);
  assert.equal(packs.length, 6);
  for (const [i, p] of packs.entries()) {
    S.crew = 9 + i;
    vm.runInContext('save()', ctx);
    assert.equal(location.hash, `#crew/${p.id}`);
    S.crew = 0;
    vm.runInContext('load()', ctx);
    assert.equal(S.crew, 9 + i);
    location.hash = `#${p.slug}`;
    S.crew = 0;
    vm.runInContext('load()', ctx);
    assert.equal(S.tab, 'crew');
    assert.equal(S.crew, 9 + i);
  }
  location.hash = '#crew/268';
  vm.runInContext('load()', ctx);
  assert.equal(S.crew, 8);
});

test('offline precache admits pack tiles and leaves both cover sizes on demand', () => {
  assert.equal(shellFile('img/packs/saloon-card-pack-tile.webp'), true);
  assert.equal(shellFile('img/packs/saloon-card-pack.webp'), false);
  assert.equal(shellFile('img/packs/saloon-card-pack-phone.webp'), false);
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
globalThis.Node = Element;
globalThis.matchMedia = () => ({ matches: false });
globalThis.document = { createElement: tag => new Element(tag), createTextNode: text => text };
const { createCommands } = await import('../src/os/commands.js');
const nodes = el => el instanceof Element ? [el, ...el.children.flatMap(nodes)] : [];

function terminal() {
  const output = [], revealed = [];
  const commands = createCommands({ site, groups, projects, crew, contact,
    term: { print: el => output.push(el) },
    shell: { reveal: slug => revealed.push(slug), go: tab => revealed.push(tab) }, close() {} });
  return { commands, output, revealed };
}

test('terminal lists assets under crew and provides pack info, links, aliases and completion', () => {
  const { commands, output, revealed } = terminal();
  commands.run('ls crew');
  let text = output.map(el => el.textContent).join(' ');
  assert.match(text, /crew\/[^]*assets\//);
  assert.match(text, /saloon-card-pack/);
  for (const cmd of ['assets', 'packs', 'ls assets']) {
    output.length = 0;
    commands.run(cmd);
    text = output.map(el => el.textContent).join(' ');
    assert.match(text, /177 MB[^]*299[^]*SALOON Card Pack|SALOON Card Pack[^]*177 MB[^]*299/);
    assert.match(text, /728 MB/);
    assert.match(text, /Viral Public License/);
  }
  output.length = 0;
  commands.run('info shitbox-garage-pack');
  text = output.map(el => el.textContent).join(' ');
  assert.match(text, /SHITBOX Garage Pack/);
  assert.match(text, /08-world-paintings\//);
  assert.match(text, /204 MB/);
  assert.match(text, /Viral Public License/);
  const links = output.flatMap(nodes).filter(el => el.tag === 'a');
  assert.ok(links.some(a => a.attributes.href?.endsWith('/shitbox-garage-pack.zip')));
  assert.deepEqual(revealed, ['pack-shitbox-garage-pack']);
  commands.run('cd assets');
  assert.equal(revealed.at(-1), 'pack-saloon-card-pack');
  assert.equal(commands.complete('info saloon-c').value, 'info saloon-card-pack ');
});

test('phone regrouping restores the nested pack contents control when returning to desktop', () => {
  class MovingElement extends Element {
    parentElement = null;
    append(...kids) {
      for (const kid of kids) {
        kid.parentElement?.children.splice(kid.parentElement.children.indexOf(kid), 1);
        kid.parentElement = this;
        this.children.push(kid);
      }
    }
    replaceChildren(...kids) {
      for (const child of this.children) child.parentElement = null;
      this.children = [];
      this.append(...kids);
    }
    insertBefore(node, next) {
      this.append(node);
      if (next) {
        this.children.pop();
        this.children.splice(this.children.indexOf(next), 0, node);
      }
    }
  }
  const info = new MovingElement(), act = new MovingElement(), contents = new MovingElement();
  const button = new MovingElement(), get = new MovingElement(), status = new MovingElement();
  contents.append(button);
  act.append(get, status);
  info.append(contents, act);
  const entry = { info, children: [...info.children], act, actions: [...act.children],
    more: { node: button, parent: contents, next: null } };
  act.append(button); // the phone puts it alongside Get
  const askButton = { removeAttribute() {} };
  const ctx = vm.createContext({ phone: { matches: false },
    phoneNodes: { items: [entry], contact: [], added: [], ask: {}, parent: { insertBefore() {} } },
    closeSheet() {}, $: () => askButton, $$: () => [], screen: { style: { removeProperty() {} } } });
  const source = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  const fn = source.slice(source.indexOf('function phoneMarkup()'), source.indexOf('const TABS ='));
  vm.runInContext(`${fn}\nphoneMarkup()`, ctx);
  assert.equal(button.parentElement, contents);
  assert.ok(contents.children.includes(button));
  assert.ok(!act.children.includes(button));
});

test('desktop pack wordmarks fit the visible name without shrinking for their hidden full title', () => {
  const visible = { nodeType: 3 };
  const wm = { lastChild: visible, clientWidth: 576, style: { fontSize: '' } };
  let selected;
  const range = {
    selectNode: node => { selected = node; },
    selectNodeContents: node => { selected = node; },
    getBoundingClientRect: () => ({ width: selected === visible ? 499 : 1400 }),
  };
  const ctx = vm.createContext({ $: () => wm, panelOf: () => ({}), S: { tab: 'crew' },
    phone: { matches: false }, Node: { TEXT_NODE: 3 }, document: { createRange: () => range },
    getComputedStyle: () => ({ fontSize: '116px' }) });
  const source = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  const fn = source.slice(source.indexOf('function fitWm()'), source.indexOf('function layout()'));
  vm.runInContext(`${fn}\nfitWm()`, ctx);
  assert.equal(wm.style.fontSize, '');
});
