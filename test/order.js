import assert from 'node:assert/strict';
import { arrange } from '../src/order.js';

const keys = ['a', 'b', 'c', 'd'];
// nothing saved, or junk: the default order
assert.deepEqual(arrange(keys, undefined), keys);
assert.deepEqual(arrange(keys, 'junk'), keys);
// a saved order is kept
assert.deepEqual(arrange(keys, ['d', 'b', 'a', 'c']), ['d', 'b', 'a', 'c']);
// gone keys are dropped, repeats and non-strings ignored
assert.deepEqual(arrange(keys, ['d', 'x', 'd', 7, 'b', 'a', 'c']), ['d', 'b', 'a', 'c']);
// a game added later lands right after the one before it by default
assert.deepEqual(arrange(['a', 'b', 'n', 'c', 'd'], ['d', 'b', 'a', 'c']), ['d', 'b', 'n', 'a', 'c']);
// two in a row, and one added first
assert.deepEqual(arrange(['n0', 'a', 'b', 'n1', 'n2', 'c', 'd'], ['d', 'b', 'a', 'c']), ['n0', 'd', 'b', 'n1', 'n2', 'a', 'c']);
console.log('order ok');
