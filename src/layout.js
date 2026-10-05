import { LANE_COUNT } from './species.js';

export const WATERLINE = 132;
export const CENTER_X = 240;
const FIRST_LANE_DEPTH = 78;
const MIN_SEA_DEPTH = 330;

// Spread the six swimming lanes and the seabed between the surface and the controls,
// so tall phones fill the whole sea instead of leaving the lower half empty.
// width/height: visible world size; dockTop: world y where the cast/reel controls start.
export function computeLayout({ width, height, dockTop = height }) {
  const top = WATERLINE + FIRST_LANE_DEPTH;
  const seabedLine = Math.max(top + MIN_SEA_DEPTH, Math.min(height - 10, dockTop - 6));
  const seabedLane = seabedLine - 24;
  const spacing = (seabedLane - top) / (LANE_COUNT - 1);
  const lanes = Array.from({ length: LANE_COUNT }, (_, lane) => top + lane * spacing);
  return {
    width, height, lanes, spacing, seabedLine,
    scale: Math.max(0.8, Math.min(1.3, spacing / 64)),
    laneHeight: spacing * 0.92,
    floor: seabedLine + 8,
    left: CENTER_X - width / 2,
    right: CENTER_X + width / 2,
  };
}

// Share of the picture's width, on each side, that holds the reef. It is never stretched.
export const BG_EDGE = 0.22;

// Scale/position for a background whose waterline and sand line are fractions of its height.
// The sand line always lands on the seabed lane. On a screen narrower than the picture the picture is
// centred (the outer reef is cropped). On a wider screen the reef stays pinned to both edges and only the
// open water between them is stretched, so no reef ever appears in the middle of the sea. Whatever the
// picture does not cover below the sand (the strip behind the controls) is filled with a mirrored copy.
export function backgroundPlacement(bg, layout) {
  const scale = (layout.seabedLine - WATERLINE) / ((bg.seabed - bg.waterline) * bg.h);
  const tileWidth = bg.w * scale;
  const height = bg.h * scale;
  const top = WATERLINE - bg.waterline * height;
  const below = Math.max(0, layout.height - (top + height));
  if (layout.width <= tileWidth) return { scale, top, tileWidth, height, below, slices: null, distortion: 1 - layout.width / tileWidth };
  const edge = tileWidth * BG_EDGE;
  const center = layout.width - 2 * edge;
  return { scale, top, tileWidth, height, below, slices: { edge, center }, distortion: center / (tileWidth - 2 * edge) - 1 };
}
