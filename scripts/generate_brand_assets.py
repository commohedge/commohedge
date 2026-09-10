from pathlib import Path

from PIL import Image

SRC = Path(
    r"C:\Users\bilal\.cursor\projects\c-Users-bilal-Desktop-Stage-LAST-VERSION-FOREX-Fx-commo-Pricers-Commo-Pricers-Fx-commo-Pricers\assets\c__Users_bilal_AppData_Roaming_Cursor_User_workspaceStorage_d53c97dec4bccedb5af3b1084c78ea6b_images_commohedge_logo-be4dc68b-aad3-4b25-8683-33db977deb5d.png"
)
PUBLIC = Path(__file__).resolve().parents[1] / "public"
PUBLIC.mkdir(parents=True, exist_ok=True)

im = Image.open(SRC).convert("RGBA")
bbox = im.getbbox()
pad = 40
cropped = im.crop(
    (
        max(0, bbox[0] - pad),
        max(0, bbox[1] - pad),
        min(im.width, bbox[2] + pad),
        min(im.height, bbox[3] + pad),
    )
)

black = cropped.copy()
pixels = cropped.load()
white = Image.new("RGBA", cropped.size, (0, 0, 0, 0))
wp = white.load()
for y in range(cropped.height):
    for x in range(cropped.width):
        _r, _g, _b, a = pixels[x, y]
        if a > 0:
            wp[x, y] = (255, 255, 255, a)


def fit_square(img: Image.Image, size: int, bg=None) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), bg if bg else (0, 0, 0, 0))
    target = int(size * 0.72)
    tmp = img.copy()
    tmp.thumbnail((target, target), Image.Resampling.LANCZOS)
    x = (size - tmp.width) // 2
    y = (size - tmp.height) // 2
    canvas.paste(tmp, (x, y), tmp)
    return canvas


fit_square(white, 512).save(PUBLIC / "commohedge-logo.png", optimize=True)
fit_square(black, 512).save(PUBLIC / "commohedge-logo-dark.png", optimize=True)
fit_square(white, 512).save(PUBLIC / "logo.png", optimize=True)

navy = (12, 19, 34, 255)  # #0c1322
fit_square(white, 512, navy).save(PUBLIC / "apple-touch-icon.png", optimize=True)
fit_square(white, 32, navy).save(PUBLIC / "favicon-32x32.png", optimize=True)
fit_square(white, 16, navy).save(PUBLIC / "favicon-16x16.png", optimize=True)

icos = [fit_square(white, s, navy).convert("RGBA") for s in (16, 32, 48)]
icos[0].save(
    PUBLIC / "favicon.ico",
    format="ICO",
    sizes=[(16, 16), (32, 32), (48, 48)],
    append_images=icos[1:],
)

fit_square(white, 192).save(PUBLIC / "icon-192.png", optimize=True)
fit_square(white, 512).save(PUBLIC / "icon-512.png", optimize=True)

print("OK")
for p in sorted(PUBLIC.glob("*")):
    if p.is_file() and any(k in p.name for k in ("logo", "favicon", "icon", "apple")):
        print(p.name, p.stat().st_size)
