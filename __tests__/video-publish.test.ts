import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { sampleInput } from '../src/video/sample';
import { buildExtractiveScript } from '../src/video/script';
import { publishVideo, PublishOptions, TikTokApproval } from '../src/video/publish';
import { sha256, writeJson, readLedger } from '../src/video/storage';
import { ReadyVideoManifest, VideoLedger } from '../src/video/types';

const now = new Date('2026-10-03T12:00:00Z');
let directory: string;
let manifest: ReadyVideoManifest;
let ledger: VideoLedger;
let options: PublishOptions;
let requests: any[];
let posts = 0;
const post = (platform: string, status = 'published', id = platform) => ({ post: { _id: id, status, platforms: [{ platform, status, platformPostUrl: `https://example.org/${id}` }] } });
function httpError(status: number, code?: string) { return { response: { status, data: { code }, headers: {} } }; }
function store(): void { writeJson(options.ledgerPath!, ledger); writeJson(options.manifestPath!, manifest); }
function approval(): TikTokApproval {
  return { issueDate: manifest.issueDate, accountId: 'tt', videoSha256: manifest.videoSha256,
    contentPreviewConfirmed: true, expressConsentGiven: true, privacyLevel: 'PUBLIC_TO_EVERYONE',
    allowComment: false, allowDuet: false, allowStitch: false };
}
async function provider(config: any): Promise<{ data: any }> {
  requests.push(config);
  if (config.url.endsWith('/accounts')) return { data: { accounts: [{ _id: 'yt', platform: 'youtube', isActive: true }, { _id: 'tt', platform: 'tiktok', isActive: true }] } };
  if (config.url.endsWith('/creator-info')) return { data: {
    creator: { canPostMore: true }, privacyLevels: [{ value: 'PUBLIC_TO_EVERYONE' }],
    postingLimits: { maxVideoDurationSec: 600, interactionSettings: {} },
  } };
  if (config.url.endsWith('/media/presign')) return { data: { uploadUrl: 'https://uploads.example.org/video', publicUrl: 'https://media.example.org/video.mp4' } };
  if (config.method === 'PUT') {
    for await (const chunk of config.data) { expect(chunk.length).toBeGreaterThan(0); }
    return { data: {} };
  }
  if (config.method === 'POST' && config.url.endsWith('/posts')) { posts++; return { data: post(config.data.platforms[0].platform) }; }
  if (config.method === 'GET' && config.url.includes('/posts/')) return { data: post(config.url.split('/').pop()) };
  throw new Error(`Unexpected request ${config.method} ${config.url}`);
}

beforeEach(() => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'gradient-publish-'));
  requests = []; posts = 0;
  const story = sampleInput(now).stories[0];
  const script = buildExtractiveScript(story);
  const bytes = Buffer.from('unit-test-video');
  fs.writeFileSync(path.join(directory, 'video.mp4'), bytes);
  manifest = { version: 1, status: 'ready', issueDate: '2026-10-03', story, script, duration: 35,
    videoFile: 'video.mp4', videoSha256: sha256(bytes), captionsFile: 'captions.srt', title: story.title,
    description: `${story.title}\nSource: ${story.sourceUrl}\nAI-generated narration.` };
  ledger = { version: 1, issues: { [manifest.issueDate]: { story, script, selectedAt: now.toISOString(),
    contentHash: sha256(JSON.stringify({ storyId: story.id, narration: script.narration, title: manifest.title, description: manifest.description })), platforms: {} } } };
  options = { manifestPath: path.join(directory, 'manifest.json'), ledgerPath: path.join(directory, 'ledger.json'),
    apiKey: 'test-key', accounts: { youtube: 'yt', tiktok: 'tt' }, now: () => now, pollSeconds: 0,
    transport: provider, sleep: async () => {} };
  store();
});
afterEach(() => { fs.rmSync(directory, { recursive: true, force: true }); });

