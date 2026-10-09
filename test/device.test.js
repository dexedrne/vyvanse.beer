import test from 'node:test';
import assert from 'node:assert/strict';

test('only phone hardware gets the phone flag, in either orientation', async () => {
  const { isPhone, gameUrl, deviceFlags } = await import('../src/device.js');
  const cases = [
    ['iPhone portrait', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile/15E148', 5, true],
    ['iPhone landscape', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile/15E148', 5, true],
    ['Android phone', 'Mozilla/5.0 (Linux; Android 15; Pixel 9) Mobile Safari/537.36', 5, true],
    ['Android tablet', 'Mozilla/5.0 (Linux; Android 15; Pixel Tablet) Safari/537.36', 5, false],
    ['iPad mobile UA', 'Mozilla/5.0 (iPad; CPU OS 18_0) Mobile/15E148', 5, false],
    ['iPad desktop UA', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) Safari/605.1.15', 5, false],
    ['small desktop window', 'Mozilla/5.0 (Windows NT 10.0) Chrome/130', 0, false],
  ];
  for (const [label, userAgent, maxTouchPoints, phone] of cases) {
    const nav = { userAgent, maxTouchPoints };
    assert.equal(isPhone(nav), phone, label);
    const url = new URL(gameUrl('https://game.example/play?room=3#level2', phone));
    assert.equal(url.searchParams.get('device'), phone ? 'phone' : null, label);
    assert.equal(url.searchParams.get('room'), '3');
    assert.equal(url.hash, '#level2');
    assert.deepEqual(deviceFlags(nav, []), { type: 'vyvanse:device', phone, touch: maxTouchPoints > 0, pad: false });
    assert.equal(deviceFlags(nav, [{ connected: true }]).pad, true);
    assert.equal(deviceFlags(nav, [{ connected: false }]).pad, false);
  }
  assert.equal(isPhone({ userAgent: 'Android', userAgentData: { mobile: true } }), true);
  assert.equal(isPhone({ userAgent: 'Android', userAgentData: { mobile: false } }), false);
});
