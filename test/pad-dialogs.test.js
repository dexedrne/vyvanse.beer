import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
const desktop = '@media (min-width: 961px), (min-width: 761px) and (min-height: 701px), (min-width: 761px) and (hover: hover), (min-width: 761px) and (pointer: fine) {';

// A pad moves focus by script, which browsers do not always count as :focus-visible.
test('with a pad, whatever the walk reaches inside a dialog draws the amber ring', () => {
  assert.match(css, /:is\(html\[data-input='ps'\], html\[data-input='xbox'\]\) :is\(dialog, \.ask, \.sheet, \.term, \.offline-card\) :is\(a, button, select, summary, \[tabindex='0'\]\):focus \{\s*outline: 2px solid var\(--amber\);/);
  assert.match(css, /:is\(html\[data-input='ps'\], html\[data-input='xbox'\]\) :is\(dialog, \.ask, \.sheet, \.term, \.offline-card\) \.play:focus \{\s*outline-offset: -5px;/);
});

// The pad's "contents" on a Crew pack opens the sheet, which used to be styled for phones only.
test('the contents sheet is a panel on desktop screens too, over a dimmed menu', () => {
  for (const rule of [/\n  \.sheet \{ position: absolute; z-index: 12;[^}]*background: var\(--ink\);/, /\n  \.dim \{ position: absolute; z-index: 11; inset: 0;/]) {
    const at = css.search(rule);
    assert.ok(at > 0, `missing ${rule}`);
    assert.equal(css.lastIndexOf(desktop, at), css.lastIndexOf('@media', at), 'it sits in the desktop block');
  }
});
