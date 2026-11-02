import test from 'node:test';
import assert from 'node:assert/strict';
import { projects, shelf, sections } from '../src/projects.js';
import { nearestNeighbour, placeK, Spring, InsertState } from '../src/motion.js';
import { cartBody } from '../src/render.js';

test('wheel keeps every section, thirteen cases and all seventeen game URLs', () => {
  const cases=shelf(projects);
  assert.equal(cases.length,13);
  assert.equal(cases.flat().length,17);
  assert.equal(new Set(cases.flat().map(p=>p.url)).size,17);
  // the row has no genre tags or jumps any more (owner 11/2), so a game may sit outside its
  // section's run: SankoQuest Survivors (arcade) comes second, right after SHITBOX. The rest
  // still run in section order, and every section is still in use.
  const rest=cases.filter(e=>e[0].cmd!=='sanko');
  assert.deepEqual([...new Set(rest.map(e=>e[0].section))],sections.map(s=>s.id));
  for(const e of cases)assert.ok(sections.some(s=>s.id===e[0].section),e[0].cmd);
  assert.deepEqual(cases.map(e=>e[0].cmd),['shitbox','sanko','radpayne','radops','radzombies','radbrawl','spidertag','radtap','saloon','radbonk','radquest','radcraft','brogate']);
  for(const cmd of ['radquest','radcraft','brogate']){
    const p=projects.find(p=>p.cmd===cmd);assert.ok(p.frame);assert.equal(p.section,'worlds');assert.equal(p.image.width,1600);assert.equal(p.image.height,900);assert.equal(p.image.lettered,1);
  }
});
test('shooter case resolves either edition without changing its URL or front label',()=>{
  const eds=shelf(projects).find(e=>e[0].cmd==='radops');
  assert.deepEqual(eds.map(e=>e.edition.label),['Team deathmatch','Bomb defusal']);
  assert.equal(eds[1].of,'radops');assert.equal(eds[1].url,'https://rbgo.vyvanse.beer');
  const {body,mirror}=cartBody(eds[1],2,eds);
  assert.match(body,/2 of 2: Bomb defusal/);assert.match(body,/cart--back/);assert.doesNotMatch(body,/slot__mirror/);assert.match(mirror,/slot__mirror/);
});
test('nearest library neighbour follows direction and favours aligned rows across groups',()=>{
  const f={bx:100,by:100}, right={bx:200,by:100}, diagonal={bx:125,by:180}, below={bx:100,by:220}, left={bx:0,by:100};
  const items=[f,right,diagonal,below,left];
  assert.equal(nearestNeighbour(items,f,'right',100),right);
  assert.equal(nearestNeighbour(items,f,'down',100),diagonal);
  assert.equal(nearestNeighbour(items,right,'left',100),f);
  assert.equal(nearestNeighbour(items,left,'left',100),null);
  assert.equal(nearestNeighbour(items,f,'up',100),null);
  assert.equal(nearestNeighbour(items,null,'right',100),null);
});
test('wheel turns enter beyond reach and settle to the approved targets',()=>{
  assert.equal(placeK(1,176,4).x,169.84);assert.equal(placeK(3,176,4).o,.7);assert.ok(placeK(5,176,4).hidden);
  const s=new Spring(0,17,.62);s.set(169.84);let max=0;for(let i=0;i<180;i++){s.step(1/120);max=Math.max(max,s.x);}assert.ok(max>169.84);assert.ok(Math.abs(s.x-169.84)<.01);
});
test('insert accepts one press/release, cancel, ordered beats and return',()=>{
  const s=new InsertState();assert.equal(s.advance('lifting'),false);assert.equal(s.release(),false);assert.ok(s.press());assert.equal(s.press(),false);assert.ok(s.cancel());assert.equal(s.state,'idle');
  s.press();assert.ok(s.release());assert.equal(s.press(),false);assert.equal(s.release(),false);assert.equal(s.advance('playing'),false);
  for(const state of ['dropping','seated','playing'])assert.ok(s.advance(state));s.eject();assert.equal(s.state,'idle');assert.ok(s.press());
});
