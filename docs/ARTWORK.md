# Artwork Provenance

The shipped PNGs were generated with the built-in image generation tool on 2026-10-04 and copied into this repository.
No UNIS game files, screenshots or copyrighted cabinet artwork were imported.
The boat, hook, bubbles and celebration particles are rendered with Phaser code.
Tool mode: built-in, not CLI. The source generations remain under the Codex generated_images directory.

| Asset | Dimensions | SHA-256 |
| --- | --- | --- |
| `public/assets/cove.png` | 1024x1536 | `047f24530850ff1e1ffbe16bc27ddbc4af8fa6ae7244a68572bebc15baf37887` |
| `public/assets/sea-creatures.png` | 1536x1024 | `6cebe4cdfb69e97bb1a63dbbe55bb42768622268a856bf9ee2f2bcfd3ea2c4bb` |
| `public/assets/deep-creatures.png` | 1254x1254 | `1079fd75608d1ec8afb0a2ec41f2397579221550db7644d2d9d757e803b39c58` |

Original atlas composition: 4 columns x 2 rows. The new atlas has 2 columns x 2 rows.
Use the inspected source rectangles in `src/species.js`, not assumed grid cells: the original turtle/tentacles can exceed their nominal cells.
Phaser registers named frames from these rectangles; the book and rewards clip the same raster regions explicitly.
Transparency inspected: real RGBA, transparent cell gaps, no background removal or pixel editing.
Artwork was visually inspected inside the game, not only as an isolated sheet.

New atlas order: seal, shark, anglerfish, giant squid. All four remain vivid, opaque and friendly.
The actual generated size was 1254x1254; metadata and tests use that size, without resizing the bitmap.
Existing sea-creatures.png was not overwritten. Its nonzero RGB in transparent gaps is not a visible background: alpha is zero there.
Depth tiers are stylized arcade layout/difficulty, not a lesson in animal habitats.

## Additional Creature Atlas Prompts

Tool mode: built-in image generation, then built-in layout edit; transparent_background=true for both.
Reference for the first generation: public/assets/sea-creatures.png, inspected before use.
Draft source: `C:/Users/KANASIT/.codex/generated_images/01a0a932-e659-70c3-ae95-cda7602b4d8b/exec-22201422-977d-4e29-b9bb-ea434b584a7a.png`.
Final source: `C:/Users/KANASIT/.codex/generated_images/01a0a932-e659-70c3-ae95-cda7602b4d8b/exec-19b58ae9-8d80-4d83-8c57-2878b45ce0a4.png`.
Shipped copy: `public/assets/deep-creatures.png`. The draft had poor cell separation and is not shipped.

### Generation

```text
Use case: stylized-concept. Asset type: transparent sprite atlas for an original children's fishing game. Generate a NEW square 1024 x 1024 atlas, precisely 2 columns x 2 rows of equal 512 x 512 cells. Image 1 is STYLE REFERENCE ONLY: match its polished, vibrant, softly sculpted 3D cartoon sea animals, glossy eyes and friendly smiles; do NOT reproduce its background glows. Top left: a friendly silver-grey seal swimming horizontally facing RIGHT, small flippers, whiskers, entire body and tail visible. Top right: a friendly large blue-grey shark facing RIGHT in horizontal side profile, rounded dorsal fin, broad body, smiling closed mouth, no scary teeth. Bottom left: a cute deep-sea anglerfish facing RIGHT, round teal and violet body, curved fishing-lure antenna with a small bright yellow bulb, friendly big eye and small smile, NO glow outside the bulb, NO scary teeth. Bottom right: a friendly giant squid swimming horizontally facing RIGHT, coral-red streamlined mantle on the LEFT, head and short flowing cluster of curled tentacles on the RIGHT, recognizable squid not octopus, whole body visible. Exactly ONE animal in each cell, all isolated on actual transparent background, perfectly centered in its cell with at least 50 pixels clear margin on all sides. Keep each animal horizontally composed, including anglerfish; clear recognizable silhouettes, vivid opaque solid colors, crisp clean cutout edges. NO cast shadows, NO ambient glow halos, NO gradients behind animals, NO underwater scene, NO labels, NO text, NO grid lines, NO logo. Do not include any artwork in the transparent gaps. Output must be genuinely RGBA transparent.
```

