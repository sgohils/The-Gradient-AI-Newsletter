import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { sampleInput } from '../src/video/sample';
import { renderVideo } from '../src/video/render';
import { readLedger, writeJson } from '../src/video/storage';
import { runCommand } from '../src/video/process';

vi.mock('../src/video/process', () => ({ runCommand: vi.fn() }));
const now = new Date('2026-10-03T12:00:00Z');
const original = sampleInput(now);
const invalid = { ...original.stories[0], sourceExcerpt: 'Incomplete source evidence '.repeat(30) };
const second = { ...original.stories[0], id: 'second', rank: 2, sourceUrl: 'https://example.org/second' };
let root: string;
let options: Parameters<typeof renderVideo>[0];

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'gradient-selection-'));
  options = { inputPath: path.join(root, 'input.json'), outputDir: path.join(root, 'output'),
    ledgerPath: path.join(root, 'ledger.json'), now, groqApiKey: 'fake' };
  writeJson(options.inputPath, { ...original, stories: [invalid, second] });
  vi.spyOn(axios, 'post').mockRejectedValue({ response: { status: 429 } });
  vi.mocked(runCommand).mockReset().mockImplementation(async (_command, args, directory) => {
    if (args[0].endsWith('narrate.py')) {
      const output = args[args.indexOf('--output-dir') + 1];
      const words = fs.readFileSync(args[args.indexOf('--script') + 1], 'utf8').trim().split(/\s+/);
      writeJson(path.join(output, 'timing.json'), { duration: 28, sampleRate: 24000,
        words: words.map((text, i) => ({ text, start: i * 28 / words.length, end: (i + 1) * 28 / words.length })) });
      fs.writeFileSync(path.join(output, 'audio.wav'), 'mock audio');
    }
    if (directory && args.includes('video.mp4')) fs.writeFileSync(path.join(directory, 'video.mp4'), 'mock video');
    return '';
  });
});
afterEach(() => { vi.restoreAllMocks(); fs.rmSync(root, { recursive: true, force: true }); });

describe('daily rendering tries usable evidence without changing frozen stories', () => {
  it('renders the next valid story with only one API call, then preserves that choice on rerun', async () => {
    const result = await renderVideo(options);
    expect(result.manifest).toMatchObject({ status: 'ready', story: { id: 'second' }, script: { provider: 'extractive' } });
    expect(axios.post).toHaveBeenCalledTimes(1);
    expect(readLedger(options.ledgerPath!).issues[original.issueDate].story.id).toBe('second');

    writeJson(options.inputPath, original); // A changed newsletter cannot replace the validated choice.
    vi.mocked(runCommand).mockClear();
    expect((await renderVideo(options)).manifest).toEqual(result.manifest);
    expect(axios.post).toHaveBeenCalledTimes(1);
    expect(runCommand).toHaveBeenCalledTimes(1); // Only artifact verification, no re-render.
  });
  it('does not reserve a date or story when every script fails validation', async () => {
    writeJson(options.inputPath, { ...original, stories: [invalid, { ...invalid, id: 'second', rank: 2, sourceUrl: second.sourceUrl }] });
    const result = await renderVideo(options);
    expect(result.manifest).toMatchObject({ status: 'skipped', reason: expect.stringContaining('None of 2 eligible stories') });
    expect(readLedger(options.ledgerPath!).issues).toEqual({});
    expect(axios.post).toHaveBeenCalledTimes(1);
    expect(runCommand).not.toHaveBeenCalled();
  });
  it('reports short evidence before spending an API call or starting the renderer', async () => {
    writeJson(options.inputPath, { ...original, stories: [{ ...invalid, sourceExcerpt: 'Short teaser.' }] });
    expect((await renderVideo(options)).manifest).toMatchObject({ status: 'skipped', reason: expect.stringContaining('1 with fewer than 40 source words') });
    expect(axios.post).not.toHaveBeenCalled();
    expect(runCommand).not.toHaveBeenCalled();
    expect(readLedger(options.ledgerPath!).issues).toEqual({});
  });
  it('preserves a previously frozen story even when another candidate could work', async () => {
    const ledger = { version: 1, issues: { [original.issueDate]: { story: invalid, selectedAt: now.toISOString(), platforms: {} } } };
    writeJson(options.ledgerPath!, ledger);
    expect((await renderVideo(options)).manifest).toMatchObject({ status: 'skipped', reason: expect.stringContaining('None of 1 eligible stories') });
    expect(readLedger(options.ledgerPath!).issues).toEqual(ledger.issues);
    expect(runCommand).not.toHaveBeenCalled();
  });
  it('upgrades an unsubmitted legacy script while preserving its frozen story', async () => {
    writeJson(options.ledgerPath!, { version: 1, issues: { [original.issueDate]: {
      story: second, selectedAt: now.toISOString(), platforms: {},
      script: { provider: 'extractive', sentences: [], narration: 'Previously frozen legacy script.' },
    } } });
    const result = await renderVideo(options);
    expect(result.manifest).toMatchObject({ status: 'ready', story: { id: 'second' },
      script: { version: 3 }, selectionReason: expect.any(String) });
    expect(readLedger(options.ledgerPath!).issues[original.issueDate].story.id).toBe('second');
    expect(axios.post).toHaveBeenCalledTimes(1);
  });
});
