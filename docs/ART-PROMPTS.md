# Prompt สร้างภาพชุดใหม่ (ChatGPT) — สไตล์กึ่งสมจริง

> **สถานะ: ใช้งานแล้ว (2026-10-05)** ภาพทั้ง 7 รูปจากชุดนี้ถูกตัดและใส่ในเกมแล้ว (ดู [ARTWORK.md](ARTWORK.md))
> เอกสารนี้เก็บไว้สำหรับสั่งภาพใหม่/แก้เฉพาะตัว

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
| H | `sheet-e-extra.png` | 1536×1024 แนวนอน | สัตว์ทะเลเพิ่ม 12 ชนิด (ใช้งานแล้ว) |
| I | `sheet-f-pirate.png` | 1536×1024 แนวนอน | เรือโจรสลัด 3 ลำ ปืนใหญ่ ไอเทมช่วยจับ (ใช้งานแล้ว) |
| J | `background-sunset-*.png`, `background-night-*.png` | 4 รูป แนวตั้ง+แนวนอน | ฉากยามเย็นและกลางคืน (ใช้งานแล้ว) |
| K | `sheet-g-boss.png` | 1536×1024 แนวนอน | ปลายักษ์ 3 ตัว (ใช้งานแล้ว) |
| L | `sheet-h-ancient.png` | 1536×1024 แนวนอน | ปลาโบราณยักษ์ 2 ตัว: ปลาฟันก้นหอย ปลาเกราะยักษ์ (รอสั่ง) |

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

## H — `sheet-e-extra.png` สัตว์ทะเลเพิ่ม 12 ชนิด (ชุดเสริม 2026-10-05 — ใช้งานแล้ว)

> สั่งเพิ่มเพื่อให้แต่ละชั้นมีปลาหลากหลายขึ้น ไม่เจอชนิดเดิมบ่อย ทำในแชตเดิมที่ทำ A-D ได้จะดีที่สุด แล้วพิมพ์เพิ่มท้าย prompt ว่า
> `Match the exact art style of the earlier creature sheets.`

```text
Create a 1536x1024 landscape PNG with a TRANSPARENT background (real alpha, no checkerboard pattern drawn in).

ART STYLE: semi-realistic painted illustration for a premium mobile fishing game, the same style as the earlier creature sheets. Natural anatomy and real proportions, accurate species markings and real-world colours (slightly richer than life), fine scale, skin and fin detail, soft light from above with a gentle rim light, a small natural highlight in the eye. NOT cartoon: no big cute eyes, no smiles, no eyebrows, no thick outlines, no chibi proportions. Calm and friendly for children, mouths closed or only slightly open with no visible teeth, no blood.

LAYOUT: exactly 12 separate sea animals in a grid of 3 rows x 4 columns, in this reading order (left to right, then top to bottom). Each animal is centred in its own invisible cell, about 70% of the cell width, with wide empty transparent space all around. Nothing touches or overlaps another animal or the image edge. Every animal in side view facing RIGHT (head toward the right edge), swimming or walking horizontally, whole body visible including fins, tail, legs and antennae. No water, no sand, no bubbles, no shadows, no glow, no text, no labels, no numbers, no grid lines, no frame.

1) a short mackerel (Thai pla thu): slim silver body with a blue-green back and fine dark wavy lines, yellowish fins
2) a yellow tang: bright lemon-yellow, tall oval body, small pointed snout
3) a Moorish idol: white and yellow body with two broad black vertical bands, very long trailing white dorsal streamer, orange saddle on the snout
4) a small blue damselfish: vivid electric blue with a yellow tail
5) a common cuttlefish: oval body with a wavy fin skirt along the sides, mottled brown and cream zebra pattern, short arms in front on the right
6) a great barracuda: long slim silver body with dark bars, pointed head, mouth closed
7) an orbicular batfish: tall round silver-grey disc-shaped body with darker vertical bands and tall fins
8) a bottlenose dolphin swimming, sleek grey body, gentle expression, mouth closed
9) a manta ray seen from slightly above, very wide dark wings with a pale belly edge, head fins in front on the right, short tail to the left
10) a whale shark: very long body, dark blue-grey with white spots and pale stripes, wide flat head, mouth closed
11) a hermit crab walking to the right, red-orange legs and claws, living inside a spiral sea-snail shell
12) a horseshoe crab walking to the right, smooth brown helmet-like shell and long pointed tail spine, seen from the side and slightly above
```

ชื่อชิ้นตอนตัด (ตามลำดับ): `mackerel yellow-tang moorish-idol damselfish cuttlefish barracuda batfish dolphin manta whale-shark hermit-crab horseshoe-crab`

ตำแหน่งในเกมที่วางแผนไว้ (AI ใส่ใน `src/species.js` ตอนได้รูป): ชั้นบน ปลาทู (ฝูงเล็ก) ปลาขี้ตังเบ็ดเหลือง ปลาสลิดหินฟ้า,
ชั้นสอง ปลาผีเสื้อเทวรูป, กลางน้ำ หมึกกระดอง ปลาค้างคาว ปลาสาก โลมา (ว่ายเร็ว หายาก), ทะเลลึก กระเบนราหู ฉลามวาฬ (หายาก คะแนนสูง),
พื้นทราย ปูเสฉวน แมงดาทะเล

