import 'dotenv/config';
import * as path from 'path';
import { argument, appendSummary, flag, output } from '../src/video/cli';
import { sampleInput, sampleStructuredScript } from '../src/video/sample';
import { assertIssueDate, writeJson } from '../src/video/storage';
import { renderVideo } from '../src/video/render';

async function main(): Promise<void> {
  const root = path.resolve(argument('--output-dir') || '.cache/video-sample');
  const inputPath = path.join(root, 'input.json');
  const input = sampleInput();
  const issueDate = argument('--issue-date');
  if (issueDate) { assertIssueDate(issueDate); input.issueDate = issueDate; }
  writeJson(inputPath, input);
  const format = argument('--format') || 'fallback';
  if (!['structured', 'fallback'].includes(format)) throw new Error('--format must be structured or fallback.');
  const result = await renderVideo({ inputPath, outputDir: root, ledgerPath: path.join(root, 'ledger.json'), rebuild: flag('--rebuild'),
    script: format === 'structured' ? sampleStructuredScript(input.stories[0]) : undefined });
  if (result.manifest.status !== 'ready') throw new Error(`Sample was skipped: ${result.manifest.reason}`);
  if (format === 'structured' && result.manifest.script.format !== 'structured') throw new Error('Structured sample unexpectedly used the fallback; inspect its pacing.');
  output('manifest', result.manifestPath);
  output('directory', path.dirname(result.manifestPath));
  appendSummary(`Fictional sample rendered: ${path.join(path.dirname(result.manifestPath), result.manifest.videoFile)} (${result.manifest.duration.toFixed(2)}s). Samples cannot be published.`);
}
main().catch((error) => { console.error(error instanceof Error ? error.message : 'Sample render failed.'); process.exitCode = 1; });
