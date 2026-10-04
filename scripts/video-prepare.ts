import 'dotenv/config';
import { argument, appendSummary, output } from '../src/video/cli';
import { prepareVideoInput } from '../src/video/prepare';
import { restoreReviewedVideo } from '../src/video/preview';

async function main(): Promise<void> {
  const issueDate = argument('--issue-date', true)!;
  const restoredDir = argument('--restored-dir');
  if (restoredDir) {
    const result = restoreReviewedVideo(issueDate, restoredDir);
    output('mode', 'restored');
    output('manifest', result.manifestPath);
    output('status', result.manifest.status);
    appendSummary(`Restored the exact reviewed video for ${issueDate}.`);
  } else if (issueDate === 'sample') {
    output('mode', 'sample');
    appendSummary('Preparing a fictional sample. Samples cannot be published.');
  } else {
    const result = await prepareVideoInput({ issueDate, postsDir: argument('--posts-dir') });
    output('mode', 'render');
    output('video_input', result.inputPath);
    appendSummary(result.recovered ?
      `Recovered original RSS evidence for ${result.input.stories.length} newsletter stories on ${issueDate}; ${result.missingStories} unavailable. Newsletter delivery was not rerun.\nInput: ${result.inputPath}` :
      `Using exported video input: ${result.inputPath}`);
  }
}

main().then(() => { process.exit(0); }).catch((error: Error) => {
  appendSummary(`[video:prepare] ${error.message}`);
  process.exit(1);
});
