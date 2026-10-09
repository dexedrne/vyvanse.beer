"""Resize the existing touch mark; compose startup art from the existing rooftop. Requires Pillow."""
from pathlib import Path
from PIL import Image, ImageOps

root = Path(__file__).resolve().parent.parent
out = root / 'public' / 'pwa'
out.mkdir(exist_ok=True)
mark = Image.open(root / 'public' / 'apple-touch-icon.png').convert('RGB')
for size in (192, 512):
    mark.resize((size, size), Image.Resampling.LANCZOS).save(out / f'icon-{size}.png')
    icon = Image.new('RGB', (size, size), '#1a1330')
    side = round(size * 0.8)
    icon.paste(mark.resize((side, side), Image.Resampling.LANCZOS), ((size-side)//2, (size-side)//2))
    icon.save(out / f'maskable-{size}.png')
for size in (120, 152, 167):
    mark.resize((size, size), Image.Resampling.LANCZOS).save(out / f'apple-touch-{size}.png')
art = Image.open(root / 'public' / 'img' / 'art' / 'vyvanse.webp').convert('RGB')
for width, height in ((1206, 2622), (2622, 1206), (1320, 2868), (2868, 1320)):
    launch = ImageOps.fit(art, (width, height), Image.Resampling.LANCZOS, centering=(0.65, 0.5))
    launch = Image.blend(launch, Image.new('RGB', launch.size, '#120c20'), 0.65)
    side = round(min(width, height) * 0.18)
    launch.paste(mark.resize((side, side), Image.Resampling.LANCZOS), ((width-side)//2, (height-side)//2))
    launch.quantize(colors=64).save(out / f'startup-{width}x{height}.png', optimize=True)
