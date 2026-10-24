/** @typedef {{top:number, right:number, bottom:number, left:number}} Insets */

/** Shared geometry for the URL snapshot and later messages. Never changes the game URL.
 * @param {{width:number,height:number,safe:Insets,standalone:boolean,input:string,dpr:number}} view
 */
export function playerViewport({ width, height, safe, standalone, input, dpr }) {
  const landscape = width > height;
  return {
    type: 'vyvanse:viewport',
    safe: { top: 0, right: 0, bottom: landscape ? safe.bottom : 0, left: 0 },
    menu: { x: 8, y: 8, w: 44, h: 44 },
    width: Math.max(1, Math.round(width - safe.left - safe.right)),
    height: Math.max(1, Math.round(height - safe.top - (landscape ? 0 : safe.bottom))),
    dpr,
    layout: Math.min(width, height) >= 600 ? 'unfolded' : 'compact',
    standalone,
    orientation: landscape ? 'landscape' : 'portrait',
    input: ['ps', 'xbox', 'kb'].includes(input) ? input : 'touch',
  };
}