## I — `sheet-f-pirate.png` เรือโจรสลัด + ไอเทมช่วยจับ (2026-10-05)

> ใช้กับมินิเกมยิงเรือโจรสลัด (หลังเก็บแผนที่ครบ) และไอเทมช่วยจับ (แห รอกเร็ว ตะขอทอง กล้องส่องทางไกล)
> ทำในแชตเดิมที่ทำแผ่น A-H แล้วพิมพ์เพิ่มท้าย prompt ว่า `Match the exact art style of the earlier sheets.`

```text
Create a 1536x1024 landscape PNG with a TRANSPARENT background (real alpha, no checkerboard pattern drawn in).

ART STYLE: semi-realistic painted illustration for a premium mobile fishing game, the same style as the earlier sheets. Realistic materials (weathered wood, canvas sails, rope, brass, iron, gold, net cord, glass), real-world colours, soft daylight from above with a gentle rim light. NOT cartoon: no faces on objects, no thick outlines. Friendly for children: no skulls, no bones, no weapons held by anyone, no people on the ships.

LAYOUT: exactly 12 separate subjects in a grid of 3 rows x 4 columns, in this reading order (left to right, then top to bottom). Each subject is centred in its own invisible cell, about 75% of the cell width, with empty transparent space all around. Nothing touches or overlaps another subject or the image edge. Ships in strict side view with the bow pointing RIGHT. No water, no waves, no splash, no smoke, no shadows, no glow, no text, no letters, no numbers, no grid lines, no frame.

1) a small pirate sloop: one mast, dark weathered wooden hull, patched cream sail, a small black flag with a plain round gold coin emblem
2) a medium pirate brig: two masts, dark red and brown hull with a row of closed gun ports, grey-cream sails, the same gold coin flag
3) a large pirate galleon: three masts, tall carved stern on the left, dark hull with gold trim, full sails, the same gold coin flag
4) a short brass ship cannon on a small wooden carriage with wheels, side view, barrel pointing up and to the right
5) one black iron cannonball with a soft highlight
6) an open wooden treasure chest overflowing with gold coins and a few gems, floating style (no water drawn)
7) a wooden barrel with iron hoops, lying on its side
8) a rolled bundle of fishing net made of tan cord with round orange cork floats
9) a shiny golden fishing reel with a small crank handle
10) a large shiny golden fishing hook with an eye at the top
11) an antique brass spyglass telescope, extended, lying horizontally
12) one shiny gold coin seen from the front, plain embossed rim, NO letters or numbers
```

ชื่อชิ้นตอนตัด (ตามลำดับ): `pirate-small pirate-medium pirate-large cannon cannonball float-chest barrel net turbo-reel gold-hook spyglass coin`

แผนการใช้ (AI ทำตอนได้รูป): เรือโจรสลัด 3 ขนาดแล่นบนผิวน้ำในมินิเกม (ลำใหญ่ต้องยิงหลายนัด), ปืนใหญ่ติดหัวเรือเรา, ลูกปืน, หีบลอยและถังไม้หล่นจากเรือที่ถูกยิง,
ไอเทมช่วยจับลอยมาในแถวกลาง: แห = ทอดครั้งถัดไปจับได้ทุกตัวที่แหผ่าน (สูงสุด 3), รอกเร็ว = 3 ครั้งถัดไปแตะรอกครึ่งเดียวและเบ็ดลงเร็วขึ้น,
ตะขอทอง = ตะขอใหญ่ขึ้น 20 วินาที, กล้องส่องทางไกล = เห็นสีจริงของสัตว์ทะเลลึก 20 วินาที, เหรียญ = ใช้ทำ effect เหรียญบินเข้าคะแนน

## J — ฉากยามเย็น และกลางคืน (4 รูป, 2026-10-05)

> แต่ละรอบที่เล่น เกมจะสลับ กลางวัน → ยามเย็น → กลางคืน
> **วิธีที่ได้ผลดีที่สุด:** แนบรูปพื้นหลังเดิมไปด้วย แล้วสั่งให้ "วาดใหม่ภาพเดิม" เส้นผิวน้ำกับขอบทรายจะอยู่ตำแหน่งเดิม ผมใช้ค่าวัดเดิมได้เลย
> รูปพื้นหลังเดิมอยู่ที่ `tap-tap-fishing\art\incoming\background-portrait.png` และ `background-landscape.png`

| ไฟล์ที่ต้องเซฟ | แนบรูป | prompt |
|---|---|---|
| `background-sunset-portrait.png` | `background-portrait.png` | J1 |
| `background-sunset-landscape.png` | `background-landscape.png` | J1 |
| `background-night-portrait.png` | `background-portrait.png` | J2 |
| `background-night-landscape.png` | `background-landscape.png` | J2 |

### J1 ยามเย็น

```text
Repaint the attached image as the same scene at golden sunset. Keep EXACTLY the same composition, size and aspect ratio: the waterline stays at the same height, the sandy seabed top edge stays at the same height, the reefs stay on the left and right edges, the islands stay where they are, the centre stays open water.
Change only the lighting and colours: warm orange-pink sky with a low golden sun near the horizon behind the right island, glowing clouds, golden reflections on the water surface, the underwater light becomes warmer teal with soft golden rays, the deep water a little darker blue, the sand warmer. Same semi-realistic painted style. No fish, no animals, no boat, no people, no text, no frame.
```

