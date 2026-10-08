# Launcher art

The site's rooftop art and all four share-card URLs now put violet #4764, brown #652, yellow #3704 and mint
green #3710 together in front. #555 and #85 stay in the pieces that already had them, with #723 secondary.
#555's car is an unbadged red pop-up-headlight roadster; cowboy #723's vehicle is a weathered pickup. No ghost
appears in the new group paintings. Existing individual ghost renders remain for his selectable Crew card and
the rare automatic hero turn, using the same fallback as everyone else.

`public/og3.jpg` is the share-size export of `public/img/art/vyvanse.webp`, as before. The older solo-style
`og2.jpg` and terminal-style `og.png` now show the main four. The PokerBros background is the new game's
painting with its footer typography removed; RADTAP uses its new landscape title painting. Their 420 × 236
cartridge labels are smaller exports of the corresponding 1600 × 900 paintings. The two new 200 × 200 portraits match the existing NFT bust style; their transparent full-body
Crew fallbacks are 242 × 500 WebP.

SPIDERTAG, RadPayne, RBGO, RadOps and RadZombies use their games' main-four paintings at
`*-cast2.webp` backdrop URLs. Their 1600 × 900 backdrops retain the prior size and lossy WebP format.
Their 512 × 512 cartridge labels at fresh `*-square.webp` URLs recompose each scene into a square,
with all four characters centred and fully in frame. The scene fills every edge, with no bars or words.
The cartridge label is 4:3 with `object-fit: cover`, so the square's top and bottom 12.5% are cropped;
the characters fit inside that area. Labels retain the original lossy WebP quality 90, method 6.
The previous `*-cast2.webp` labels remain byte-for-byte beside them. Each earlier backdrop and label is
kept beside the new files as `*.prev.webp`, excluded by the existing build rule. The two Retardios-only
editions retain their images and Crew membership.

Every replaced image is preserved byte-for-byte beside the new one as `.prev`. The build removes those
archives. Pixel dimensions and RGB / RGBA modes match the replaced assets: lossy WebP remains WebP, JPEG
remains JPEG (qualities 86 / 78 / 83 for `og2` / `og3` / `og4`), and the PNG remains lossless RGB PNG.
Shirt prints follow the NFT references, with the car-brand word on #85's shirt made generic and brand
lettering omitted from the cowboy's vest.

The new hero GLBs are the supplied unlit, 1024px WebP, Draco assets with no normals, resampled Idle and
Big_Wave_Hello clips, common 24-joint rig, feet at y=0 and facing +Z. They are 683,480 / 673,536 bytes, both
below the previous 753,320-byte hero ceiling. The existing six-model memory cap remains. There is no
separate held-prop or weapon-skin slot in this launcher, so the optional launcher prop is not attached.

After `npm run build`, check archive exclusion with:

```sh
node --input-type=module -e 'import { globSync } from "node:fs"; import assert from "node:assert/strict"; assert.equal(globSync("**/*.prev.*", { cwd: "dist" }).length, 0)'
```


Every 2D file in this checkout (87 files), including archives and documentation captures. Loading screens use the title art or code; there is no separate raster loading illustration.

