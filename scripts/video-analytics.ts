import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { collectAnalytics, analyticsReport } from '../src/video/analytics';
import { improveExperiments, readExperiments } from '../src/video/experiments';
import { readLedger, writeJson } from '../src/video/storage';
import { appendSummary } from '../src/video/cli';

async function main(): Promise<void> {
  const state = await collectAnalytics(readLedger('video-state/ledger.json'), readExperiments(), {
    zernioApiKey: process.env.ZERNIO_API_KEY, accountId: process.env.ZERNIO_YOUTUBE_ACCOUNT_ID,
    googleClientId: process.env.YOUTUBE_ANALYTICS_CLIENT_ID, googleClientSecret: process.env.YOUTUBE_ANALYTICS_CLIENT_SECRET,
    googleRefreshToken: process.env.YOUTUBE_ANALYTICS_REFRESH_TOKEN,
  });
  const improved = improveExperiments(state);
  writeJson('video-state/experiments.json', improved);
  const report = analyticsReport(improved); const root = path.resolve('video-output/analytics'); fs.mkdirSync(root, { recursive: true });
  fs.writeFileSync(path.join(root, 'report.html'), report.html); fs.writeFileSync(path.join(root, 'report.csv'), report.csv);
  appendSummary(`Automatic retention analysis: hook=${improved.championHook}, beat=${improved.championBeatSeconds}s. ${Object.values(improved.metrics).filter(metric => metric.finalized).length} finalized snapshots. No owner action is required for routine analytics gaps.`);
}
main().catch(() => { console.warn('::warning::Analytics unavailable; daily publishing retains the current format.'); process.exitCode = 0; });
