"""ตัดรูปจาก ChatGPT (art/incoming/) เป็นสไปรต์ของเกม แล้วอัปเดต src/art-manifest.js

วิธีใช้ (จากโฟลเดอร์โปรเจกต์):
    python tools/sprites.py                 # ทำทุกแผ่นที่มีอยู่ใน art/incoming/
    python tools/sprites.py sheet-a-shallow # ทำเฉพาะแผ่นที่ระบุ (ไม่ต้องใส่นามสกุล)

ผลลัพธ์:
    public/assets/sprites/<id>.webp     สไปรต์ทีละตัว (ตัดขอบพอดีตัว)
    public/assets/sea-<portrait|landscape>.webp   พื้นหลัง
    art/preview/<แผ่น>.png               ภาพตรวจงาน: ทุกชิ้นที่ตัดได้บนพื้นตาราง พร้อมชื่อ
    src/art-manifest.js                  ขนาดของทุกชิ้น (ค่าที่แก้มือ เช่น จุดยึดเรือ/เส้นน้ำ จะถูกเก็บไว้)

หลักการ: แผ่นต้องเป็นพื้นโปร่งใส (ถ้าไม่ใช่ จะเดาสีพื้นจากขอบรูปแล้วตัดออกให้)
หาก้อนภาพที่ติดกัน (ขยายก้อนเล็กน้อยให้หนวด/ครีบที่แยกออกไปรวมกับตัว) แล้วจัดเข้าช่องตารางตามจุดกึ่งกลาง
ต้องมี Pillow: python -m pip install pillow
"""
import json
import os
import re
import sys
from collections import deque
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(os.environ.get('SPRITES_ROOT') or Path(__file__).resolve().parent.parent)
INCOMING = ROOT / 'art' / 'incoming'
PREVIEW = ROOT / 'art' / 'preview'
SPRITES = ROOT / 'public' / 'assets' / 'sprites'
MANIFEST = ROOT / 'src' / 'art-manifest.js'

# แผ่น -> (แถว, คอลัมน์), ลำดับชื่อตามการอ่านซ้าย->ขวา บน->ล่าง, ด้านยาวสุดของไฟล์ผลลัพธ์ (px)
SHEETS = {
    'sheet-a-shallow': ((2, 4), ['goldfish', 'clownfish', 'sardine', 'butterflyfish', 'bluefish', 'angelfish', 'seahorse', 'parrotfish'], 420),
    'sheet-b-middle': ((2, 4), ['pufferfish', 'turtle', 'jellyfish', 'lionfish', 'octopus', 'seal', 'tuna', 'ray'], 480),
    'sheet-c-deep': ((2, 3), ['shark', 'hammerhead', 'swordfish', 'grouper', 'giant-squid', 'moray'], 640),
    'sheet-d-seabed': ((3, 4), ['anglerfish', 'lobster-king', 'crab', 'starfish', 'chest', 'pearl', 'coins', 'crown', 'boot', 'bottle', 'watch', 'map'], 420),
    'boat': ((1, 1), ['boat'], 900),
}
# พื้นหลัง: ค่าเริ่มต้นของเส้นน้ำ/พื้นทราย (สัดส่วนความสูง) ตามที่สั่งใน prompt — ตรวจด้วยตาแล้วแก้ใน manifest ได้
BACKGROUNDS = {
    'background-portrait': ('portrait', 1536, {'waterline': 0.14, 'seabed': 0.80}),
    'background-landscape': ('landscape', 1536, {'waterline': 0.18, 'seabed': 0.80}),
}
ALPHA_MIN = 40      # ทึบกว่านี้ถือเป็นเนื้อภาพตอนหาก้อน
SCALE = 4           # หาก้อนบนภาพย่อ 4 เท่า
GROW = 5            # ขยายก้อน (px บนภาพย่อ) ให้ส่วนที่แยกกันนิดหน่อยรวมเป็นตัวเดียว
DUST = 0.002        # ก้อนเล็กกว่าสัดส่วนนี้ของช่องถือเป็นเศษ
PAD = 6


def load(path):
    im = Image.open(path).convert('RGBA')
    alpha = im.getchannel('A')
    lo, hi = alpha.getextrema()
    if lo > 200:  # ไม่มีพื้นโปร่งใส: เดาสีพื้นจากขอบแล้วตัดออก
        print(f'  {path.name}: ไม่มีพื้นโปร่งใส — ตัดพื้นสีเรียบจากขอบรูปให้')
        im = key_background(im)
    # ลบหมอก/เงาจางๆ ที่โปร่งเกือบหมด
    a = im.getchannel('A').point(lambda v: 0 if v < 16 else v)
    im.putalpha(a)
    return im


