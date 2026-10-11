# vyvanse.beer

Phone game integrations: [viewport and menu contract](docs/player-viewport.md).

Projects by dexedrne: [GitHub](https://github.com/dexedrne) · [X](https://x.com/dexedrne).
Live at https://vyvanse.beer. To get in touch, DM [@dexedrne on X](https://x.com/dexedrne).

A game-select screen on a rainy rooftop. Four tabs (**Games, Crew, Sites, Contact**), the selected
game's key art filling the screen over a puddle that mirrors it, the crew taking turns
standing in the water in 3D (on Crew, each of the crew alone), and the cartridges along the
bottom. Pick a game and it plays right here, full screen, with a keyboard, a mouse, touch or a
controller, like a console's big-screen menu.

```sh
npm install
npm run dev      # local dev server
npm run build    # -> dist/
npm run check    # syntax checks for every JavaScript source
npm test         # order, ticker and cast checks
```

## How it's put together

The whole screen is rendered into `index.html` at build time from
[`src/projects.js`](src/projects.js) by [`src/render.js`](src/render.js), so every game (with its
full blurb and links), every crew member (with his model download), every site and the contact
links are plain HTML before any JS runs. Without JS (and for crawlers) the panels simply stack
down the page. With JS the same markup becomes one screen with no page scroll.

| File | What it does |
| --- | --- |
| `src/projects.js` | All the data: games, sites, crew, contact. Fields documented at the top. |
| `src/render.js` | The build-time HTML (used by `vite.config.js`). |
| `src/main.js` | The menu: tabs, the cursor, the address bar, the duo's spot, what the water mirrors. |
| `src/input.js` | Keyboard and gamepads, turned into menu actions, and the on-screen glyphs. |
| `src/player.js` | Games inside the page: the iframe, the loading card, getting back to the menu. |
| `src/sort.js` | Rearranging the cartridges by hand: drag, long-press on touch, the slide and the drop. |
| `src/order.js` | The viewer's own cartridge order in `localStorage`, and fitting new games into it. |
| `src/audio.js` | The background music and the menu blips. |
| `src/stage.js` | One animation loop for the water and the crew in 3D; pauses while a game is open. |
| `src/water.js` | The rain and the puddle (WebGL2). |
| `src/duo.js` | The crew in 3D (three.js): the rotating pair, or any one alone; each model loaded when first wanted. |
| `src/ticker.js` | UTC clock and live BTC / ETH / SOL / XRP / RETARDIO prices in the bottom strip. |
| `src/tip/` | The tip jar. |
| `src/os/` | Radbro OS, the terminal. |
| `src/ask/`, `api/ask.js` | Plain words and controller chips; guarded server routing. See [Ask setup](docs/ask.md). |
| `src/style.css` | The look. Colour tokens at the top. |

## Add a project

Add an entry to `projects` in `src/projects.js`. `group: 'games'` gets a cartridge on Games and
its key art fills the screen (`image`, 1600×900 webp in `public/img/art/`); `group: 'sites'` gets
a grey cartridge on Sites and its 800×420 screenshot in the preview monitor. Both want a
textless cartridge label in `public/img/thumb/`, composed for a centred 4:3 cover crop, a `shell` colour for the plastic and an
`accent` for the glow. A game's `cast` lists who you can play as (by crew `num`); Crew reads it
for each one's "in" list.

A game can have editions: RadPayne and RetardioPayne (the harder cut, Retardios only), RadZombies
and ZombieTardio. Each edition is its own site and its own entry, with its own name, blurb, art,
links and `cmd`; the second one says `of: 'radpayne'`, and both carry `edition: { label, face }`
(`face` a crew `num`). They share one cartridge on Games, wearing the shown edition's label with
the other one's edge peeking out behind it, and a switch under the wordmark ("Radbros |
Retardios") flips between them: the art, wordmark, blurb, PLAY, links and status line crossfade
to that edition. Each game's last edition is remembered in `localStorage`. On Crew, each one's
"in" list names the edition made for him (of a game's editions, the smallest cast he's in), so
the Retardios are in RetardioPayne and ZombieTardio, the Radbros in RadPayne and RadZombies.

Set `frame: true` only if the site allows being shown in an iframe:

```sh
curl -sI https://example.com | grep -iE 'x-frame-options|frame-ancestors'
```

No output means `frame: true` is fine and PLAY runs it inside the page. With `frame: false` it
opens in a new tab, and the button and status line say so (Solscape, bitcorn and sanic).
Phone games default to landscape; set `orientation: 'any'` for a game that also supports portrait,
such as PokerBros. That skips the orientation lock and the player's rotate hint.

## Controls

The glyphs on screen follow whatever was used last: keys, Xbox buttons, or PlayStation shapes
(a pad whose name or vendor says Sony).

| | Keyboard | Controller | Mouse / touch |
| --- | --- | --- | --- |
| Move | ← → (A D); ↑ ↓ on Contact | D-pad or left stick (held: repeats) | click a cartridge; swipe the art |
| Edition (RadPayne, RadZombies) | ↑ ↓ (W S) flip it | LT / RT (L2 / R2) pick the left / right one; the d-pad ↑ ↓ flips it | the pills under the name |
| Play / pick | Enter | A (✕), or Start | click it again, or PLAY |
| Back | Esc | B (○) | |
| Sections | Q / E | LB / RB (L1 / R1) | the tabs (a bottom bar on phones) |
| Details | I | Y (△) | "details" |
| Make one wave | G | X (□) | click or tap one of them |
| Rearrange | R, then ← → and Enter (Esc puts it back, I resets) | hold Menu (Options), then the d-pad and A (B puts it back, Y resets) | drag a cartridge; on touch, hold it, then drag |
| Full screen | F | View / Select | ⛶ |
| Music, menu sounds | M, N | | ♪ and the speaker |
| Radbro OS | / or ` | | Contact → Radbro OS |
| Ask | | PS5 touchpad click | Ask → native text field; the iOS keyboard supplies dictation |

**Your own order.** The cartridges on Games and Sites can be put in any order. With a mouse,
drag one: it lifts off the row, the others slide out of its way, and it drops into the gap. On
a touch screen, hold one for a moment until it lifts, then drag (a quick swipe still scrolls the
row). With a controller, hold Menu (Options) on the selected cartridge: it lifts, with arrows
either side, the d-pad moves it along, A or Menu again drops it, B puts it back, and Y resets the
whole row; R does the same on a keyboard. A game with editions is one cartridge, so RadPayne and
RetardioPayne move together. The order is kept in this browser (`localStorage`, key `vyv-order`,
only while it differs from the default), and "reset order" in the row's head brings the default
back. A game added later shows up in its default place in a saved order: right after the game
before it in `src/projects.js`. Without storage the rows keep the default order.

View and Start act when they're let go, and only on their own: pressed together they're the
player's way back to the menu (below), so in the menu that combo does nothing. The pad is read on
a short timer rather than on animation frames, so a quick tap still counts when frames are slow.
The hints in the bottom strip drop their least important lines first when the strip is short, so
the ones for picking and going back always show whole.

A pad gives a small rumble on select where it can. The address bar keeps your place
(`#games/rbgo`, `#crew/85`, `#sites/sanic`, `#contact`), `#tip` opens the tip jar, `#play/radrun`
starts a game, and the old page's anchors (`#radrun`, `#radbro-4764`, `#bulk-os`) still land on
the right item. An edition's own name lands on its game, on that edition: `#games/retardiopayne`,
`#zombietardio`, `#play/retardiopayne`, and `open rpayne` in the terminal.

## Games in the player

PLAY runs a game in a full-screen iframe
(`allow="gamepad; fullscreen; autoplay; accelerometer; clipboard-write; xr-spatial-tracking"`) behind a loading
card: its art, its wordmark, and how to get back. While it's open the menu draws nothing at all
(no water, no duo, no rain), the ticker's clock and price checks stop, the music fades out, and
the menu is inert, so the game has the whole machine. Leaving unloads the game and puts the
cursor (and the focus) back on its cartridge.

Getting back to the menu, without clashing with the games' own pause (Esc / Start):

- **Controller:** hold **View + Menu** (Select + Start; Create + Options on a PlayStation pad) for a
  second. A ring fills up, then you're back. The page reads the pad itself, and the parent page
  keeps getting the pad while the game's iframe has the focus (checked in a Chromium-based
  browser with a real, kernel-level virtual pad, not a script stub).