describe('safe separate platform publication', () => {
  it('requires credentials and never fabricates TikTok approval', async () => {
    const missing = await publishVideo({ ...options, apiKey: undefined });
    expect(missing.issues[manifest.issueDate].platforms.youtube?.status).toBe('blocked');
    expect(requests).toHaveLength(0);
    const result = await publishVideo(options);
    expect(result.issues[manifest.issueDate].platforms.youtube?.status).toBe('published');
    expect(result.issues[manifest.issueDate].platforms.tiktok?.status).toBe('blocked');
    expect(result.issues[manifest.issueDate].platforms.tiktok?.error).toContain('Unattended TikTok');
    expect(posts).toBe(1);
  });
  it('submits separate immediate posts with attribution and AI disclosure after real TikTok approval', async () => {
    let intentWasSaved = false;
    options.checkpoint = async () => { intentWasSaved = !!readLedger(options.ledgerPath!).issues[manifest.issueDate].platforms.youtube?.firstSubmittedAt; };
    const result = await publishVideo({ ...options, tiktokApproval: approval() });
    expect(posts).toBe(2); expect(intentWasSaved).toBe(true);
    const submits = requests.filter(c => c.url.endsWith('/posts'));
    expect(submits.map(c => c.data.platforms.length)).toEqual([1, 1]);
    expect(submits[0].data).toMatchObject({ publishNow: true, platforms: [{ platform: 'youtube', accountId: 'yt', platformSpecificData: { visibility: 'public', containsSyntheticMedia: true, madeForKids: false } }] });
    expect(submits[0].data.content).toContain(storySource());
    expect(submits[1].data.tiktokSettings).toMatchObject({ content_preview_confirmed: true, express_consent_given: true, video_made_with_ai: true, privacy_level: 'PUBLIC_TO_EVERYONE' });
    expect(result.issues[manifest.issueDate].platforms.tiktok?.postUrl).toBe('https://example.org/tiktok');
    const upload = requests.find(c => c.method === 'PUT');
    expect(upload.headers.Authorization).toBeUndefined();
  });
  it('never reposts the successful platform on partial failure or an older rerun', async () => {
    await publishVideo(options);
    const result = await publishVideo({ ...options, tiktokApproval: approval() });
    expect(posts).toBe(2);
    expect(result.issues[manifest.issueDate].platforms.youtube?.status).toBe('published');
    await publishVideo({ ...options, now: () => new Date('2026-10-10T12:00:00Z') });
    expect(posts).toBe(2);
  });
  it('rejects a consent receipt for a different file and creator interaction limits', async () => {
    await publishVideo({ ...options, platforms: ['tiktok'], tiktokApproval: { ...approval(), videoSha256: '0'.repeat(64) } });
    expect(posts).toBe(0); expect(requests.some(c => c.method === 'PUT')).toBe(false);
    const result = await publishVideo({ ...options, platforms: ['tiktok'], tiktokApproval: { ...approval(), allowDuet: true } });
    expect(result.issues[manifest.issueDate].platforms.tiktok?.error).toContain('disabled allow_duet');
    expect(posts).toBe(0);
  });
  it('refuses a changed file, edited script, and sample publication', async () => {
    fs.appendFileSync(path.join(directory, 'video.mp4'), 'changed');
    await expect(publishVideo(options)).rejects.toThrow('has changed');
    fs.writeFileSync(path.join(directory, 'video.mp4'), 'unit-test-video');
    manifest.description = 'changed'; store();
    await expect(publishVideo(options)).rejects.toThrow('differs from the frozen ledger');
    manifest.sample = true; store();
    await expect(publishVideo(options)).rejects.toThrow('Sample videos cannot be published');
    expect(posts).toBe(0);
  });
  it('does not post skipped or stale stories', async () => {
    writeJson(options.manifestPath!, { version: 1, status: 'skipped', issueDate: manifest.issueDate, reason: 'No fresh stories' });
    await publishVideo(options); expect(requests).toHaveLength(0);
    store();
    const result = await publishVideo({ ...options, now: () => new Date('2026-10-07T12:00:00Z') });
    expect(result.issues[manifest.issueDate].platforms.youtube?.error).toContain('freshness'); expect(posts).toBe(0);
  });
});

