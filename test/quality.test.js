import test from 'node:test';
import assert from 'node:assert/strict';
import { renderProfile, renderSize, nextRenderTime } from '../src/quality.js';
import { castCap } from '../src/duo.js';
import { spare } from '../src/water.js';

test('Auto chooses a phone tier on mobile WebKit, with bounded buffers in every fold shape', () => {
  const profile = renderProfile('auto', {userAgent:'iPhone AppleWebKit',maxTouchPoints:5});
  assert.equal(profile.tier,'phone');
  assert.equal(profile.fps,60, 'consistent divisor of a 120 Hz display');
  assert.equal(profile.models,3);
  for (const [w,h] of [[466,678],[678,466],[626,890],[890,626]]) {
    const buffer = renderSize(w,h,3,profile.dpr,profile.waterPixels);
    assert.ok(buffer.width*buffer.height <= profile.waterPixels);
    assert.ok(buffer.ratio <= 1.5);
  }
  assert.equal(renderProfile('auto',{userAgent:'iPhone',connection:{saveData:true}}).fps,30);
  assert.equal(renderProfile('auto',{userAgent:'Desktop'}).models,6);
  assert.equal(renderProfile('detail',{userAgent:'iPhone'}).dpr,1.75);
});

test('60 Hz draws are evenly paced on 120 Hz callbacks, including a long resume gap', () => {
  let next = 0;
  const frames = [];
  for (let tick = 0; tick < 120; tick++) {
    const now = tick * 1000 / 120;
    if (now + .5 < next) continue;
    frames.push(tick);
    next = nextRenderTime(now,next,60);
  }
  assert.equal(frames.length,60);
  assert.ok(frames.every((tick,index) => tick === index*2));
  assert.ok(nextRenderTime(30000,next,60) > 30000);
});

test('the pair draws at a phone screen\'s own density inside the cast budget; battery and desktop keep their cap', () => {
  const phone = renderProfile('auto', {userAgent:'iPhone AppleWebKit',maxTouchPoints:5});
  const pair = renderSize(225,150,3,castCap(phone,3),phone.castPixels);
  assert.equal(pair.ratio,3);
  assert.ok(pair.width*pair.height <= phone.castPixels);
  // a Crew stage is held by the budget, close to what it was
  for (const [w,h] of [[393,368],[626,406],[890,300]]) {
    const was = renderSize(w,h,3,phone.dpr,phone.castPixels), now = renderSize(w,h,3,castCap(phone,3),phone.castPixels);
    assert.ok(now.width*now.height <= phone.castPixels);
    assert.ok(now.ratio >= was.ratio && now.ratio < was.ratio*1.1);
  }
  assert.equal(castCap(phone,2),2);
  assert.equal(castCap(phone,1),1.5);
  assert.equal(castCap(phone,4),3);
  assert.equal(castCap(renderProfile('battery',{userAgent:'iPhone'}),3),1);
  assert.equal(castCap(renderProfile('auto',{userAgent:'iPhone',connection:{saveData:true}}),3),1);
  assert.equal(castCap(renderProfile('auto',{userAgent:'Desktop'}),2),1.25);
  assert.equal(castCap(renderProfile('detail',{userAgent:'Desktop'}),3),1.75);
});

test('art textures: the last few stay for stepping back, the oldest go first, never one in the crossfade', () => {
  const art = (key,used,busy=false) => [key,used,busy];
  assert.deepEqual(spare([art('a',1),art('b',2)],4),[]);
  assert.deepEqual(spare([art('a',1),art('b',2),art('c',3,true),art('d',4,true),art('e',5)],4),['a']);
  assert.deepEqual(spare([art('a',5),art('b',2),art('c',9,true),art('d',4),art('e',7,true),art('f',1)],4),['f','b']);
  // a phone keeps only the crossfade (and the picture still on its way in)
  assert.deepEqual(spare([art('a',1,true),art('b',2),art('c',3,true),art('d',4,true)],2),['b']);
  assert.deepEqual(spare([art('a',1,true),art('b',2,true),art('c',3,true)],2),[]);
});
