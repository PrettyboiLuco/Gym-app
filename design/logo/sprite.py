# Setzt die Einzelbilder aus sprite.js zu je einem Raster-JPEG zusammen (6 × 6, 240 px je Bild).
import glob, os
from PIL import Image
here = os.path.dirname(os.path.abspath(__file__))
dest = os.path.join(here, '..', '..', 'mobile', 'assets', 'images')
for name in ['dark', 'light']:
    frames = sorted(glob.glob(os.path.join(here, '.frames', f'{name}-*.png')))
    size, cols = 240, 6
    sheet = Image.new('RGB', (size * cols, size * ((len(frames) + cols - 1) // cols)))
    # Die Tonwertkurve (ACES) dunkelt den hellen Hintergrund leicht ab. Damit kein Rechteck auf dem App-Grund
    # (#F6F6F7) sichtbar wird, wird je Kanal so gestreckt, dass der Hintergrund genau diesen Wert trifft.
    target = (0xF6, 0xF6, 0xF7) if name == 'light' else (0, 0, 0)
    corner = Image.open(frames[0]).convert('RGB').getpixel((2, 2))
    lut = []
    for ch in range(3):
        c, t = max(corner[ch], 1), target[ch]
        lut += [min(255, round(v * t / c)) if name == 'light' else v for v in range(256)]
    # Weicher Rand: zum Bildrand hin in den Grund überblenden, damit keine Kante des Einzelbilds sichtbar ist.
    from PIL import ImageDraw, ImageFilter
    mask = Image.new('L', (size, size), 0)
    ImageDraw.Draw(mask).ellipse((size * 0.06, size * 0.06, size * 0.94, size * 0.94), fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(size * 0.06))
    ground = Image.new('RGB', (size, size), target)
    for i, f in enumerate(frames):
        frame = Image.composite(Image.open(f).convert('RGB').point(lut), ground, mask)
        sheet.paste(frame, ((i % cols) * size, (i // cols) * size))
    sheet.save(os.path.join(dest, f'heart-sprite-{name}.jpg'), quality=86, optimize=True, progressive=True)
    print(name, len(frames), sheet.size)
