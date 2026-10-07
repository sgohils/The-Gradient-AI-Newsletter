import 'dotenv/config';
import { checkSetup } from '../src/video/setup';
import { appendSummary } from '../src/video/cli';
import { readLedger, writeJson } from '../src/video/storage';

checkSetup(readLedger('video-state/ledger.json'), 'video-output/setup/media').then(result => {
  writeJson('video-output/setup/connections.json', result);
  appendSummary(`One-time connection checks:\n\n${JSON.stringify(result, null, 2)}\n\nNo upload, email, subscription, or paid API was created. Empty retention curves are acceptable; engaged-view permissions are required for automatic experiments.`);
}).catch(() => { console.error('Connection setup checks failed without exposing credentials.'); process.exitCode = 1; });
