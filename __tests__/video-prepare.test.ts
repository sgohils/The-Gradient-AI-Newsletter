import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { Article } from '../src/types';
import { prepareVideoInput } from '../src/video/prepare';
import { restoreReviewedVideo } from '../src/video/preview';
import { sampleInput } from '../src/video/sample';
import { buildExtractiveScript } from '../src/video/script';
import { selectStory } from '../src/video/selection';
import { readInput, sha256, writeJson } from '../src/video/storage';
import { ReadyVideoManifest } from '../src/video/types';

const now = new Date('2026-10-04T16:00:00Z');
const date = '2026-10-04';
const fixture = sampleInput(now);
const article = (id = 'original'): Article => ({ id, title: `RSS title ${id}`, url: `https://example.com/${id}`,
  sourceId: 'lab', sourceName: 'Research Lab', description: 'Short RSS summary.',
  sourceExcerpt: fixture.stories[0].sourceExcerpt, sourcePublishedAt: '2026-10-04T07:00:00Z',
  publishedAt: new Date('2026-10-04T07:00:00Z') });
let root: string;
let posts: string;
beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'gradient-video-prepare-'));
  posts = path.join(root, 'posts'); fs.mkdirSync(posts);
});
afterEach(() => { fs.rmSync(root, { recursive: true, force: true }); });

function newsletter(links = ['https://example.com/original'], issueDate = date): void {
  fs.writeFileSync(path.join(posts, `${date}.md`), `---\ntitle: Newsletter\ndate: ${issueDate}\ntags: []\n---\n\nIntroduction.\n\n` +
    links.map((url, index) => `## Newsletter headline ${index + 1}\n\n**What happened:** Newsletter summary ${index + 1}.\n\n**Source:** https://example.com/unrelated-summary-link\n\n[Read more](${url})\n\n---\n`).join('\n'));
}