- **Mouse:** the small **◀ menu** button in the top-left corner, always there. In a game that
  holds the mouse, Esc lets go of it first.
- **Keyboard:** hold **Esc** for a second while the page has the focus (on the loading card, or
  after clicking the corner button). Once the game has the focus, keys go to the game only; a
  page can't see them. So it's Esc (the game pauses and lets go of the mouse), then ◀ menu, or
  the browser's own Back shortcut (Alt + ←, ⌘ [ on a Mac) when the game doesn't swallow it.
- **Back:** the browser's Back button, or a phone's back gesture. A game gets its own history
  entry (`#play/<cmd>`), so Back closes it and lands on the menu instead of leaving the site.

**An optional hook for the games.** A game can send the player back itself, which gives the
keyboard a way back from inside the game (say, a "Back to the menu" line in its pause menu, shown
only when it's framed). The menu already listens for it, and only from the playing game's own
origin and iframe window:

```js
if (window.top !== window) window.parent.postMessage({ type: 'vyvanse:menu' }, 'https://vyvanse.beer');
```

Some browsers only open new tabs (and allow full screen and sound) after a click or a key, and
don't count a pad press as one. Chromium-based ones do count it. Where a `frame: false` game
picked with a pad can't get its tab, the menu asks instead: open it in this tab (Back in the
browser returns here) or click New tab.