### Layout Repair

The draft above was inspected and used as the edit target. Final output was inspected for alpha, margins and source bounds, then tested in gameplay and the book.

```text
Edit this sprite atlas ONLY to repair the layout. Preserve exactly these four animal identities, vivid solid colors, friendly expressions, side profile facing right, and original polished sculpted 3D cartoon style. Recompose as a SQUARE image containing exactly 2 columns x 2 rows of equal square cells. Seal in top left, shark top right, anglerfish bottom left, squid bottom right. CRITICAL: shrink each whole animal including all whiskers, fins, antenna and tentacles to at most 65% of its cell WIDTH and 65% of its cell HEIGHT. Center each entire silhouette exactly on the center of its square cell. Leave a generous border of at least 17.5% of the cell size empty on EVERY side of EVERY animal. Animals must not touch the center seams or image edges. No animal or part of another animal in its neighbor's cell. True transparent background, preserve transparency, no black background, no grid lines, no text, NO drop shadows or glow halos. Keep the bulb as an opaque yellow bulb with no halo. This is a production atlas requiring huge transparent margins, NOT a tightly packed illustration.
```


## Background Prompt

```text
Use case: illustration-story. Asset type: original vertical 2D family arcade fishing game environment background, portrait 1024x1536. Create a polished hand-painted friendly ocean cove cutaway for an iPad game. The upper 14% is sunny pale blue sky with two small distant lush green limestone islands near edges, a clean calm waterline at 14%. Below is a luminous turquoise underwater cross-section filling the rest, gradually deeper teal near seabed but NOT dark navy. Clear open water in the central 75% of the composition for animated fish and a descending fishing hook to be overlaid by game engine; do NOT put fish, boat, fishing hook, rope, UI, text or treasure objects into the image. Rich playful tropical reef only around the lower and outer edges: pink branching coral, fresh green seaweed, turquoise rocks, a few shells, soft sandy seabed restricted to bottom 7%, warm tiny sunlight rays subtly through water. Bright crisp children's adventure animation art, soft dimensional shading and painterly texture, detailed but visually calm, confident outlines, inviting turquoise/pink/lime/yellow palette. Full-bleed environment, no frame, no vignette, no cards, no bokeh orbs, no logos, no watermark. Landscape islands remain near edges and do not cover center boat placement. This is a playable background, not a poster or screenshot. Original artwork, do not imitate Treasure Cove cabinet graphics.
```

## Sprite Prompt

```text
Use case: stylized-concept. Asset type: original transparent sprite atlas for a friendly 2D children's fishing arcade game. A precisely aligned 4-column by 2-row grid of EIGHT separate characters on a genuinely transparent background, landscape 1536x1024. Each equal 384x512 cell contains exactly ONE complete sprite centered in that cell, with wide transparent padding. All creatures face RIGHT, side view, all full body, no cropped tails, no contact between cells, no labels or grid lines, no underwater backdrop, no bubbles, no surrounding props, no shadows outside characters. Polished hand-painted cartoon sprites, bright colors, strong silhouette, friendly big eyes, soft dimensional highlights, matching a sunny turquoise tropical cove. TOP ROW left to right: 1 small golden-yellow fish with tiny orange fins, 2 coral-orange clownfish with three white bands, 3 rounded cobalt-blue fish with yellow fins, 4 yellow and white striped tropical angelfish. BOTTOM ROW left to right: 5 cute round mint-green pufferfish with little pale spikes, 6 friendly sea turtle with green flippers and olive shell, 7 lavender-purple smiling octopus with complete curling eight short tentacles, 8 closed golden wooden treasure chest with turquoise gem clasp (no face). Each sprite occupies approximately 65% of the CELL width, and fits comfortably inside its cell height. No rod, no hook, no fishing line, no logos, no text, no watermarks. Original art unrelated to existing arcade cabinet assets. Clear true alpha transparency in all gaps and around every sprite.
```
