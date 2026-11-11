import test from 'node:test';
import assert from 'node:assert/strict';

// Settings is built with the page's own helpers, so the test hands it a few stand-ins for the page.
function fakePage() {
  const made = [];
  class Node {}
  class El extends Node {
    constructor(tag) { super(); this.tag = tag; this.listeners = {}; this.attrs = {}; this.children = []; this.open = false; this.box = null; }
    addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
    setAttribute(k, v) { this.attrs[k] = v; }
    getAttribute(k) { return this.attrs[k] ?? null; }
    append(...kids) { this.children.push(...kids); }
    focus() {}
    showModal() { this.open = true; }
    close() { this.open = false; }
    getBoundingClientRect() { return this.box; }
    fire(type, event) { for (const fn of this.listeners[type] || []) fn(event); }
  }
  const document = {
    body: new El('body'),
    createElement(tag) { const el = new El(tag); made.push(el); return el; },
    createTextNode: (text) => text,
    getElementById: () => ({ getAttribute: () => 'false' }),
  };
  return { document, Node, made };
}

test('Settings closes on a click outside its panel, and not on a click on its own padding', async () => {
  const page = fakePage();
  Object.assign(globalThis, { document: page.document, Node: page.Node, matchMedia: () => ({ matches: false }) });
  const { createSettings } = await import('../src/settings.js');
  const settings = createSettings({ audio: { toggleMusic() {}, toggleSfx() {} } });
  const dialog = page.made.find((el) => el.tag === 'dialog');
  assert.equal(page.document.body.children.at(-1), dialog);
  dialog.box = { left: 420, right: 860, top: 145, bottom: 575 };
  const click = (target, clientX, clientY) => { dialog.fire('pointerdown', { target, clientX, clientY }); dialog.fire('click', { target, clientX, clientY }); };

  settings.open();
  assert.equal(dialog.open, true);
  click(dialog, 432, 160); // the panel's own 24px padding: the browser reports the dialog as the target here too
  assert.equal(dialog.open, true, 'a click on the padding keeps it open');
  click(page.made.find((el) => el.tag === 'select'), 600, 460);
  assert.equal(dialog.open, true, 'a click on a control keeps it open');
  dialog.fire('pointerdown', { target: page.made.find((el) => el.tag === 'button'), clientX: 500, clientY: 200 });
  dialog.fire('click', { target: dialog, clientX: 900, clientY: 200 }); // pressed on a button, let go off the panel
  assert.equal(dialog.open, true, 'a press dragged off the panel keeps it open');
  click(dialog, 419, 300); // one pixel left of the panel: the backdrop
  assert.equal(dialog.open, false, 'a click on the backdrop closes it');

  for (const [x, y] of [[640, 100], [640, 600], [900, 300]]) {
    settings.open();
    click(dialog, x, y);
    assert.equal(dialog.open, false, `backdrop at ${x},${y}`);
  }
});
