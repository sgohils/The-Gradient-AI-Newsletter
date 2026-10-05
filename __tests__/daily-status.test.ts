import { afterEach, describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { dailyStatus } from '../src/cli/daily-status';
import { sampleInput } from '../src/video/sample';
import { writeJson } from '../src/video/storage';

const temporary: string[] = [];
const now = new Date('2026-10-05T12:00:00Z');
function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gradient-daily-'));
  temporary.push(root);
  const outputDir = path.join(root, 'posts'); fs.mkdirSync(outputDir);
  return { outputDir, ledgerPath: path.join(root, 'ledger.json'), now };
}
afterEach(() => { for (const dir of temporary.splice(0)) fs.rmSync(dir, { recursive: true, force: true }); });

describe('daily recovery preflight', () => {
  it('starts a missing edition and ignores yesterday\'s completed edition', () => {
    const options = fixture();
    for (const extension of ['md', 'html']) fs.writeFileSync(path.join(options.outputDir, `2026-10-04.${extension}`), 'Yesterday');
    expect(dailyStatus(options)).toMatchObject({ issueDate: '2026-10-05', newsletterNeeded: true, videoNeeded: true });
  });
  it('reuses a committed newsletter and its evidence for a video recovery, without sending email again', () => {
    const options = fixture();
    for (const extension of ['md', 'html']) fs.writeFileSync(path.join(options.outputDir, `2026-10-05.${extension}`), 'Complete edition');
    const inputPath = path.join(options.outputDir, '2026-10-05.video.json'); writeJson(inputPath, sampleInput(now));
    expect(dailyStatus(options)).toMatchObject({ newsletterNeeded: false, videoNeeded: true, videoInputPath: inputPath });
    const input = sampleInput(now);
    writeJson(options.ledgerPath, { version: 1, issues: { '2026-10-05': { story: input.stories[0], platforms: {
      youtube: { status: 'published' },
    } } } });
    expect(dailyStatus(options)).toMatchObject({ newsletterNeeded: false, videoNeeded: false });
  });
  it('keeps a failed or pending video eligible for reconciliation and recovery', () => {
    const options = fixture();
    for (const status of ['failed', 'pending']) {
      writeJson(options.ledgerPath, { version: 1, issues: { '2026-10-05': { story: sampleInput(now).stories[0], platforms: {
        youtube: { status },
      } } } });
      expect(dailyStatus(options).videoNeeded).toBe(true);
    }
  });
  it('keeps the parent issue date when the video job runs past midnight', () => {
    const options = fixture();
    for (const extension of ['md', 'html']) fs.writeFileSync(path.join(options.outputDir, `2026-10-05.${extension}`), 'Complete edition');
    expect(dailyStatus({ ...options, now: new Date('2026-10-06T00:05:00Z'), issueDate: '2026-10-05' }))
      .toMatchObject({ issueDate: '2026-10-05', newsletterNeeded: false });
    expect(() => dailyStatus({ ...options, issueDate: '../invalid' })).toThrow('Invalid issue date');
  });
  it('stops on incomplete newsletter files rather than risking another send', () => {
    const options = fixture();
    fs.writeFileSync(path.join(options.outputDir, '2026-10-05.md'), 'Partial edition');
    expect(() => dailyStatus(options)).toThrow('incomplete');
    fs.writeFileSync(path.join(options.outputDir, '2026-10-05.html'), '');
    expect(() => dailyStatus(options)).toThrow('incomplete');
  });
  it('rejects a mismatched evidence date and damaged publication ledger', () => {
    const options = fixture();
    writeJson(path.join(options.outputDir, '2026-10-05.video.json'), sampleInput(new Date('2026-10-04T12:00:00Z')));
    expect(() => dailyStatus(options)).toThrow('different date');
    writeJson(options.ledgerPath, { version: 1, issues: [] });
    expect(() => dailyStatus(options)).toThrow('publication ledger');
  });
});
