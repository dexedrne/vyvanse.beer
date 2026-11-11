# 11/10 pass: integration

One branch, blast/int-1110, built on blast/base-1110 (add778f). This is the commit a release would be built from.

## Merged (in this order, each with --no-ff, no conflicts)

| package | reviewed head | merge | what a player sees |
|---|---|---|---|
| vyv-menu-pad | 2e37369 | 5f7a51e | Opening blurbs end on a whole sentence; details stay under the top bar at 720p; from a pad the open-it-here dialog has two buttons and links in the details sheet work; phone prompts name the right buttons; the phone pair is no longer cut off; the wave hint keeps clear of other text. |
| vyv-layout-css | 0633d50 | f680c2d | A visible focus ring in every dialog with a pad; a pack's contents open as a visible panel on desktop; Contact, the shelf (all 13 cartridges and the count), Sites and the Wallpapers pack fit on laptop screens; the top bar stays still; Settings in the site's own dark colours, not navy, and it closes on a click outside. |
| vyv-content | 9755095 | a80ada2 | Key art on RadQuest, RADCRAFT and BROGATE; BROGATE, RadQuest, RADCRAFT, ZombieTardio and SHITBOX copy matches the games that ship; Sassy's button opens the camp. |
| vyv-scene | 95571b4 | 90fa331 | No hitch in the rain on a shelf step; the pair keep their faces toward the camera while idling; the pair is drawn at the phone screen's own sharpness; the pair arrives sooner on a first visit. |

The four packages own separate files (main.js; style.css and settings.js; projects.js; water.js, duo.js and stage.js), so nothing had to be resolved.

## Left out

Nothing.

## Suite

- npm run check: syntax checked 77 files, passed.
- npm test: 119 tests, 118 pass, 0 fail, 1 skipped. The skip is the real-Redis limits test, which only runs when a Redis server binary is given (REDIS_SERVER_BIN); it is skipped the same way on the base.

## Build

vite 8.3.1, 46 modules, built in under a second with no warnings: index.html 399.9 kB (43.9 kB gzip), main script 127.8 kB, the 3D pair's chunk 608.8 kB (under the 700 kB limit), styles 99.1 kB.
The build box has no unzip, so npm run build stopped at its first step (fetching the pinned Run Escape release). That step was done by hand with the same address and the same checksum (it matched), unpacked with python3, and then vite build ran under the build lock. Nothing in the repository was changed for it.

## Look set against the live site

Each picture is the live site (vyvanse.beer) on top or left and this build below or right, at the same address, window size and wait. Nothing is worse than live, so nothing was reverted.

- look-games-1280x720.webp: Games opening. All 13 cartridges and "1 of 13" fit (live cuts BROGATE and the count); SHITBOX's blurb ends on a whole sentence and says over forty cars.
- look-games-details-1280x720.webp: Games with details open. The whole blurb shows and the name stays where it was, under the top bar.
- look-crew-1280x720.webp: Crew, #4764. "music on" and "sfx off" on one line instead of two; the RadQuest chip is gone because RadQuest stars #652 only; the rest is the same.
- look-sites-1280x720.webp: Sites, Solscape. The status line sits under the Play button instead of running against the preview; the rest is the same.
- look-contact-1280x720.webp: Contact. The CONTACT heading is back under the top bar (live: cut off behind it); all eight rows and the footnote fit.
- look-settings-1280x720.webp: Settings. Same panel, rows and sizes, in the site's dark panel colours instead of navy.
- look-games-393x852.webp: phone Games (touch). Same layout; the pair stands clear of its canvas edge; "40+ cars".
- look-crew-393x852.webp: phone Crew (touch). Same; the two pictures catch #4764 at different moments of his idle (checked at 6, 12 and 24 seconds: same size on both, and live turns him side-on at 12).
- look-contact-393x852.webp: phone Contact (touch). Same.
- look-shelf-1366x768.webp: Games shelf at 1366x768. Same shelf; the blurb ends on a whole sentence (live stops at "helicopte...").
- look-shelf-626x890.webp: Games shelf on the unfolded Duo. Same layout; "40+ cars".
- look-pkg-menu-pad-radpayne-details-1280x720.webp (menu and pad): RadPayne with details open. Live pushes the kind line and name through the top bar; this build keeps both under it.
- look-pkg-layout-css-contact-1366x768.webp (layout): Contact at 1366x768. The heading clears the top bar; every row fits.
- look-pkg-content-brogate-1280x720.webp (cards): BROGATE. Its key art fills the panel and the puddle, the blurb describes the game that ships, and the 13th cartridge and "13 of 13" are on screen.
- look-pkg-scene-pair-393x852-dpr3.webp and look-pkg-scene-pair-zoom-393x852-dpr3.webp (rain scene): phone Games at device scale 3, whole screen and the pair close up. The pair is a little crisper in this build (prints on the shirts, #85's face) and both face the camera.
