import test from 'node:test';
import { readFileSync, existsSync } from 'node:fs';
import assert from 'node:assert/strict';
import * as THREE from 'three';
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

test('the ten Crew members: SHITBOX has the eight earlier drivers plus #2214, and all game casts exclude #268', () => {
  const nums = crew.members.map(m => m.num).sort();
  assert.deepEqual(nums, ['2214', '2564', '268', '3704', '3710', '4764', '555', '652', '723', '85']);
  assert.deepEqual([...projects.find(p => p.cmd === 'shitbox').cast].sort(), ['2214', '2564', '3704', '3710', '4764', '555', '652', '723', '85']);
  for (const p of projects.filter(p => p.group === 'games')) {
    assert.ok(Array.isArray(p.cast), p.cmd);
    // every crew game has a cast; only the Sanko fan game, played as its own adventurers, has none
    if (p.cmd !== 'sanko') assert.ok(p.cast.length, p.cmd);
    assert.ok(!p.cast.includes('268'), p.cmd);
    for (const num of p.cast) assert.ok(nums.includes(num), `${p.cmd}: ${num}`);
  }
  assert.deepEqual(projects.find(p => p.cmd === 'sanko').cast, []);
  for (const m of crew.members) assert.ok(!playsIn(projects, m.num).some(p => p.cmd === 'sanko'), m.num);
});

test('BROGATE lists the party the game has', () => {
  assert.deepEqual(projects.find(p => p.cmd === 'brogate').cast, ['85', '2214', '4764', '652', '723']);
  const games = num => playsIn(projects, num).map(p => p.cmd);
  for (const num of ['85', '2214', '4764', '652', '723']) assert.ok(games(num).includes('brogate'), num);
  for (const num of ['3704', '3710', '2564']) assert.ok(!games(num).includes('brogate'), num);
});

