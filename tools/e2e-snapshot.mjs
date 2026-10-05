// Runs the browser tests against a frozen copy of the code, on its own dev server (port 5195), so the
// working tree can keep changing while the tests run. Usage: npm run test:e2e:snapshot -- [playwright args]
import { cpSync, rmSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const snapshot = join(root, '.e2e-snapshot');
rmSync(snapshot, { recursive: true, force: true });
mkdirSync(snapshot);
// Inside the project, so imports still resolve from the project's node_modules.
for (const item of ['index.html', 'src', 'public', 'tests']) cpSync(join(root, item), join(snapshot, item), { recursive: true });
console.log(`Snapshot of the code taken in .e2e-snapshot/ (${new Date().toLocaleTimeString()}). You can keep editing.`);

// Call the Playwright CLI with node directly (no shell), so arguments with spaces stay intact.
const cli = join(root, 'node_modules', '@playwright', 'test', 'cli.js');
const result = spawnSync(process.execPath, [cli, 'test', ...process.argv.slice(2)], {
  cwd: root, stdio: 'inherit', env: { ...process.env, E2E_SNAPSHOT: '1' },
});
process.exit(result.status ?? 1);
