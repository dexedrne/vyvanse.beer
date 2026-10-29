import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { site, groups, projects, crew, contact, duo } from '../src/projects.js';
import { renderShell } from '../src/render.js';

test('Crew families and assets keep one unique first tile and accessible expansion controls', () => {
  const html = renderShell({ site, groups, projects, crew, contact, duo });
  const sections = [...html.matchAll(/<div class="tgroup(?: tgroup--packs)?" data-crew-group>([^]*?)<\/ul><\/div>/g)].map(m => m[1]);
  assert.equal(sections.length, 3);
  for (const [i, name] of ['radbros', 'retardios', 'assets'].entries()) {
    assert.match(sections[i], new RegExp(`data-crew-expand aria-expanded="false" aria-controls="crew-${name}"`));
    assert.match(sections[i], new RegExp(`id="crew-${name}"`));
    assert.equal([...sections[i].matchAll(/<button class="tile(?: tile--pack)?"/g)].length, [6, 3, 6][i]);
  }
  const tiles = [...html.matchAll(/<button class="tile(?: tile--pack)?"[^]*?data-i="(\d+)"[^]*?aria-controls="([^"]+)"/g)];
  const roster = [...crew.members, ...crew.npcs, ...crew.assets.packs];
  assert.deepEqual(tiles.map(m => +m[1]), roster.map((_, i) => i));
  assert.deepEqual(tiles.map(m => m[2]), roster.map(m => m.slug));
  const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
  assert.match(css, /\.js \[data-crew-group\]:not\(\.is-open\) > \.tiles > \.tslot:not\(:first-child\) \{ display: none; \}/);
});

test('navigation reveals later tiles in families and assets but leaves first tiles and NPCs compact', () => {
  const source = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  const groups = Array.from({ length: 3 }, () => ({ open: false, button: { setAttribute(_name, value) { this.expanded = value; } } }));
  for (const group of groups) group.classList = { toggle(_name, value) { group.open = value; } };
  const tiles = [];
  for (const group of groups) {
    group.first = { closest: () => group };
    tiles.push(group.first, { closest: () => group });
  }
  tiles.push({ closest: () => null });
  const ctx = vm.createContext({ controlsOf: () => tiles, $$: () => groups, panelOf: () => null,
    $: (selector, group) => selector === '[data-crew-expand]' ? group.button : group.first });
  vm.runInContext(source.slice(source.indexOf('function setCrewGroup('), source.indexOf("document.addEventListener('click'", source.indexOf('function setCrewGroup('))), ctx);
  for (const [index, expected] of [[0, [false, false, false]], [1, [true, false, false]], [3, [false, true, false]], [5, [false, false, true]], [6, [false, false, false]]]) {
    ctx.revealCrewGroup(index);
    assert.deepEqual(groups.map(g => g.open), expected);
    assert.deepEqual(groups.map(g => g.button.expanded), expected.map(String));
  }
});

test('Crew paint keeps the picked NPC visible when its canonical slug differs from its saved internal number', () => {
  const source = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  const chak = { dataset: { id: 'chudjak' }, on: false }, ophelia = { dataset: { id: 'ophelia' }, on: false };
  for (const card of [chak, ophelia]) card.classList = { toggle: (_name, value) => { card.on = value; }, remove() {} };
  const index = crew.members.length;
  const ctx = vm.createContext({ S: { crew: index }, LISTS: { crew: [...crew.members, ...crew.npcs] },
    idOf: () => 'chak', onItem: () => null, itemsOf: () => [chak, ophelia], $: () => null,
    rowMarks() {}, controlsOf: () => [], keepInView() {}, typeOut() {}, backdrop() {}, warm() {} });
  vm.runInContext(source.slice(source.indexOf('function paint('), source.indexOf('// a cartridge')), ctx);
  ctx.paint('crew');
  assert.equal(chak.on, true);
  assert.equal(ophelia.on, false);
});
