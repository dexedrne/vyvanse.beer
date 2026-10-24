import test from 'node:test';
import assert from 'node:assert/strict';
import { playerViewport } from '../src/viewport.js';

test('all four fold shapes expose usable canvas bounds and a full-size menu reservation', () => {
  for (const [width,height] of [[466,678],[678,466],[626,890],[890,626]]) {
    const land = width > height;
    const safe = land ? {top:0,right:44,bottom:21,left:44} : {top:54,right:0,bottom:34,left:0};
    const data = playerViewport({width,height,safe,standalone:true,input:'xbox',dpr:1.5});
    assert.equal(data.width,width-safe.left-safe.right);
    assert.equal(data.height,height-safe.top-(land?0:safe.bottom));
    assert.equal(data.safe.bottom,land?21:0);
    assert.equal(data.menu.w,44);
    assert.equal(data.menu.h,44);
    assert.equal(data.input,'xbox');
    assert.equal(data.layout,Math.min(width,height)>=600?'unfolded':'compact');
  }
});
