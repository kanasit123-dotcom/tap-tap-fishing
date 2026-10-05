import test from 'node:test';
import assert from 'node:assert/strict';
import { computeLayout, backgroundPlacement, BG_EDGE, WATERLINE } from '../src/layout.js';
import { WORLD } from '../src/model.js';
import { LANE_COUNT, SEABED } from '../src/species.js';

// Visible world size and control top for real screens (css size / zoom).
const screens = {
  tallPhone: { width: 480, height: 909, dockTop: 734 },
  ipadPortrait: { width: 615, height: 760, dockTop: 635 },
  desktop: { width: 1334, height: 760, dockTop: 608 },
  landscapePhone: { width: 1918, height: 760, dockTop: 574 },
};

test('lanes run from just under the surface down to the controls on every screen', () => {
  for (const [name, screen] of Object.entries(screens)) {
    const layout = computeLayout(screen);
    assert.equal(layout.lanes.length, LANE_COUNT, name);
    assert.ok(layout.lanes[0] > WORLD.originY + WORLD.rest + 30, `${name}: first lane below the resting hook`);
    layout.lanes.slice(1).forEach((y, i) => assert.ok(y - layout.lanes[i] >= 50, `${name}: lanes ${i}/${i + 1} apart`));
    assert.ok(layout.seabedLine <= screen.dockTop - 6 + 1e-9 && layout.seabedLine >= screen.dockTop - 12, `${name}: seabed sits on top of the controls`);
    assert.ok(layout.lanes[SEABED] < layout.seabedLine && layout.floor > layout.seabedLine);
    assert.ok(layout.scale >= 0.8 && layout.scale <= 1.3);
    assert.equal(layout.right - layout.left, screen.width);
  }
});

test('a tall phone uses its extra height instead of leaving the bottom half empty', () => {
  const tall = computeLayout(screens.tallPhone);
  const old = 535; // the previous fixed deepest lane
  assert.ok(tall.lanes[5] > old + 70);
  assert.ok(tall.scale > computeLayout(screens.desktop).scale, 'creatures grow to fill the larger lanes');
});

test('a missing or bogus control position still leaves a playable sea', () => {
  const layout = computeLayout({ width: 480, height: 760, dockTop: 0 });
  assert.ok(layout.seabedLine - layout.lanes[0] >= 300);
});

test('background keeps its waterline at the surface, puts the sand on the seabed lane and fills below and beside', () => {
  const bg = { w: 1024, h: 1536, waterline: 0.12, seabed: 0.8 };
  for (const [name, screen] of Object.entries(screens)) {
    const layout = computeLayout(screen);
    const place = backgroundPlacement(bg, layout);
    assert.ok(Math.abs(place.top + bg.waterline * place.height - WATERLINE) < 1e-6, name);
    assert.ok(Math.abs(place.top + bg.seabed * place.height - layout.seabedLine) < 1e-6, `${name}: sand starts exactly on the seabed lane`);
    assert.ok(place.top + place.height + place.below >= screen.height - 1e-6, `${name} reaches the bottom (picture + mirrored strip)`);
    assert.ok(place.below < place.height * (1 - bg.seabed), `${name}: the mirrored strip stays inside the sand band`);
    if (place.slices) {
      assert.ok(Math.abs(place.slices.edge * 2 + place.slices.center - screen.width) < 1e-6, `${name}: reef | water | reef spans the screen exactly`);
      assert.ok(Math.abs(place.slices.edge - place.tileWidth * BG_EDGE) < 1e-9, `${name}: the reef is never stretched`);
    } else assert.ok(place.tileWidth >= screen.width, `${name}: a single picture covers the width`);
  }
});

test('the painting that needs the least stretching or cropping is chosen per screen shape', () => {
  const portrait = { w: 1024, h: 1536, waterline: 0.126, seabed: 0.775 };
  const landscape = { w: 1536, h: 1024, waterline: 0.182, seabed: 0.806 };
  const pick = (screen) => {
    const layout = computeLayout(screen);
    return backgroundPlacement(portrait, layout).distortion <= backgroundPlacement(landscape, layout).distortion ? 'portrait' : 'landscape';
  };
  assert.equal(pick(screens.tallPhone), 'portrait');
  assert.equal(pick(screens.desktop), 'landscape');
  assert.equal(pick(screens.landscapePhone), 'landscape');
});
