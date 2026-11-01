"""Draw app/icon.png: a serif "S" on a warm graphite tile. Needs Pillow (pip install pillow)."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
SIZE, SCALE = 512, 4  # draw large, then downsample for smooth edges
big = SIZE * SCALE
image = Image.new('RGBA', (big, big), (0, 0, 0, 0))
draw = ImageDraw.Draw(image)
draw.rounded_rectangle([0, 0, big - 1, big - 1], radius=110 * SCALE, fill=(30, 33, 38, 255))
font = ImageFont.truetype(str(ROOT / 'app/assets/fonts/newsreader/Newsreader-Variable.ttf'), 380 * SCALE)
try:
    font.set_variation_by_axes([72, 400])  # optical size, weight
except (OSError, ValueError):
    pass
box = draw.textbbox((0, 0), 'S', font=font)
x = (big - (box[2] - box[0])) / 2 - box[0]
y = (big - (box[3] - box[1])) / 2 - box[1]
draw.text((x, y), 'S', font=font, fill=(244, 241, 234, 255))
image.resize((SIZE, SIZE), Image.LANCZOS).save(ROOT / 'app/icon.png', optimize=True)
print('Wrote app/icon.png')
