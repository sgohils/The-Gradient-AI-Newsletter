import { argument } from '../src/video/cli';
import { recordHealth } from '../src/video/health';
import { readLedger } from '../src/video/storage';
const date = process.env.ISSUE_DATE || new Date().toISOString().slice(0, 10);
const ledger = readLedger('video-state/ledger.json');
const state = ledger.issues[date]?.platforms.youtube;
recordHealth(date, argument('--phase') || 'daily', ledger.youtubePause ? 'publication-paused' : state?.status || argument('--status') || 'unknown',
  ledger.youtubePause?.reason || ledger.issues[date]?.quarantineReason || state?.error || argument('--detail') || 'Automatic pipeline status.', undefined, Boolean(ledger.youtubePause));
