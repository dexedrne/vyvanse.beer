# vyvanse.beer

Project shelf for [dexedrne](https://github.com/dexedrne). Live at https://vyvanse.beer.

Plain static site: Vite builds `index.html` + one stylesheet into `dist/`, and ships no client JS.
The tap list is rendered into the HTML at build time.

```sh
npm install
npm run dev      # local dev server
npm run build    # -> dist/
```

## Add a project

Add one entry to [`src/projects.js`](src/projects.js). Fields are documented at the top of that
file. Images go in `public/img/`.

## Share card and icons

- `public/og.png` is a 1200×630 screenshot of `scripts/og-card.html`.
- `public/apple-touch-icon.png` is a 180×180 screenshot of `scripts/touch-icon.html`.
- `public/favicon.svg` is hand-drawn SVG.

Open the card pages after `npm install` so the fonts resolve.

## Fonts

[Shrikhand](https://fonts.google.com/specimen/Shrikhand) and
[Schibsted Grotesk](https://fonts.google.com/specimen/Schibsted+Grotesk), both SIL Open Font
License, bundled from Fontsource.
