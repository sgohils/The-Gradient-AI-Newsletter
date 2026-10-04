import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { sampleInput } from '../src/video/sample';
import { buildExtractiveScript } from '../src/video/script';
import { renderVideo } from '../src/video/render';
import { sha256, writeJson, readManifest } from '../src/video/storage';
import { runCommand } from '../src/video/process';

vi.mock('../src/video/process', () => ({ runCommand: vi.fn().mockResolvedValue('') }));
let root: string;
const now = new Date('2026-10-03T12:00:00Z');
const input = sampleInput(now);
const story = input.stories[0];
const script = buildExtractiveScript(story);
const bytes = Buffer.from('already-uploaded-video');
const hash = sha256(bytes);
let options: Parameters<typeof renderVideo>[0];
beforeEach(() => {
  vi.mocked(runCommand).mockClear();
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'gradient-graphics-recovery-'));
  options = { inputPath: path.join(root, 'input.json'), outputDir: path.join(root, 'output'), ledgerPath: path.join(root, 'ledger.json'), now };
  writeJson(options.inputPath, input);
  writeJson(options.ledgerPath!, { version: 1, issues: { [input.issueDate]: { story, script, selectedAt: now.toISOString(),
    media: { publicUrl: 'https://example.org/uploaded.mp4', videoSha256: hash, uploadedAt: now.toISOString() }, platforms: {} } } });
  const folder = path.join(options.outputDir!, input.issueDate);
  writeJson(path.join(folder, 'manifest.json'), { version: 1, status: 'ready', issueDate: input.issueDate, story, script,
    duration: 38.85, videoFile: 'video.mp4', videoSha256: hash, captionsFile: 'captions.srt', title: story.title, description: 'Source attribution' });
  fs.writeFileSync(path.join(folder, 'video.mp4'), bytes);
});
afterEach(() => { fs.rmSync(root, { recursive: true, force: true }); });

describe('graphics upgrades preserve submitted videos', () => {
  it('reuses the exact submitted legacy artifact instead of changing its graphics', async () => {
    const result = await renderVideo(options);
    expect(result.manifest.status).toBe('ready');
    expect(result.manifest).not.toHaveProperty('graphicsVersion');
    expect(fs.readFileSync(path.join(path.dirname(result.manifestPath), 'video.mp4'))).toEqual(bytes);
    expect(readManifest(result.manifestPath)).toEqual(result.manifest);
  });
  it('refuses a rebuild or missing submitted artifact before rendering anything', async () => {
    await expect(renderVideo({ ...options, rebuild: true })).rejects.toThrow('already submitted');
    fs.unlinkSync(path.join(options.outputDir!, input.issueDate, 'video.mp4'));
    await expect(renderVideo(options)).rejects.toThrow('missing or changed');
    expect(runCommand).not.toHaveBeenCalled();
  });
});