### J2 กลางคืน

```text
Repaint the attached image as the same scene at a calm moonlit night. Keep EXACTLY the same composition, size and aspect ratio: the waterline stays at the same height, the sandy seabed top edge stays at the same height, the reefs stay on the left and right edges, the islands stay where they are as dark silhouettes, the centre stays open water.
Change only the lighting and colours: deep navy sky with stars and a bright full moon, silver moonlight shimmering on the water surface, the underwater scene in deep blue with soft silvery moon rays, a few corals glowing faintly cyan and pink (bioluminescent), the sand in cool moonlit grey-blue. It must stay readable and friendly for children, NOT pitch black: fish drawn on top must still stand out. Same semi-realistic painted style. No fish, no animals, no boat, no people, no text, no frame.
```

## K — `sheet-g-boss.png` ปลายักษ์ (บอส) 3 ตัว

> ปลายักษ์จะโผล่มาทุก 2-3 นาที มีเสียงเตือน ว่ายช้าผ่านกลางจอ ต้องแตะรอกเยอะ แต่ได้คะแนนสูงมาก และเข้าสมุดสะสมหมวดใหม่ "ยักษ์ใหญ่"
> ทำในแชตเดิมที่ทำแผ่น A-I แล้วพิมพ์เพิ่มท้าย prompt ว่า `Match the exact art style of the earlier creature sheets.`

```text
Create a 1536x1024 landscape PNG with a TRANSPARENT background (real alpha, no checkerboard pattern drawn in).

ART STYLE: semi-realistic painted illustration for a premium mobile fishing game, the same style as the earlier creature sheets. Natural anatomy, real proportions, rich detail, soft light from above with a gentle rim light. NOT cartoon. Majestic but gentle and friendly for children: mouths closed, no teeth, calm eyes.

LAYOUT: exactly 3 separate giant sea animals stacked in 3 rows (one per row, each row a full-width band), in this order from top to bottom. Each animal is centred in its band, about 85% of the image width, with empty transparent space above and below. Nothing touches another animal or the image edge. Every animal in strict side view facing RIGHT (head toward the right edge), swimming horizontally, whole body visible including the full tail. No water, no bubbles, no shadows, no glow, no text, no labels, no grid lines, no frame.

1) a huge blue whale: long blue-grey body with pale mottling, small dorsal fin near the tail, long flippers, gentle eye, mouth closed
2) a giant friendly kraken: a huge deep-red octopus with a big rounded head on the right and eight very long curling arms trailing to the left, one large calm eye, no teeth
3) a giant golden king marlin: shimmering gold and amber body with a tall sail-like dorsal fin and a long pointed bill to the right
```

ชื่อชิ้นตอนตัด (ตามลำดับ): `boss-whale boss-kraken boss-marlin`

## L — `sheet-h-ancient.png` ปลาโบราณยักษ์ 2 ตัว (2026-10-06 — ใช้งานแล้ว)

> ปลายักษ์กลุ่มใหม่ในหมวด "ยักษ์ใหญ่" (ข้อ 5 ที่ตกลงกัน) ในเกมตั้งชื่อว่า ปลาฟันก้นหอยโบราณ (Helicoprion) และ ปลาเกราะยักษ์โบราณ (Dunkleosteus)
> เกมเด็ก: ต้องดูสง่าแต่ใจดี ไม่น่ากลัว ปากปิด ไม่เห็นฟัน ทำในแชตเดิมที่ทำแผ่น K แล้วพิมพ์เพิ่มท้าย prompt ว่า `Match the exact art style of the earlier creature sheets.`

```text
Create a 1536x1024 landscape PNG with a TRANSPARENT background (real alpha, no checkerboard pattern drawn in).

ART STYLE: semi-realistic painted illustration for a premium mobile fishing game, the same style as the earlier giant-creature sheet. Natural anatomy, rich detail, soft light from above with a gentle rim light. NOT cartoon. Majestic but gentle and friendly for children: mouths closed, NO visible teeth, calm eyes, no blood, no scars.

LAYOUT: exactly 2 separate giant prehistoric fish stacked in 2 rows (one per row, each row a full-width band), in this order from top to bottom. Each animal is centred in its band, about 80% of the image width, with empty transparent space above and below. Nothing touches the other animal or the image edge. Strict side view facing RIGHT (head toward the right edge), long horizontal swimming pose, whole body visible including the full tail. No water, no bubbles, no shadows, no glow, no text, no labels, no grid lines, no frame.

1) a Helicoprion: a long sleek ancient shark-like fish in grey-blue with a pale belly, a tall dorsal fin and a forked tail, and on its lower jaw a coiled spiral whorl of small pale tooth plates that curls under the chin like a seashell; the mouth is closed, so the whorl looks like an ornate spiral decoration
2) a Dunkleosteus: a massive armoured prehistoric fish with a rounded head covered in thick bony plates in rust brown and bronze, a smooth tapering grey-olive body, a calm large eye set in the armour, the jaw closed with smooth bony plates, small fins and a crescent tail
```