describe('credentials, retries, durable intent, and reconciliation', () => {
  it('records expired credentials and payment errors without paid fallbacks', async () => {
    for (const status of [401, 402]) {
      const transport = vi.fn().mockRejectedValue(httpError(status));
      const result = await publishVideo({ ...options, transport, platforms: ['youtube'] });
      expect(result.issues[manifest.issueDate].platforms.youtube?.status).toBe('failed');
      expect(transport).toHaveBeenCalledTimes(1);
      expect(result.issues[manifest.issueDate].platforms.youtube?.error).toContain(status === 401 ? 'authorization failed' : 'requires payment');
    }
    expect(posts).toBe(0);
  });
  it('reuses the exact submission key and saved intent for a lost response', async () => {
    let failed = false;
    const keys: string[] = [];
    options.transport = async c => {
      if (c.method === 'POST' && c.url?.endsWith('/posts')) {
        const saved = readLedger(options.ledgerPath!).issues[manifest.issueDate].platforms.youtube!;
        expect(saved.status).toBe('submitting'); expect(saved.request).toEqual(c.data);
        keys.push(c.headers!['Idempotency-Key'] as string);
        if (!failed) { failed = true; throw httpError(503); }
      }
      return provider(c);
    };
    const result = await publishVideo({ ...options, platforms: ['youtube'] });
    expect(keys).toHaveLength(2); expect(keys[0]).toBe(keys[1]);
    expect(result.issues[manifest.issueDate].platforms.youtube?.status).toBe('published');
  });
  it('stops before posting when the remote ledger checkpoint cannot be saved', async () => {
    await expect(publishVideo({ ...options, platforms: ['youtube'], checkpoint: async () => { throw new Error('git push failed'); } })).rejects.toThrow('git push failed');
    expect(posts).toBe(0);
  });
  it('stops uncertain submissions after the provider idempotency window expires', async () => {
    ledger.issues[manifest.issueDate].platforms.youtube = { accountId: 'yt', status: 'uncertain', idempotencyKey: 'saved-key', firstSubmittedAt: '2026-10-02T10:00:00Z' }; store();
    const result = await publishVideo({ ...options, platforms: ['youtube'] });
    expect(result.issues[manifest.issueDate].platforms.youtube?.status).toBe('uncertain');
    expect(result.issues[manifest.issueDate].platforms.youtube?.error).toContain('window expired'); expect(posts).toBe(0);
  });
  it('reconciles pending IDs to live URLs without a new upload', async () => {
    ledger.issues[manifest.issueDate].platforms.youtube = { accountId: 'yt', status: 'pending', idempotencyKey: 'saved-key', postId: 'youtube' }; store();
    const result = await publishVideo({ ...options, reconcileOnly: true, manifestPath: undefined });
    expect(result.issues[manifest.issueDate].platforms.youtube?.status).toBe('published');
    expect(result.issues[manifest.issueDate].platforms.youtube?.postUrl).toBe('https://example.org/youtube');
    expect(requests.every(c => c.method === 'GET')).toBe(true);
  });
  it('retries a known failed post through its provider ID, never by creating another post', async () => {
    ledger.issues[manifest.issueDate].platforms.youtube = { accountId: 'yt', status: 'failed', idempotencyKey: 'saved-key', firstSubmittedAt: now.toISOString(), postId: 'youtube' }; store();
    options.transport = async c => {
      if (c.url?.endsWith('/posts/youtube') && c.method === 'GET') { requests.push(c); return { data: post('youtube', 'failed') }; }
      if (c.url?.endsWith('/posts/youtube/retry')) { requests.push(c); return { data: post('youtube') }; }
      return provider(c);
    };
    const result = await publishVideo({ ...options, platforms: ['youtube'] });
    expect(result.issues[manifest.issueDate].platforms.youtube?.status).toBe('published');
    expect(requests.find(c => c.method === 'POST')?.url).toContain('/posts/youtube/retry'); expect(posts).toBe(0);
  });
  it('bounds temporary retries and records unresolved submissions separately', async () => {
    let attempts = 0;
    options.transport = async c => {
      if (c.method === 'POST' && c.url?.endsWith('/posts')) { attempts++; throw httpError(503); }
      return provider(c);
    };
    const result = await publishVideo({ ...options, platforms: ['youtube'] });
    expect(attempts).toBe(3); expect(result.issues[manifest.issueDate].platforms.youtube?.status).toBe('uncertain');
  });
});

function storySource(): string { return manifest.story.sourceUrl; }