def key_background(im):
    rgb = im.convert('RGB')
    w, h = rgb.size
    px = rgb.load()
    border = [px[x, y] for x in range(0, w, 7) for y in (0, h - 1)] + [px[x, y] for y in range(0, h, 7) for x in (0, w - 1)]
    bg = tuple(sorted(c[i] for c in border)[len(border) // 2] for i in range(3))
    dist = lambda c: max(abs(c[0] - bg[0]), abs(c[1] - bg[1]), abs(c[2] - bg[2]))
    seen = bytearray(w * h)
    q = deque((x, y) for x in range(w) for y in (0, h - 1))
    q.extend((x, y) for y in range(h) for x in (0, w - 1))
    alpha = Image.new('L', (w, h), 255)
    ap = alpha.load()
    while q:
        x, y = q.popleft()
        i = y * w + x
        if seen[i]:
            continue
        seen[i] = 1
        d = dist(px[x, y])
        if d > 60:
            continue
        ap[x, y] = 0 if d < 34 else int((d - 34) / 26 * 255)
        if d < 34:
            for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                if 0 <= nx < w and 0 <= ny < h and not seen[ny * w + nx]:
                    q.append((nx, ny))
    alpha = alpha.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.7))
    # Edge pixels still carry the background colour: repaint them with the average of nearby solid pixels.
    solid = alpha.point(lambda v: 255 if v >= 250 else 0)
    painted = Image.composite(rgb, Image.new('RGB', rgb.size), solid).filter(ImageFilter.BoxBlur(3))
    weight = solid.filter(ImageFilter.BoxBlur(3))
    ap, sp, pp, wp = alpha.load(), solid.load(), painted.load(), weight.load()
    out = rgb.convert('RGBA')
    op = out.load()
    for y in range(h):
        for x in range(w):
            a = ap[x, y]
            if a == 0:
                op[x, y] = (0, 0, 0, 0)
            elif not sp[x, y] and wp[x, y]:
                k = 255 / wp[x, y]
                op[x, y] = tuple(min(255, round(c * k)) for c in pp[x, y]) + (a,)
            else:
                op[x, y] = px[x, y] + (a,)
    return out