ชื่อชิ้นตอนตัด (ตามลำดับ): `boss-helicoprion boss-dunkleosteus`
ตัดแล้ว: `python tools/sprites.py sheet-h-ancient` ได้ `boss-helicoprion` 720x229 และ `boss-dunkleosteus` 720x237 (ใส่ในเกมแล้ว 2026-10-06 ผลออกมาตรงตาม prompt: ปากปิด ไม่เห็นฟัน หันขวา พื้นโปร่งใส)
ข้อสังเกต: ภาพที่ได้มีแสงเรืองรองจางๆ รอบตัวในไฟล์ต้นฉบับ แต่เมื่อตัดแล้วขอบสะอาด ไม่มีขอบเรืองในเกม

---

## M — `sheet-i-horn.png` แตรหมอก 1 ชิ้น (2026-10-06 — ใช้งานแล้ว)

> ไอเทมใหม่ "แตรหมอก" ลอยมาในทะเลลึก จับได้แล้วเป่าเรียกปลายักษ์ตัวต่อไปทันที ในเกมตั้งชื่อว่า `horn`
> ทำในแชตเดิมที่ทำแผ่น I (ไอเทมช่วยจับ) แล้วพิมพ์เพิ่มท้าย prompt ว่า `Match the exact art style of the earlier sheets.`

```text
Create a 1536x1024 landscape PNG with a TRANSPARENT background (real alpha, no checkerboard pattern drawn in).

ART STYLE: semi-realistic painted illustration for a premium mobile fishing game, the same style as the earlier item sheets. Realistic materials (polished brass, aged copper, rope, leather strap), real-world colours, soft daylight from above with a gentle rim light. NOT cartoon: no face on the object, no thick outlines. Friendly for children.

LAYOUT: exactly 1 subject, centred, about 60% of the image width, with empty transparent space all around. Nothing touches the image edge. No water, no mist, no shadows, no glow, no sound waves, no text, no letters, no numbers, no frame.

1) an antique ship's fog horn: a large flared brass horn shaped like a trumpet bell, with a short curved mouthpiece on the left, a rubber air bulb attached behind the mouthpiece, a few darker copper bands around the horn, a small coil of rope hanging from it, shown from the side, the wide bell opening pointing to the RIGHT
```

ชื่อชิ้นตอนตัด: `horn`
หลังได้รูป: `python tools/sprites.py sheet-i-horn` (ไอเทม `horn` อยู่ในแคตตาล็อกแล้ว ตอนนี้ซ่อนในเกมจริงจนกว่าจะมีรูป)
ผลในเกม: ปลาลอยในเลก 4 หายาก ติดเบ็ดแล้วเสียงแตรหมอกดังและหมอกบางๆ ลอยผ่านจอ ปลายักษ์ตัวถัดไปเข้ามาทันที (ถ้ามีตัวอยู่ในทะเล ตัวถัดไปตามมาทันทีที่ตัวนั้นว่ายผ่านไป) ไม่ทำงานตอนฝนสมบัติ

---

## N — `sheet-j-giants.png` แมวน้ำยักษ์ + เต่าทะเลยักษ์ 2 ตัว (2026-10-06 — ใช้งานแล้ว)

> บอสใหม่ 2 ตัวที่ผู้เล่นขอ ในเกมตั้งชื่อว่า แมวน้ำยักษ์ (`boss-seal`, 190 คะแนน, แตะ 28 ครั้ง, ว่ายเร็ว) และ เต่าทะเลยักษ์ (`boss-turtle`, 210 คะแนน, แตะ 30 ครั้ง, ว่ายช้ากว่า)
> เข้าหมวด "ยักษ์ใหญ่" (รวมเป็น 7 ตัว) ทำในแชตเดิมที่ทำแผ่น K/L แล้วพิมพ์เพิ่มท้าย prompt ว่า `Match the exact art style of the earlier creature sheets.`
> รอบที่แล้ว (แผ่น L) ChatGPT วาดแสงเรืองรอบตัวทั้งที่สั่งว่าไม่เอา เครื่องมือตัดภาพจัดการให้ได้ แต่ถ้าเห็นพื้นหลังดำหรือกรอบ ให้สั่งใหม่

```text
Create a 1536x1024 landscape PNG with a TRANSPARENT background (real alpha, no checkerboard pattern drawn in, no dark or coloured background, no vignette).

ART STYLE: semi-realistic painted illustration for a premium mobile fishing game, the same style as the earlier giant-creature sheets. Natural anatomy, rich detail, soft light from above with a gentle rim light. NOT cartoon. Majestic but gentle and friendly for children: mouths closed, no teeth, calm kind eyes, no blood, no scars.

LAYOUT: exactly 2 separate giant sea animals stacked in 2 rows (one per row, each row a full-width band), in this order from top to bottom. Each animal is centred in its band, about 80% of the image width, with empty transparent space above and below. Nothing touches the other animal or the image edge. Strict side view facing RIGHT (head toward the right edge), swimming horizontally, whole body visible including the full tail and every flipper. No water, no bubbles, no shadows, no glow, no halo, no text, no labels, no grid lines, no frame.

1) a giant seal: a huge, long, sleek grey seal with dark speckles on a silver-grey coat and a pale cream belly, a big rounded head with a short snout on the right, long white whiskers, large dark gentle eyes, small ear holes, one front flipper held out to the side, the two rear flippers together at the tail end on the left; the mouth is closed and friendly; it looks twice as big and powerful as an ordinary harbour seal
2) a giant ancient sea turtle: an enormous green and olive sea turtle with a high domed shell made of large patterned plates, the shell worn and weathered with a few small barnacles and a little pale green algae on it, thick wrinkled skin, a wise gentle face on the right with a calm eye and a closed beak-like mouth, two huge front flippers spread out wide as if flying through the water, two small rear flippers and a short tail on the left
```

