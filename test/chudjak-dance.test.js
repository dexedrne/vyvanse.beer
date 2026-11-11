import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { groove, faceOut } from '../src/duo.js';

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

// the heroes' chain from the hips up to the head, standing where `turn` puts them
function body(num = '85', turn = 0) {
  const root = new THREE.Group(), bones = {};
  let parent = root;
  for (const name of ['Hips','Spine02','Spine01','Spine','neck','Head']) { bones[name] = new THREE.Bone(); parent.add(bones[name]); parent = bones[name]; }
  root.rotation.y = turn;
  return { num, root, bones, beat:0, energy:1, waving:false };
}
const ahead = b => new THREE.Vector3(0,0,1).applyQuaternion(b.getWorldQuaternion(new THREE.Quaternion()));
const facing = b => { const v=ahead(b); return Math.atan2(v.x,v.z); };
const Y = new THREE.Vector3(0,1,0), X = new THREE.Vector3(1,0,0);
function look(c, by) {
  c.bones.Hips.quaternion.setFromAxisAngle(Y,by*.4).multiply(new THREE.Quaternion().setFromAxisAngle(X,.2));
  c.bones.neck.quaternion.setFromAxisAngle(Y,by*.25);
  c.bones.Head.quaternion.setFromAxisAngle(Y,by*.7).multiply(new THREE.Quaternion().setFromAxisAngle(X,-.15));
}

test('an idle that looks a long way round still shows a face: hips and head stay near the camera', () => {
  for (const turn of [.17,-.17,0]) for (const by of [-1.5,-.9,.9,1.5]) for (const cam of [0,.08]) {
    const c=body('85',turn);look(c,by);
    const lean=ahead(c.bones.Hips).y, nod=ahead(c.bones.Head).y;
    faceOut(c,cam);
    assert.ok(Math.abs(facing(c.bones.Hips)-cam)<=.3+1e-9, `hips ${turn} ${by}`);
    assert.ok(Math.abs(facing(c.bones.Head)-cam)<=.6+1e-9, `head ${turn} ${by}`);
    assert.equal(Math.sign(facing(c.bones.Head)-cam),Math.sign(by),'still looking the way the clip looks');
    assert.ok(Math.abs(ahead(c.bones.Hips).y-lean)<1e-9 && Math.abs(ahead(c.bones.Head).y-nod)<1e-9,'the lean and the nod stay');
  }
  // further round is never nearer the camera: no snapping back as the clip turns
  let last=0;
  for (let by=0;by<=2;by+=.05) { const c=body();look(c,by);faceOut(c);const at=facing(c.bones.Head);assert.ok(at>=last-1e-9);last=at; }
});

test('a small look-around, a wave and Chak are left as their clips have them', () => {
  const pose = c => ['Hips','neck','Head'].map(name=>c.bones[name].quaternion.clone());
  const same = (c,was) => ['Hips','neck','Head'].forEach((name,i)=>assert.ok(c.bones[name].quaternion.angleTo(was[i])<1e-6,name));
  const small=body();look(small,.2);let was=pose(small);faceOut(small);same(small,was);
  const waving=body('85',.44);look(waving,1.5);was=pose(waving);faceOut(waving,0,0);same(waving,was);
  const chak=body('chudjak');look(chak,1.5);was=pose(chak);faceOut(chak);same(chak,was);
  // letting go for a wave is gradual: half way, the head is between the clip's turn and the limit
  const half=body();look(half,1.5);const free=facing(half.bones.Head);faceOut(half,0,.5);
  assert.ok(facing(half.bones.Head)>.6 && facing(half.bones.Head)<free);
});
