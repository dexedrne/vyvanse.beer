import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { site, groups, crew, projects, duo, contact, shelf } from '../src/projects.js';
import { renderShell } from '../src/render.js';
import { arrange, renamed } from '../src/order.js';
import { ACTIONS, BY_ID, CHIPS, actionOf, plainAction, runAction } from '../src/ask/actions.js';

const saloon = projects.find(p => p.cmd === 'saloon');
const OLD = 'pokerbros';

test('SALOON is the poker game: its own name, site, art and cartridge label', () => {
  assert.equal(saloon.slug, 'saloon');
  assert.equal(saloon.name, 'SALOON');
  assert.equal(saloon.url, 'https://saloon.cards');
  assert.equal(saloon.links[0].href, saloon.url);
  assert.equal(saloon.frame, true);
  assert.equal(saloon.orientation, 'any');
  for (const name of [OLD, 'poker', 'holdem']) assert.ok(saloon.aliases.includes(name), name);
  for (const src of [saloon.image.src, saloon.thumb]) {
    assert.match(src, /\/saloon\.webp$/);
    assert.ok(existsSync(new URL(`../public${src}`, import.meta.url)), src);
  }
  const { aliases, ...shown } = saloon;
  assert.doesNotMatch(JSON.stringify(shown), /poker ?bros/i);
});

test('the old name is no other entry’s, and nothing on the page says it', () => {
  const others = [...projects.filter(p => p !== saloon), ...crew.members];
  assert.ok(!others.some(x => [x.cmd, x.slug, ...(x.aliases || [])].includes(OLD)));
  assert.doesNotMatch(renderShell({ site, groups, projects, crew, contact, duo }), /poker ?bros/i);
});

test('deep links and commands with the old name land on SALOON', () => {
  // as the menu reads #pokerbros, #games/pokerbros and #play/pokerbros (src/main.js, load)
  assert.equal(projects.find(p => p.slug === OLD || p.cmd === OLD || p.aliases?.includes(OLD)), saloon);
  assert.equal(projects.find(p => p.group === 'games' && (p.cmd === OLD || p.aliases?.includes(OLD))), saloon);
  assert.equal(plainAction(OLD), 'play:saloon');
  assert.equal(plainAction(`play ${OLD} as 85`), 'play:saloon:85');
});

test('a saved order that still says pokerbros keeps SALOON in its place', () => {
  const games = shelf(projects);
  const keys = games.map(eds => eds[0].cmd);
  const old = renamed(games, eds => eds[0].cmd);
  assert.equal(old[OLD], 'saloon');
  // saved before the rename: SALOON first, the rest reversed
  const saved = [OLD, ...keys.filter(k => k !== 'saloon').reverse()];
  const order = arrange(keys, saved, old);
  assert.deepEqual(order, ['saloon', ...keys.filter(k => k !== 'saloon').reverse()]);
  // games saved since still slot in by default, and SALOON is never doubled or lost
  const added = arrange(keys, [keys[1], OLD, 'saloon', keys[0]], old);
  const at = k => added.indexOf(k);
  assert.deepEqual([...added].sort(), [...keys].sort());
  assert.ok(at(keys[1]) < at('saloon') && at('saloon') < at(keys[0]));
  // without the old names it would have dropped back to its default place
  assert.notEqual(arrange(keys, saved)[0], 'saloon');
  // an old name never takes over a key that exists today
  assert.deepEqual(arrange(['a', 'b'], ['b', 'a'], { b: 'a' }), ['b', 'a']);
});

test('ask: play:saloon has its chip, and old play:pokerbros actions still run', () => {
  assert.ok(BY_ID.has('play:saloon'));
  assert.ok(!ACTIONS.some(a => a.id.split(':')[1] === OLD), 'the catalogue only has today’s ids');
  const chip = CHIPS.find(c => c.action === 'play:saloon');
  assert.ok(chip);
  assert.doesNotMatch(chip.label, /poker ?bros/i);
  assert.equal(plainAction(chip.label), 'play:saloon');
  assert.equal(actionOf(`play:${OLD}`), BY_ID.get('play:saloon'));
  assert.equal(actionOf(`play:${OLD}:85`), BY_ID.get('play:saloon:85'));
  for (const bad of [`play:${OLD}:2564`, `play:${OLD}:85:x`, `crew:${OLD}`, 'play:nothing']) assert.equal(actionOf(bad), undefined, bad);
  const played = [];
  const shell = { play: (p, opts) => played.push([p.cmd, opts.as]) };
  assert.equal(runAction(`play:${OLD}`, shell), true);
  assert.equal(runAction(`play:${OLD}:723`, shell), true);
  assert.equal(runAction(`play:${OLD}:2564`, shell), false);
  assert.deepEqual(played, [['saloon', undefined], ['saloon', '723']]);
});
