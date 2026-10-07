import * as fs from 'fs';
import * as path from 'path';
import { assertIssueDate, readInput, readLedger } from '../video/storage';

/** Scheduled recovery attempts reuse a committed edition instead of emailing it again. */
export function dailyStatus(options: { outputDir?: string; ledgerPath?: string; now?: Date; issueDate?: string } = {}): {
  issueDate: string; newsletterNeeded: boolean; videoNeeded: boolean; videoInputPath?: string; videoPauseReason?: string;
} {
  const issueDate = options.issueDate || (options.now || new Date()).toISOString().slice(0, 10);
  assertIssueDate(issueDate);
  const outputDir = options.outputDir || 'posts';
  const files = ['md', 'html'].map(extension => path.join(outputDir, `${issueDate}.${extension}`));
  const present = files.filter(file => fs.existsSync(file));
  if ((present.length && present.length !== 2) || present.some(file => fs.statSync(file).size === 0)) {
    throw new Error(`Today's newsletter files are incomplete (${issueDate}); inspect the earlier run before sending again.`);
  }
  const ledger = readLedger(options.ledgerPath || 'video-state/ledger.json');
  const inputPath = path.join(outputDir, `${issueDate}.video.json`);
  let videoInputPath: string | undefined;
  if (fs.existsSync(inputPath)) {
    if (readInput(inputPath).issueDate !== issueDate) throw new Error('Daily video input belongs to a different date.');
    videoInputPath = inputPath;
  }
  return { issueDate, newsletterNeeded: present.length === 0,
    videoNeeded: !ledger.youtubePause && !ledger.issues[issueDate]?.quarantineReason && ledger.issues[issueDate]?.platforms.youtube?.status !== 'published', videoInputPath,
    ...(ledger.youtubePause ? { videoPauseReason: ledger.youtubePause.reason } : {}) };
}