ชื่อชิ้นตอนตัด (ตามลำดับ): `boss-seal boss-turtle`
ตัดแล้ว: `python tools/sprites.py sheet-j-giants` ได้ `boss-seal` 720x215 และ `boss-turtle` 720x283 (ใส่ในเกมแล้ว 2026-10-06 ภาพตรงตาม prompt: หันขวา ปากปิด หน้าใจดี พื้นโปร่งใส ขอบเรืองเหมือนแผ่น L แต่ตัดสะอาด) ค่าในเกม: แมวน้ำ size 280 speed 30, เต่า size 280 speed 22

---

## ชุดสั่งรอบเดียว (2026-10-06): แตรหมอก + ปลาพิเศษ 8 ตัว + ทะเลใหม่ 3 ฉาก + สติ๊กเกอร์ 16 ดวง — ได้รูปครบและใส่ในเกมแล้ว (2026-10-06)

> ผลที่ได้: รูปตรง prompt ทั้งหมด (ปลาหันขวา พื้นโปร่งใส ขอบเรืองจางๆ ที่เครื่องมือตัดออกให้ ฉากใหม่เส้นผิวน้ำ 0.126/0.182 และขอบทราย 0.775/0.806 ตรงของเดิม) ตัวพิเศษตัดออกมาเล็กกว่าแผ่นก่อน (ด้านยาว 216-320 px) แต่พอสำหรับขนาดในเกม

ทำในแชต ChatGPT **ห้องเดียวกับแผ่นก่อนๆ** (สไตล์จะตรงกัน) พิมพ์ต่อท้ายทุก prompt ว่า `Match the exact art style of the earlier sheets.`
เซฟไฟล์ไว้ที่ `tap-tap-fishing\art\incoming\` แล้วบอกผมว่า "รูปมาแล้ว" ผมจะตัด ใส่เกม และเทสต์ให้ ส่งมาทีละรูปก็ได้ ไม่ต้องรอครบ

| ลำดับ | ไฟล์ที่ต้องเซฟ | แนบรูปไปด้วย | prompt | ได้อะไรในเกม |
|---|---|---|---|---|
| 1 | `sheet-i-horn.png` | ไม่ต้อง | M (อยู่ข้างบน) | ไอเทมแตรหมอก |
| 2 | `sheet-k-special.png` | ไม่ต้อง | O | ปลาพิเศษ 8 ตัว (หมวดใหม่ในสมุด "ปลาพิเศษ") |
| 3 | `background-arctic-portrait.png` และ `background-arctic-landscape.png` | `background-portrait.png` / `background-landscape.png` | P1 | ทะเลน้ำแข็ง |
| 4 | `background-lagoon-portrait.png` และ `background-lagoon-landscape.png` | เหมือนกัน | P2 | ลากูนมรกต |
| 5 | `background-wreck-portrait.png` และ `background-wreck-landscape.png` | เหมือนกัน | P3 | อ่าวเรืออับปาง |
| 6 | `sheet-l-stickers.png` | ไม่ต้อง | Q | สติ๊กเกอร์ความสำเร็จ 16 ดวง |

รูปพื้นหลังเดิมอยู่ที่ `tap-tap-fishing\art\incoming\background-portrait.png` และ `background-landscape.png` (วิธีเดียวกับฉากยามเย็น/กลางคืน: แนบรูปเดิมแล้วสั่ง "วาดใหม่ภาพเดิม" เส้นผิวน้ำกับขอบทรายจะอยู่ตำแหน่งเดิม)

## O — `sheet-k-special.png` ปลาพิเศษ 8 ตัว (2026-10-06 — ใช้งานแล้ว)

> สัตว์ทะเลหายากแปลกตา เข้าสมุดหมวดใหม่ "ปลาพิเศษ" (ไม่กระทบเงื่อนไขปลดล็อกของแต่งเรือ) ผมกำหนดค่าในเกมไว้แล้ว: มังกรทะเลใบไม้ (ชั้น 2), หอยงวงช้าง (กลางน้ำ),
> ปลาโมลา (ชั้นลึก), ปลาซีลาแคนท์ ปลาริบบิ้นยักษ์ หมึกยักษ์ลายจุด (ลึกสุด), กั้งตั๊กแตน กุ้งก้ามกรามยักษ์ (พื้นทราย) ตัวที่ยังไม่เคยจับจะแวะมาเยี่ยมบ่อยเป็นพิเศษ

```text
Create a 1536x1024 landscape PNG with a TRANSPARENT background (real alpha, no checkerboard pattern drawn in, no dark or coloured background, no vignette).

ART STYLE: semi-realistic painted illustration for a premium mobile fishing game, the same style as the earlier creature sheets. Natural anatomy and real proportions, accurate species markings and real-world colours (slightly richer than life), fine scale, skin and fin detail, soft light from above with a gentle rim light, a small natural highlight in the eye. NOT cartoon: no big cute eyes, no smiles, no eyebrows, no thick outlines, no chibi proportions. Calm and friendly for children, mouths closed or only slightly open with no visible teeth, no blood.

