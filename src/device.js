import { renderProfile } from './quality.js';

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

// A fold keeps the hardware tier; individual renderers also bound the total pixel count.
export function dprCap(nav = navigator, base = 1.25) {
  const profile = renderProfile(undefined, nav);
  return profile.tier === 'desktop' && profile.mode === 'auto' ? base : profile.dpr;
}
