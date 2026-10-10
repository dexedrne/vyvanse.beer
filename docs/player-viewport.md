# Phone viewport contract

The launcher still fits every game into its iframe. Adoption of this contract is optional;
existing games, including PokerBros, keep their own responsive layout and input handling.
There is no iframe scaling, fixed game resolution, or dependency on a ready reply.

On phones, the iframe URL preserves existing query parameters and fragments and adds:

```text
?device=phone&vb=1&safe=0,0,0,0&menu=8,8,32,32&standalone=1
```

`safe` is `top,right,bottom,left` in the game's CSS pixels: only the part of the **iframe**
still covered by hardware, rather than the outer page's insets. The portrait frame already
excludes all hardware insets, so these values are zero. Landscape excludes the left/right
insets but extends under the home indicator, so an installed iPhone app reports `0,0,21,0`.
Never apply the outer portrait top/bottom inset twice. `standalone` is `0` in Safari and `1`
in the installed app. The query is the initial snapshot; use messages for later changes.

On load, resize, orientation change, and input change, the parent sends:

```js
{
  type: 'vyvanse:viewport',
  safe: { top: 0, right: 0, bottom: 21, left: 0 },
  menu: { x: 8, y: 8, w: 32, h: 32 },
  standalone: true,
  orientation: 'landscape', // or 'portrait'
  input: 'ps' // or 'touch'
}
```

The menu rectangle is the translucent launcher nub. Keep a HUD corner or first seat plate
clear of that rectangle plus its 8-pixel gutter. The loading/menu bar temporarily occupies
more space; after readiness it collapses to the nub. Tapping the nub reveals the bar for
three seconds. It does not capture touches elsewhere in the game.

Use the iframe's own `innerWidth` and `innerHeight` to lay out the game. `env(safe-area-*)`
inside an iframe does not describe the outer phone's hardware. Do not infer viewport size
from `standalone`, an example below, or the URL's `safe` values.

| iPhone 16 Pro context | Portrait iframe | Landscape iframe |
| --- | --- | --- |
| Installed app | 402 × 778 | 750 × 402 |
| Safari classic-toolbar mockup | 402 × 681 | 756 × 352 |

Safari's actual dimensions and reported bottom inset depend on the toolbar and iOS version.
The parent measures the visual viewport and real safe areas; the examples are not constants.
Open the launcher with `?probe` to display its current measurements in the strip for five seconds.

After the iframe's load event and its first game frame have been drawn, optionally reply:

```js
parent.postMessage({ type: 'vyvanse:ready' }, 'https://vyvanse.beer');
```

The launcher validates the sender against the current iframe and its origin. The existing
pad shim's acknowledgement before load still refreshes input; it does not bypass the loading
card. A game that never replies still opens 2.5 seconds after its iframe loads. A late load/reply from a closed
game cannot mark a replacement game ready. The existing `vyvanse:pads`, `vyvanse:device`,
and `vyvanse:menu` messages continue to work. Create + Options held for one second,
the corner menu control, and the browser's Back still return to the launcher.
