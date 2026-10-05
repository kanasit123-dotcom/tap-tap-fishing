"""วาด icon ของเกม (ปลาการ์ตูนว่ายเข้าหาเบ็ด บนพื้นทะเล) -- ไม่ต้องใช้รูปจากที่อื่น

ใช้ (จากโฟลเดอร์โปรเจกต์):
    python tools/make_icon.py
    -> public/icons/icon-{32,180,192,512}.png และ icon-maskable-512.png

ปลาในรูปคือปลาการ์ตูนของเกมเอง (public/assets/sprites/clownfish.webp จาก tools/sprites.py)
รันซ้ำได้ทุกครั้งที่เปลี่ยนภาพปลา
"""
import math
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / 'public' / 'assets'
OUT = ROOT / 'public' / 'icons'
S = 1024
INK = (18, 66, 88)
STEEL = (206, 220, 230)
SAND = (240, 214, 150)


def gradient(top, bottom):
    img = Image.new('RGB', (S, S))
    d = ImageDraw.Draw(img)
    for y in range(S):
        t = y / (S - 1)
        d.line([(0, y), (S, y)], fill=tuple(round(a + (b - a) * t) for a, b in zip(top, bottom)))
    return img.convert('RGBA')


def load_fish():
    fish = Image.open(ASSETS / 'sprites' / 'clownfish.webp').convert('RGBA')
    return fish.crop(fish.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox())


def sticker(fish, width, outline):
    """ขยายปลาให้กว้าง `width` พิกเซล แล้วใส่ขอบหมึกหนาแบบสติกเกอร์ ให้เห็นชัดแม้ย่อเหลือ 32px"""
    fish = fish.resize((width, round(fish.height * width / fish.width)), Image.LANCZOS)
    pad = outline * 2
    canvas = Image.new('RGBA', (fish.width + pad * 2, fish.height + pad * 2), (0, 0, 0, 0))
    canvas.paste(fish, (pad, pad), fish)
    alpha = canvas.getchannel('A').point(lambda v: 255 if v > 24 else 0)
    ring = alpha.filter(ImageFilter.MaxFilter(outline * 2 + 1)).filter(ImageFilter.GaussianBlur(1.5))
    out = Image.new('RGBA', canvas.size, INK + (0,))
    out.putalpha(ring)
    out.alpha_composite(canvas)
    return out


def bubbles(layer):
    d = ImageDraw.Draw(layer)
    for cx, cy, r in ((150, 250, 54), (232, 150, 30), (110, 420, 26), (900, 780, 36), (840, 880, 20), (300, 330, 18)):
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(255, 255, 255, 56), outline=(255, 255, 255, 190), width=max(4, r // 8))
        d.ellipse([cx - r * 0.5, cy - r * 0.55, cx - r * 0.12, cy - r * 0.2], fill=(255, 255, 255, 200))


def rays(layer):
    d = ImageDraw.Draw(layer)
    for x, spread, alpha in ((200, 150, 46), (470, 220, 38), (760, 160, 44)):
        d.polygon([(x - 40, 0), (x + 40, 0), (x + spread, 860), (x - spread * 0.7, 860)], fill=(255, 255, 255, alpha))


def seabed(layer):
    d = ImageDraw.Draw(layer)
    top = [(x, 905 + math.sin(x / 150) * 22) for x in range(-10, S + 20, 10)]
    d.polygon(top + [(S + 20, S + 20), (-10, S + 20)], fill=SAND + (255,))
    d.line(top, fill=(255, 240, 190, 255), width=10, joint='curve')
    for cx, cy in ((180, 975), (520, 990), (860, 968)):
        d.ellipse([cx - 14, cy - 8, cx + 14, cy + 8], fill=(222, 190, 124, 255))


def hook(layer):
    """เบ็ดห้อยจากบนลงมา อยู่เหนือหัวปลาเล็กน้อย ไม่ชนหน้าปลา"""
    d = ImageDraw.Draw(layer)
    x, bend, r = 850, 255, 70      # แกนเบ็ด จุดบนของส่วนโค้ง และรัศมี
    tip = (x - 2 * r + 2, bend + r - 64)
    for width, color in ((60, INK), (34, STEEL)):
        d.line([(x, -10), (x, bend + r)], fill=color, width=width)
        d.arc([x - 2 * r, bend, x, bend + 2 * r], 0, 180, fill=color, width=width)
        d.line([(x - 2 * r, bend + r), tip], fill=color, width=width)
        d.ellipse([tip[0] - width // 2, tip[1] - width // 2, tip[0] + width // 2, tip[1] + width // 2], fill=color)
    d.line([(x - 9, 40), (x - 9, bend + 10)], fill=(255, 255, 255, 200), width=8)
    d.ellipse([x - 36, 150, x + 36, 222], outline=INK, width=20)
    d.ellipse([x - 36, 150, x + 36, 222], outline=STEEL, width=9)


def backdrop():
    """ฉากหลังคือภาพทะเลจริงของเกม (น้ำโล่งมีลำแสง + ขอบทรายด้านล่าง) ครอปเป็นสี่เหลี่ยมจัตุรัส"""
    sea = Image.open(ASSETS / 'sea-portrait.webp').convert('RGB')
    top = round(sea.height * 0.80) - round(sea.width * 0.78)     # ให้ขอบทรายอยู่ราว 78% ของภาพ
    box = (0, top, sea.width, top + sea.width)
    return sea.crop(box).resize((S, S), Image.LANCZOS).convert('RGBA')


def draw(k=1.0):
    """k < 1 ย่อเฉพาะปลากับเบ็ดเข้ากลางภาพ (สำหรับ maskable ที่ Android อาจตัดขอบเป็นวงกลม) พื้นหลังเต็มภาพเสมอ"""
    img = backdrop()
    front = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    fish = sticker(load_fish(), 700, 16).rotate(7, resample=Image.BICUBIC, expand=True)
    shadow = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).ellipse([140, 905, 720, 985], fill=(8, 60, 80, 110))
    front.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(16)))
    front.alpha_composite(fish, (S // 2 - fish.width // 2 - 80, 640 - fish.height // 2))
    hook(front)
    if k != 1.0:
        size = round(S * k)
        small = front.resize((size, size), Image.LANCZOS)
        front = Image.new('RGBA', (S, S), (0, 0, 0, 0))
        front.paste(small, ((S - size) // 2, (S - size) // 2))
        # เส้นเอ็นยังต้องต่อขึ้นไปถึงขอบบนของภาพ ไม่ให้เบ็ดลอยกลางอากาศ
        line = ImageDraw.Draw(img)
        lx, top = S / 2 + (850 - S / 2) * k, (S - size) // 2 + 20
        for width, color in ((round(60 * k), INK), (round(34 * k), STEEL)):
            line.line([(lx, -10), (lx, top)], fill=color, width=width)
    img.alpha_composite(front)
    return img


def save(img, size, name):
    img.resize((size, size), Image.LANCZOS).convert('RGB').save(OUT / name, optimize=True)
    print(name, (OUT / name).stat().st_size // 1024, 'KB')


if __name__ == '__main__':
    OUT.mkdir(parents=True, exist_ok=True)
    full = draw(1.0)
    for size in (32, 180, 192, 512):
        save(full, size, f'icon-{size}.png')
    # maskable: เนื้อหาต้องอยู่ในวงกลมกลาง 80%
    save(draw(0.74), 512, 'icon-maskable-512.png')