### iPhone / installed PWA

In Safari, use **Share → Add to Home Screen → Open as Web App**. The same game shelf fills the
screen, with the existing rooftop, puddle duo, music and tip jar. Pair the DualSense in iOS
Bluetooth settings, press a pad button to expose it to Safari, and use ✕ to play, ○ to go back,
L1/R1 for sections and the d-pad/stick to select. L3 toggles music (M on a keyboard); the music
button also starts audio after the first tap. Create + Options held for one second unloads the
game and returns to the shelf. Touch supports cartridge taps, swiping the artwork, swiping the
section bar, and safe-area back buttons. Portrait works for browsing and PokerBros; other games
ask for landscape. The manifest permits either orientation, and each game's player controls its
landscape lock and rotate hint.

The production build generates `sw.js` from an exact list of launcher files: scripts, fonts,
art, the menu's models, music and install assets. Games, APIs and wallets are never cached.
Offline starts the installed shelf and shows a card; games need a connection. Navigation uses
the network with a short fallback timeout, keeping installed HTML with its own art until a new
complete shell activates. Each content change gets a new shell cache; an
update waits until the visitor clicks **update** in the menu or closes old launcher windows.
Installing an update never reloads an active game. Other open launcher windows also pick up
the new shell, deferring their reload until play ends.

Games receive `?device=phone` only on phone hardware and an authenticated live device message.
The launcher also relays pad snapshots to the selected game's exact origin for WebKit versions
that do not expose pads inside cross-site iframes. Phase 2 games must include the tiny shim and
disable split screen on phones. See [the device/pad contract](docs/device-flag.md).

`scripts/smoke-pwa.mjs` checks the production build with the Playwright iPhone 16 Pro portrait
and landscape WebKit descriptors plus desktop Chromium. It uses a cross-origin fixture for
device/relay checks, tests offline launch and installed landscape geometry, and writes at most
three screenshots. Phone UI checks use WPE's existing poster fallback; Chromium renders the
live water/duo. Physical Bluetooth input and iOS compositor insets still require a real device. Provide a
Playwright installation via `PLAYWRIGHT_MODULE` if it is not in the local dependencies. Run
with the owner smoke TMPDIR, `nice -n 10`, and ports 5960–5964; browsers are headless, audio is
muted, and processes are stopped by their recorded PIDs.

## Music and sounds

`public/audio/vyvanse-bg.webm` (Opus) and `vyvanse-bg.m4a` (AAC, for Safari): a chill piano loop
made for this site, 1:54, at a low volume (0.3). Browsers only allow sound after a click or a key
(or, in some, a pad press), so it fades in on the first one, unless the visitor turned it off (♪ or M, remembered in
`localStorage`). It's fetched only then (`preload="none"`), and it pauses while a game is open
and while the tab is hidden. The menu blips (a short square wave on move and select) are off by
default and have their own toggle (N).

## Look

