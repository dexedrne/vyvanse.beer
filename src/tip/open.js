// The tip jar's way in: tiny, in the main bundle. The panel itself is a lazy chunk.
let mod;
export const loadTip = () => (mod ||= import('./panel.js').catch((e) => ((mod = null), Promise.reject(e))));
export const openTip = () => loadTip().then((m) => m.open(), () => {});
