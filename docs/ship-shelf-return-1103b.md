# Ship note: games shelf return, redone on current main (11/3)

Branch `fix/shelf-return-1103b`, five commits on top of main 21ec588. It is not pushed and not deployed.
`git merge-base fix/shelf-return-1103b main` is 21ec588, which is main's HEAD, and `git merge-tree` reports a clean merge.

## What changed
- **The old shelf is back, on top of current main.** The three code commits from `fix/shelf-return-1103` were cherry-picked:
  - the restore of the pre-wheel UI with git (8308217, which is the 991b7c4 shelf plus content);
  - the phone fit;
  - the crew-behind-shelf fix.
  The conflicts in `src/main.js` and `src/render.js` were resolved by taking the restored shelf, and `src/wheel.css`, `src/motion.js` and `test/wheel.test.js` are removed.
- **Content added since the wheel is kept and carried into the shelf UI:**
  - SankoQuest Survivors: its key art, label and blurb. Its two-line wordmark (`twoLines`, the `.wm--two` CSS, which stays on one line on short screens) and the short cartridge name `SankoQuest` (`cartName`, with the full name as the button's aria-label).
  - The `tabNote` reason, shown in the status line and in the new-tab dialog.
  - Run Escape hosting and its build step, #2214 in the crew and casts, the Ask notes counts, the ZombieTardio blurb, and the 85, 268, 555 crew order.
  - `src/projects.js`, `vercel.json`, `scripts/`, `server/`, `public/`, `README.md` and `docs/ask.md` are identical to main.
- **The wheel's content checks are kept.** They now live in `test/shelf.test.js`: 13 cases, 17 URLs, the order with SankoQuest second, and the shooter editions. `test/sanko.test.js` now checks the shelf markup instead of the wheel's.
- **Phones (portrait, up to 760 px).** Same as the first branch: two columns of whole cartridges, each with its art, name and its own Play (46 px tall). Tapping a card picks it and scrolls back up to its art and blurb, and the crew no longer shows through.
- **New: the desktop row fits 13.** With SankoQuest the shelf has 13 games, and at 1920 the 13th cartridge (BROGATE) was cut off at the right edge. The games row now narrows its cartridges just enough to fit across the screen, down to 84 px at the least, and only at 761 px wide and up. At 1920 that is 121 px instead of 132 px, and at 1366 it is 84 px. A screen too narrow even for that still scrolls the row as before. Phones and phone landscape are unchanged.

## Measured (headless Chromium, SwiftShader)
| size | horizontal overflow | columns | cartridges off screen | every card fully shown when scrolled to | Play height |
|---|---|---|---|---|---|
| 390x844 | 0 | 2 | 0 | yes (13 of 13) | 46 px |
| 430x932 | 0 | 2 | 0 | yes | 46 px |
| 626x890 | 0 | 2 | 0 | yes | 46 px |
| 360x800 | 0 | 2 | 0 | yes | 46 px |
| 1920x1080 | 0 | one row of 13 | 0 (was 1 before the desktop fit) | – | – |
| 1366x768 | 0 | one row of 13 | 0 | – | – |

Before (the wheel on main), cartridges off screen: 9 of 12 at 390, 9 of 12 at 430, 10 of 21 at 626 and 15 of 21 at 360.

ArrowRight on desktop goes from SHITBOX to SankoQuest Survivors (`after/1920x1080-sanko.png`).

## Checks
- `npm test`: 109 tests, 108 pass, 0 fail, 1 skipped. The skip was already there.
- `npm run check`: 75 files OK.
- `npm run build`: OK, exit 0. It downloads Run Escape as main's build does.

## Pictures
`docs/review/shelf-return-1103/` has `NOTES.md`, `captions.json`, `before/` (the wheel, built from main 21ec588) and `after/`.
- Key pictures:
  - `after/390x844.png` and `after/390x844-shelf1.png`
  - `after/430x932-sanko.png`: the two-line name and the short cartridge name
  - `after/626x890-shelf1.png`
  - `after/1920x1080.png`: all 13 across
  - `after/1366x768.png`
- Clips, muted, 30 fps, about 10 s each:
  - `before/390x844-wheel.webm` (1.7 MB): the wheel turning with the arrow keys.
  - `after/390x844-shelf.webm` (2.8 MB): scrolling the shelf, then picking SPIDERTAG, which goes back up to its art.

## Not done / honest notes
- **Main 21ec588 wasn't in this box's repo or its local origin.** It was fetched read-only from the public GitHub repo. Local `main` was fast-forwarded to it, with nothing pushed.
- `/usr/bin/google-chrome` isn't installed here, so captures used `/usr/bin/chromium` with `--use-angle=swiftshader`, `--mute-audio` and a fresh temp profile. They ran under the browser lock, and the browser and preview servers were closed afterwards.
- **The clips are sped up and the wheel clip is choppy**, about 11 frames, because software rendering draws the wheel page slowly.
- **The "tap" in the shelf clip is a click.** Headless touch taps didn't select a cartridge here: the slow browser delivers the finger-up after the 360 ms long-press timer, so the tap became a long-press. The first branch saw the same thing. It is worth one tap test on a real phone.
- On the foldable (626 wide) the two columns make big cartridges, about 290 px each.
- Phone landscape keeps the old single sideways row. It wasn't one of the brief's sizes.
- No OWNER-NOTES.md exists in the repo, so there were no owner notes to act on.
