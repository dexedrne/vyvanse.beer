# Phones, touch and controllers in the launcher

Phase 1 is the launcher. Games implement this contract in phase 2. Phones use one local player and one viewport: **hide and disable split screen on phones**, even with multiple connected pads. Online multiplayer can use that viewport. Tablets (including the owner's iPad 10th generation), desktop browsers and their multiplayer modes keep their current behavior.

## Launch URL

On an iPhone or Android phone the launcher opens the game's existing URL with `device=phone` added to its query. Existing parameters and the fragment survive:

```
https://game.vyvanse.beer/play?room=3&device=phone#level2
```

Detection uses hardware UA/mobile hints, never window width, orientation or touch alone. Android tablets, iPads reporting either an iPad or a desktop Macintosh UA, and narrow desktop windows do not get the flag. The flag is also retained by the player's new-tab link. A game opened directly can use its own equivalent hardware detection as a fallback.

Read the query **before constructing the menu or choosing a saved multiplayer mode**:

```js
let phone = new URLSearchParams(location.search).get('device') === 'phone';
let touch = phone;
let pad = false;
```

## Live device message

The launcher sends this after iframe load, after the game says it is ready, and when controller availability changes:

```js
{ type: 'vyvanse:device', phone: true, touch: true, pad: true }
```

All three flags are booleans. `phone` identifies the hardware, `touch` says touch is available, and `pad` says a controller is exposed to the launcher. Pad presence is independent of the last input used in the menu. Hide split screen whenever `phone` is true. On a phone, show touch controls when `touch && !pad`; retain a reachable way to request them while using a pad. Clear held input on disconnect/visibility loss. Do not infer a tablet from landscape or a phone from a narrow iframe.

Only accept messages from `window.parent` with `event.origin === 'https://vyvanse.beer'`. A development/preview origin must be explicitly configured; never derive trust from arbitrary referrers and never use an origin wildcard. A game can send `{type:'vyvanse:ready'}` to that origin to get the current flags again. To return to the menu, send `{type:'vyvanse:menu'}` to that origin. The launcher checks both the selected game's exact origin and its iframe window.

## Gamepad relay shim

Native Gamepad API access remains enabled by the iframe's `allow="gamepad; fullscreen; autoplay; accelerometer; clipboard-write; xr-spatial-tracking"` and `allowfullscreen`. A parent cannot undo a game's restrictive response Permissions Policy. Some WebKit versions/process configurations fail to expose native pads in cross-site iframes; [WebKit issue 325548](https://bugs.webkit.org/show_bug.cgi?id=325548) reports this. The [Gamepad specification](https://www.w3.org/TR/gamepad/) also gates exposure on gamepad interaction and permissions.

The launcher reads `navigator.getGamepads()` every animation frame while a game is open and sends only to that game's URL origin:

```js
{ type: 'vyvanse:pads', v: 1, pads: [{
  index: 0, id: 'DualSense Wireless Controller', mapping: 'standard',
  connected: true, timestamp: 123,
  axes: [0, 0, 0, 0],
  buttons: [[1, 3], [0, 0]]
}] }
```

Each button is `[value, flags]`; flag 1 means pressed, flag 2 means touched. Empty `pads` means all disconnected. Indexes remain the browser's pad indexes; holes are preserved when the shim reconstructs the Gamepad array. Relay does not support haptics, motion sensors or DualSense touchpad coordinates.

Copy [`public/vyvanse-pad.js`](../public/vyvanse-pad.js) into each game's own public directory, and include it **before the game input module or engine**:

```html
<script src="/vyvanse-pad.js"></script>
<script type="module" src="/src/main.js"></script>
```

The shim patches `navigator.getGamepads()` so ordinary polling code works. Connected native pads win per index, with no duplicate relay connection events. When native access is unavailable or throws a policy error, relay snapshots fill the missing slots. Relayed pads have Gamepad-shaped axes/buttons and synthetic `gamepadconnected`/`gamepaddisconnected` events. Input expires after 500 ms without a fresh snapshot (and while hidden); use `VyvansePad.getGamepads()` explicitly if the browser prevents patching the navigator. Read every frame rather than retaining an old snapshot or checking `instanceof Gamepad`.

The shim also exposes `VyvansePad.device` and dispatches a local `vyvanse:device` CustomEvent with the flags in `event.detail`:

```js
const applyDevice = ({ phone, touch, pad }) => {
  setSplitScreenAvailable(!phone); // also reject saved/URL/controller shortcuts into split screen
  setTouchControlsVisible(phone && touch && !pad);
};
applyDevice(VyvansePad.device);
addEventListener('vyvanse:device', e => applyDevice(e.detail));
```

For a local/preview launcher, explicitly allow its exact origin in the game's trusted script markup, for example `data-launcher-origin="http://127.0.0.1:5960"`. Production defaults to `https://vyvanse.beer`.

Create + Options (standard buttons 8 + 9) held for one second returns to the launcher, even when the iframe owns focus. A large safe-area menu button and browser Back also unload the frame. Games keep their own Options/pause behavior; do not consume the launcher's hold combination as a multiplayer shortcut.

## Phase 2 checklist for every game

1. Load the shim before input code; keep native pads primary and use the relay if needed.
2. Apply `device=phone` before restoring state. Hide split-screen choices and reject split-screen entry through settings, saved state, hotkeys, extra pads or URLs. Use a single viewport and one local player on phones.
3. Listen for the device message/shim event. Show usable touch controls when a phone has no pad; hide them after a controller connects; restore them on disconnect. Keep pause/restart reachable.
4. Fit play in landscape (PokerBros also supports portrait), honor safe areas in direct Safari launches, and avoid double-padding when embedded (the launcher already insets the iframe). Keep menus readable when the phone is portrait. The launcher defaults to a landscape lock/rotate hint; `orientation: 'any'` in its project entry skips both.
5. Test Bluetooth DualSense input both directly and in the iframe, Safari and Add to Home Screen. Test reconnect, background/resume and hold Create + Options. Test iPad and desktop multiplayer separately.

| Game / edition | Phase 2 work |
| --- | --- |
| Spidertag | Apply all five steps; one local player/viewport on phones. |
| RadPayne | Apply all five steps; hide/reject split-screen modes on phones. |
| RetardioPayne | Apply all five steps independently of the RadPayne edition. |
| RBGO | Apply all five steps; hide/reject split-screen modes on phones. |
| RADOPS | Apply all five steps; hide/reject split-screen modes on phones. |
| RadZombies | Apply all five steps; hide/reject split-screen modes on phones. |
| ZombieTardio | Apply all five steps independently of the RadZombies edition. |
| SHITBOX | Apply all five steps; one camera/player on phones. |
| RadTap | Apply all five steps; preserve touch rhythm play and controller timing. |
| PokerBros | Apply all five steps; preserve tap targets and one phone viewport. |
| RadBrawl | Apply all five steps; one local phone player, no split-screen shortcuts. |
| RadFighter | Apply all five steps; preserve pad combat and add phone touch controls. |
| Solscape | Direct launch: read the phone query, keep one viewport, use native pads and phone touch controls. |
| bitcorn maze | Direct launch: read the phone query, use native pads and preserve touch maze navigation. |
| bulkagachi | Apply all five steps; preserve tap interactions and one phone viewport. |
| hog rider 3d | Apply all five steps; use one phone camera/player with pad and touch controls. |

External games that open a new tab receive the phone query from the launcher, but cannot receive a parent iframe relay or live device messages. They must use their own native pad detection and phone handling.

## What automation proves

Unit tests cover phone/tablet classification, compact snapshots, source/origin validation, native preference, malformed packets, reentrant engine polling, disconnects, stale input, deployment updates in multiple windows and Safari audio ranges. Playwright uses its exact iPhone 16 Pro portrait/landscape WebKit descriptors and a controlled cross-origin game fixture to prove iframe permissions, messages, shim polling, menu/back/hold and offline behavior. It also checks the installed landscape viewport at 874 × 402 CSS pixels. It cannot emulate a Bluetooth DualSense or the iOS compositor; safe-area geometry is checked with injected insets. The desktop WPE software renderer uses the existing poster fallback for phone UI checks; Chromium exercises the live water/duo. Physical iPhone Safari/PWA and iPad controller confirmation remains a real-device check, not a claim made by the headless run.
