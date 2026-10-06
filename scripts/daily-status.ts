import * as fs from 'fs';
import { dailyStatus } from '../src/cli/daily-status';

try {
  const status = dailyStatus({ outputDir: process.env.OUTPUT_DIR, issueDate: process.env.ISSUE_DATE });
  const outputs = `issue_date=${status.issueDate}\nnewsletter_needed=${status.newsletterNeeded}\nvideo_needed=${status.videoNeeded}\nvideo_input=${status.videoInputPath || ''}\n`;
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, outputs);
  const summary = `Daily edition: ${status.issueDate} (UTC)\n` +
    `Newsletter: ${status.newsletterNeeded ? 'not committed yet; publication needed' : 'already committed; email will not be sent again'}\n` +
    `YouTube: ${status.videoNeeded ? 'not published yet' : 'already published; no new upload'}\n` +
    `Automatic video rendering: ${process.env.VIDEO_ENABLED === 'true' ? 'enabled' : 'disabled (Actions variable VIDEO_ENABLED must be true; a secret does not enable it)'}\n` +
    `Automatic video publication: ${process.env.VIDEO_PUBLISH_ENABLED === 'true' ? 'enabled' : 'disabled (Actions variable VIDEO_PUBLISH_ENABLED must be true; a secret does not enable it)'}\n`;
  if (process.env.GITHUB_ACTIONS === 'true' && status.videoNeeded && process.env.VIDEO_ENABLED !== 'true') {
    console.warn('::warning::Daily video is disabled. Set VIDEO_ENABLED=true in Settings > Secrets and variables > Actions > Variables, not Secrets.');
  } else if (process.env.GITHUB_ACTIONS === 'true' && status.videoNeeded && process.env.VIDEO_PUBLISH_ENABLED !== 'true') {
    console.warn('::warning::Daily video publication is disabled. Set VIDEO_PUBLISH_ENABLED=true in Actions Variables, not Secrets.');
  }
  console.log(summary);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `\n${summary.replace(/\n/g, '  \n')}\n`);
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Daily preflight failed.');
  process.exitCode = 1;
}
