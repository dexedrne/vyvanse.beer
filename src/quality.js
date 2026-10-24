/** @typedef {'auto'|'battery'|'detail'} Quality */
/** @typedef {{userAgent:string,maxTouchPoints?:number,connection?:{saveData?:boolean}}} Device */
const modes = ['auto', 'battery', 'detail'];
/** @type {Quality} */
let sessionQuality = 'auto';

/** @returns {Quality} */
export function readQuality() {
  try {
    const value = localStorage.getItem('vyv-quality');
    return value === 'battery' || value === 'detail' ? value : sessionQuality;
  } catch { return sessionQuality; }
}

/** @param {string} value */
export function setQuality(value) {
  if (!modes.includes(value)) return;
  sessionQuality = value === 'detail' ? 'detail' : value === 'battery' ? 'battery' : 'auto';
  try { localStorage.setItem('vyv-quality', value); } catch { /* session-only preference */ }
  dispatchEvent(new Event('vyv:quality'));
}

/** Auto budgets depend on hardware, never on the current fold width.
 * @param {Quality} mode
 * @param {Device} nav
 */
export function renderProfile(mode = readQuality(), nav = navigator) {
  const mobile = /iPhone|iPad|iPod|Android.*Mobile/i.test(nav.userAgent) ||
    (/Macintosh.*AppleWebKit/i.test(nav.userAgent) && (nav.maxTouchPoints || 0) > 1);
  const battery = mode === 'battery' || (mode === 'auto' && nav.connection?.saveData);
  return {
    mode, tier: battery ? 'battery' : mobile ? 'phone' : 'desktop',
    dpr: battery ? 1 : mode === 'detail' ? 1.75 : mobile ? 1.5 : 1.25,
    waterPixels: battery ? 350000 : mode === 'detail' ? 1000000 : mobile ? 650000 : 900000,
    castPixels: battery ? 180000 : mobile ? 350000 : 600000,
    models: mobile ? 3 : 6,
    fps: battery ? 30 : 60,
  };
}

/** @param {number} width @param {number} height @param {number} dpr @param {number} cap @param {number} pixels */
export function renderSize(width, height, dpr, cap, pixels) {
  const w = Math.max(1, width), h = Math.max(1, height);
  const ratio = Math.min(Math.max(1, dpr), cap, Math.sqrt(pixels / (w * h)));
  return { width:Math.max(1, Math.floor(w * ratio)), height:Math.max(1, Math.floor(h * ratio)), ratio };
}

/** Keep the fractional interval instead of drifting on high refresh displays.
 * @param {number} now @param {number} due @param {number} fps
 */
export function nextRenderTime(now, due, fps) {
  const interval = 1000 / fps;
  return now + interval - Math.max(0, now - due) % interval;
}
