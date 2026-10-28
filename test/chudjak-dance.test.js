import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { groove } from '../src/duo.js';

function dancer(num = 'chudjak') {
  const root = new THREE.Group(), bones = {};
  for (const name of ['Hips','Spine01','Spine02','neck','Head','LeftShoulder','RightShoulder','LeftArm','RightArm','LeftForeArm','RightForeArm']) {
    bones[name] = new THREE.Bone(); root.add(bones[name]);
  }
  return { num, root, bones, beat:0, energy:1, waving:false };
}

test('Chudjak has a small rhythmic arm dance while the other crew keep their idle groove', () => {
  const c=dancer(), other=dancer('85');
  groove(c, .25); groove(other, .25);
  assert.ok(c.bones.LeftForeArm.quaternion.angleTo(new THREE.Quaternion()) > .1);
  assert.equal(other.bones.LeftForeArm.quaternion.angleTo(new THREE.Quaternion()), 0);
  const first=c.bones.LeftArm.quaternion.clone();
  for(const b of Object.values(c.bones)) { b.quaternion.identity(); b.position.set(0,0,0); }
  groove(c, .7);
  assert.ok(first.angleTo(c.bones.LeftArm.quaternion) > .05);
});

test('the dance leaves a waving arm to its authored clip and stays restrained over a full minute', () => {
  const c=dancer();c.waving=true;groove(c,.25);
  assert.equal(c.bones.LeftForeArm.quaternion.angleTo(new THREE.Quaternion()),0);
  assert.equal(c.bones.RightForeArm.quaternion.angleTo(new THREE.Quaternion()),0);
  c.waving=false;
  for(let frame=0;frame<3600;frame++){
    for(const b of Object.values(c.bones)) { b.quaternion.identity(); b.position.set(0,0,0); }
    groove(c,frame/60);
    for(const b of Object.values(c.bones)){
      assert.ok(b.quaternion.toArray().every(Number.isFinite));
      assert.ok(b.quaternion.angleTo(new THREE.Quaternion()) < .7);
    }
    assert.ok(Math.abs(c.bones.Hips.position.y)<.03);
  }
});
