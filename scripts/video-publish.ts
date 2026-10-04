import 'dotenv/config';
import { argument, appendSummary, flag, gitCheckpoint } from '../src/video/cli';
import { publicationSummary, publishVideo, readApproval } from '../src/video/publish';
import { readLedger, readManifest } from '../src/video/storage';
import { Platform } from '../src/video/types';

async function main(): Promise<void> {
  const ledgerPath = argument('--ledger') || 'video-state/ledger.json';
  const reconcileOnly = flag('--reconcile-only');
  const manifestPath = argument('--manifest', !reconcileOnly);
  const platforms = (argument('--platforms') || 'youtube,tiktok').split(',') as Platform[];
  if (!platforms.length || platforms.some((platform) => !['youtube', 'tiktok'].includes(platform))) throw new Error('Only youtube and tiktok are supported.');
  const date = manifestPath ? readManifest(manifestPath).issueDate : undefined;
  try {
    const ledger = await publishVideo({ manifestPath, ledgerPath, reconcileOnly,
      apiKey: process.env.ZERNIO_API_KEY, accounts: { youtube: process.env.ZERNIO_YOUTUBE_ACCOUNT_ID, tiktok: process.env.ZERNIO_TIKTOK_ACCOUNT_ID },
      platforms, tiktokApproval: readApproval(argument('--tiktok-approval')), checkpoint: gitCheckpoint(ledgerPath) });
    appendSummary(publicationSummary(ledger, date));
    if (date && platforms.some((platform) => ['failed', 'blocked', 'uncertain'].includes(ledger.issues[date]?.platforms[platform]?.status || ''))) process.exitCode = 1;
  } catch (error) {
    appendSummary(publicationSummary(readLedger(ledgerPath), date));
    throw error;
  }
}

main().catch((error: Error) => { console.error(`[video:publish] ${error.message}`); process.exitCode = 1; });
