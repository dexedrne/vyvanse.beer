import test from 'node:test';
import assert from 'node:assert/strict';
import { crew, projects, playsIn, heroPair } from '../src/projects.js';

test('the new pair have full Crew cards and both updated games list them', () => {
  for (const num of ['3704', '3710']) {
    const member = crew.members.find(m => m.num === num);
    assert.ok(member?.model && member?.face && member?.image && member?.download);
    const games = playsIn(projects, num).map(p => p.cmd);
    assert.ok(games.includes('pokerbros') && games.includes('radtap'));
  }
  assert.ok(!projects.find(p => p.cmd === 'pokerbros').cast.includes('2564'));
});

test('hero rotation leads with the main four and has just one ghost slot per twenty pairs', () => {
  const pairs = Array.from({ length: 60 }, (_, i) => heroPair(i));
  assert.deepEqual(pairs[0], ['4764', '652']);
  assert.deepEqual(pairs[1], ['3704', '3710']);
  for (const pair of pairs) {
    assert.equal(pair.length, 2);
    assert.notEqual(pair[0], pair[1]);
    assert.ok(pair.every(num => crew.members.some(m => m.num === num)));
  }
  for (let i = 0; i < pairs.length; i += 20) {
    const cycle = pairs.slice(i, i + 20);
    assert.equal(cycle.filter(p => p.includes('2564')).length, 1);
    for (const num of ['4764', '652', '3704', '3710']) assert.ok(cycle.filter(p => p.includes(num)).length >= 7);
  }
});