A rainy night in midnight purple, with a console menu on it. Bebas Neue for the wordmarks and
tabs, VT323 for the status lines and key hints, Tilt Neon for the sign, Spline Sans for reading,
Spline Sans Mono for small code bits; all SIL Open Font License, bundled from Fontsource. Amber
is the cursor: whatever is selected wears it.

**The water** ([`src/water.js`](src/water.js)) is one WebGL2 canvas over the art. Above the
waterline it's clear except for the rain (and, on Games and Contact, a soft blur of the painted
cast behind the duo, so the live pair doesn't fight it). Below it, the floor is a puddle that
mirrors the art upside down, the neon of the cartridges and buttons standing in it, and the duo
(or a crew render) about their own feet. A ripple sim stepped at a fixed 60 Hz takes the rain,
heavy drops that splash, the pointer's wake and clicks. Under text the water is held dark enough
for every pair to meet WCAG AA.

**The crew in 3D** ([`src/duo.js`](src/duo.js)): one renderer that holds any of the eight web
models (`public/models/*-hero.glb`, each with `Idle` and `Big_Wave_Hello`) and shows a pair or
one alone, with a small groove on one shared beat (a head nod, a shoulder bounce, a hip sway).
On Games and Contact, the pair on the right changes on 24-second turns using the existing stage loop.
#4764, #652, yellow-haired #3704 and green-haired #3710 take 17 of each 20 turns; the two Retardios,
#555 with cowboy-hat truck driver #723, and a rare #2564 pair take one each. Edition-specific rosters stay
as before. Reduced motion holds the pair still, and opening a game pauses the loop. Every 7 to 12
seconds one of them waves, at you or at the other one. On Crew, whoever is picked stands alone,
centre stage, and waves hello; he waves again on a click or tap (or X / G). Each model is
fetched the first time it's wanted, and on Crew the cards either side are fetched once his is
in and the page is idle. Until a model is in (and without WebGL, or if it fails) his render
stands there instead. Past six models loaded, the ones off screen for 30 seconds give their GPU
memory back.

## Performance

- First load: the HTML (about 10 KB gzipped, with all the content), the CSS (about 8 KB), the
  menu's JS (about 18 KB), the fonts and the first key art. Everything else waits.
- After the first paint: the stage (water and loop, about 8 KB) and then three.js with the two
  models (about 155 KB gzipped plus 1.4 MB of models), skipped with Save-Data.
- On Crew: each one's model (0.6 to 0.75 MB) the first time his card is picked, and the cards
  either side when idle.
- On demand: the tip jar (about 10 KB), its wallet code (1 to 2 KB), Radbro OS (about 9 KB with
  its CSS), the music (1.4 MB).
- One loop draws both, at 60 fps while you're doing something and 30 after a few idle seconds.
  Pixel ratio capped at 1.25; the water draws at most about 0.9 MP and drops resolution itself
  when frames run long. Nothing runs while the tab is hidden or a game is open.
- Reduced motion: no rain, ripples, groove or automatic waves (a wave only when asked), and no
  flicker or slides.
- No WebGL2, or a failure: the plain backdrops and the crew's renders stay; everything works.

## Phone

The art on top with the puddle under it, the cartridges as a sideways swipe row, the tabs as a
bottom bar, and the ticker drifting slowly above it. Swipe the art to move along the row; tap a
cartridge to pick it, tap again to play.

## Tip jar

