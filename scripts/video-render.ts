import 'dotenv/config';
import { argument, appendSummary, flag, output } from '../src/video/cli';
import { renderVideo } from '../src/video/render';

async function main(): Promise<void> {
  const result = await renderVideo({ inputPath: argument('--input', true)!, outputDir: argument('--output-dir'),
    ledgerPath: argument('--ledger'), python: process.env.VIDEO_PYTHON, ffmpeg: process.env.VIDEO_FFMPEG,
    groqApiKey: process.env.GROQ_API_KEY, groqModel: process.env.VIDEO_GROQ_MODEL, rebuild: flag('--rebuild'), reviewOnly: flag('--review-only') });
  output('manifest', result.manifestPath);
  output('issue_date', result.manifest.issueDate);
  output('status', result.manifest.status);
  if (result.manifest.status === 'ready') appendSummary('Format: ' + (result.manifest.script.format || 'legacy') +
    '\nTitle: ' + result.manifest.title + '\nProducer brief: ' + (result.manifest.briefFile || 'legacy artifact'));
  appendSummary(result.manifest.status === 'ready' ?
    `Video rendered: ${result.manifest.issueDate}, ${result.manifest.duration.toFixed(2)} seconds.\nStory choice: ${result.manifest.selectionReason || 'Previously frozen story.'}\nManifest: ${result.manifestPath}` :
    `Video skipped: ${result.manifest.reason}`);
}

main().catch((error: Error) => { console.error(`[video:render] ${error.message}`); process.exitCode = 1; });
