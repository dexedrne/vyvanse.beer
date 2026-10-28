import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';

test('Chudjak elbow and wrist joints run through the repaired arm centres in both exports', () => {
  for(const file of ['chudjak.glb','chudjak-rigged.glb']){
    const b=readFileSync(new URL('../public/models/'+file,import.meta.url));
    const g=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)));
    const world=new Map();
    function visit(index,parent){
      const n=g.nodes[index],m=n.matrix?new THREE.Matrix4().fromArray(n.matrix):new THREE.Matrix4().compose(new THREE.Vector3(...(n.translation??[0,0,0])),new THREE.Quaternion(...(n.rotation??[0,0,0,1])),new THREE.Vector3(...(n.scale??[1,1,1])));
      m.premultiply(parent);world.set(n.name,new THREE.Vector3().setFromMatrixPosition(m));
      for(const child of n.children??[])visit(child,m);
    }
    for(const index of g.scenes[g.scene??0].nodes)visit(index,new THREE.Matrix4());
    for(const [name,at] of [['LeftForeArm',[.175,.170,-.118]],['RightForeArm',[-.185,.170,.095]],['LeftHand',[.202,-.035,-.060]],['RightHand',[-.140,-.035,.153]]]){
      assert.ok(world.get(name).distanceTo(new THREE.Vector3(...at))<.002,`${file} ${name}: ${world.get(name).toArray()}`);
    }
    assert.equal(g.skins[0].joints.length,21);
    assert.deepEqual(g.animations.map(a=>a.name).sort(),['Big_Wave_Hello','Casual_Walk','Idle','Lean_Forward_Sprint','Run_02','walk']);
  }
});
