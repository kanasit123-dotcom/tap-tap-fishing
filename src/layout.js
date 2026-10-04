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

// Scale/position for a background whose waterline and sand line are fractions of its height.
// Aligns the sand with the seabed lane, always reaches the bottom of the view, and repeats
// mirrored copies sideways on wide screens.
export function backgroundPlacement(bg, layout) {
  const alignSeabed = (layout.seabedLine - WATERLINE) / ((bg.seabed - bg.waterline) * bg.h);
  const coverBottom = (layout.height - WATERLINE) / ((1 - bg.waterline) * bg.h);
  const scale = Math.max(alignSeabed, coverBottom);
  const tileWidth = bg.w * scale;
  const top = WATERLINE - bg.waterline * bg.h * scale;
  const side = Math.max(0, Math.ceil((layout.width / tileWidth - 1) / 2));
  return { scale, top, tileWidth, height: bg.h * scale, tiles: Array.from({ length: side * 2 + 1 }, (_, i) => i - side) };
}
