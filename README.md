# vyvanse.beer

Projects by dexedrne: [GitHub](https://github.com/dexedrne) · [X](https://x.com/dexedrne).
Live at https://vyvanse.beer. To get in touch, DM [@dexedrne on X](https://x.com/dexedrne).

A rainy-night landing page with a terminal, Radbro OS, one click away. It starts hidden: the
`>_ radbro os` button (or `/`) opens it, docked beside the page on desktop and as a bottom
sheet on phones, and the first open in a session greets you with `neofetch`. Both read the
same data, so clicking a project runs `open <name>`, and typing commands moves the page.

Projects open in a new tab. Projects that allow framing can also run in draggable in-page
windows (full-screen sheets on phones), but only when asked: the small "In a window" button on
their card, `win <name>` (or `open <name> --window`) in the terminal, or `set windows on`
to make windows the default. That setting is remembered in `localStorage`; `set windows off`
goes back to tabs, and `open <name> --tab` always uses a tab.

```sh
npm install
npm run dev      # local dev server
npm run build    # -> dist/
```

The landing is rendered into `index.html` at build time, so every project and link is in the
HTML without JS. The terminal and windows (`src/main.js`, about 17 KB gzipped) are layered on top.
The 3D viewer for the hero is a separate chunk (about 290 KB gzipped) that only loads once the
hero is on screen, and the rainy night behind the page (`src/water.js`, about 13 KB gzipped) is
another, fetched straight away and started right after the first paint.

## Add a project

Add an entry to `projects` in [`src/projects.js`](src/projects.js). The fields are documented
at the top of that file. `group: 'games'` gets a big pane with its screenshot on one side (the
side swaps from one game to the next, and phones put it on top), `group: 'sites'` gets a picture
card, three to a row (two on tablets, one on phones), with a short last row centred. The `cmd`
name is what the terminal takes (`open <cmd>`, `info <cmd>`), and it tab-completes automatically.

Set `frame: true` only if the site allows being shown in an iframe:

```sh
curl -sI https://example.com | grep -iE 'x-frame-options|frame-ancestors'
```

No output means `frame: true` is fine, and the project gets the opt-in window controls. If
the site sends either header, use `frame: false` and it only ever opens in a new tab.

Screenshots go in `public/img/`: 800×420 webp, under 80 KB. A project without one still gets
a card, just with a plain tile where the picture would be.

## Add a command

Add an entry to the `table` in [`src/commands.js`](src/commands.js):

```js
hello: {
  desc: 'say hi',            // shown in `help`
  run(args, ctx) {
    term.print(line('hi ', args.join(' ')));
  },
},
```

`usage: 'hello <name>'` changes how it shows in `help`, `args: (words) => [...]` gives it tab
completion (`words` is what's typed so far, split on spaces), and `hidden: true` leaves it out
of `help`. To add a quick-command chip, add a
`<button data-cmd="...">` to `.term__chips` in `index.html`. Anything on the page with
`data-cmd` runs that command when clicked.

## Keys

`/` or `` ` `` opens the terminal at the prompt, Tab completes, ↑ and ↓ walk history, Ctrl+L
clears, Esc closes it (and minimises a focused window). Open or closed is remembered for the
tab session only, so new visits always start on the plain landing. `set windows on|off` is the
one setting that sticks between visits.

## Tip jar

The amber "tip vyvanse.sol" pill in the contact pane (or `tip` in the terminal, or
vyvanse.beer/#tip) opens a small panel: SOL to vyvanse.sol, or ETH on Ethereum, Arbitrum or
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
- The panel (with its QR encoder, [uqr](https://github.com/unjs/uqr)) is a lazy chunk of about
  8 KB gzipped, and the wallet code another 1 to 2 KB, loaded only on "connect wallet & send".

## Look

A rainy night in midnight purple. The neon sign (`vyvanse.beer`, the `.beer` in amber) and #4764
stand on the waterline of a puddle that mirrors them (on phones he stands up on the sign's
letters), and a stream runs on down the page. It passes a drop at each section's heading, widens
into pools with rings from the drips, and swings out behind the glass panes. The crew stand at a
second waterline, mirrored in their own strip of water. The sections surface as they scroll in,
and the panes on the water are dark glass.

The water is [`src/water.js`](src/water.js): one WebGL2 canvas fixed behind the page, drawn by a
single fragment shader over a small ripple simulation.

- The sign's reflection is drawn from the real `<h1>` and flickers on with it, and #4764's copies
  his live 3D canvas every frame while the hero is on screen (his render before that).
- The stream is night water seen from above: wavelets riding the current catch the light as
  glints and mirror a hazy sky in moving bands, flecks of foam drift down, and the neon of the
  section titles and of each game's and site's art shows in it, broken up by the waves.
- Rain lands everywhere below the waterline (now and then a heavy drop that splashes), the pools
  get drips, the pointer (or a finger) leaves a wake, each section heading drops a ripple into
  its pool as it scrolls in, and scrolling speeds the stream up. The ripples move with the page
  and step at a fixed 60 Hz on any display.
- On wide screens the drops sit in the margin and the stream runs down it past the headings. On
  narrower ones the drops sit in the open water above each heading, and the stream dips under
  it. Under text the water is held dark enough for every pair to meet WCAG AA, and a little less
  so under the glass.
- It starts right after the first paint (the CSS reflections stand in until it has drawn, then
  fade out as it fades in), draws at most 60 frames a second (30 once nothing has moved for a few
  seconds), and stops while the tab is hidden. If frames run long for the display it draws fewer
  pixels, and if even the fewest stay under about 24 fps in its first seconds it hands over to
  the CSS night. With reduced motion it draws still frames only: no rain, ripples or flow. The
  sign's flicker, the reveals and the drop rings are off too.
- Without WebGL2 (or JS) the page keeps a plain CSS night, and the sign, #4764 and the crew get a
  CSS reflection instead.

The colour tokens are at the top of [`src/style.css`](src/style.css), and every text pair meets
WCAG AA. Type is [Tilt Neon](https://fonts.google.com/specimen/Tilt+Neon) for the sign and the
section titles, [Spline Sans](https://fonts.google.com/specimen/Spline+Sans) for the page,
[Spline Sans Mono](https://fonts.google.com/specimen/Spline+Sans+Mono) for small code bits, and
the bitmap terminal face [VT323](https://fonts.google.com/specimen/VT323) for Radbro OS and the
hero's boot log. All four are SIL Open Font License and bundled from Fontsource.

## Share card and icons

- `public/og2.jpg` is the share card: a painted 1200×630 of #4764 in a rainy neon puddle under the
  vyvanse.beer sign. The older card, `public/og.png`, is a screenshot of `scripts/og-card.html`
  and stays so old links keep their preview.
- `public/apple-touch-icon.png` is a 180×180 screenshot of `scripts/touch-icon.html`.
- `public/favicon.svg` is hand-drawn SVG.

Open the card pages after `npm install` so the fonts resolve.

## Radbro renders

`public/img/radbros/` holds flat renders of the rigged Radbro models on transparent
backgrounds: `radbro-4764-hero.webp` (719×1100, waving) for the hero, and 500px-tall crew
figures. `public/img/retardios/` holds the same 500px crew figures of Retardio #555 (waving) and
Retardio #85 (cheering), rendered from their game models; their crew downloads are the web models
`public/models/retardio555-hero.glb` and `retardio85-hero.glb` (mesh + `Idle` and `Big_Wave_Hello`,
the same cut as #4764's).

## #4764 in 3D

The hero is a [`<model-viewer>`](https://modelviewer.dev) you can drag around (`src/bro.js`).
The render above is its poster, scaled to the same size and spot as the 3D view, so the first
paint is the same picture, and without JS (or WebGL) it's just that image. The camera aims high
enough that his feet sit near the bottom of the box, on the hero's waterline; the room over his
head (for the katana and the tilt) is kept out of the layout with a negative margin. He idles, waves every 8 to 12 seconds (or when you tap him), and turns slowly
after 4 seconds on his own. With reduced motion on, he doesn't turn or wave by himself. In the
terminal, `spin` spins him round.

- `public/models/radbro4764-hero.glb` (about 730 KB) is a web cut of the rigged model: the
  mesh plus two clips, `Idle` and `Big_Wave_Hello`, with both turned to face the camera. It
  was made with [glTF-Transform](https://gltf-transform.dev): unlit, texture resized to 1024
  and converted to WebP at quality 90, animations resampled, then Draco.
- `public/draco/` is the Draco decoder from `three/examples/jsm/libs/draco/gltf/`, served from
  this site instead of Google's CDN. Copy those two files again if you update `three`.
- `@google/model-viewer` and `three` are pinned to exact versions. model-viewer 4.3.1 never
  fires `finished`, so `src/bro.js` watches the wave's clock instead, and its leftover debug
  `console.log` calls are silenced in the build (`vite.config.js`). Keyboard focus lands inside
  its shadow DOM, so `src/bro.js` adds the lilac focus ring there.

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
- The screenshots of other people's projects in `public/img/` belong to those projects.
