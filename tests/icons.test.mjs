import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const file = (path) => readFileSync(new URL(`../${path}`, import.meta.url));
const png = (path) => { const data = file(path); assert.equal(data.subarray(1, 4).toString(), 'PNG', path); return [data.readUInt32BE(16), data.readUInt32BE(20)]; };

test('home-screen icons exist at the sizes the manifest and page declare', () => {
  for (const [name, size] of [['icon-32', 32], ['icon-180', 180], ['icon-192', 192], ['icon-512', 512], ['icon-maskable-512', 512]]) {
    assert.deepEqual(png(`public/icons/${name}.png`), [size, size], name);
  }
});

test('manifest installs the game like the other games: standalone, Thai name, any + maskable icons', () => {
  const manifest = JSON.parse(file('public/manifest.webmanifest'));
  assert.equal(manifest.display, 'standalone'); assert.equal(manifest.lang, 'th');
  assert.equal(manifest.start_url, './'); assert.equal(manifest.scope, './');
  assert.match(manifest.name, /อ่าวสมบัติ/); assert.ok(manifest.short_name.length <= 12);
  assert.ok(/^#[0-9a-f]{6}$/i.test(manifest.theme_color) && /^#[0-9a-f]{6}$/i.test(manifest.background_color));
  const purposes = manifest.icons.map((icon) => `${icon.sizes}/${icon.purpose}`).sort();
  assert.deepEqual(purposes, ['192x192/any', '512x512/any', '512x512/maskable']);
  for (const icon of manifest.icons) {
    assert.ok(!icon.src.startsWith('/'), 'relative, so it works under the /tap-tap-fishing/ base');
    const [w, h] = png(`public/${icon.src}`); assert.equal(`${w}x${h}`, icon.sizes);
  }
});

test('index.html links the manifest, favicon, Apple touch icon and web-app meta tags', () => {
  const html = file('index.html').toString('utf-8');
  for (const needle of ['rel="manifest" href="/manifest.webmanifest"', 'rel="apple-touch-icon" href="/icons/icon-180.png"', 'href="/icons/icon-32.png"',
    'name="apple-mobile-web-app-capable" content="yes"', 'name="apple-mobile-web-app-title" content="อ่าวสมบัติ"', 'name="mobile-web-app-capable" content="yes"']) {
    assert.ok(html.includes(needle), needle);
  }
  assert.ok(!/user-scalable\s*=\s*no|maximum-scale\s*=\s*1/.test(html), 'zoom stays enabled (see AGENTS.md)');
});