| File | Size | Format | Use |
| --- | --- | --- | --- |
| `public/apple-touch-icon.png` | 180 × 180 | PNG | UI / room / deck texture |
| `public/favicon.svg` | vector | SVG | UI / room / deck texture |
| `public/img/art/pokerbros.prev.webp` | 1600 × 900 | WEBP | archive (excluded from build) |
| `public/img/art/pokerbros.webp` | 1600 × 900 | WEBP | launcher game / site art |
| `public/img/art/radbrawl.webp` | 1600 × 900 | WEBP | launcher game / site art |
| `public/img/art/radfighter.webp` | 1600 × 900 | WEBP | launcher game / site art |
| `public/img/art/radops-cast2.webp` | 1600 × 900 | WEBP | launcher game / site art |
| `public/img/art/radops.prev.webp` | 1600 × 900 | WEBP | archive (excluded from build) |
| `public/img/art/radpayne-cast2.webp` | 1600 × 900 | WEBP | launcher game / site art |
| `public/img/art/radpayne.prev.webp` | 1600 × 900 | WEBP | archive (excluded from build) |
| `public/img/art/radrun-cast2.webp` | 1600 × 900 | WEBP | launcher game / site art |
| `public/img/art/radrun.prev.webp` | 1600 × 900 | WEBP | archive (excluded from build) |
| `public/img/art/radtap.prev.webp` | 1600 × 900 | WEBP | archive (excluded from build) |
| `public/img/art/radtap.webp` | 1600 × 900 | WEBP | launcher game / site art |
| `public/img/art/radzombies-cast2.webp` | 1600 × 900 | WEBP | launcher game / site art |
| `public/img/art/radzombies.prev.webp` | 1600 × 900 | WEBP | archive (excluded from build) |
| `public/img/art/rbgo-cast2.webp` | 1600 × 900 | WEBP | launcher game / site art |
| `public/img/art/rbgo.prev.webp` | 1600 × 900 | WEBP | archive (excluded from build) |
| `public/img/art/retardiopayne.webp` | 1600 × 900 | WEBP | launcher game / site art |
| `public/img/art/shitbox.webp` | 1600 × 900 | WEBP | launcher game / site art |
| `public/img/art/solscape.webp` | 1600 × 840 | WEBP | launcher game / site art |
| `public/img/art/vyvanse.prev.webp` | 1600 × 900 | WEBP | archive (excluded from build) |
| `public/img/art/vyvanse.webp` | 1600 × 900 | WEBP | launcher game / site art |
| `public/img/art/zombietardio.webp` | 1600 × 900 | WEBP | launcher game / site art |
| `public/img/bitcorn.webp` | 800 × 420 | WEBP | UI / room / deck texture |
| `public/img/bulk.webp` | 800 × 420 | WEBP | UI / room / deck texture |
| `public/img/bulkagachi.webp` | 800 × 420 | WEBP | UI / room / deck texture |
| `public/img/faces/radbro-2564.webp` | 200 × 200 | WEBP | character portrait |
| `public/img/faces/radbro-3704.webp` | 200 × 200 | WEBP | character portrait |
| `public/img/faces/radbro-3710.webp` | 200 × 200 | WEBP | character portrait |
| `public/img/faces/radbro-4764.webp` | 200 × 200 | WEBP | character portrait |
| `public/img/faces/radbro-652.webp` | 200 × 200 | WEBP | character portrait |
| `public/img/faces/radbro-723.webp` | 200 × 200 | WEBP | character portrait |
| `public/img/faces/retardio-555.webp` | 200 × 200 | WEBP | character portrait |
| `public/img/faces/retardio-85.webp` | 200 × 200 | WEBP | character portrait |
| `public/img/hog.webp` | 800 × 420 | WEBP | UI / room / deck texture |
| `public/img/radbros/radbro-2564.webp` | 265 × 500 | WEBP | character portrait |
| `public/img/radbros/radbro-3704.webp` | 295 × 500 | WEBP | character portrait |
| `public/img/radbros/radbro-3710.webp` | 307 × 500 | WEBP | character portrait |
| `public/img/radbros/radbro-4764-hero.webp` | 719 × 1100 | WEBP | character portrait |
| `public/img/radbros/radbro-4764.webp` | 285 × 500 | WEBP | character portrait |
| `public/img/radbros/radbro-652.webp` | 267 × 500 | WEBP | character portrait |
| `public/img/radbros/radbro-723.webp` | 336 × 500 | WEBP | character portrait |
| `public/img/radrun.jpg` | 1200 × 630 | JPEG | UI / room / deck texture |
| `public/img/retardios/retardio-555.webp` | 312 × 500 | WEBP | character portrait |
| `public/img/retardios/retardio-85.webp` | 186 × 500 | WEBP | character portrait |
| `public/img/sanic.webp` | 800 × 420 | WEBP | UI / room / deck texture |
| `public/img/solscape.webp` | 800 × 420 | WEBP | UI / room / deck texture |
| `public/img/thumb/bitcorn.webp` | 420 × 221 | WEBP | launcher game / site art |
| `public/img/thumb/bulk.webp` | 420 × 221 | WEBP | launcher game / site art |
| `public/img/thumb/bulkagachi.webp` | 420 × 221 | WEBP | launcher game / site art |
| `public/img/thumb/hog.webp` | 420 × 221 | WEBP | launcher game / site art |
| `public/img/thumb/pokerbros.prev.webp` | 420 × 236 | WEBP | archive (excluded from build) |
| `public/img/thumb/pokerbros.webp` | 420 × 236 | WEBP | launcher game / site art |
| `public/img/thumb/radbrawl.webp` | 420 × 236 | WEBP | launcher game / site art |
| `public/img/thumb/radfighter.webp` | 420 × 236 | WEBP | launcher game / site art |
| `public/img/thumb/radops-cast2.webp` | 512 × 512 | WEBP | previous cartridge label (retained) |
| `public/img/thumb/radops-square.webp` | 512 × 512 | WEBP | launcher cartridge label |
| `public/img/thumb/radops.prev.webp` | 420 × 236 | WEBP | archive (excluded from build) |
| `public/img/thumb/radpayne-cast2.webp` | 512 × 512 | WEBP | previous cartridge label (retained) |
| `public/img/thumb/radpayne-square.webp` | 512 × 512 | WEBP | launcher cartridge label |
| `public/img/thumb/radpayne.prev.webp` | 420 × 236 | WEBP | archive (excluded from build) |
| `public/img/thumb/radrun-cast2.webp` | 512 × 512 | WEBP | previous cartridge label (retained) |
| `public/img/thumb/radrun-square.webp` | 512 × 512 | WEBP | launcher cartridge label |
| `public/img/thumb/radrun.prev.webp` | 420 × 236 | WEBP | archive (excluded from build) |
| `public/img/thumb/radtap.prev.webp` | 420 × 236 | WEBP | archive (excluded from build) |
| `public/img/thumb/radtap.webp` | 420 × 236 | WEBP | launcher game / site art |
| `public/img/thumb/radzombies-cast2.webp` | 512 × 512 | WEBP | previous cartridge label (retained) |
| `public/img/thumb/radzombies-square.webp` | 512 × 512 | WEBP | launcher cartridge label |
| `public/img/thumb/radzombies.prev.webp` | 420 × 236 | WEBP | archive (excluded from build) |
| `public/img/thumb/rbgo-cast2.webp` | 512 × 512 | WEBP | previous cartridge label (retained) |
| `public/img/thumb/rbgo-square.webp` | 512 × 512 | WEBP | launcher cartridge label |
| `public/img/thumb/rbgo.prev.webp` | 420 × 236 | WEBP | archive (excluded from build) |
| `public/img/thumb/retardiopayne.webp` | 420 × 236 | WEBP | launcher game / site art |
| `public/img/thumb/sanic.webp` | 420 × 221 | WEBP | launcher game / site art |
| `public/img/thumb/shitbox.webp` | 420 × 236 | WEBP | launcher game / site art |
| `public/img/thumb/solscape.webp` | 420 × 221 | WEBP | launcher game / site art |
| `public/img/thumb/zombietardio.webp` | 420 × 236 | WEBP | launcher game / site art |
| `public/og.png` | 1200 × 630 | PNG | share / OG art |
| `public/og.prev.png` | 1200 × 630 | PNG | archive (excluded from build) |
| `public/og2.jpg` | 1200 × 630 | JPEG | share / OG art |
| `public/og2.prev.jpg` | 1200 × 630 | JPEG | archive (excluded from build) |
| `public/og3.jpg` | 1200 × 630 | JPEG | share / OG art |
| `public/og3.prev.jpg` | 1200 × 630 | JPEG | archive (excluded from build) |
| `public/og4.jpg` | 1200 × 630 | JPEG | share / OG art |
| `public/og4.prev.jpg` | 1200 × 630 | JPEG | archive (excluded from build) |
| `scripts/og-backdrop.jpg` | 1200 × 630 | JPEG | share / OG art |
