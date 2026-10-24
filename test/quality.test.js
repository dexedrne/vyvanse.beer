import test from 'node:test';
import assert from 'node:assert/strict';
import { renderProfile, renderSize } from '../src/quality.js';

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
