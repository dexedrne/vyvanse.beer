import test from 'node:test';
import assert from 'node:assert/strict';
import { projects, shelf, sections } from '../src/projects.js';

test('shelf keeps every section, thirteen cases and all seventeen game URLs', () => {
  const cases=shelf(projects);
  assert.equal(cases.length,13);
  assert.equal(cases.flat().length,17);
  assert.equal(new Set(cases.flat().map(p=>p.url)).size,17);
  // one row in order, no genre jumps (owner 11/2): SankoQuest Survivors (arcade) comes second, right
  // after SHITBOX; the rest still run in section order, and every section is still in use
  const rest=cases.filter(e=>e[0].cmd!=='sanko');
  assert.deepEqual([...new Set(rest.map(e=>e[0].section))],sections.map(s=>s.id));
  for(const e of cases)assert.ok(sections.some(s=>s.id===e[0].section),e[0].cmd);
  assert.deepEqual(cases.map(e=>e[0].cmd),['shitbox','sanko','radpayne','radops','radzombies','radbrawl','spidertag','radtap','saloon','radbonk','radquest','radcraft','brogate']);
  for(const cmd of ['radquest','radcraft','brogate']){
    const p=projects.find(p=>p.cmd===cmd);assert.ok(p.frame);assert.equal(p.section,'worlds');assert.equal(p.image.width,1600);assert.equal(p.image.height,900);assert.equal(p.image.lettered,1);
  }
});
test('shooter case resolves either edition without changing its URL',()=>{
  const eds=shelf(projects).find(e=>e[0].cmd==='radops');
  assert.deepEqual(eds.map(e=>e.edition.label),['Team deathmatch','Bomb defusal']);
  assert.equal(eds[1].of,'radops');assert.equal(eds[1].url,'https://rbgo.vyvanse.beer');
});
