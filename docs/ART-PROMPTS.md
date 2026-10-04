# Prompt สร้างภาพชุดใหม่ (ChatGPT) — สไตล์กึ่งสมจริง

**รวม 7 รูป** (6 รูปหลัก + พื้นหลังแนวนอน 1 รูปที่ไม่บังคับ แต่แนะนำ)

| ลำดับ | ชื่อไฟล์ที่ต้องเซฟ | ขนาด | ข้างใน |
|---|---|---|---|
| A | `sheet-a-shallow.png` | 1536×1024 แนวนอน | ปลาน้ำตื้น 8 ตัว |
| B | `sheet-b-middle.png` | 1536×1024 แนวนอน | สัตว์กลางน้ำ 8 ตัว |
| C | `sheet-c-deep.png` | 1536×1024 แนวนอน | สัตว์ใหญ่ทะเลลึก 6 ตัว |
| D | `sheet-d-seabed.png` | 1536×1024 แนวนอน | พื้นทะเล + สมบัติ + ไอเทมพิเศษ 12 ชิ้น |
| E | `boat.png` | 1536×1024 แนวนอน | เรือประมงพร้อมคนตกปลา (ไม่มีคันเบ็ด) |
| F | `background-portrait.png` | 1024×1536 แนวตั้ง | ฉากทะเลสำหรับมือถือ/ไอแพดแนวตั้ง |
| G | `background-landscape.png` | 1536×1024 แนวนอน | ฉากทะเลสำหรับจอแนวนอน (ไม่บังคับ) |

## วิธีทำ

1. เปิดแชต ChatGPT **ห้องเดียวกันทั้งชุด** ภาพจะได้สไตล์เดียวกัน
2. ทำ **A ก่อน** ถ้าพอใจสไตล์แล้ว รูปต่อไปพิมพ์เพิ่มท้าย prompt ได้ว่า `Match the exact art style of the first sheet.`
3. สั่งทีละรูป (copy กล่อง prompt ทั้งกล่อง) แล้วกด **ดาวน์โหลดเป็น PNG**
4. เซฟเป็นชื่อไฟล์ตามตารางไว้ที่ `tap-tap-fishing\art\incoming\`
5. บอกผมว่า "รูปมาแล้ว" — ผมจะรัน `python tools/sprites.py` ตัดเป็นตัวๆ ใส่เกม และตรวจทุกตัวในเกมจริง

**เช็กก่อนเซฟ:** พื้นหลังต้องโปร่งใส (เป็นตารางหมากรุกตอนเปิดดู) ยกเว้นรูป F/G ที่เป็นฉาก · ทุกตัวหันหัวไปทาง **ขวา** · ไม่มีตัวไหนชนกันหรือโดนขอบรูป · ไม่มีตัวหนังสือ
ถ้ามีตัวไหนผิด สั่งแก้เฉพาะตัวได้เลย เช่น `Redraw only the seahorse, keep everything else identical.`
ถ้า ChatGPT ให้พื้นขาว/พื้นสีมา ไม่เป็นไร สคริปต์ตัดพื้นสีเรียบให้ได้ แต่พื้นโปร่งใสจะคมที่สุด

---

## A — `sheet-a-shallow.png` ปลาน้ำตื้น

```text
Create a 1536x1024 landscape PNG with a TRANSPARENT background (real alpha, no checkerboard pattern drawn in).

ART STYLE: semi-realistic painted illustration for a premium mobile fishing game. Natural anatomy and real proportions, accurate species markings and real-world colours (slightly richer than life), fine scale and fin detail, soft light from above with a gentle rim light, a small natural highlight in the eye. NOT cartoon: no big cute eyes, no smiles, no eyebrows, no thick outlines, no chibi proportions. Calm and friendly for children, no blood, no scary teeth.

