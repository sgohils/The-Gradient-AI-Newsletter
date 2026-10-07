/** Try stable same-minor PyPI patches; failed verification never commits them. */
import { readFileSync, writeFileSync } from 'node:fs';
const paths = ['scripts/video/requirements.txt', 'scripts/video/constraints.txt'];
const cache = new Map();
for (const path of paths) {
  const lines = readFileSync(path, 'utf8').split('\n');
  for (let index = 0; index < lines.length; index++) {
    const match = lines[index].match(/^([\w-]+)(\[[\w,]+\])?==(\d+)\.(\d+)\.(\d+)\s*$/);
    if (!match) continue;
    const [, name, extras = '', major, minor, patch] = match;
    try {
      if (!cache.has(name)) {
        if (cache.size >= 50) continue;
        const response = await fetch(`https://pypi.org/pypi/${encodeURIComponent(name)}/json`, { signal: AbortSignal.timeout(10000) });
        if (!response.ok) throw new Error('Package metadata unavailable');
        cache.set(name, (await response.json()).releases);
      }
      const releases = cache.get(name);
      const next = Object.keys(releases).filter(version => new RegExp(`^${major}\\.${minor}\\.\\d+$`).test(version) &&
        releases[version].some(file => !file.yanked)).sort((a, b) => Number(b.split('.')[2]) - Number(a.split('.')[2]))[0];
      if (next && Number(next.split('.')[2]) > Number(patch)) lines[index] = `${name}${extras}==${next}`;
    } catch { /* Keep the known-good pin; never switch services or major versions. */ }
  }
  writeFileSync(path, lines.join('\n'));
}
console.log('Same-minor Python patch candidates prepared; adoption requires full runtime verification.');
