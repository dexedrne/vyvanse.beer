import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { prepareCastMaterials } from '../src/duo.js';

test('Chudjak preview shows texture and patch colours without scene lighting', () => {
  const root=new THREE.Group(), map=new THREE.Texture();
  const shirt=new THREE.MeshStandardMaterial({map,color:0xffffff,metalness:1});
  const skin=new THREE.MeshStandardMaterial({color:0xcccccc});
  const a=new THREE.Mesh(new THREE.BoxGeometry(),[shirt,skin]);
  const b=new THREE.Mesh(new THREE.BoxGeometry(),shirt);root.add(a,b);
  prepareCastMaterials('chudjak',root);
  assert.ok(a.material.every(m=>m.isMeshBasicMaterial));
  assert.equal(a.material[0].map,map);
  assert.ok(a.material[1].color.equals(skin.color));
  assert.equal(a.material[0],b.material);
  assert.ok(shirt.isMeshStandardMaterial);
});

test('other crew keep their existing materials', () => {
  const root=new THREE.Group(), material=new THREE.MeshStandardMaterial({color:0xabcdef});
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(),material);root.add(mesh);
  prepareCastMaterials('85',root);
  assert.equal(mesh.material,material);
});
