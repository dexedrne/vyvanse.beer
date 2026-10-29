import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { crew, projects } from '../src/projects.js';

test('Chak canonical and legacy links select one card and save the new URL', () => {
  const source = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  const idOf = source.slice(source.indexOf('const idOf ='), source.indexOf('// put the cursor'));
  const hashFns = source.slice(source.indexOf('function save()'), source.indexOf('// ---- hints'));
  const LISTS = { crew: [...crew.members, ...crew.npcs, ...crew.assets.packs] };
  const S = { tab: 'crew', crew: 0 }, location = { hash: '' };
  const ctx = vm.createContext({ LISTS, S, location, projects, player: {}, TABS: ['games', 'crew', 'sites', 'contact'],
    history: { replaceState: (_a, _b, hash) => { location.hash = hash; } },
    show: tab => { S.tab = tab; }, at() {}, locate() {}, openTipJar() {} });
  vm.runInContext(`${idOf}\n${hashFns}`, ctx);
  const index = LISTS.crew.findIndex(m => m.num === 'chudjak');
  for (const hash of ['#crew/chak', '#crew/chudjak', '#chak', '#chudjak']) {
    S.crew = 0; location.hash = hash;
    vm.runInContext('load()', ctx);
    assert.equal(S.tab, 'crew', hash);
    assert.equal(S.crew, index, hash);
    vm.runInContext('save()', ctx);
    assert.equal(location.hash, '#crew/chak');
  }
  for (const member of [...crew.members, crew.npcs.find(m => m.num === 'ophelia')]) {
    S.crew = LISTS.crew.indexOf(member);
    vm.runInContext('save()', ctx);
    assert.equal(location.hash, `#crew/${member.num}`);
  }
});
