import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { site, groups, projects, crew, contact, duo } from '../src/projects.js';
import { renderShell } from '../src/render.js';
import { launchUrl } from '../src/ask/actions.js';

const txra = projects.find(p => p.cmd === 'txra');
const html = renderShell({ site, groups, projects, crew, contact, duo });

test('Code is its own group and tab, after Sites, with TXRA laid out like a site', () => {
  assert.deepEqual(groups.map(g => g.id), ['games', 'sites', 'code']);
  assert.equal(txra.group, 'code');
  assert.deepEqual(txra.aliases, ['decomp', 'tokyo']);
  assert.equal(txra.frame, false);
  assert.equal(txra.links[0].href, txra.url);
  for (const src of [txra.image.src, txra.thumb, txra.phoneImage]) assert.ok(existsSync(`public${src}`), src);
  assert.deepEqual([...html.matchAll(/data-tab="(\w+)"/g)].map(m => m[1]), ['games', 'crew', 'sites', 'code', 'contact']);
  const panel = html.match(/<section class="panel panel--code"[^]*?<\/section>/)?.[0];
  assert.ok(panel);
  assert.match(panel, /<article class="item item--site" id="txra"/);
  assert.match(panel, /class="carts carts--sites carts--code"/);
  assert.match(panel, /href="https:\/\/github\.com\/dexedrne\/txra-decomp\/releases\/tag\/v1\.1\.0"/);
  assert.doesNotMatch(html.match(/<section class="panel panel--sites"[^]*?<\/section>/)[0], /id="txra"/);
});

test('a repository opens as itself on a phone, without the games’ device flag', () => {
  const phone = { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X)' };
  assert.equal(launchUrl(txra, undefined, phone), 'https://github.com/dexedrne/txra-decomp');
  const site = projects.find(p => p.group === 'sites' && p.frame);
  assert.match(launchUrl(site, undefined, phone), /device=phone/);
});

// Only the terminal's DOM boundary is stubbed; command parsing and output stay real (as in packs.test.js).
class Element {
  children = [];
  attributes = {};
  className = '';
  constructor(tag = '') { this.tag = tag; }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  append(...kids) { this.children.push(...kids); }
  addEventListener() {}
  get textContent() { return this.children.map(c => c instanceof Element ? c.textContent : c).join(''); }
}
globalThis.Node = Element;
globalThis.matchMedia = () => ({ matches: false });
globalThis.document = { createElement: tag => new Element(tag), createTextNode: text => text };
const opened = [];
globalThis.window = { open: url => (opened.push(url), {}) };
const { createCommands } = await import('../src/os/commands.js');
const nodes = el => el instanceof Element ? [el, ...el.children.flatMap(nodes)] : [];

test('the terminal lists, describes, opens and goes to Code', () => {
  const output = [], shell = [];
  const commands = createCommands({ site, groups, projects, crew, contact,
    term: { print: el => output.push(el) },
    shell: { reveal: slug => shell.push(`reveal ${slug}`), go: tab => shell.push(`go ${tab}`), canPlay: () => true, play: () => shell.push('play') }, close() {} });
  commands.run('ls code');
  assert.match(output.map(el => el.textContent).join(' '), /code\/[^]*txra[^]*TXRA/);
  output.length = 0;
  commands.run('info txra');
  assert.match(output.map(el => el.textContent).join(' '), /TXRA[^]*byte for byte[^]*source on github[^]*windows and linux builds[^]*v1\.1\.0/);
  const links = output.flatMap(nodes).filter(el => el.tag === 'a').map(a => a.attributes.href);
  assert.deepEqual(links, txra.links.map(l => l.href));
  commands.run('open decomp');
  assert.deepEqual(opened, [txra.url]);
  assert.ok(!shell.includes('play'));
  commands.run('cd code');
  assert.deepEqual(shell, ['reveal txra', 'go code']);
});
