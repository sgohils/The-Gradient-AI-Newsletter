import 'dotenv/config';
import * as path from 'path';
import { argument, appendSummary, flag, output } from '../src/video/cli';
import { sampleInput } from '../src/video/sample';
import { assertIssueDate, writeJson } from '../src/video/storage';
import { renderVideo } from '../src/video/render';
import { buildShortScript } from '../src/video/short-script';

async function main(): Promise<void> {
  const root = path.resolve(argument('--output-dir') || '.cache/video-sample');
  const inputPath = path.join(root, 'input.json');
  const kind = argument('--kind') || 'context';
  if (!['context', 'product', 'research'].includes(kind)) throw new Error('Sample kind must be context, product or research.');
  const input = sampleInput(new Date(), kind as 'context' | 'product' | 'research');
  const issueDate = argument('--issue-date');
  if (issueDate) { assertIssueDate(issueDate); input.issueDate = issueDate; }
  writeJson(inputPath, input);
  const profile = argument('--profile');
  if (profile && !['standard', 'simple'].includes(profile)) throw new Error('Sample profile must be standard or simple.');
  if (profile) writeJson(path.join(root, 'ledger.json'), { version: 1, issues: {
    [input.issueDate]: { story: input.stories[0], script: buildShortScript(input.stories[0], profile as 'standard' | 'simple'),
      selectedAt: input.generatedAt, platforms: {} },
  } });
  const result = await renderVideo({ inputPath, outputDir: root, ledgerPath: path.join(root, 'ledger.json'), rebuild: flag('--rebuild') });
  if (result.manifest.status !== 'ready') throw new Error(`Sample was skipped: ${result.manifest.reason}`);
  output('manifest', result.manifestPath);
  output('directory', path.dirname(result.manifestPath));
  appendSummary(`Fictional sample rendered: ${path.join(path.dirname(result.manifestPath), result.manifest.videoFile)} (${result.manifest.duration.toFixed(2)}s). Samples cannot be published.`);
}
main().catch((error) => { console.error(error instanceof Error ? error.message : 'Sample render failed.'); process.exitCode = 1; });
