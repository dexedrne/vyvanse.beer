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

test('Chak dances with his body while the fitted arm poses remain authored by the clip', () => {
  const c=dancer(), other=dancer('85');
  const arms=['LeftShoulder','RightShoulder','LeftArm','RightArm','LeftForeArm','RightForeArm'];
  for(const name of arms)c.bones[name].quaternion.setFromAxisAngle(new THREE.Vector3(1,0,0),.35);
  const poses=arms.map(name=>c.bones[name].quaternion.clone());
  groove(c,.25);groove(other,.25);
  arms.forEach((name,i)=>assert.ok(c.bones[name].quaternion.angleTo(poses[i])<1e-7,name));
  assert.ok(c.bones.Head.quaternion.angleTo(new THREE.Quaternion())>.01);
  assert.ok(other.bones.LeftArm.quaternion.angleTo(new THREE.Quaternion())>0);
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
