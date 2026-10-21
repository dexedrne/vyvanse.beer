// Hardware, not viewport width: a landscape iPhone is still a phone; an iPad is not.
export function isPhone(nav = navigator) {
  const ua = nav.userAgent || '';
  if (/iPad|Tablet|Silk|Kindle/i.test(ua)) return false;
  return /iPhone|iPod/i.test(ua) || (/Android/i.test(ua) && (nav.userAgentData?.mobile ?? /Mobile/i.test(ua)));
}

export function gameUrl(url, phone = isPhone()) {
  if (!phone) return url;
  const game = new URL(url);
  game.searchParams.set('device', 'phone');
  return game.href;
}

export function deviceFlags(nav = navigator, pads = []) {
  const phone = isPhone(nav);
  return { type: 'vyvanse:device', phone, touch: phone || nav.maxTouchPoints > 0,
    pad: pads.some(p => p && p.connected !== false) };
}

// Internal render resolution cap. Current iPhones (dpr 3) are fast enough for a little more than the
// 1.25 everyone else gets; the pixel budgets in the renderers still bound the actual canvas size.
export function dprCap(nav = navigator, base = 1.25) {
  return /iPhone/i.test(nav.userAgent || '') && !/iPad/i.test(nav.userAgent || '') ? 1.75 : base;
}
