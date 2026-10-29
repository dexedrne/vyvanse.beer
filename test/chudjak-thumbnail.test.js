import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {crew} from '../src/projects.js';
test('Chak uses a close-up face thumbnail and keeps his fullbody fallback',()=>{
 const c=crew.npcs.find(c=>c.num==='chudjak');
 assert.equal(c.face,'/img/chak-face.webp');
 assert.equal(c.image.src,'/img/chak.webp');
 const b=readFileSync(new URL('../public'+c.face,import.meta.url));
 assert.equal(b.subarray(0,4).toString(),'RIFF');assert.equal(b.subarray(8,12).toString(),'WEBP');
});
