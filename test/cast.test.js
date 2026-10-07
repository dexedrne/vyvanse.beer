import test from 'node:test';
import assert from 'node:assert/strict';
import { crew, projects, playsIn, duo } from '../src/projects.js';

test('the new pair have full Crew cards and both updated games list them', () => {
  for (const num of ['3704', '3710']) {
    const member = crew.members.find(m => m.num === num);
    assert.ok(member?.model && member?.face && member?.image && member?.download);
    const games = playsIn(projects, num).map(p => p.cmd);
    assert.ok(games.includes('pokerbros') && games.includes('radtap'));
  }
  assert.ok(!projects.find(p => p.cmd === 'pokerbros').cast.includes('2564'));
});

test('Games and Contact keep #4764 and #85 on the puddle; the new pair are on their own Crew cards', () => {
  assert.deepEqual(duo, ['4764', '85']);
});