test('Crew links pick the Retardio editions and keep the ghost out of SALOON', () => {
  for (const num of ['555', '85', '2214']) {
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
  assert.equal(tiles.length, 12);
  assert.deepEqual(tiles.slice(-5), ['retardio-268', 'retardio-2214', 'retardio-555', 'chak', 'ophelia']);
});

test('#2214 has a full Crew card between #268 and #555, keeping the owner\'s Retardio order 85, 268, 2214, 555', () => {
  assert.deepEqual(crew.members.filter(m => m.kind.startsWith('Retardio')).map(m => m.num), ['85', '268', '2214', '555']);
  const member = crew.members.find(m => m.num === '2214');
  assert.equal(member.name, 'Retardio Cousin Classic #2214');
  assert.equal(member.slug, 'retardio-2214');
  assert.equal(member.kind, 'Retardio Cousin Classic');
  assert.equal(member.repo, false);
  assert.equal(member.model, '/models/retardio2214-hero.glb');
  assert.ok(member.download.href.endsWith('/radbros-3d/retardio2214-3d-model.zip'));
  assert.match(member.line, /red hair/);
  assert.match(member.line, /TUNA/);
  assert.match(member.image.alt, /TUNA/);
  for (const text of [member.line, member.image.alt]) assert.doesNotMatch(text, /\b(she|her|girl)\b/i);
  assert.deepEqual([member.image.width, member.image.height], [306, 500]);
  const html = renderShell({ site, groups, projects, crew, contact, duo });
  const card = html.match(/<article class="item item--crew" id="retardio-2214"[^]*?<\/article>/)?.[0];
  assert.ok(card?.includes('My own Retardio'));
  assert.ok(card.includes('retardio2214-3d-model.zip'));
  assert.ok(card.includes('/img/retardios/retardio-2214.webp'));
  // one edition per game: the Retardios editions, RadOps for RadOps/RBGO, RAD FIGHTER for RADBRAWL/RAD FIGHTER
  assert.deepEqual(playsIn(projects, '2214').map(p => p.cmd),
    ['shitbox', 'saloon', 'retardiopayne', 'radops', 'zombietardio', 'radfighter', 'spidertag', 'radtap', 'radbonk', 'brogate']);
  assert.deepEqual(projects.filter(p => p.cast?.includes('2214')).map(p => p.cmd),
    ['shitbox', 'saloon', 'retardiopayne', 'radops', 'rbgo', 'radzombies', 'zombietardio', 'radbrawl', 'radfighter', 'spidertag', 'radtap', 'radbonk', 'brogate']);
  assert.ok(!card.includes('not in a game yet'));
  for (const cmd of ['shitbox', 'retardiopayne', 'zombietardio', 'radfighter', 'radbonk']) assert.ok(card.includes(`data-goto="${cmd}"`), cmd);
});

test('every Crew member\'s face, card render and hero model are on disk, and each hero has the clips the stage plays', () => {
  for (const m of crew.members) {
    for (const asset of [m.face, m.model, m.image.src]) assert.ok(existsSync(new URL(`../public${asset}`, import.meta.url)), `${m.num}: ${asset}`);
    const bytes = readFileSync(new URL(`../public${m.model}`, import.meta.url));
    assert.equal(bytes.readUInt32LE(0), 0x46546c67, m.model);
    const gltf = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
    const clips = gltf.animations.map(a => a.name);
    assert.ok(clips.includes('Idle') && clips.includes('Big_Wave_Hello'), `${m.num}: ${clips}`);
    assert.equal(gltf.skins[0].joints.length, 24, m.num);
    assert.ok(gltf.materials.every(mat => mat.extensions?.KHR_materials_unlit), `${m.num}: unlit`);
  }
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

test('every Crew card offers the same ten-character zip, including the Retardios', () => {
  const html = renderShell({ site, groups, projects, crew, contact, duo });
  const cards = [...html.matchAll(/<article class="item item--crew"[^]*?<\/article>/g)].map(m => m[0]);
  assert.equal(cards.length, 12);
  assert.ok(crew.downloadAll.href.endsWith('/crew-3d-all-ten.zip'));
  assert.equal(crew.downloadAll.label, 'all ten, one .zip');
  assert.ok(!html.includes('original four'));
  for (const card of cards.slice(0, 10)) {
    assert.ok(card.includes(`href="${crew.downloadAll.href}" download`));
    assert.ok(card.includes(`class="more-link"`));
    assert.ok(card.includes(`${crew.downloadAll.label} (${crew.downloadAll.size})`));
  }
  for (const card of cards.slice(10)) assert.ok(!card.includes(crew.downloadAll.href));
});


test('Chak preview and public download include both hand joints and the movement clips', () => {
  for (const file of ['chak.glb', 'chak-rigged.glb']) {
    const bytes = readFileSync(new URL(`../public/models/${file}`, import.meta.url));
    assert.equal(bytes.readUInt32LE(0), 0x46546c67);
    const gltf = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
    const joints = new Set(gltf.skins.flatMap(s => s.joints.map(i => gltf.nodes[i].name)));
    for (const name of ['LeftArm', 'RightArm', 'LeftForeArm', 'RightForeArm', 'LeftHand', 'RightHand']) assert.ok(joints.has(name), `${file}: ${name}`);
    const parents = new Map();
    gltf.nodes.forEach((n, i) => (n.children ?? []).forEach(child => parents.set(child, i)));
    const world = i => {
      const n = gltf.nodes[i], matrix = n.matrix ? new THREE.Matrix4().fromArray(n.matrix) : new THREE.Matrix4().compose(new THREE.Vector3(...(n.translation ?? [0,0,0])), new THREE.Quaternion(...(n.rotation ?? [0,0,0,1])), new THREE.Vector3(...(n.scale ?? [1,1,1])));
      return parents.has(i) ? matrix.premultiply(world(parents.get(i))) : matrix;
    };
    for (const [name, sign] of [['LeftShoulder', 1], ['RightShoulder', -1]]) assert.ok(new THREE.Vector3().setFromMatrixPosition(world(gltf.nodes.findIndex(n => n.name === name))).x * sign > 0, `${file}: ${name} convention`);
    const clips = new Set(gltf.animations.map(a => a.name));
    for (const name of ['Idle', 'walk', 'Casual_Walk', 'Run_02', 'Lean_Forward_Sprint', 'Big_Wave_Hello']) assert.ok(clips.has(name), `${file}: ${name}`);
  }
});
