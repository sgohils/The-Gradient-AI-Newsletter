import 'dotenv/config';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { argument, appendSummary, output } from '../src/video/cli';
import { assertIssueDate, readLedger, writeJson } from '../src/video/storage';
import { restoreReviewedVideo } from '../src/video/preview';
import { runCommand } from '../src/video/process';

async function main(): Promise<void> {
  const issueDate = argument('--issue-date') || process.env.ISSUE_DATE || ''; assertIssueDate(issueDate);
  const ledger = readLedger('video-state/ledger.json'); const entry = ledger.issues[issueDate];
  if (entry?.platforms.youtube?.status === 'published') { output('mode', 'complete'); return; }
  if (entry?.quarantineReason) { output('mode', 'quarantined'); appendSummary(entry.quarantineReason); return; }
  const submitted = entry && (entry.media || Object.values(entry.platforms).some(platform => platform?.firstSubmittedAt));
  if (!submitted) { output('mode', 'render'); return; }
  const token = process.env.GITHUB_TOKEN; const repository = process.env.GITHUB_REPOSITORY;
  if (token && repository === 'sgohils/The-Gradient-AI-Newsletter') {
    const client = axios.create({ timeout: 30000, headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' } });
    const response = await client.get(`https://api.github.com/repos/${repository}/actions/artifacts`, { params: { name: 'daily-video-output', per_page: 100 } });
    const artifacts = (response.data.artifacts || []).filter((artifact: any) => !artifact.expired &&
      Date.parse(artifact.created_at) >= Date.parse(entry.selectedAt) - 60000).sort((a: any, b: any) => b.id - a.id).slice(0, 12);
    for (const artifact of artifacts) {
      try {
        const zip = await client.get(`https://api.github.com/repos/${repository}/actions/artifacts/${artifact.id}/zip`, {
          responseType: 'arraybuffer', maxContentLength: 80 * 1024 * 1024,
        });
        const root = path.resolve('.cache', `video-recovery-${artifact.id}`); fs.mkdirSync(root, { recursive: true });
        const zipPath = path.join(root, 'artifact.zip'); fs.writeFileSync(zipPath, zip.data);
        await runCommand(process.env.VIDEO_PYTHON || (process.platform === 'win32' ? 'python' : 'python3'),
          [path.resolve('scripts/video/unpack.py'), '--archive', zipPath, '--directory', root]);
        const restored = restoreReviewedVideo(issueDate, root);
        if (entry.media && restored.manifest.videoSha256 !== entry.media.videoSha256) continue;
        output('mode', 'restored'); output('manifest', restored.manifestPath); output('status', 'ready');
        appendSummary(`Automatically restored the exact submitted video from artifact ${artifact.id}; the current ledger was preserved.`); return;
      } catch { /* Try another artifact, never regenerate submitted media. */ }
    }
  }
  entry.quarantineReason = 'Submitted video artifact is unavailable; this issue is quarantined automatically to prevent duplicate or changed uploads.';
  writeJson('video-state/ledger.json', ledger); output('mode', 'quarantined'); appendSummary(entry.quarantineReason);
}
main().catch(() => { output('mode', 'quarantined'); console.error('Submitted-media recovery could not verify an exact artifact; no replacement upload is allowed.'); process.exitCode = 1; });
