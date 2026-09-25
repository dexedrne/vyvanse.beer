# vyvanse.beer

Projects by dexedrne: [GitHub](https://github.com/dexedrne) · [X](https://x.com/dexedrne).
Live at https://vyvanse.beer.

A plain landing page with a terminal, Radbro OS, one click away. It starts hidden: the
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
HTML without JS. The terminal and windows (`src/main.js`, about 14 KB gzipped) are layered on top.
The 3D viewer for the hero is a separate chunk (about 290 KB gzipped) that only loads once the
hero is on screen.

## Add a project

Add an entry to `projects` in [`src/projects.js`](src/projects.js). The fields are documented
at the top of that file. `group: 'games'` gets a row with a screenshot, `group: 'sites'` gets
a picture card in a two-column grid (one column on phones). The `cmd` name is what the
terminal takes (`open <cmd>`, `info <cmd>`), and it tab-completes automatically.

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

## Look

Midnight purple. The colour tokens are at the top of [`src/style.css`](src/style.css), and every
text pair meets WCAG AA. Type is [Spline Sans](https://fonts.google.com/specimen/Spline+Sans)
for the page and [Spline Sans Mono](https://fonts.google.com/specimen/Spline+Sans+Mono) for
the terminal. Both are SIL Open Font License and bundled from Fontsource.

## Share card and icons

- `public/og.png` is a 1200×630 screenshot of `scripts/og-card.html`.
- `public/apple-touch-icon.png` is a 180×180 screenshot of `scripts/touch-icon.html`.
- `public/favicon.svg` is hand-drawn SVG.

Open the card pages after `npm install` so the fonts resolve.

## Radbro renders

`public/img/radbros/` holds flat renders of the rigged Radbro models on transparent
backgrounds: `radbro-4764-hero.webp` (719×1100, waving) for the hero, and 500px-tall crew
figures.

## #4764 in 3D

The hero is a [`<model-viewer>`](https://modelviewer.dev) you can drag around (`src/bro.js`).
The render above is its poster, so the first paint is the same picture, and without JS it's
just that image. He idles, waves every 8 to 12 seconds (or when you tap him), and turns slowly
after 4 seconds on his own. With reduced motion on, he doesn't turn or wave by himself. In the
terminal, `spin` spins him round.

- `public/models/radbro4764-hero.glb` (about 730 KB) is a web cut of the rigged model: the
  mesh plus two clips, `Idle` and `Big_Wave_Hello`, with both turned to face the camera. It
  was made with [glTF-Transform](https://gltf-transform.dev): unlit, texture resized to 1024
  and converted to WebP at quality 90, animations resampled, then Draco.
- `public/draco/` is the Draco decoder from `three/examples/jsm/libs/draco/gltf/`, served from
  this site instead of Google's CDN. Copy those two files again if you update `three`.
- `@google/model-viewer` and `three` are pinned to exact versions. model-viewer 4.3.1 never
  fires `finished`, so `src/bro.js` watches the wave's clock instead.
