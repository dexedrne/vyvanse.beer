import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import * as THREE from 'three';
import { crew, site, groups, projects, contact, duo } from '../src/projects.js';
import { renderShell } from '../src/render.js';
import { prepareCastMaterials } from '../src/duo.js';

test('Ophelia joins other characters with a preview, without changing the playable roster or offering downloads', () => {
  const npc = crew.npcs.find(m => m.num === 'ophelia');
  assert.ok(npc?.npcOnly);
  assert.ok(!npc.download);
  assert.equal(crew.members.length, 9);
  for (const asset of [npc.model, npc.face, npc.image.src]) assert.ok(existsSync(new URL(`../public${asset}`, import.meta.url)), asset);
  const card = renderShell({ site, groups, projects, crew, contact, duo }).match(/<article class="item item--crew" id="ophelia"[^]*?<\/article>/)?.[0];
  assert.ok(card?.includes('Say hello'));
  assert.ok(card.includes('Non-playable NPC'));
  assert.ok(!card.includes('download') && !card.includes('Free to use'));
});

test('Ophelia preview carries the original skeleton and texture assets with the two stage clips', () => {
  const bytes = readFileSync(new URL('../public/models/ophelia.glb', import.meta.url));
  assert.equal(bytes.readUInt32LE(0), 0x46546c67);
  const gltf = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
  assert.deepEqual(gltf.animations.map(a => a.name), ['Idle', 'Big_Wave_Hello']);
  assert.equal(gltf.skins[0].joints.length, 24);
  assert.equal(gltf.images.length, 3);
  for (const clip of gltf.animations) {
    assert.equal(clip.channels.length, 72);
    for (const channel of clip.channels) assert.ok(gltf.nodes[channel.target.node]);
    for (const sampler of clip.samplers) for (const index of [sampler.input, sampler.output]) {
      const accessor = gltf.accessors[index];
      const view = gltf.bufferViews[accessor.bufferView];
      assert.ok(view.byteOffset + view.byteLength <= gltf.buffers[0].byteLength);
    }
  }
});

test('Ophelia keeps her texture and colours on the unlit stage', () => {
  const root = new THREE.Group(), map = new THREE.Texture();
  const material = new THREE.MeshStandardMaterial({ map, color: 0xa98765 });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(), material); root.add(mesh);
  prepareCastMaterials('ophelia', root);
  assert.ok(mesh.material.isMeshBasicMaterial);
  assert.equal(mesh.material.map, map);
  assert.ok(mesh.material.color.equals(material.color));
});

test('activating a preview-only NPC waves without attempting a download', () => {
  const source = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  const activate = source.slice(source.indexOf('function activate('), source.indexOf('function details('));
  const calls = [];
  const run = new Function('S', 'LISTS', 'waveDuo', 'input', `${activate}; return activate;`)(
    { tab: 'crew', crew: 0 }, { crew: [crew.npcs.find(m => m.num === 'ophelia')] }, num => calls.push(num), { rumble() {} });
  run({ from: 'pad', pad: 0 });
  run({ from: 'keyboard' });
  assert.deepEqual(calls, ['ophelia', 'ophelia']);
});