LAYOUT: exactly 8 separate fish in a grid of 2 rows x 4 columns, in this reading order (left to right, then top to bottom). Each fish is centred in its own invisible cell, about 70% of the cell width, with wide empty transparent space all around. Nothing touches or overlaps another fish or the image edge. Every fish in strict side view facing RIGHT (head toward the right edge), horizontal swimming pose, whole body visible including all fins and the full tail. No water, no bubbles, no sand, no shadows, no glow, no text, no labels, no numbers, no grid lines, no frame.

1) a common goldfish, metallic orange-gold body with a long flowing tail
2) an ocellaris clownfish, bright orange with three white bands edged in thin black
3) a single sardine: slim silver body, blue-green back, a row of small dark spots
4) a threadfin butterflyfish: pale silver-white body with fine diagonal lines, yellow rear half, black band through the eye
5) a royal blue tang: vivid blue with a black palette-shaped pattern and a bright yellow tail
6) a queen angelfish: electric blue and yellow, blue crown spot on the forehead, long trailing dorsal and anal fins
7) a yellow seahorse in its natural upright pose, curled tail, snout pointing right
8) a stoplight parrotfish (terminal phase): turquoise-green with pink-orange accents and a beak-like mouth
```

## B — `sheet-b-middle.png` สัตว์กลางน้ำ

```text
Create a 1536x1024 landscape PNG with a TRANSPARENT background (real alpha, no checkerboard pattern drawn in).

ART STYLE: semi-realistic painted illustration for a premium mobile fishing game. Natural anatomy and real proportions, accurate markings and real-world colours (slightly richer than life), fine skin, scale and fin detail, soft light from above with a gentle rim light, a small natural highlight in the eye. NOT cartoon: no big cute eyes, no smiles, no eyebrows, no thick outlines, no chibi proportions. Calm and friendly for children, no blood, no scary teeth.

LAYOUT: exactly 8 separate sea animals in a grid of 2 rows x 4 columns, in this reading order (left to right, then top to bottom). Each animal is centred in its own invisible cell, about 70% of the cell width, with wide empty transparent space all around. Nothing touches or overlaps another animal or the image edge. Every animal in side view facing RIGHT (head toward the right edge), swimming horizontally, whole body visible. No water, no bubbles, no sand, no shadows, no glow, no text, no labels, no numbers, no grid lines, no frame.

1) a porcupine pufferfish inflated into a round ball with short spines, sandy beige with dark spots, small fins
2) a green sea turtle swimming, flippers spread, olive-brown patterned shell, head to the right
3) a moon jellyfish: softly translucent pale lilac-blue bell on top with four faint rings, short frilly arms and fine tentacles hanging straight down
4) a red lionfish with maroon and white stripes and large fan-like spiny fins
5) a common octopus swimming to the right, reddish-brown textured skin, arms trailing behind it to the left
6) a harbor seal swimming underwater, grey with dark spots, sleek body, flippers tucked
7) a yellowfin tuna: dark navy back, silver belly, long yellow fins and small yellow finlets
8) a spotted eagle ray seen from slightly above, dark blue-grey back with white spots, wide wings spread, head to the right, long thin tail to the left
```

## C — `sheet-c-deep.png` สัตว์ใหญ่ทะเลลึก

```text
Create a 1536x1024 landscape PNG with a TRANSPARENT background (real alpha, no checkerboard pattern drawn in).

ART STYLE: semi-realistic painted illustration for a premium mobile fishing game. Natural anatomy and real proportions, accurate markings and real-world colours, fine skin detail, soft light from above with a gentle rim light, a small natural highlight in the eye. NOT cartoon: no big cute eyes, no smiles, no thick outlines. Calm and friendly for children: all mouths closed or only slightly open with no visible teeth, no blood.

LAYOUT: exactly 6 separate large sea animals in a grid of 2 rows x 3 columns, in this reading order (left to right, then top to bottom). Each animal is centred in its own invisible cell, about 75% of the cell width, with empty transparent space all around. Nothing touches or overlaps another animal or the image edge. Every animal in strict side view facing RIGHT (head toward the right edge), long horizontal swimming pose, whole body visible including the full tail. No water, no bubbles, no shadows, no glow, no text, no labels, no grid lines, no frame.

