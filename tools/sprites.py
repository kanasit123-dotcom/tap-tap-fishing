"""ตัดรูปจาก ChatGPT (art/incoming/) เป็นสไปรต์ของเกม แล้วอัปเดต src/art-manifest.js

วิธีใช้ (จากโฟลเดอร์โปรเจกต์):
    python tools/sprites.py                 # ทำทุกแผ่นที่มีอยู่ใน art/incoming/
    python tools/sprites.py sheet-a-shallow # ทำเฉพาะแผ่นที่ระบุ (ไม่ต้องใส่นามสกุล)

ผลลัพธ์:
    public/assets/sprites/<id>.webp     สไปรต์ทีละตัว (ตัดขอบพอดีตัว)
    public/assets/sea-<portrait|landscape>.webp   พื้นหลัง
    art/preview/<แผ่น>.png               ภาพตรวจงาน: ทุกชิ้นที่ตัดได้บนพื้นตาราง พร้อมชื่อ (เรือ/พื้นหลังมีเส้นจุดยึดทับ)
    src/art-manifest.js                  ขนาดของทุกชิ้น + จุดยึดเรือ/เส้นน้ำ/พื้นทราย (สร้างใหม่ทุกครั้งที่รัน อย่าแก้มือ)

จุดยึดที่วัดจากรูปจริงอยู่ในตาราง ANCHORS ด้านล่าง (พิกัดบนรูปต้นฉบับ) ถ้าวาดเรือหรือพื้นหลังใหม่ ให้วัดแล้วแก้ตารางนั้น

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
    'sheet-e-extra': ((3, 4), ['mackerel', 'yellow-tang', 'moorish-idol', 'damselfish', 'cuttlefish', 'barracuda', 'batfish', 'dolphin', 'manta', 'whale-shark', 'hermit-crab', 'horseshoe-crab'], 480),
    'sheet-f-pirate': ((3, 4), ['pirate-small', 'pirate-medium', 'pirate-large', 'cannon', 'cannonball', 'float-chest', 'barrel', 'net', 'turbo-reel', 'gold-hook', 'spyglass', 'coin'], 600),
    'sheet-g-boss': ((3, 1), ['boss-whale', 'boss-kraken', 'boss-marlin'], 720),
    'sheet-h-ancient': ((2, 1), ['boss-helicoprion', 'boss-dunkleosteus'], 720),
    'sheet-i-horn': ((1, 1), ['horn'], 420),
    'sheet-j-giants': ((2, 1), ['boss-seal', 'boss-turtle'], 720),
    'sheet-k-special': ((2, 4), ['leafy-dragon', 'nautilus', 'sunfish', 'coelacanth', 'oarfish', 'giant-octopus', 'mantis-shrimp', 'giant-crayfish'], 480),
    'sheet-m-orcas': ((3, 1), ['orca', 'boss-orca', 'boss-dolphin'], 720),
    'sheet-l-stickers': ((4, 4), ['st-first-catch', 'st-shallow', 'st-middle', 'st-deep', 'st-seabed', 'st-giants', 'st-special', 'st-fever', 'st-jackpot', 'st-pirate', 'st-wheel', 'st-duo', 'st-horn', 'st-daily', 'st-night', 'st-all'], 256),
    'boat': ((1, 1), ['boat'], 900),
}
# พื้นหลัง: (ชื่อ, ความสูงสูงสุดของไฟล์ผลลัพธ์) — เส้นน้ำ/ขอบทราย (สัดส่วนความสูง) อยู่ใน ANCHORS
BACKGROUNDS = {
    'background-portrait': ('portrait', 1536),
    'background-landscape': ('landscape', 1536),
    'background-sunset-portrait': ('sunset-portrait', 1536),
    'background-sunset-landscape': ('sunset-landscape', 1536),
    'background-night-portrait': ('night-portrait', 1536),
    'background-night-landscape': ('night-landscape', 1536),
    'background-arctic-portrait': ('arctic-portrait', 1536),
    'background-arctic-landscape': ('arctic-landscape', 1536),
    'background-lagoon-portrait': ('lagoon-portrait', 1536),
    'background-lagoon-landscape': ('lagoon-landscape', 1536),
    'background-wreck-portrait': ('wreck-portrait', 1536),
    'background-wreck-landscape': ('wreck-landscape', 1536),
}
# ค่าที่วัดจากรูปที่ ChatGPT วาด (2026-10-05) เปิดดูเส้นแดง/เหลืองใน art/preview/background-*.png เพื่อตรวจ
#   background: waterline = เส้นผิวน้ำ, seabed = ขอบบนของพื้นทราย (สัดส่วนของความสูงรูป)
#   boat: holder = ปากท่อวางคันเบ็ดที่หัวเรือ, waterline = รอยต่อสีขาว/แดงของท้องเรือ (พิกเซลบนรูปต้นฉบับ boat.png)
ANCHORS = {
    'portrait': {'waterline': 0.126, 'seabed': 0.775},
    'landscape': {'waterline': 0.182, 'seabed': 0.806},
    # Sunset/night are repaints of the day images with the same composition; re-measure if the preview lines are off.
    'sunset-portrait': {'waterline': 0.126, 'seabed': 0.775},
    'sunset-landscape': {'waterline': 0.182, 'seabed': 0.806},
    'night-portrait': {'waterline': 0.126, 'seabed': 0.775},
    'night-landscape': {'waterline': 0.182, 'seabed': 0.806},
    # Arctic / lagoon / wreck seas are repaints of the day pictures too (prompts P1-P3); re-measure if the preview lines are off.
    'arctic-portrait': {'waterline': 0.126, 'seabed': 0.775},
    'arctic-landscape': {'waterline': 0.182, 'seabed': 0.806},
    'lagoon-portrait': {'waterline': 0.126, 'seabed': 0.775},
    'lagoon-landscape': {'waterline': 0.182, 'seabed': 0.806},
    'wreck-portrait': {'waterline': 0.126, 'seabed': 0.775},
    'wreck-landscape': {'waterline': 0.182, 'seabed': 0.806},
    'boat': {'holder': (1350, 462), 'waterline': 706},
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
        crop = (max(0, box[0] - PAD), max(0, box[1] - PAD), min(im.width, box[2] + PAD), min(im.height, box[3] + PAD))
        piece = piece.crop(crop)
        ratio = 1.0
        if max(piece.size) > longest:
            ratio = longest / max(piece.size)
            piece = piece.resize((max(1, round(piece.width * ratio)), max(1, round(piece.height * ratio))), Image.LANCZOS)
        SPRITES.mkdir(parents=True, exist_ok=True)
        out = SPRITES / f'{sprite_id}.webp'
        piece.save(out, 'WEBP', quality=90, alpha_quality=100, method=6)
        entry = {'file': f'sprites/{sprite_id}.webp', 'w': piece.width, 'h': piece.height}
        marks = []
        if sprite_id == 'boat':
            to_sprite = lambda x, y: ((x - crop[0]) * ratio, (y - crop[1]) * ratio)
            hx, hy = to_sprite(*ANCHORS['boat']['holder'])
            wl = to_sprite(0, ANCHORS['boat']['waterline'])[1]
            entry['holder'] = [round(hx), round(hy)]
            entry['waterline'] = round(wl)
            marks = [('point', hx, hy), ('hline', wl)]
        manifest['sprites'][sprite_id] = entry
        pieces.append((sprite_id, piece, marks))
        print(f'  {sprite_id:14} {piece.width}x{piece.height}  {out.stat().st_size // 1024} KB  ({len(comps)} ก้อน)')
    extra = sum(len(v) for k, v in groups.items() if k >= len(ids))
    if extra:
        print(f'  !! มีภาพเกินจำนวนช่อง {extra} ก้อน — ตรวจว่า AI วาดเกินมาหรือไม่')
    preview(name, pieces)


def preview(name, pieces):
    if not pieces:
        return
    cell = 520 if len(pieces) == 1 else 260
    sheet = Image.new('RGB', (cell * min(4, len(pieces)), (cell + 24) * ((len(pieces) + 3) // 4)), (255, 255, 255))
    draw = ImageDraw.Draw(sheet)
    for i, (sprite_id, piece, marks) in enumerate(pieces):
        x, y = (i % 4) * cell, (i // 4) * (cell + 24)
        for cy in range(0, cell, 20):
            for cx in range(0, cell, 20):
                if (cx + cy) // 20 % 2:
                    draw.rectangle((x + cx, y + cy, x + cx + 19, y + cy + 19), fill=(222, 228, 232))
        thumb = piece.copy()
        thumb.thumbnail((cell - 16, cell - 16))
        left, top = x + (cell - thumb.width) // 2, y + (cell - thumb.height) // 2
        sheet.paste(thumb, (left, top), thumb)
        for mark in marks:   # จุดยึด (เรือ): กากบาทแดง = ปากท่อวางคันเบ็ด, เส้นเหลือง = เส้นน้ำ
            k = thumb.width / piece.width
            if mark[0] == 'point':
                px, py = left + mark[1] * k, top + mark[2] * k
                draw.line((px - 8, py, px + 8, py), fill=(230, 20, 20), width=3)
                draw.line((px, py - 8, px, py + 8), fill=(230, 20, 20), width=3)
            else:
                ly = top + mark[1] * k
                draw.line((left, ly, left + thumb.width, ly), fill=(255, 190, 0), width=2)
        draw.text((x + 6, y + cell + 4), f'{sprite_id} {piece.width}x{piece.height}', fill=(20, 60, 70))
    PREVIEW.mkdir(parents=True, exist_ok=True)
    sheet.save(PREVIEW / f'{name}.png')


def background(name, path, kind, tallest, manifest):
    im = Image.open(path).convert('RGB')
    if im.height > tallest:
        im = im.resize((round(im.width * tallest / im.height), tallest), Image.LANCZOS)
    out = ROOT / 'public' / 'assets' / f'sea-{kind}.webp'
    im.save(out, 'WEBP', quality=84, method=6)
    entry = {**ANCHORS[kind], 'file': f'sea-{kind}.webp', 'w': im.width, 'h': im.height}
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
    head = ('// Generated by tools/sprites.py from the processed artwork sheets. Do not edit by hand:\n'
            '// boat/background anchors come from ANCHORS in the tool and are rewritten on every run.\n')
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
            kind, tallest = BACKGROUNDS[stem]
            background(stem, path, kind, tallest, manifest)
            done += 1
        else:
            print(f'ข้าม {path.name}: ชื่อไฟล์ต้องเป็น {", ".join(list(SHEETS) + list(BACKGROUNDS))}')
    if not done:
        print('ไม่พบไฟล์ใน art/incoming/ (ดูชื่อไฟล์ใน docs/ART-PROMPTS.md)')
        return
    write_manifest(manifest)
    print(f'อัปเดต {MANIFEST.relative_to(ROOT)} แล้ว — ดูภาพตรวจงานใน art/preview/')
    if 'boat' in manifest['sprites']:
        print('ตรวจ art/preview/boat.png: กากบาทแดงต้องอยู่ที่ปากท่อวางคันเบ็ด เส้นเหลืองต้องอยู่ที่รอยต่อสีท้องเรือ')


if __name__ == '__main__':
    main(sys.argv[1:])
