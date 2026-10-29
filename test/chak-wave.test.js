import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Keep the real exported skeleton and clips; images/geometry are not needed to test motion.
async function motion() {
  const bytes=readFileSync(new URL('../public/models/chak.glb',import.meta.url));
  const size=bytes.readUInt32LE(12),json=JSON.parse(bytes.subarray(20,20+size));
  const bin=bytes.subarray(28+size);
  for(const node of json.nodes){delete node.mesh;delete node.skin;}
  for(const name of ['meshes','skins','materials','textures','images','samplers','extensionsUsed','extensionsRequired'])delete json[name];
  let text=Buffer.from(JSON.stringify(json));text=Buffer.concat([text,Buffer.alloc((4-text.length%4)%4,32)]);
  const out=Buffer.alloc(28+text.length+bin.length);out.writeUInt32LE(0x46546c67,0);out.writeUInt32LE(2,4);out.writeUInt32LE(out.length,8);
  out.writeUInt32LE(text.length,12);out.writeUInt32LE(0x4e4f534a,16);text.copy(out,20);out.writeUInt32LE(bin.length,20+text.length);out.writeUInt32LE(0x004e4942,24+text.length);bin.copy(out,28+text.length);
  return new GLTFLoader().parseAsync(out.buffer.slice(out.byteOffset,out.byteOffset+out.byteLength),'');
}

test('Chak greeting raises a bent elbow with the palm forward and returns smoothly to rest',async()=>{
  const g=await motion(),root=g.scene,mixer=new THREE.AnimationMixer(root);
  const clip=g.animations.find(c=>c.name==='Big_Wave_Hello');assert.ok(clip);
  const names=['LeftArm','LeftArmTwist1','LeftArmTwist2','LeftForeArm','LeftForeArmTwist1','LeftForeArmTwist2','LeftHand'];
  const bones=names.map(n=>{const b=root.getObjectByName(n);assert.ok(b,n);return b;});
  const action=mixer.clipAction(clip);action.setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;action.play();
  const positions=()=>bones.map(b=>b.getWorldPosition(new THREE.Vector3()));
  mixer.setTime(0);root.updateMatrixWorld(true);const start=positions();let previous=bones.map(b=>b.getWorldQuaternion(new THREE.Quaternion()));
  for(let frame=1;frame<=120;frame++){
    mixer.setTime(clip.duration*frame/120);root.updateMatrixWorld(true);
    bones.forEach((b,i)=>{const q=b.getWorldQuaternion(new THREE.Quaternion());assert.ok(previous[i].angleTo(q)<.25,`sudden arm turn: ${b.name} frame ${frame}`);previous[i]=q;});
    if(frame===60){
      const shoulder=bones[0].getWorldPosition(new THREE.Vector3()),elbow=bones[3].getWorldPosition(new THREE.Vector3()),wrist=bones[6].getWorldPosition(new THREE.Vector3());
      assert.ok(elbow.y<shoulder.y && wrist.y>elbow.y+.15,'relaxed upper arm and raised forearm');
      const angle=shoulder.clone().sub(elbow).angleTo(wrist.clone().sub(elbow));assert.ok(angle>.6 && angle<2,'bent elbow');
      const palm=new THREE.Vector3(0,0,1).applyQuaternion(bones[6].getWorldQuaternion(new THREE.Quaternion()));assert.ok(palm.z>.6,'palm faces the viewer');
    }
  }
  positions().forEach((p,i)=>assert.ok(p.distanceTo(start[i])<.005,`${names[i]} returns to rest`));
});