LAYOUT: exactly 8 separate sea animals in a grid of 2 rows x 4 columns, in this reading order (left to right, then top to bottom). Each animal is centred in its own invisible cell, about 75% of the cell width, with wide empty transparent space all around. Nothing touches or overlaps another animal or the image edge. Every animal in side view facing RIGHT (head toward the right edge), swimming or walking horizontally, whole body visible including fins, tail, legs, arms and antennae. No water, no sand, no bubbles, no shadows, no glow, no halo, no text, no labels, no numbers, no grid lines, no frame.

1) a leafy sea dragon: slender yellow-green body covered in leaf-like and ribbon-like appendages in olive, gold and brown, long tubular snout, tiny transparent fins, upright gentle swimming pose
2) a chambered nautilus: spiral shell with cream and rust-brown flame stripes, a soft hood and many thin tentacles spreading to the right, shell on the left
3) an ocean sunfish (mola mola): tall rounded silver-grey disc body with a tall dorsal fin and a tall anal fin, a short rounded rear edge instead of a tail, small mouth closed, small calm eye
4) a coelacanth: deep steel-blue body with pale white speckles, thick scales, fleshy paddle-like lobed fins, a three-lobed tail
5) an oarfish: extremely long, thin silver ribbon-like body in a gentle horizontal wave, a crest of long red spines on the head and a red dorsal fin along the whole back, big calm eye
6) a large spotted octopus: soft lavender-pink body with white spots, a big rounded head (mantle) on the right and eight arms curling and trailing to the left, rows of pale suckers on the arms, one calm eye
7) a mantis shrimp walking: bright green, blue and orange body with red-orange legs and folded club-like claws, two stalked eyes in green and gold, segmented tail, no teeth, friendly
8) a giant blue-green crayfish walking: large body in blue, green and brown with two big strong claws held forward on the right, long antennae, segmented tail on the left, orange-red joints
```

ชื่อชิ้นตอนตัด (ตามลำดับ): `leafy-dragon nautilus sunfish coelacanth oarfish giant-octopus mantis-shrimp giant-crayfish`

## P — ทะเลใหม่ 3 ฉาก (แต่ละฉาก 2 รูป แนวตั้ง+แนวนอน, 2026-10-06 — ใช้งานแล้ว)

> เกมจะสลับฉากทุกรอบที่เล่น: กลางวัน → ยามเย็น → กลางคืน → ทะเลน้ำแข็ง → ลากูนมรกต → อ่าวเรืออับปาง → กลับไปกลางวัน
> **ต้องแนบรูปพื้นหลังเดิม** แล้วสั่งวาดใหม่ในองค์ประกอบเดิม เพื่อให้เส้นผิวน้ำ ขอบทราย และขอบแนวปะการังอยู่ตำแหน่งเดิม (ผมใช้ค่าวัดเดิม)

### P1 ทะเลน้ำแข็ง (arctic)

```text
Repaint the attached image as the same scene in a calm polar sea in clear daylight. Keep EXACTLY the same composition, size and aspect ratio: the waterline stays at the same height, the sandy seabed top edge stays at the same height, the reef shapes stay on the left and right edges, the two islands stay where they are, the centre stays open water.
Change the setting: the islands become snow-covered rocky islands with a few small icebergs, a pale cold blue sky with thin clouds, the water an icy clear turquoise with crisp white-cyan light rays, the left and right reefs become cold-water scenery (pale blue and white coral-like rock, purple and white anemones, golden kelp), and the sand a pale grey-white with small shells. Bright, friendly and readable for children: fish drawn on top must stand out. Same semi-realistic painted style. No fish, no animals, no boat, no people, no text, no frame.
```

### P2 ลากูนมรกต (lagoon)

```text
Repaint the attached image as the same scene in a sunny emerald lagoon. Keep EXACTLY the same composition, size and aspect ratio: the waterline stays at the same height, the sandy seabed top edge stays at the same height, the reef shapes stay on the left and right edges, the two islands stay where they are, the centre stays open water.
Change the setting: the islands become small palm-tree islands with white beaches, a soft turquoise-and-peach sky, the water a glowing emerald green with golden-green light rays, the left and right sides become swaying forests of tall green kelp and sea-grass with a few pink and orange corals at the base, and the sand bright white and sparkling. Fresh, warm and friendly for children: fish drawn on top must stand out. Same semi-realistic painted style. No fish, no animals, no boat, no people, no text, no frame.
```

### P3 อ่าวเรืออับปาง (wreck)

```text
Repaint the attached image as the same scene in a quiet bay with old sunken treasure. Keep EXACTLY the same composition, size and aspect ratio: the waterline stays at the same height, the sandy seabed top edge stays at the same height, the reef shapes stay on the left and right edges, the two islands stay where they are as green rocky islets, the centre stays open water.
Change the setting: the water a deeper teal-blue with soft green-gold light rays; on the LEFT edge, in place of the reef, the curved wooden ribs and broken hull of an old sunken sailing ship covered with barnacles, seaweed and small corals; on the RIGHT edge a tilted broken mast with torn sails, an old anchor and a few treasure chests with spilled gold coins half buried in the sand; some pale gold coins glinting on the seabed. Mysterious but cheerful and friendly for children, NOT scary: no skeletons, no skulls, no people. Fish drawn on top must stand out. Same semi-realistic painted style. No fish, no animals, no boat, no text, no frame.
```

## Q — `sheet-l-stickers.png` สติ๊กเกอร์ความสำเร็จ 16 ดวง (2026-10-06 — ใช้งานแล้ว)

> สติ๊กเกอร์ที่ปลดล็อกเมื่อทำภารกิจสำเร็จ (ยังไม่ปลดล็อกจะเป็นเงาจาง ในสมุดสะสม) ความหมายของแต่ละดวง (ผมจะผูกกับเกมตอนได้รูป):
> 1 จับปลาตัวแรก, 2 น้ำตื้นครบ, 3 กลางน้ำครบ, 4 ทะเลลึกครบ, 5 พื้นทะเลครบ, 6 ยักษ์ใหญ่ครบ, 7 ปลาพิเศษครบ, 8 เข้า FEVER, 9 แจ็กพอต, 10 ยิงเรือโจรสลัดจนแตก,
> 11 วงล้อ ★100, 12 เล่น 2 คนจนจบ, 13 เป่าแตรหมอก, 14 ภารกิจประจำวันครบ 3, 15 ออกเรือกลางคืน, 16 สมุดสะสมครบทุกชนิด

```text
Create a 1536x1024 landscape PNG with a TRANSPARENT background (real alpha, no checkerboard pattern drawn in, no dark or coloured background, no vignette).

