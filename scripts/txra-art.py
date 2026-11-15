"""TXRA's card art, framed from screenshots of the game running in its native PC build.

The frames are the build's own 240 x 160 guest captures (`--snapshots`, every 300th frame of the
scripted race in tests/race-input.txt), saved as PNG and named by frame: 000900 is the title screen,
002700 the start of the first battle (White Shark), 003600 the race in the tunnel. Every frame is an
integer nearest-neighbour upscale on whole pixels, on a dark warm background, saved lossless.

  key art         public/img/art/txra.webp     1600 x 840, title and battle side by side at 3x
  phone backdrop  public/img/txra-phone.webp   800 x 760, the battle at 3x
  cartridge label public/img/thumb/txra.webp   480 x 320, the tunnel at 2x (the cart crops 4:3)

usage: python3 -I scripts/txra-art.py <folder of the PNG frames> [out_dir, default public/img]
Requires Pillow. No ROM data is read or written here, only the screenshots.
"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

shots, out = Path(sys.argv[1]), Path(sys.argv[2] if len(sys.argv) > 2 else 'public/img')
W, H = 1600, 840
BG_EDGE = (16, 12, 10)
BG_MID = (38, 29, 22)


def frame(name, k):
    im = Image.open(shots / f'{name}.png').convert('RGB')
    assert im.size == (240, 160), im.size
    return im.resize((240 * k, 160 * k), Image.NEAREST)


def backdrop(w, h, cx=0.5, cy=0.46):
    # warm charcoal with a soft lamp-light falloff toward the edges
    small = Image.new('RGB', (w // 8, h // 8))
    px = small.load()
    sw, sh = small.size
    for y in range(sh):
        for x in range(sw):
            dx = (x / sw - cx) * 1.15
            dy = (y / sh - cy) * 1.6
            t = min(1.0, (dx * dx + dy * dy) ** 0.5 * 1.25)
            t = t * t * (3 - 2 * t)
            px[x, y] = tuple(round(BG_MID[i] * (1 - t) + BG_EDGE[i] * t) for i in range(3))
    return small.resize((w, h), Image.BICUBIC)


def shadow(canvas, im, x, y, pad=12):
    # the shadow under a bezel (all shadows go down before any screen, so none falls on a picture)
    w, h = im.size
    sh = Image.new('L', canvas.size, 0)
    ImageDraw.Draw(sh).rounded_rectangle((x - pad + 10, y - pad + 22, x + w + pad + 10, y + h + pad + 26), 18, fill=170)
    sh = sh.filter(ImageFilter.GaussianBlur(22))
    canvas.paste((6, 4, 3), (0, 0), sh)


def screen(canvas, im, x, y, pad=12):
    w, h = im.size
    d = ImageDraw.Draw(canvas)
    # bezel: dark warm plastic, a lighter top edge, a black lip around the glass
    d.rounded_rectangle((x - pad, y - pad, x + w + pad - 1, y + h + pad - 1), 14, fill=(33, 27, 23))
    d.rounded_rectangle((x - pad, y - pad, x + w + pad - 1, y + h + pad - 1), 14, outline=(58, 48, 40), width=1)
    d.line((x - pad + 14, y - pad + 1, x + w + pad - 15, y - pad + 1), fill=(74, 62, 52))
    d.rectangle((x - 3, y - 3, x + w + 2, y + h + 2), fill=(8, 6, 5))
    canvas.paste(im, (x, y))


# key art: the title screen and the first battle of a race, 3x each
art = backdrop(W, H)
left, right = frame('000900', 3), frame('002700', 3)
gap = 40
x0 = (W - (720 * 2 + gap)) // 2
y0 = (H - 480) // 2 - 4
for put in (shadow, screen):
    put(art, left, x0, y0)
    put(art, right, x0 + 720 + gap, y0)
art.save(out / 'art' / 'txra.webp', lossless=True, quality=100, method=6)

# phone backdrop: one frame, 3x, on the same background with room above and below
PW, PH = 800, 760
ph = backdrop(PW, PH, cy=0.5)
f = frame('002700', 3)
for put in (shadow, screen):
    put(ph, f, (PW - 720) // 2, (PH - 480) // 2)
ph.save(out / 'txra-phone.webp', lossless=True, quality=100, method=6)

# cartridge label: a race in the tunnel, 2x, edge to edge (the cart shows a centred 4:3 crop)
frame('003600', 2).save(out / 'thumb' / 'txra.webp', lossless=True, quality=100, method=6)

for p in (out / 'art' / 'txra.webp', out / 'txra-phone.webp', out / 'thumb' / 'txra.webp'):
    print(p, Image.open(p).size, p.stat().st_size)