1) a grey reef shark: sleek grey body, white belly, black-tipped tail, mouth closed
2) a scalloped hammerhead shark, mouth closed
3) a swordfish with a long flat sword-like bill pointing right, dark purple-grey back, silver belly
4) a giant grouper: massive heavy body, mottled brown and yellow, large mouth closed
5) a giant squid jetting to the right: long red-orange mantle in front on the right, large eye, eight arms and two long tentacles trailing behind to the left
6) a green moray eel: long muscular body in a gentle S-curve, head on the right, mouth only slightly open with no visible teeth
```

## D — `sheet-d-seabed.png` พื้นทะเล สมบัติ และไอเทมพิเศษ

```text
Create a 1536x1024 landscape PNG with a TRANSPARENT background (real alpha, no checkerboard pattern drawn in).

ART STYLE: semi-realistic painted illustration for a premium mobile fishing game. Realistic materials (wet shell, brass, gold, glass, old leather, parchment), real-world colours, soft light from above with a gentle rim light. NOT cartoon: no faces on objects, no big cute eyes, no thick outlines. Friendly for children.

LAYOUT: exactly 12 separate subjects in a grid of 3 rows x 4 columns, in this reading order (left to right, then top to bottom). Each subject is centred in its own invisible cell, about 65% of the cell width, with wide empty transparent space all around. Nothing touches or overlaps another subject or the image edge. Animals in side view facing RIGHT. No water, no sand, no bubbles, no shadows on the ground, no glow halo around anything, no text, no letters, no numbers, no labels, no grid lines, no frame.

1) a deep-sea anglerfish facing right: dark brown-black rounded body, small eye, a thin lure rod over its head ending in a pale-blue bulb, mouth closed so the teeth are hidden
2) a large spiny lobster with a rare shining golden-orange shell and long antennae, side view facing right, looks precious and regal (no crown, no face)
3) a red swimming crab seen from the front and slightly above, claws raised, legs spread
4) an orange sea star seen from directly above, five arms, bumpy texture
5) a closed antique treasure chest: dark wooden planks, iron bands, brass lock, a few gold coins peeking from the lid seam
6) an open pearl oyster shell with one large lustrous white pearl inside
7) a small worn leather pouch spilling shiny gold coins
8) an ornate gold crown set with red and blue gems
9) an old worn brown leather boot with a strand of green seaweed hanging from it
10) a green glass message bottle lying horizontally, cork stopper, a rolled parchment letter inside
11) an antique brass pocket watch with the lid open, a plain dial with simple tick marks and NO numbers, a short chain
12) one torn corner piece of an old parchment treasure map with a dotted path, a small island shape and a red X, NO letters or writing
```

## E — `boat.png` เรือ

> คันเบ็ด สายเอ็น ตะขอ และรอกบนคัน เกมวาดเองเพื่อให้คันโค้งตามแรงปลาและรอกหมุนตามจังหวะแตะ จึงสั่งให้รูปเรือ **ไม่มีคันเบ็ด**

```text
Create a 1536x1024 landscape PNG with a TRANSPARENT background (real alpha, no checkerboard pattern drawn in).

ART STYLE: semi-realistic painted illustration for a premium mobile fishing game, real materials (painted wood, worn paint, rope, canvas), soft daylight from above. NOT cartoon, no thick outlines.

SUBJECT: one small wooden fishing boat in strict side view, the bow pointing RIGHT, centred in the image and about 75% of the image width. Painted hull with a darker antifouling colour below a clear, straight, horizontal waterline stripe, so it is obvious where the water would meet the hull; the whole hull is visible including the part below that stripe. A small wheelhouse cabin at the stern on the left. One adult fisherman wearing a straw sun hat and an orange life vest sits in the middle of the boat, facing right, looking at the water, hands resting on his knees. A short vertical metal rod-holder tube is mounted on the top rail near the bow on the right, and it is EMPTY.

