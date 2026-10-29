import test from 'node:test';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { site, groups, crew, projects, playsIn, duo, contact } from '../src/projects.js';
import { renderShell } from '../src/render.js';

test('the new pair have full Crew cards and their updated games list them', () => {
  for (const num of ['3704', '3710']) {
    const member = crew.members.find(m => m.num === num);
    assert.ok(member?.model && member?.face && member?.image && member?.download);
    const games = playsIn(projects, num).map(p => p.cmd);
    assert.ok(games.includes('saloon') && games.includes('radtap') && games.includes('radbrawl'));
  }
  assert.ok(!projects.find(p => p.cmd === 'saloon').cast.includes('2564'));
});

test('Games and Contact keep #4764 and #85 on the puddle; the new pair are on their own Crew cards', () => {
  assert.deepEqual(duo, ['4764', '85']);
});

test('the nine Crew members keep the existing eight SHITBOX drivers and all game casts exclude #268', () => {
  const nums = crew.members.map(m => m.num).sort();
  assert.deepEqual(nums, ['2564', '268', '3704', '3710', '4764', '555', '652', '723', '85']);
  assert.deepEqual([...projects.find(p => p.cmd === 'shitbox').cast].sort(), ['2564', '3704', '3710', '4764', '555', '652', '723', '85']);
  for (const p of projects.filter(p => p.group === 'games')) {
    assert.ok(p.cast?.length, p.cmd);
    assert.ok(!p.cast.includes('268'), p.cmd);
    for (const num of p.cast) assert.ok(nums.includes(num), `${p.cmd}: ${num}`);
  }
});

test('Crew links pick the Retardio editions and keep the ghost out of SALOON', () => {
  for (const num of ['555', '85']) {
    const games = playsIn(projects, num).map(p => p.cmd);
    assert.ok(games.includes('retardiopayne') && games.includes('zombietardio'));
    assert.ok(!games.includes('radpayne') && !games.includes('radzombies'));
  }
  const ghost = playsIn(projects, '2564').map(p => p.cmd);
  assert.ok(ghost.includes('shitbox') && ghost.includes('radtap'));
  assert.ok(!ghost.includes('saloon') && !ghost.includes('radfighter'));
});

test('#268 has a full Crew card beside #85 without advertising a game', () => {
  const member = crew.members[crew.members.findIndex(m => m.num === '85') + 1];
  assert.equal(member?.num, '268');
  assert.equal(member.name, 'Retardio Classic #268');
  assert.ok(member.model && member.face && member.image && member.download);
  assert.match(member.line, /#85.*cousin/);
  assert.match(member.line, /keeps.*FREE MITCH poster/);
  assert.deepEqual(playsIn(projects, '268'), []);
  const html = renderShell({ site, groups, projects, crew, contact, duo });
  const card = html.match(/<article class="item item--crew" id="retardio-268"[^]*?<\/article>/)?.[0];
  assert.ok(card?.includes('not in a game yet'));
  assert.ok(!card.includes('data-goto='));
  const tiles = [...html.matchAll(/<button class="tile"[^]*?aria-controls="([^"]+)"/g)].map(m => m[1]);
  assert.equal(tiles.length, 11);
  assert.deepEqual(tiles.slice(-4), ['retardio-85', 'retardio-268', 'chak', 'ophelia']);
});

test('Chak replaces the legacy NPC card with his model download and current game appearances', () => {
  const npc = crew.npcs.find(m => m.num === 'chudjak');
  assert.ok(npc?.model && npc?.face && npc?.image);
  assert.equal(npc.name, 'Chak');
  assert.equal(npc.slug, 'chak');
  assert.equal(npc.model, '/models/chak.glb');
  assert.match(npc.line, /NPC in RadQuest .* RADBONK, SHITBOX, RadZombies and ZombieTardio/);
  assert.match(npc.line, /playable as CHUD in World of Radcraft/);
  const html = renderShell({ site, groups, projects, crew, contact, duo });
  const card = html.match(/<article class="item item--crew" id="chak"[^]*?<\/article>/)?.[0];
  assert.ok(card?.includes('Chak'));
  assert.ok(!card.includes('Chudjak'));
  assert.ok(card?.includes('Non-playable NPC'));
  assert.ok(!card?.includes('#chudjak'));
  assert.ok(!card?.includes('Viral Public License'));
  assert.ok(card?.includes('Get the model'));
  assert.ok(card?.includes('/models/chak-rigged.glb'));
  assert.ok(card?.includes('rigged and animated'));
  assert.equal(npc.download.rigged, true);
  assert.ok(!card?.includes('Free to use'));
});

test('every Crew card offers the same nine-character zip, including the Retardios', () => {
  const html = renderShell({ site, groups, projects, crew, contact, duo });
  const cards = [...html.matchAll(/<article class="item item--crew"[^]*?<\/article>/g)].map(m => m[0]);
  assert.equal(cards.length, 11);
  assert.ok(crew.downloadAll.href.endsWith('/crew-3d-all-nine.zip'));
  assert.equal(crew.downloadAll.label, 'all nine, one .zip');
  assert.ok(!html.includes('original four'));
  for (const card of cards.slice(0, 9)) {
    assert.ok(card.includes(`href="${crew.downloadAll.href}" download`));
    assert.ok(card.includes(`class="more-link"`));
    assert.ok(card.includes(`${crew.downloadAll.label} (${crew.downloadAll.size})`));
  }
  for (const card of cards.slice(9)) assert.ok(!card.includes(crew.downloadAll.href));
});


test('Chudjak preview and public download include both hand joints and the movement clips', () => {
  for (const file of ['chudjak.glb', 'chudjak-rigged.glb']) {
    const bytes = readFileSync(new URL(`../public/models/${file}`, import.meta.url));
    assert.equal(bytes.readUInt32LE(0), 0x46546c67);
    const gltf = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
    const joints = new Set(gltf.skins.flatMap(s => s.joints.map(i => gltf.nodes[i].name)));
    for (const name of ['LeftArm', 'RightArm', 'LeftForeArm', 'RightForeArm', 'LeftHand', 'RightHand']) assert.ok(joints.has(name), `${file}: ${name}`);
    assert.ok(gltf.nodes.find(n => n.name === 'LeftShoulder').translation[0] > 0, `${file}: left shoulder convention`);
    assert.ok(gltf.nodes.find(n => n.name === 'RightShoulder').translation[0] < 0, `${file}: right shoulder convention`);
    const clips = new Set(gltf.animations.map(a => a.name));
    for (const name of ['Idle', 'walk', 'Casual_Walk', 'Run_02', 'Lean_Forward_Sprint', 'Big_Wave_Hello']) assert.ok(clips.has(name), `${file}: ${name}`);
  }
});
