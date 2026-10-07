const repo = process.env.GITHUB_REPOSITORY;
const token = process.env.GITHUB_TOKEN;
if (repo !== 'sgohils/The-Gradient-AI-Newsletter' || !token) throw new Error('Maintenance requires the repository workflow token.');
const headers = { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'User-Agent': 'GradientMaintenance' };
const base = `https://api.github.com/repos/${repo}/actions`;
let reclaimed = 0;
for (let page = 1; page <= 5; page++) {
  const response = await fetch(`${base}/artifacts?per_page=100&page=${page}`, { headers });
  if (!response.ok) break;
  const list = (await response.json()).artifacts || [];
  for (const artifact of list) {
    if (artifact.expired && ['daily-video-output', 'daily-video-input', 'retention-report', 'video-preview'].includes(artifact.name)) {
      const removed = await fetch(`${base}/artifacts/${artifact.id}`, { method: 'DELETE', headers });
      if (removed.ok) reclaimed++;
    }
  }
  if (list.length < 100) break;
}
const response = await fetch(`${base}/caches?per_page=100`, { headers });
if (response.ok) {
  const caches = (await response.json()).actions_caches || [];
  let bytes = caches.reduce((sum, cache) => sum + cache.size_in_bytes, 0);
  for (const cache of caches.sort((a, b) => Date.parse(a.last_accessed_at) - Date.parse(b.last_accessed_at))) {
    if (bytes <= 8 * 1024 ** 3) break;
    // Remove only this pipeline's replaceable caches; never unrelated builds.
    if (!/^(kokoro-cpu-|video-assets-v1-|gradient-video-assets-)/.test(cache.key)) continue;
    const removed = await fetch(`${base}/caches/${cache.id}`, { method: 'DELETE', headers });
    if (removed.ok) bytes -= cache.size_in_bytes;
  }
}
console.log(`Removed ${reclaimed} expired pipeline artifacts; cache allowance checked.`);
