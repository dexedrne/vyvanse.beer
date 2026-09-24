# vyvanse.beer

Projects by dexedrne: [GitHub](https://github.com/dexedrne) · [X](https://x.com/dexedrne).
Live at https://vyvanse.beer.

A plain landing page with a terminal beside it. Both read the same data, so clicking a
project types `open <name>` into the terminal, and typing commands moves the page. Projects
that allow framing open in draggable in-page windows (full-screen sheets on phones). The rest
open in a new tab.

```sh
npm install
npm run dev      # local dev server
npm run build    # -> dist/
```

The landing is rendered into `index.html` at build time, so every project and link is in the
HTML without JS. The terminal and windows (`src/main.js`, about 10 KB gzipped) are layered on top.

## Add a project

Add an entry to `projects` in [`src/projects.js`](src/projects.js). The fields are documented
at the top of that file. `group: 'games'` gets a row with a screenshot, `group: 'older'` gets
a compact line. The `cmd` name is what the terminal takes (`open <cmd>`, `info <cmd>`), and it
tab-completes automatically.

Set `frame: true` only if the site allows being shown in an iframe:

```sh
curl -sI https://example.com | grep -iE 'x-frame-options|frame-ancestors'
```

No output means `frame: true` is fine. If the site sends either header, use `frame: false`
and `open` uses a new tab instead.

Screenshots go in `public/img/`: 800px-wide webp at about 1.9:1, under 80 KB.

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

`usage: 'hello <name>'` changes how it shows in `help`, `args: () => [...]` gives it tab
completion, and `hidden: true` leaves it out of `help`. To add a quick-command chip, add a
`<button data-cmd="...">` to `.term__chips` in `index.html`. Anything on the page with
`data-cmd` runs that command when clicked.

## Keys

`/` or `` ` `` focuses the terminal, Tab completes, ↑ and ↓ walk history, Ctrl+L clears,
Esc puts the sheet away (and minimises a focused window).

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