ART STYLE: glossy collectible sticker medals for a premium children's fishing game, painted in the same semi-realistic style as the earlier sheets (real materials, soft light from above), but as shiny round badges: each sticker is a perfectly round medal with a coloured enamel ring, a thin gold rim and a soft white die-cut sticker border around it, with one simple, clearly readable object painted in the middle. Friendly and cheerful, no faces on objects, NO text, NO letters, NO numbers on any sticker.

LAYOUT: exactly 16 separate round stickers in a grid of 4 rows x 4 columns, in this reading order (left to right, then top to bottom). Each sticker is centred in its own invisible cell, about 80% of the cell width, with empty transparent space around it. Nothing touches or overlaps another sticker or the image edge. All stickers face the viewer straight on, the same size. No shadows on the ground, no glow, no halo, no grid lines, no frame.

1) a small silver fish on a light blue ring
2) a pale pink-and-white seashell on a sky-blue ring
3) a green sea turtle on a teal ring
4) a shark fin above waves on a deep-blue ring
5) a starfish and a small crab on a sand-gold ring
6) a big whale tail above waves on a navy ring
7) a sparkling pearl in an open shell, with tiny stars, on a violet ring
8) a bright orange flame on a red ring
9) a golden crown with red and blue jewels on a gold ring
10) a small brass cannon and a black cannonball on a dark-brown ring
11) a golden prize wheel with a single big star on a green ring
12) two small fishing boats side by side, one red and one blue, on a turquoise ring
13) a brass fog horn on a grey-blue ring
14) a calendar page with a big check mark and a small sun on a yellow ring
15) a crescent moon and a star above dark water on a midnight-blue ring
16) a shining golden trophy cup with a small fish on it on a rainbow-coloured ring
```

ชื่อชิ้นตอนตัด (ตามลำดับ): `st-first-catch st-shallow st-middle st-deep st-seabed st-giants st-special st-fever st-jackpot st-pirate st-wheel st-duo st-horn st-daily st-night st-all`

---

## R — `sheet-m-orcas.png` วาฬเพชฌฆาต + วาฬเพชฌฆาตยักษ์ + โลมายักษ์ 3 ตัว (2026-10-07 — ใช้งานแล้ว)

> เด็กๆ ขอ วาฬเพชฌฆาต (ปกติ + ยักษ์) และ โลมา (ปกติ + ยักษ์) · โลมาปกติมีรูปอยู่แล้ว (แผ่น H) จึงสั่งแค่ 3 ตัวที่ยังไม่มี
> ในเกม (ลงทะเบียนไว้แล้ว ซ่อนอยู่จนกว่าจะมีรูป):
> - `orca` วาฬเพชฌฆาต — **ตัวปกติอยู่ชั้นล่าง (เลน 5) เป็นเงาดำก่อนดึงขึ้นมา** 80 คะแนน แตะ 21 ครั้ง ว่ายเร็ว (หายากพอสมควร)
> - `boss-orca` วาฬเพชฌฆาตยักษ์ — บอสหมวด "ยักษ์ใหญ่" 230 คะแนน แตะ 31 ครั้ง
> - `boss-dolphin` โลมายักษ์ — บอสหมวด "ยักษ์ใหญ่" 195 คะแนน แตะ 28 ครั้ง
> - `dolphin` โลมาปกติ (รูปเดิม) **ย้ายลงชั้นล่าง (เลน 4) เป็นเงาดำก่อน** แล้ว (เดิมอยู่กลางน้ำ)
>
> ทำในแชตเดิมที่ทำแผ่นก่อนๆ แล้วพิมพ์เพิ่มท้าย prompt ว่า `Match the exact art style of the earlier creature sheets, and the earlier dolphin.`
> (ถ้าแนบรูปโลมาเดิม `public/assets/sprites/dolphin.webp` ไปด้วย โลมายักษ์จะหน้าตาเป็นพันธุ์เดียวกัน)

```text
Create a 1536x1024 landscape PNG with a TRANSPARENT background (real alpha, no checkerboard pattern drawn in, no dark or coloured background, no vignette).