def components(im):
    small = im.getchannel('A').resize((im.width // SCALE, im.height // SCALE), Image.BOX)
    mask = small.point(lambda v: 255 if v >= ALPHA_MIN else 0).filter(ImageFilter.MaxFilter(GROW))
    w, h = mask.size
    px = mask.load()
    seen = bytearray(w * h)
    found = []
    for y0 in range(h):
        for x0 in range(w):
            if seen[y0 * w + x0] or not px[x0, y0]:
                continue
            q = deque([(x0, y0)])
            seen[y0 * w + x0] = 1
            cells = []
            while q:
                x, y = q.popleft()
                cells.append((x, y))
                for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                    if 0 <= nx < w and 0 <= ny < h and not seen[ny * w + nx] and px[nx, ny]:
                        seen[ny * w + nx] = 1
                        q.append((nx, ny))
            cx = sum(c[0] for c in cells) / len(cells) * SCALE
            cy = sum(c[1] for c in cells) / len(cells) * SCALE
            found.append({'cells': cells, 'cx': cx, 'cy': cy, 'area': len(cells) * SCALE * SCALE})
    return found


def cut_sheet(name, path, grid, ids, longest, manifest):
    im = load(path)
    rows, cols = grid
    cw, ch = im.width / cols, im.height / rows
    groups = {i: [] for i in range(rows * cols)}
    for comp in components(im):
        if comp['area'] < DUST * cw * ch:
            continue
        c = min(cols - 1, int(comp['cx'] // cw))
        r = min(rows - 1, int(comp['cy'] // ch))
        groups[r * cols + c].append(comp)
    pieces = []
    for index, sprite_id in enumerate(ids):
        comps = groups.get(index) or []
        if not comps:
            print(f'  !! ช่องที่ {index + 1} ({sprite_id}) ว่าง — ตรวจรูปต้นฉบับ')
            continue
        keep = Image.new('L', (im.width // SCALE, im.height // SCALE), 0)
        kp = keep.load()
        for comp in comps:
            for x, y in comp['cells']:
                kp[x, y] = 255
        keep = keep.resize(im.size, Image.NEAREST).filter(ImageFilter.MaxFilter(2 * SCALE + 1))
        piece = Image.new('RGBA', im.size, (0, 0, 0, 0))
        piece.paste(im, (0, 0), keep)
        box = piece.getchannel('A').point(lambda v: 255 if v >= 8 else 0).getbbox()
        piece = piece.crop((max(0, box[0] - PAD), max(0, box[1] - PAD), min(im.width, box[2] + PAD), min(im.height, box[3] + PAD)))
        if max(piece.size) > longest:
            ratio = longest / max(piece.size)
            piece = piece.resize((max(1, round(piece.width * ratio)), max(1, round(piece.height * ratio))), Image.LANCZOS)
        SPRITES.mkdir(parents=True, exist_ok=True)
        out = SPRITES / f'{sprite_id}.webp'
        piece.save(out, 'WEBP', quality=90, alpha_quality=100, method=6)
        entry = manifest['sprites'].get(sprite_id, {})
        entry.update({'file': f'sprites/{sprite_id}.webp', 'w': piece.width, 'h': piece.height})
        manifest['sprites'][sprite_id] = entry
        pieces.append((sprite_id, piece))
        print(f'  {sprite_id:14} {piece.width}x{piece.height}  {out.stat().st_size // 1024} KB  ({len(comps)} ก้อน)')
    extra = sum(len(v) for k, v in groups.items() if k >= len(ids))
    if extra:
        print(f'  !! มีภาพเกินจำนวนช่อง {extra} ก้อน — ตรวจว่า AI วาดเกินมาหรือไม่')
    preview(name, pieces)


def preview(name, pieces):
    if not pieces:
        return
    cell = 260
    sheet = Image.new('RGB', (cell * min(4, len(pieces)), (cell + 24) * ((len(pieces) + 3) // 4)), (255, 255, 255))
    draw = ImageDraw.Draw(sheet)
    for i, (sprite_id, piece) in enumerate(pieces):
        x, y = (i % 4) * cell, (i // 4) * (cell + 24)
        for cy in range(0, cell, 20):
            for cx in range(0, cell, 20):
                if (cx + cy) // 20 % 2:
                    draw.rectangle((x + cx, y + cy, x + cx + 19, y + cy + 19), fill=(222, 228, 232))
        thumb = piece.copy()
        thumb.thumbnail((cell - 16, cell - 16))
        sheet.paste(thumb, (x + (cell - thumb.width) // 2, y + (cell - thumb.height) // 2), thumb)
        draw.text((x + 6, y + cell + 4), f'{sprite_id} {piece.width}x{piece.height}', fill=(20, 60, 70))
    PREVIEW.mkdir(parents=True, exist_ok=True)
    sheet.save(PREVIEW / f'{name}.png')


def background(name, path, kind, tallest, defaults, manifest):
    im = Image.open(path).convert('RGB')
    if im.height > tallest:
        im = im.resize((round(im.width * tallest / im.height), tallest), Image.LANCZOS)
    out = ROOT / 'public' / 'assets' / f'sea-{kind}.webp'
    im.save(out, 'WEBP', quality=84, method=6)
    entry = {**defaults, **manifest['backgrounds'].get(kind, {})}
    entry.update({'file': f'sea-{kind}.webp', 'w': im.width, 'h': im.height})
    manifest['backgrounds'][kind] = entry
    print(f'  {kind}: {im.width}x{im.height} {out.stat().st_size // 1024} KB  waterline={entry["waterline"]} seabed={entry["seabed"]}')
    small = im.copy(); small.thumbnail((520, 520))
    draw = ImageDraw.Draw(small)
    for key, color in (('waterline', (255, 40, 40)), ('seabed', (255, 200, 0))):
        y = round(entry[key] * small.height)
        draw.line((0, y, small.width, y), fill=color, width=2)
    PREVIEW.mkdir(parents=True, exist_ok=True)
    small.save(PREVIEW / f'{name}.png')


def read_manifest():
    if not MANIFEST.exists():
        return {'sprites': {}, 'backgrounds': {}}
    text = MANIFEST.read_text(encoding='utf-8')
    body = re.search(r'export default (\{.*\});?\s*$', text, re.S).group(1)
    data = json.loads(body)
    data.setdefault('sprites', {})
    data.setdefault('backgrounds', {})
    return data


def write_manifest(data):
    head = ('// Generated by tools/sprites.py from the processed artwork sheets. Hand edits to\n'
            '// background/boat anchor fields are kept when the tool runs again.\n')
    MANIFEST.write_text(head + 'export default ' + json.dumps(data, indent=2, ensure_ascii=False) + ';\n', encoding='utf-8')


def main(args):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass
    names = {a for a in args if not a.startswith('--')}
    manifest = read_manifest()
    files = {p.stem: p for p in sorted(INCOMING.glob('*')) if p.suffix.lower() in ('.png', '.webp', '.jpg', '.jpeg')} if INCOMING.exists() else {}
    done = 0
    for stem, path in files.items():
        if names and stem not in names:
            continue
        if stem in SHEETS:
            print(f'{path.name}:')
            grid, ids, longest = SHEETS[stem]
            cut_sheet(stem, path, grid, ids, longest, manifest)
            done += 1
        elif stem in BACKGROUNDS:
            print(f'{path.name}:')
            kind, tallest, defaults = BACKGROUNDS[stem]
            background(stem, path, kind, tallest, defaults, manifest)
            done += 1
        else:
            print(f'ข้าม {path.name}: ชื่อไฟล์ต้องเป็น {", ".join(list(SHEETS) + list(BACKGROUNDS))}')
    if not done:
        print('ไม่พบไฟล์ใน art/incoming/ (ดูชื่อไฟล์ใน docs/ART-PROMPTS.md)')
        return
    write_manifest(manifest)
    print(f'อัปเดต {MANIFEST.relative_to(ROOT)} แล้ว — ดูภาพตรวจงานใน art/preview/')
    if 'boat' in manifest['sprites'] and not manifest['sprites']['boat'].get('holder'):
        print('!! เรือยังไม่มีจุดยึดคันเบ็ด (holder) และเส้นน้ำ (waterline) — ต้องวัดจากรูปแล้วใส่ใน manifest ก่อน เกมจึงจะใช้รูปเรือ')


if __name__ == '__main__':
    main(sys.argv[1:])
