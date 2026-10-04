# Artwork Provenance

Both PNGs were generated with the built-in image generation tool on 2026-10-04 and copied into this repository.
No UNIS game files, screenshots or copyrighted cabinet artwork were imported.
The boat, hook, bubbles and celebration particles are rendered with Phaser code.
Tool mode: built-in, not CLI. The source generations remain under the Codex generated_images directory.

| Asset | Dimensions | SHA-256 |
| --- | --- | --- |
| `public/assets/cove.png` | 1024x1536 | `047f24530850ff1e1ffbe16bc27ddbc4af8fa6ae7244a68572bebc15baf37887` |
| `public/assets/sea-creatures.png` | 1536x1024 | `6cebe4cdfb69e97bb1a63dbbe55bb42768622268a856bf9ee2f2bcfd3ea2c4bb` |

Atlas: 4 columns x 2 rows; cells are 384x512. Frame order is defined in `src/species.js`.
Transparency inspected: real RGBA, transparent cell gaps, no background removal or pixel editing.
Artwork was visually inspected inside the game, not only as an isolated sheet.

## Background Prompt

```text
Use case: illustration-story. Asset type: original vertical 2D family arcade fishing game environment background, portrait 1024x1536. Create a polished hand-painted friendly ocean cove cutaway for an iPad game. The upper 14% is sunny pale blue sky with two small distant lush green limestone islands near edges, a clean calm waterline at 14%. Below is a luminous turquoise underwater cross-section filling the rest, gradually deeper teal near seabed but NOT dark navy. Clear open water in the central 75% of the composition for animated fish and a descending fishing hook to be overlaid by game engine; do NOT put fish, boat, fishing hook, rope, UI, text or treasure objects into the image. Rich playful tropical reef only around the lower and outer edges: pink branching coral, fresh green seaweed, turquoise rocks, a few shells, soft sandy seabed restricted to bottom 7%, warm tiny sunlight rays subtly through water. Bright crisp children's adventure animation art, soft dimensional shading and painterly texture, detailed but visually calm, confident outlines, inviting turquoise/pink/lime/yellow palette. Full-bleed environment, no frame, no vignette, no cards, no bokeh orbs, no logos, no watermark. Landscape islands remain near edges and do not cover center boat placement. This is a playable background, not a poster or screenshot. Original artwork, do not imitate Treasure Cove cabinet graphics.
```

## Sprite Prompt

```text
Use case: stylized-concept. Asset type: original transparent sprite atlas for a friendly 2D children's fishing arcade game. A precisely aligned 4-column by 2-row grid of EIGHT separate characters on a genuinely transparent background, landscape 1536x1024. Each equal 384x512 cell contains exactly ONE complete sprite centered in that cell, with wide transparent padding. All creatures face RIGHT, side view, all full body, no cropped tails, no contact between cells, no labels or grid lines, no underwater backdrop, no bubbles, no surrounding props, no shadows outside characters. Polished hand-painted cartoon sprites, bright colors, strong silhouette, friendly big eyes, soft dimensional highlights, matching a sunny turquoise tropical cove. TOP ROW left to right: 1 small golden-yellow fish with tiny orange fins, 2 coral-orange clownfish with three white bands, 3 rounded cobalt-blue fish with yellow fins, 4 yellow and white striped tropical angelfish. BOTTOM ROW left to right: 5 cute round mint-green pufferfish with little pale spikes, 6 friendly sea turtle with green flippers and olive shell, 7 lavender-purple smiling octopus with complete curling eight short tentacles, 8 closed golden wooden treasure chest with turquoise gem clasp (no face). Each sprite occupies approximately 65% of the CELL width, and fits comfortably inside its cell height. No rod, no hook, no fishing line, no logos, no text, no watermarks. Original art unrelated to existing arcade cabinet assets. Clear true alpha transparency in all gaps and around every sprite.
```
