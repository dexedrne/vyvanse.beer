import test from 'node:test';
import assert from 'node:assert/strict';
import { site, groups, crew, projects, playsIn, duo, contact } from '../src/projects.js';
import { renderShell } from '../src/render.js';

test('the new pair have full Crew cards and their updated games list them', () => {
  for (const num of ['3704', '3710']) {
    const member = crew.members.find(m => m.num === num);
    assert.ok(member?.model && member?.face && member?.image && member?.download);
    const games = playsIn(projects, num).map(p => p.cmd);
    assert.ok(games.includes('pokerbros') && games.includes('radtap') && games.includes('radbrawl'));
  }
  assert.ok(!projects.find(p => p.cmd === 'pokerbros').cast.includes('2564'));
});

test('Games and Contact keep #4764 and #85 on the puddle; the new pair are on their own Crew cards', () => {
  assert.deepEqual(duo, ['4764', '85']);
});

test('the eight current crew can drive SHITBOX; every cast uses current crew IDs', () => {
  const nums = crew.members.map(m => m.num).sort();
  assert.deepEqual(nums, ['2564', '3704', '3710', '4764', '555', '652', '723', '85']);
  assert.deepEqual([...projects.find(p => p.cmd === 'shitbox').cast].sort(), nums);
  for (const p of projects.filter(p => p.group === 'games')) {
    assert.ok(p.cast?.length, p.cmd);
    for (const num of p.cast) assert.ok(nums.includes(num), `${p.cmd}: ${num}`);
  }
});

test('Crew links pick the Retardio editions and keep the ghost out of PokerBros', () => {
  for (const num of ['555', '85']) {
    const games = playsIn(projects, num).map(p => p.cmd);
    assert.ok(games.includes('retardiopayne') && games.includes('zombietardio'));
    assert.ok(!games.includes('radpayne') && !games.includes('radzombies'));
  }
  const ghost = playsIn(projects, '2564').map(p => p.cmd);
  assert.ok(ghost.includes('shitbox') && ghost.includes('radtap'));
  assert.ok(!ghost.includes('pokerbros') && !ghost.includes('radfighter'));
});

test('every Crew card offers the same eight-character zip, including the Retardios', () => {
  const html = renderShell({ site, groups, projects, crew, contact, duo });
  const cards = [...html.matchAll(/<article class="item item--crew"[^]*?<\/article>/g)].map(m => m[0]);
  assert.equal(cards.length, 8);
  assert.ok(crew.downloadAll.href.endsWith('/crew-3d-all-eight.zip'));
  assert.equal(crew.downloadAll.label, 'all eight, one .zip');
  assert.ok(!html.includes('original four'));
  for (const card of cards) {
    assert.ok(card.includes(`href="${crew.downloadAll.href}" download`));
    assert.ok(card.includes(`class="more-link"`));
    assert.ok(card.includes(`${crew.downloadAll.label} (${crew.downloadAll.size})`));
  }
});
