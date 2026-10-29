import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { site, groups, projects, crew, contact, duo } from '../src/projects.js';
import { renderShell } from '../src/render.js';

test('Crew families are native compact controls with counts and unchanged tile indices', () => {
  const html = renderShell({ site, groups, projects, crew, contact, duo });
  const families = [...html.matchAll(/<details class="tgroup" data-crew-group name="crew-family">([^]*?)<\/details>/g)].map(m => m[1]);
  assert.equal(families.length, 2);
  for (const [i, name] of ['radbros', 'retardios'].entries()) {
    assert.match(families[i], new RegExp(`<summary[^>]*aria-controls="crew-${name}">${name} <span class="tgroup__count">${i ? 3 : 6}</span>`));
    assert.ok(families[i].includes(`id="crew-${name}"`));
  }
  const tiles = [...html.matchAll(/<button class="tile"[^]*?data-i="(\d+)"[^]*?aria-controls="([^"]+)"/g)];
  assert.deepEqual(tiles.map(m => +m[1]), [...crew.members, ...crew.npcs].map((_, i) => i));
  assert.deepEqual(tiles.map(m => m[2]), [...crew.members, ...crew.npcs].map(m => m.slug));
});

test('navigation opens only the picked family and keeps NPCs and packs compact', () => {
  const source = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  const radbros = { open: false }, retardios = { open: false };
  const familyOf = [radbros, retardios, null, null];
  const ctx = vm.createContext({ controlsOf: () => familyOf.map(group => ({ closest: () => group })),
    $$: () => [radbros, retardios], panelOf: () => null });
  vm.runInContext(source.slice(source.indexOf('function revealCrewGroup('), source.indexOf("document.addEventListener('keydown'", source.indexOf('function revealCrewGroup('))), ctx);
  for (const [index, expected] of [[0, [true, false]], [1, [false, true]], [2, [false, false]], [3, [false, false]]]) {
    ctx.revealCrewGroup(index);
    assert.deepEqual([radbros.open, retardios.open], expected);
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