ART STYLE: semi-realistic painted illustration for a premium mobile fishing game, the same style as the earlier creature sheets. Natural anatomy, rich detail, soft light from above with a gentle rim light. NOT cartoon. Majestic but gentle and friendly for children: mouths closed, no teeth showing, calm kind eyes, no blood, no scars.

LAYOUT: exactly 3 separate sea animals stacked in 3 rows (one per row, each row a full-width band about one third of the image height), in this order from top to bottom. Each animal is centred in its band and about 60% of the image width, with clear empty transparent space above and below, so the tall dorsal fin and the tail never touch the band above or below. Nothing touches another animal or the image edge. Strict side view facing RIGHT (head toward the right edge), swimming horizontally, whole body visible including the full tail fluke and every flipper. No water, no bubbles, no shadows, no glow, no halo, no text, no labels, no grid lines, no frame.

1) an ordinary adult orca (killer whale): glossy jet-black back and sides, a crisp white belly and white lower jaw, a clear white oval patch just above and behind the eye, a pale grey saddle patch behind the tall upright dorsal fin, two broad rounded flippers, a strong tail fluke on the left; a rounded head on the right with the mouth closed in a friendly gentle line and one calm dark eye
2) a giant ancient orca: the same black and white colours but much bigger and more powerful looking, an extra tall dorsal fin with a slight natural curve, very broad flippers and a huge tail fluke on the left, a wide strong body, a wise calm eye and a closed friendly mouth; it looks twice as big as an ordinary orca
3) a giant dolphin: a huge bottlenose dolphin with a smooth silvery blue-grey back fading into a pale cream-white belly, a long beak-like snout on the right with the mouth closed in a friendly smile, a gentle dark eye, a curved dorsal fin, two pointed flippers and a strong horizontal tail fluke on the left; it looks twice as big and strong as an ordinary bottlenose dolphin

Match the exact art style of the earlier creature sheets, and the earlier dolphin.
```

ชื่อชิ้นตอนตัด (ตามลำดับ): `orca boss-orca boss-dolphin`
ตัดแล้ว: `python tools/sprites.py sheet-m-orcas` ได้ `orca` 720x284, `boss-orca` 720x254, `boss-dolphin` 720x228 (2026-10-07) รูปตรง prompt: หันขวา ปากปิด หน้าใจดี ครบทั้งครีบและหาง สามตัวแยกกันไม่ชนกัน
ChatGPT ให้พื้นเป็นแสงเรืองสีเข้มจางๆ (alpha 0-254) แต่เครื่องมือตัดออกได้สะอาด ตรวจบนพื้นฟ้า 2 สีแล้วไม่มีขอบเรืองและไม่กินส่วนสีดำของตัววาฬ
ข้อสังเกต: วาฬเพชฌฆาตปกติกับตัวยักษ์หน้าตาเกือบเหมือนกัน (ตัวยักษ์ถูกวาดอ้วนและครีบหลังสูงกว่าเล็กน้อย) ในเกมต่างกันที่ขนาด (175 กับ 290) ถ้าอยากให้ต่างกว่านี้สั่งวาดตัวยักษ์ใหม่ตัวเดียวได้ เช่น `Redraw only the giant orca with a much taller dorsal fin and a bigger, heavier body, keep everything else identical.`

---

## สำหรับ AI ที่ทำงานต่อ

- `python tools/sprites.py [ชื่อแผ่น]` อ่านไฟล์ตามชื่อในตารางจาก `art/incoming/` (ไฟล์ดิบไม่ถูก commit) → เขียน `public/assets/sprites/<id>.webp`,
  `public/assets/sea-<portrait|landscape>.webp`, ภาพตรวจ `art/preview/` และสร้าง `src/art-manifest.js` ใหม่ทั้งไฟล์ (อย่าแก้มือ)
- ตารางช่อง/ชื่อ id ต่อแผ่นอยู่ใน `SHEETS` (ลำดับต้องตรงกับ prompt ข้างบน) จุดยึดที่วัดจากรูปจริงอยู่ใน `ANCHORS`
  (ปากท่อวางคันเบ็ดและเส้นรอยต่อสีท้องเรือของ `boat.png`, เส้นน้ำและขอบทรายของพื้นหลัง) — ถ้าสั่งเรือหรือพื้นหลังใหม่ ต้องวัดแล้วแก้ตารางนี้
  ดูกากบาทแดง/เส้นเหลืองใน `art/preview/boat.png` และ `background-*.png` ว่าตรงตำแหน่ง
- แผ่น H: เพิ่มรายการ 12 ตัวใน `src/species.js` ตามตำแหน่งที่วางแผนไว้ในหัวข้อ H ก่อนรัน `tools/sprites.py sheet-e-extra`
- ตั้งชื่อ `id` ใหม่ในแผ่นต้องมีรายการใน `src/species.js` ด้วย (ทดสอบ `tests/assets.test.mjs` บังคับให้ทุกตัวมีภาพและทุกภาพมีรายการ)
- สัตว์ที่ไม่มีภาพจะไม่ออกในเกมจริง (โหมด DEV `?qa=1` ใช้อีโมจิแทน)
- ชุดการ์ตูนเดิม (atlas + `legacy`) ถูกลบแล้ว ดูได้ใน Git ที่ commit `ab5e4cc`
