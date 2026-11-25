"""Cut the eyes of the semibot head into their own transparent PNG.

The page tints the grey head with a CSS filter, which also paints the eyes. It lays this image on top,
untinted, so the eyes keep the colors of the game. Run after fetch_icons.py: python3 scripts/make_eyes.py
Needs Pillow.
"""

from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter

PLAYERS = Path(__file__).resolve().parent.parent / "apps" / "web" / "public" / "icons" / "players"

# Ellipses of the two eyes as fractions of the image, measured on the 192 pixel head: x, y, radius x, radius y.
EYES = ((0.305, 0.375, 0.128, 0.138), (0.700, 0.375, 0.128, 0.138))
SCALE = 8  # draw large and shrink, so the edge is smooth


def main() -> None:
    head = Image.open(PLAYERS / "head.png").convert("RGBA")
    width, height = head.size
    mask = Image.new("L", (width * SCALE, height * SCALE), 0)
    draw = ImageDraw.Draw(mask)
    for cx, cy, rx, ry in EYES:
        box = ((cx - rx) * width, (cy - ry) * height, (cx + rx) * width, (cy + ry) * height)
        draw.ellipse([value * SCALE for value in box], fill=255)
    mask = mask.resize((width, height), Image.LANCZOS).filter(ImageFilter.GaussianBlur(0.4))
    alpha = ImageChops.multiply(mask, head.getchannel("A"))
    eyes = head.copy()
    eyes.putalpha(alpha)
    eyes.save(PLAYERS / "eyes.png", optimize=True)
    print("eyes.png written")


if __name__ == "__main__":
    main()