DO NOT DRAW: no fishing rod, no fishing line, no hook, no net, no water, no waves, no reflection, no shadow under the boat, no text, no name on the hull, no flag with letters.
```

## F — `background-portrait.png` ฉากทะเลแนวตั้ง

```text
Create a 1024x1536 portrait image (opaque, no transparency).

A semi-realistic painted cross-section of a tropical sea used as a fishing game background. Realistic water, light and textures, but clean, bright and inviting for children.
- Top 14% of the image: bright blue sky with soft white clouds and two small distant green limestone islands, one near the left edge and one near the right edge. The middle of the sky is clear.
- Exactly at 14% from the top: a calm, straight, perfectly horizontal waterline across the full width.
- Below the waterline: clear underwater view, light turquoise near the surface becoming a deeper blue lower down (never black), with gentle sun rays coming down from the surface.
- Rocky reef with corals, sponges, sea fans and seaweed ONLY along the left and right edges (the outer 15% on each side). The central 70% is open water.
- A sandy seabed whose flat top surface is at 80% of the image height; sand fills the bottom 20% with a few small rocks, shells and patches of seagrass.
NO fish, NO animals, NO boat, NO people, NO text, NO UI, no frame, no vignette, no logo.
```

## G — `background-landscape.png` ฉากทะเลแนวนอน (ไม่บังคับ)

```text
Create a 1536x1024 landscape image (opaque, no transparency). Same scene and same art style as the portrait sea background: match it exactly.

A semi-realistic painted cross-section of a tropical sea used as a fishing game background. Realistic water, light and textures, but clean, bright and inviting for children.
- Top 18% of the image: bright blue sky with soft white clouds and small distant green limestone islands near the left and right edges. The middle of the sky is clear.
- Exactly at 18% from the top: a calm, straight, perfectly horizontal waterline across the full width.
- Below the waterline: clear underwater view, light turquoise near the surface becoming a deeper blue lower down (never black), with gentle sun rays.
- Rocky reef with corals, sponges, sea fans and seaweed ONLY along the left and right edges (the outer 12% on each side). The centre is open water.
- A sandy seabed whose flat top surface is at 80% of the image height; sand fills the bottom 20% with a few small rocks, shells and patches of seagrass.
NO fish, NO animals, NO boat, NO people, NO text, NO UI, no frame, no vignette, no logo.
```

---

## สำหรับ AI ที่ทำงานต่อ

- `python tools/sprites.py` อ่านไฟล์ตามชื่อในตารางจาก `art/incoming/` → เขียน `public/assets/sprites/<id>.webp`, `public/assets/sea-<portrait|landscape>.webp`, ภาพตรวจ `art/preview/` และอัปเดต `src/art-manifest.js`
- ตารางช่อง/ชื่อ id ต่อแผ่นอยู่ใน `SHEETS` ของสคริปต์ (ลำดับต้องตรงกับ prompt ข้างบน)
- **พื้นหลัง:** ค่า `waterline` / `seabed` (สัดส่วนความสูง) ตั้งตาม prompt — เปิด `art/preview/background-*.png` (เส้นแดง = น้ำ, เส้นเหลือง = ทราย) แล้วแก้ใน manifest ให้ตรงภาพจริง
- **เรือ:** ต้องใส่ `holder: [x, y]` (จุดโคนคันเบ็ด px บนสไปรต์) และ `waterline: y` (px) ใน manifest เอง เกมจะวางเรือให้เส้นน้ำตรงผิวน้ำ และวาดคันเบ็ดจาก holder ไปจุดหมุนตะขอ — ถ้าไม่มีสองค่านี้ เกมยังใช้เรือที่วาดด้วยโค้ด
- สัตว์ที่ยังไม่มีภาพจะไม่ออกในเกมจริง (โหมด DEV `?qa=1` ใช้อีโมจิแทนเพื่อทดสอบกลไก)
- เมื่อทั้ง 12 ตัวเดิมมีภาพใหม่ครบ ลบ `legacy` ใน `src/species.js` และ atlas เก่าได้ (ต้องแก้ `tests/assets.test.mjs` ด้วย)
