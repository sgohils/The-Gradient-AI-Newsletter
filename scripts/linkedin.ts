import 'dotenv/config';
import * as path from 'path';
import { argument, appendSummary, flag } from '../src/video/cli';
import { prepareLinkedInPost, writeLinkedInPreview } from '../src/linkedin/prepare';
import { publishLinkedInPost } from '../src/linkedin/publish';
import { linkedInCheckpoint } from '../src/linkedin/checkpoint';
import { readPublication } from '../src/linkedin/storage';
import { assertIssueDate } from '../src/video/storage';

async function main(): Promise<void> {
  const date = argument('--issue-date') || process.env.ISSUE_DATE || new Date().toISOString().slice(0, 10);
  assertIssueDate(date);
  const stateDir = argument('--state-dir') || 'linkedin-state';
  const saved = readPublication(path.join(stateDir, `${date}.json`), date);
  const publish = flag('--publish') || (flag('--automatic') && process.env.LINKEDIN_PUBLISH_ENABLED === 'true');
  if (flag('--automatic') && !publish && !process.env.NEWSLETTER_BASE_URL && !saved?.firstSubmittedAt) {
    appendSummary('## Daily LinkedIn company Page post\n\nDisabled. Set Actions variable NEWSLETTER_BASE_URL to generate previews, then LINKEDIN_PUBLISH_ENABLED=true to publish.');
    return;
  }
  const post = saved?.firstSubmittedAt ? saved : prepareLinkedInPost({ issueDate: date,
    baseUrl: process.env.NEWSLETTER_BASE_URL || '', postsDir: argument('--posts-dir'), outputDir: argument('--output-dir') });
  // Restore the submitted preview instead of changing a pending request on rerun.
  if (saved?.firstSubmittedAt) {
    writeLinkedInPreview(post, argument('--output-dir'));
  }
  appendSummary(`## Daily LinkedIn company Page post\n\nEdition: ${date} (UTC)\n\n${post.content}\n`);
  if (!publish) {
    appendSummary('Preview only. To enable daily posting, set Actions variable LINKEDIN_PUBLISH_ENABLED=true.');
    return;
  }
  const result = await publishLinkedInPost({ post, stateDir,
    apiKey: process.env.ZERNIO_API_KEY, accountId: process.env.ZERNIO_LINKEDIN_ACCOUNT_ID,
    organizationUrn: process.env.ZERNIO_LINKEDIN_ORGANIZATION_URN,
    checkpoint: linkedInCheckpoint(path.join(stateDir, `${date}.json`)) });
  appendSummary(`LinkedIn status: **${result.status}**\n\n${result.postUrl || result.error || `Zernio post: ${result.postId || 'not submitted'}`}\n`);
  if (['failed', 'blocked', 'uncertain'].includes(result.status)) process.exitCode = 1;
}

main().catch(error => {
  appendSummary(`LinkedIn stopped: ${error instanceof Error ? error.message : 'Publication failed.'}`);
  process.exitCode = 1;
});
