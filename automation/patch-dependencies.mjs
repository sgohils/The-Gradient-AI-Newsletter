import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const manifest = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const lock = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'));
const updates = [];
const executable = process.platform === 'win32' ? 'npm.cmd' : 'npm';
for (const name of Object.keys({ ...manifest.dependencies, ...manifest.devDependencies })) {
  const current = lock.packages?.[`node_modules/${name}`]?.version;
  if (!/^\d+\.\d+\.\d+$/.test(current || '')) continue;
  const [major, minor, patch] = current.split('.').map(Number);
  try {
    const raw = execFileSync(executable, ['view', `${name}@${major}.${minor}`, 'version', '--json'], { encoding: 'utf8', timeout: 15000, windowsHide: true });
    const candidates = JSON.parse(raw); const versions = Array.isArray(candidates) ? candidates : [candidates];
    const newest = versions.filter(value => new RegExp(`^${major}\\.${minor}\\.\\d+$`).test(value))
      .sort((a, b) => Number(b.split('.')[2]) - Number(a.split('.')[2]))[0];
    if (newest && Number(newest.split('.')[2]) > patch) updates.push(`${name}@${newest}`);
  } catch { console.log(`${name}: registry unavailable; keeping the existing version.`); }
}
if (updates.length) execFileSync(executable, ['install', '--package-lock-only', '--ignore-scripts', '--no-save', ...updates], { stdio: 'inherit', windowsHide: true });
execFileSync(executable, ['ci'], { stdio: 'inherit', windowsHide: true });
console.log(`${updates.length} same-minor patch candidates prepared; validation must pass before committing.`);
