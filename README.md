# vyvanse.beer

Project shelf for [dexedrne](https://github.com/dexedrne). Live at https://vyvanse.beer.

Plain static site: Vite builds `index.html` + one stylesheet into `dist/`, and ships no client JS.
The menu (every section and card) is rendered into the HTML at build time.

```sh
npm install
npm run dev      # local dev server
npm run build    # -> dist/
```

## On the menu

**On tap**, games and worlds:

- [Rug Run](https://rugrun.vyvanse.beer), Radbro rooftop chase, free-swing 3D browser game
  ([source](https://github.com/dexedrne/rug-run))
- [Solscape](https://www.solscape.fun), original multiplayer browser world in open beta
  ([play](https://play.solscape.fun))
- [Robinscape](https://robinscape.quest), dark forest castle roguelite
- [BITCORN](https://bitcorn.lol), website with Cornelius's 3D corn maze and a pixel farm

**Bottle shop**, coin and meme sites:

- [HOG on Solana](https://www.crankmyhog.lol)
- [Dood](https://doodpfp.lol)
- [Cucked Peter](https://cuckedpeter.vercel.app)
- [CHUDBOB](https://chudbob-phi.vercel.app)

**From the cellar**, older pours and code:

- [BULK OS](https://www.bulked.lol/os), an old web desktop full of early games and hand-edited sprites
- [$SANIC](https://www.sanic.fun), playable WebGL ring runner
- [KH:CoM decomp](https://github.com/dexedrne/khcom), byte-identical GBA decompilation

## Add a project

Add one entry to a section in [`src/projects.js`](src/projects.js). Fields are documented at the
top of that file. Big "on tap" cards take the image layout, "bottle shop" entries go in the compact
grid, and a new section only needs a new object in `sections`.

Card images live in `public/img/`: 800px-wide webp, under 80 KB, 800x420 for a big card and
800x500 for a bottle. They are cropped from a 1280x720 screenshot of the live site, or taken
from the site's own share image when the landing page shows a contract address or needs a click.

## Share card and icons

- `public/og.png` is a 1200×630 screenshot of `scripts/og-card.html`.
- `public/apple-touch-icon.png` is a 180×180 screenshot of `scripts/touch-icon.html`.
- `public/favicon.svg` is hand-drawn SVG.

Open the card pages after `npm install` so the fonts resolve.

## Fonts

[Shrikhand](https://fonts.google.com/specimen/Shrikhand) and
[Schibsted Grotesk](https://fonts.google.com/specimen/Schibsted+Grotesk), both SIL Open Font
License, bundled from Fontsource.
