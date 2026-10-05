import * as fs from 'fs';
import { dailyStatus } from '../src/cli/daily-status';

try {
  const status = dailyStatus({ outputDir: process.env.OUTPUT_DIR, issueDate: process.env.ISSUE_DATE });
  const outputs = `issue_date=${status.issueDate}\nnewsletter_needed=${status.newsletterNeeded}\nvideo_needed=${status.videoNeeded}\nvideo_input=${status.videoInputPath || ''}\n`;
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, outputs);
  const summary = `Daily edition: ${status.issueDate} (UTC)\n` +
    `Newsletter: ${status.newsletterNeeded ? 'not committed yet; publication needed' : 'already committed; email will not be sent again'}\n` +
    `YouTube: ${status.videoNeeded ? 'not published yet' : 'already published; no new upload'}\n` +
    `Automatic video rendering: ${process.env.VIDEO_ENABLED === 'true' ? 'enabled' : 'disabled (VIDEO_ENABLED is not true)'}\n` +
    `Automatic video publication: ${process.env.VIDEO_PUBLISH_ENABLED === 'true' ? 'enabled' : 'disabled (VIDEO_PUBLISH_ENABLED is not true)'}\n`;
  console.log(summary);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `\n${summary.replace(/\n/g, '  \n')}\n`);
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Daily preflight failed.');
  process.exitCode = 1;
}