describe('video-only recovery of a pre-export newsletter', () => {
  it('reuses existing valid input without fetching or rewriting it', async () => {
    const inputPath = path.join(posts, `${date}.video.json`);
    writeJson(inputPath, fixture); const bytes = fs.readFileSync(inputPath);
    const fetch = vi.fn();
    const result = await prepareVideoInput({ issueDate: date, postsDir: posts, fetch });
    expect(result).toMatchObject({ inputPath, input: fixture, recovered: false });
    expect(fetch).not.toHaveBeenCalled(); expect(fs.readFileSync(inputPath)).toEqual(bytes);
  });
  it('recovers only matching original links, evidence and timestamps in newsletter rank order', async () => {
    newsletter(['https://example.com/missing', 'https://example.com/second', 'https://example.com/original?utm_source=newsletter']);
    const markdown = fs.readFileSync(path.join(posts, `${date}.md`));
    const fetch = vi.fn().mockResolvedValue([article('original'), article('second'), article('unrelated-summary-link')]);
    const result = await prepareVideoInput({ issueDate: date, postsDir: posts, fetch, now });
    expect(result).toMatchObject({ recovered: true, missingStories: 1 });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(result.input.issueDate).toBe(date);
    expect(result.input.stories.map(s => [s.id, s.rank])).toEqual([['second', 2], ['original', 3]]);
    expect(result.input.stories[0]).toMatchObject({ sourceExcerpt: fixture.stories[0].sourceExcerpt,
      publishedAt: '2026-10-04T07:00:00.000Z', title: 'RSS title second' });
    expect(result.input.stories[0].summary).toContain('Newsletter summary 2');
    expect(readInput(result.inputPath)).toEqual(result.input);
    expect(fs.readFileSync(path.join(posts, `${date}.md`))).toEqual(markdown);
    expect(fs.readdirSync(posts).sort()).toEqual([`${date}.md`, `${date}.video.json`]);
  });
  it('does not turn an old or missing RSS publication time into fresh news', async () => {
    newsletter();
    for (const timestamp of ['2026-09-01T07:00:00Z', '']) {
      const inputPath = path.join(posts, `${date}.video.json`);
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
      const result = await prepareVideoInput({ issueDate: date, postsDir: posts, now,
        fetch: async () => [{ ...article(), sourcePublishedAt: timestamp }] });
      expect(selectStory(result.input, { version: 1, issues: {} }, now)).toBeUndefined();
    }
  });
  it('recovers an original URL containing parentheses', async () => {
    const url = 'https://example.com/model_(research)';
    newsletter([url]);
    const result = await prepareVideoInput({ issueDate: date, postsDir: posts, now,
      fetch: async () => [{ ...article(), url }] });
    expect(result.input.stories[0].sourceUrl).toBe(url);
  });
  it('fails clearly when the saved issue or original evidence is unavailable', async () => {
    const fetch = vi.fn().mockResolvedValue([]);
    await expect(prepareVideoInput({ issueDate: date, postsDir: posts, fetch })).rejects.toThrow('issue_date=sample');
    expect(fetch).not.toHaveBeenCalled();
    newsletter();
    await expect(prepareVideoInput({ issueDate: date, postsDir: posts, fetch })).rejects.toThrow('original stories are no longer available');
    expect(fs.existsSync(path.join(posts, `${date}.video.json`))).toBe(false);
    // Rewritten descriptions are not promoted into original RSS evidence.
    await expect(prepareVideoInput({ issueDate: date, postsDir: posts,
      fetch: async () => [{ ...article(), sourceExcerpt: '', description: fixture.stories[0].sourceExcerpt }] })).rejects.toThrow('original stories are no longer available');
  });
  it('rejects invalid dates, corrupt or mismatched input and a mismatched newsletter', async () => {
    const fetch = vi.fn();
    await expect(prepareVideoInput({ issueDate: '../2026-10-04', postsDir: posts, fetch })).rejects.toThrow('Invalid issue date');
    newsletter(['https://example.com/original'], '2026-10-03');
    await expect(prepareVideoInput({ issueDate: date, postsDir: posts, fetch })).rejects.toThrow('Newsletter date');
    writeJson(path.join(posts, `${date}.video.json`), { ...fixture, issueDate: '2026-10-03' });
    await expect(prepareVideoInput({ issueDate: date, postsDir: posts, fetch })).rejects.toThrow('Video input date');
    fs.writeFileSync(path.join(posts, `${date}.video.json`), '{');
    await expect(prepareVideoInput({ issueDate: date, postsDir: posts, fetch })).rejects.toThrow();
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe('exact reviewed artifact restoration', () => {
  const bytes = Buffer.from('exact reviewed MP4 bytes');
  function save(prefix = 'video-output'): string {
    const folder = path.join(root, 'restored', prefix, date);
    const story = fixture.stories[0];
    const manifest: ReadyVideoManifest = { version: 1, status: 'ready', issueDate: date, story,
      script: buildExtractiveScript(story), duration: 38.85, videoFile: 'video.mp4', videoSha256: sha256(bytes),
      captionsFile: 'captions.srt', title: story.title, description: 'Source attribution' };
    writeJson(path.join(folder, 'manifest.json'), manifest);
    fs.writeFileSync(path.join(folder, 'video.mp4'), bytes);
    return folder;
  }
  it.each(['video-output', 'restored-video/video-output', '.'])('normalizes the %s layout while preserving media and manifest bytes', (prefix) => {
    const source = save(prefix);
    const output = path.join(root, 'video-output');
    const result = restoreReviewedVideo(date, path.join(root, 'restored'), output);
    expect(result.manifestPath).toBe(path.join(output, date, 'manifest.json'));
    expect(fs.readFileSync(result.manifestPath)).toEqual(fs.readFileSync(path.join(source, 'manifest.json')));
    expect(fs.readFileSync(path.join(output, date, 'video.mp4'))).toEqual(bytes);
  });
  it('stops instead of replacing a missing, modified or unfinished reviewed video', () => {
    const output = path.join(root, 'video-output');
    expect(() => restoreReviewedVideo(date, path.join(root, 'restored'), output)).toThrow('no reviewed video');
    const folder = save();
    fs.writeFileSync(path.join(folder, 'video.mp4'), 'different');
    expect(() => restoreReviewedVideo(date, path.join(root, 'restored'), output)).toThrow('missing or changed');
    fs.unlinkSync(path.join(folder, 'video.mp4'));
    expect(() => restoreReviewedVideo(date, path.join(root, 'restored'), output)).toThrow('missing or changed');
    writeJson(path.join(folder, 'manifest.json'), { version: 1, status: 'skipped', issueDate: date, reason: 'No story' });
    expect(() => restoreReviewedVideo(date, path.join(root, 'restored'), output)).toThrow('not ready');
    expect(fs.existsSync(output)).toBe(false);
  });
});
