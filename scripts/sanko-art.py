"""SankoQuest Survivors' key art and cartridge label, cut textless from the game's own share image.

The fan game's public/og.jpg (1200 x 630) is its only scene picture: an adventurer ringed by the
Greentown horde, lettered with the big SankoQuest title, a SURVIVORS subtitle and a tagline along the
bottom. The subtitle is filled in from the surrounding picture by exemplar (patch) inpainting; the big
title and the tagline are left outside both crops, so neither file carries any lettering and no
filled-in patch shows at the bottom of the key art.

  key art         public/img/art/sanko.webp     1600 x 900, the 16:9 band between title and tagline
  cartridge label public/img/thumb/sanko.webp   420 x 315 (4:3), the adventurer and the nearest ring

usage: python3 -I scripts/sanko-art.py <the game's public/og.jpg> [out_dir, default public/img]
Requires Pillow and numpy.
"""
import sys
from pathlib import Path

import numpy as np
from numpy.lib.stride_tricks import sliding_window_view as win
from PIL import Image, ImageFilter

src = sys.argv[1]
out = Path(sys.argv[2]) if len(sys.argv) > 2 else Path(__file__).resolve().parent.parent / 'public' / 'img'
im = np.asarray(Image.open(src).convert('RGB')).astype(np.float32)
H, W, _ = im.shape
assert (W, H) == (1200, 630), f'expected the 1200 x 630 share image, got {W} x {H}'
r, g, b = im[..., 0], im[..., 1], im[..., 2]

cream = (r > 225) & (g > 215) & (b > 150) & (b < 235)
orange = (r > 150) & (g > 70) & (r - b > 80) & (r - g > 30)

TITLE_BOTTOM = 92   # the big SankoQuest title and its shadow end above this row
TAG_TOP = 572       # the tagline's letters, outline and shadow start below this row


def box(m, x0, y0, x1, y1):
    o = np.zeros_like(m)
    o[y0:y1, x0:x1] = m[y0:y1, x0:x1]
    return o


def dilate(m, k):
    img = Image.fromarray((m * 255).astype(np.uint8))
    return np.asarray(img.filter(ImageFilter.MaxFilter(2 * k + 1))) > 0


# letters plus their black outline and drop shadow. The tagline is filled as well, as it always was, so
# the cleaned picture has no lettering below the title; neither crop reaches it.
dark = im.max(axis=2) < 50
surv = box(orange, 490, 100, 712, 140)            # SURVIVORS
tag = box(cream, 320, 576, 880, 620)              # the tagline
mask = dilate(surv, 3) | (dark & dilate(surv, 4)) | dilate(tag, 3) | (dark & dilate(tag, 5))
mask = dilate(mask, 1)
ys, _ = np.nonzero(mask[:300])
assert ys.min() >= TITLE_BOTTOM, 'the subtitle fill reaches into the title'
ys, _ = np.nonzero(mask[300:])
assert ys.min() + 300 >= TAG_TOP, 'the tagline starts higher than the key art crop allows'

# ---- exemplar inpainting: onion peel by known fraction, best 9x9 match (SSD) in a local window ----
P = 4   # half patch: 9x9
S = 90  # search half window
known = ~mask
kb = np.pad(known, P, constant_values=False)
valid = win(kb, (2 * P + 1, 2 * P + 1)).all(axis=(2, 3))  # a source patch must be all original pixels
img = np.pad(im, ((P, P), (P, P), (0, 0)), mode='edge')
kn = np.pad(known, P, constant_values=False)
rng = np.random.default_rng(7)
while not kn[P:-P, P:-P].all():
    unk = ~kn[P:-P, P:-P]
    nb = dilate(~unk, 1) & unk  # the boundary: unknown pixels next to a known one
    ys, xs = np.nonzero(nb)
    ii = np.pad(kn.astype(np.int32).cumsum(0).cumsum(1), ((1, 0), (1, 0)))
    k2 = 2 * P + 1
    frac = (ii[ys + k2, xs + k2] - ii[ys, xs + k2] - ii[ys + k2, xs] + ii[ys, xs]) / (k2 * k2)
    best = np.flatnonzero(frac >= frac.max() - 1e-6)
    j = best[rng.integers(len(best))]
    y, x = ys[j], xs[j]
    tgt = img[y:y + 2 * P + 1, x:x + 2 * P + 1]
    tk = kn[y:y + 2 * P + 1, x:x + 2 * P + 1]
    y0, y1 = max(P, y - S), min(H - P - 1, y + S)
    x0, x1 = max(P, x - S), min(W - P - 1, x + S)
    region = img[y0:y1 + 2 * P + 1, x0:x1 + 2 * P + 1]
    cands = np.moveaxis(win(region, (2 * P + 1, 2 * P + 1), axis=(0, 1)), 2, -1)  # ny, nx, ph, pw, 3
    d = ((cands - tgt) ** 2 * tk[..., None]).sum(axis=(2, 3, 4))
    d = np.where(valid[y0:y1 + 1, x0:x1 + 1], d, np.inf)
    gy, gx = np.mgrid[y0:y1 + 1, x0:x1 + 1]
    d = d + 2.0 * ((gy - y) ** 2 + (gx - x) ** 2)  # a small pull towards nearby patches
    by, bx = np.unravel_index(np.argmin(d), d.shape)
    sy, sx = y0 + by, x0 + bx
    srcp = img[sy:sy + 2 * P + 1, sx:sx + 2 * P + 1]
    m = ~tk
    tgt[m] = srcp[m]
    tk[:] = True
res = img[P:-P, P:-P]
# soften the seams a touch, inside the filled area only
blur = np.asarray(Image.fromarray(res.clip(0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8))).astype(np.float32)
soft = np.asarray(Image.fromarray((mask * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.5))).astype(np.float32)[..., None] / 255
res = res * (1 - soft * 0.6) + blur * (soft * 0.6)
clean = Image.fromarray(res.clip(0, 255).astype(np.uint8))

# ---- key art: the 16:9 band between the title and the tagline, centred on the adventurer, 1600x900 ----
cx = 600
hgt = TAG_TOP - TITLE_BOTTOM
wid = round(hgt * 16 / 9)
art = clean.crop((cx - wid // 2, TITLE_BOTTOM, cx - wid // 2 + wid, TAG_TOP)).resize((1600, 900), Image.LANCZOS)
art = art.filter(ImageFilter.UnsharpMask(radius=1.6, percent=55, threshold=2))
(out / 'art').mkdir(parents=True, exist_ok=True)
art.save(out / 'art' / 'sanko.webp', 'WEBP', quality=86, method=6)

# ---- cartridge label: 4:3 around the adventurer and the closest ring of the horde, 420x315 ----
lab = clean.crop((330, 128, 870, 533)).resize((420, 315), Image.LANCZOS)
lab = lab.filter(ImageFilter.UnsharpMask(radius=1.0, percent=40, threshold=2))
(out / 'thumb').mkdir(parents=True, exist_ok=True)
lab.save(out / 'thumb' / 'sanko.webp', 'WEBP', quality=90, method=6)
print(f'key art: {wid} x {hgt} crop at ({cx - wid // 2}, {TITLE_BOTTOM}), x{1600 / wid:.2f} to 1600 x 900')
