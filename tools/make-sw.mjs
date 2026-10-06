// After `vite build`: turns tools/sw.template.js into dist/sw.js with this build's file list and a version
// that changes whenever any file changes (so a new build replaces the old offline copy). Run by `npm run build`.
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const files = walk(dist).map((path) => relative(dist, path).split(sep).join('/')).filter((file) => file !== 'sw.js' && !file.endsWith('.map')).sort();
if (!files.includes('index.html')) throw new Error('dist/index.html is missing: run vite build first');
const hash = createHash('sha1');
for (const file of files) { hash.update(file); hash.update(readFileSync(join(dist, file))); }
const version = hash.digest('hex').slice(0, 12);

const template = readFileSync(join(root, 'tools', 'sw.template.js'), 'utf8');
const output = template.replace('__VERSION__', () => version).replace('__FILES__', () => JSON.stringify(files, null, 2));
writeFileSync(join(dist, 'sw.js'), output);
const size = files.reduce((sum, file) => sum + statSync(join(dist, file)).size, 0);
console.log(`dist/sw.js: ${files.length} files (${(size / 1048576).toFixed(1)} MB) kept for offline play, version ${version}`);