The amber "tip vyvanse.sol" pill (top right), Contact → Tip jar, `tip` in the terminal, or
vyvanse.beer/#tip opens a small panel: SOL to vyvanse.sol, or ETH on Ethereum, Arbitrum or
Robinhood Chain to one wallet. It shows the address (copy it, check it against your wallet),
quick amounts or your own, a Solana Pay / EIP-681 link with its QR for phone wallets, and
"connect wallet & send" for browser wallets: Wallet Standard (Phantom, Solflare, Backpack) for
SOL, EIP-6963 (MetaMask, Rabby, Robinhood Wallet's browser) for ETH, which switches or adds the
chain first. The visitor approves a plain transfer in their own wallet; there's no backend.

- Addresses live in [`src/tip/config.js`](src/tip/config.js). vyvanse.sol was resolved the
  way wallets do it (SOL record, else the domain's owner); the panel re-reads those SNS
  accounts from a public RPC when it opens and turns sending off if the answer has changed.
- The SOL transfer is built by hand (`src/tip/sol.js`), so @solana/web3.js never loads. The
  EVM side is plain EIP-1193 calls (`src/tip/evm.js`).
- The panel (with its QR encoder, [uqr](https://github.com/unjs/uqr)) is a lazy chunk, and the
  wallet code another, loaded only on "connect wallet & send". With a controller, the d-pad walks
  its buttons and B closes it.

## Radbro OS

The terminal is a hidden extra: `/` (or `` ` ``) opens it over the menu, as does Contact → Radbro
OS. It reads the same data: `ls`, `info <name>` (moves the menu to it), `open <name>` (plays it
here; `--tab` for a new tab), `crew`, `cd sites`, `wave`, `neofetch`, `tip`, `help`. Tab completes,
↑ and ↓ walk history, Esc closes it. Its code and CSS are their own chunk (`src/os/`).

To add a command, add an entry to the `table` in [`src/os/commands.js`](src/os/commands.js):
`desc` shows in `help`, `usage` changes how it shows there, `args: (words) => [...]` gives it tab
completion, and `hidden: true` leaves it out of `help`.

## Share card and icons

- `public/og4.jpg` is the share card: a painted 1200×630 of the main four, #4764, #652, #3704 and #3710,
  hanging out on a rainy neon rooftop with their supporting crew. The older URLs, `public/og3.jpg`,
  `public/og2.jpg` and `public/og.png`, also show the new four. The PNG keeps the terminal-card layout
  in `scripts/og-card.html`. Previous images sit beside each replacement as `.prev` and are excluded
  from builds. See [the full art inventory](docs/ART.md).
- `public/apple-touch-icon.png` is a 180×180 screenshot of `scripts/touch-icon.html`.
- `public/favicon.svg` is hand-drawn SVG.

## Radbro renders and models

`public/img/radbros/` and `public/img/retardios/` hold flat renders of the rigged models on
transparent backgrounds (the crew renders, 500 px tall), `public/img/faces/` their 200×200 crops
for the character-select tiles. The web models in `public/models/` (all eight, each crew member's
`model` in `src/projects.js`) are the mesh plus `Idle` and `Big_Wave_Hello`, unlit, textures at
1024 in WebP, Draco-compressed. The Retardios' crew downloads are packages like the Radbros'
(`retardio555-3d-model.zip` and `retardio85-3d-model.zip` on the `radbros-3d` release: static,
rigged and animated `.glb`, a preview, a README and the license). `public/draco/` is the Draco
decoder from `three/examples/jsm/libs/draco/gltf/`, served from this site; copy those two files
again if you update `three` (pinned to an exact version).

#3704 and #3710 use the same 24-joint hero rig, WebP / Draco optimisation, Idle and wave clips, grounding,
groove and loading budget as the others. Their Crew cards list PokerBros and RADTAP, and those two games'
launcher art and cartridge labels match their new group paintings. PokerBros's cast excludes #2564.
The new model download links use the existing `radbros-3d` release on this site's repository; attach
`radbro3704-3d-model.zip` and `radbro3710-3d-model.zip` there before publishing the site.

## License

- The site code is MIT: [`LICENSE`](LICENSE).
- The Radbro renders and 3D models (`public/img/radbros/`, `public/models/radbro*`,
  `public/img/radrun.jpg`, `public/og.png`, `public/og2.jpg`) and the `radbros-3d` release downloads are under
  the [Viral Public License](https://viralpubliclicense.org/VPL.txt):
  [`LICENSE-ASSETS`](LICENSE-ASSETS). Use them, remix them, rig them, sell them or put them in
  a game. Anything made from them keeps the same license. The source models are also at
  [dexedrne/radbros-3d](https://github.com/dexedrne/radbros-3d).
- `public/draco/` is the Draco decoder that ships with three.js (Apache-2.0).
- Retardio #555 and #85 (`public/img/retardios/`, `public/models/retardio*`) are dexedrne's own Retardios.
  Their 3D model packages on the `radbros-3d` release are under the same Viral Public License as the Radbros'.
- The background music (`public/audio/`) was made for this site and isn't covered by either
  license above.
- The screenshots of other people's projects in `public/img/` belong to those projects.
