# vyvanse.beer

Projects by dexedrne: [GitHub](https://github.com/dexedrne) · [X](https://x.com/dexedrne).
Live at https://vyvanse.beer. To get in touch, DM [@dexedrne on X](https://x.com/dexedrne).

A game-select screen on a rainy rooftop. Four tabs (**Games, Crew, Sites, Contact**), the selected
game's key art filling the screen over a puddle that mirrors it, Radbro #4764 and Retardio #85
standing in the water in 3D, and the cartridges along the bottom. Pick a game and it plays right
here, full screen, with a keyboard, a mouse, touch or a controller, like a console's big-screen
menu.

```sh
npm install
npm run dev      # local dev server
npm run build    # -> dist/
node test/ticker.js
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
| `src/audio.js` | The background music and the menu blips. |
| `src/stage.js` | One animation loop for the water and the duo; pauses while a game is open. |
| `src/water.js` | The rain and the puddle (WebGL2). |
| `src/duo.js` | #4764 and #85 in 3D (three.js). |
| `src/ticker.js` | UTC clock and live BTC / ETH / SOL / XRP / RETARDIO prices in the bottom strip. |
| `src/tip/` | The tip jar. |
| `src/os/` | Radbro OS, the terminal. |
| `src/style.css` | The look. Colour tokens at the top. |

## Add a project

Add an entry to `projects` in `src/projects.js`. `group: 'games'` gets a cartridge on Games and
its key art fills the screen (`image`, 1600×900 webp in `public/img/art/`); `group: 'sites'` gets
a grey cartridge on Sites and its 800×420 screenshot in the preview monitor. Both want a
cartridge label in `public/img/thumb/` (420×236 webp), a `shell` colour for the plastic and an
`accent` for the glow. A game's `cast` lists who you can play as (by crew `num`); Crew reads it
for each one's "in" list.

Set `frame: true` only if the site allows being shown in an iframe:

```sh
curl -sI https://example.com | grep -iE 'x-frame-options|frame-ancestors'
```

No output means `frame: true` is fine and PLAY runs it inside the page. With `frame: false` it
opens in a new tab, and the button and status line say so (Solscape, bitcorn and sanic).

## Controls

The glyphs on screen follow whatever was used last: keys, Xbox buttons, or PlayStation shapes
(a pad whose name or vendor says Sony).

| | Keyboard | Controller | Mouse / touch |
| --- | --- | --- | --- |
| Move | ← → (A D); ↑ ↓ on Contact | D-pad or left stick (held: repeats) | click a cartridge; swipe the art |
| Play / pick | Enter | A (✕), or Start | click it again, or PLAY |
| Back | Esc | B (○) | |
| Sections | Q / E | LB / RB (L1 / R1) | the tabs (a bottom bar on phones) |
| Details | I | Y (△) | "details" |
| Make one wave | G | X (□) | click or tap one of them |
| Full screen | F | View / Select | ⛶ |
| Music, menu sounds | M, N | | ♪ and the speaker |
| Radbro OS | / or ` | | Contact → Radbro OS |

View and Start act when they're let go, and only on their own: pressed together they're the
player's way back to the menu (below), so in the menu that combo does nothing. The pad is read on
a short timer rather than on animation frames, so a quick tap still counts when frames are slow.
The hints in the bottom strip drop their least important lines first when the strip is short, so
the ones for picking and going back always show whole.

A pad gives a small rumble on select where it can. The address bar keeps your place
(`#games/rbgo`, `#crew/85`, `#sites/sanic`, `#contact`), `#tip` opens the tip jar, `#play/radrun`
starts a game, and the old page's anchors (`#radrun`, `#radbro-4764`, `#bulk-os`) still land on
the right item.

## Games in the player

PLAY runs a game in a full-screen iframe
(`allow="gamepad; fullscreen; autoplay; clipboard-write; xr-spatial-tracking"`) behind a loading
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
origin:

```js
if (window.top !== window) window.parent.postMessage({ type: 'vyvanse:menu' }, 'https://vyvanse.beer');
```

Some browsers only open new tabs (and allow full screen and sound) after a click or a key, and
don't count a pad press as one. Chromium-based ones do count it. Where a `frame: false` game
picked with a pad can't get its tab, the menu asks instead: open it in this tab (Back in the
browser returns here) or click New tab.

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

**The duo** ([`src/duo.js`](src/duo.js)): `public/models/radbro4764-hero.glb` and
`retardio85-hero.glb`, each with `Idle` and `Big_Wave_Hello`, plus a small groove on one shared
beat (a head nod, a shoulder bounce, a hip sway), #85 a beat-fraction behind. Every 7 to 12
seconds one of them waves, at you or at the other one; click or tap one (or press X / G) and he
waves. They stand on the right of Games and Contact, and centre stage on Crew when #4764 or #85
is picked. Until three.js and the models load (and without WebGL) their renders stand there
instead.

## Performance

- First load: the HTML (about 10 KB gzipped, with all the content), the CSS (about 8 KB), the
  menu's JS (about 18 KB), the fonts and the first key art. Everything else waits.
- After the first paint: the stage (water and loop, about 8 KB) and then three.js with the two
  models (about 155 KB gzipped plus 1.4 MB of models), skipped with Save-Data.
- On demand: the tip jar (about 10 KB), its wallet code (1 to 2 KB), Radbro OS (about 9 KB with
  its CSS), the music (1.4 MB).
- One loop draws both, at 60 fps while you're doing something and 30 after a few idle seconds.
  Pixel ratio capped at 1.25; the water draws at most about 0.9 MP and drops resolution itself
  when frames run long. Nothing runs while the tab is hidden or a game is open.
- Reduced motion: no rain, ripples, groove or automatic waves (a wave only when asked), and no
  flicker or slides.
- No WebGL2, or a failure: the plain backdrops and the duo's renders stay; everything works.

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

- `public/og4.jpg` is the share card: a painted 1200×630 of Radbro #4764 and Retardio #85 hanging
  out on a rainy neon rooftop under the vyvanse.beer sign. The older cards, `public/og3.jpg`,
  `public/og2.jpg` and `public/og.png` (a screenshot of `scripts/og-card.html`), stay so old links
  keep their preview.
- `public/apple-touch-icon.png` is a 180×180 screenshot of `scripts/touch-icon.html`.
- `public/favicon.svg` is hand-drawn SVG.

## Radbro renders and models

`public/img/radbros/` and `public/img/retardios/` hold flat renders of the rigged models on
transparent backgrounds (the crew renders, 500 px tall), `public/img/faces/` their 200×200 crops
for the character-select tiles. The web models in `public/models/` (#4764, #555 and #85) are the
mesh plus `Idle` and `Big_Wave_Hello`, unlit, textures at 1024 in WebP, Draco-compressed; the
Retardios' crew downloads are these same files. `public/draco/` is the Draco decoder from
`three/examples/jsm/libs/draco/gltf/`, served from this site; copy those two files again if you
update `three` (pinned to an exact version).

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
- The background music (`public/audio/`) was made for this site and isn't covered by either
  license above.
- The screenshots of other people's projects in `public/img/` belong to those projects.
