import { describe, expect, it, vi, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { sampleInput } from '../src/video/sample';
import { buildShortScript, cleanEvidence, generateShortCandidates, simplifyShortScript, validateShortScript } from '../src/video/short-script';
import { collectVisuals, allowedLicense } from '../src/video/visuals';
import { extractPermittedMedia } from '../src/video/source-media';
import { buildPhotoStoryboard } from '../src/video/photo-storyboard';
import { initialExperiments, assignExperiment, improveExperiments } from '../src/video/experiments';
import { collectAnalytics, analyticsReport } from '../src/video/analytics';
import { VideoMetric } from '../src/video/types';
import { readLedger, writeJson } from '../src/video/storage';

const temporary: string[] = [];
const story = sampleInput().stories[0];
const fixture = () => { const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gradient-autopilot-')); temporary.push(root); return root; };
afterEach(() => { for (const root of temporary.splice(0)) fs.rmSync(root, { recursive: true, force: true }); });

describe('clean, bounded short scripts', () => {
  it('removes feed metadata and markup while preserving source facts', () => {
    expect(cleanEvidence('arXiv:2610.01234v1 Announce Type: new Abstract: A \\textbf{model} checks answers. https://example.com')).toBe('A model checks answers.');
    const sourceExcerpt = 'arXiv:2610.01234v1 Announce Type: new Abstract: ' + story.sourceExcerpt;
    const script = buildShortScript({ ...story, sourceExcerpt });
    expect(script.version).toBe(3); expect(script.narration).not.toMatch(/arxiv|abstract|announce type/i);
    expect(script.sentences.map(sentence => sentence.evidenceQuote).every(quote => sourceExcerpt.includes(quote))).toBe(true);
  });
  it('supports standard and simple profiles without generic intros or repeated hook evidence', () => {
    const standard = buildShortScript(story);
    expect(standard.narration.split(/\s+/).length).toBeGreaterThanOrEqual(55);
    expect(standard.narration.split(/\s+/).length).toBeLessThanOrEqual(65);
    expect(standard.sentences.slice(1).every(sentence => sentence.evidenceQuote !== standard.sentences[0].evidenceQuote)).toBe(true);
    const simple = simplifyShortScript(story, standard);
    expect(simple.profile).toBe('simple'); expect(simple.narration.split(/\s+/).length).toBeGreaterThanOrEqual(38);
    expect(() => validateShortScript(story, simple)).not.toThrow();
  });
  it('rejects unsupported numbers, unrelated claims and broken grammar', () => {
    const script = buildShortScript(story);
    for (const text of ['The system improves results by 99%.', 'Researchers say the moon is made from cheese.', 'This it propose a brand new toolkit.']) {
      const sentences = script.sentences.map((sentence, index) => index === 1 ? { ...sentence, text, displayText: 'The system' } : sentence);
      expect(() => validateShortScript(story, { ...script, sentences, narration: sentences.map(sentence => sentence.text).join(' ') })).toThrow();
    }
  });
  it('calls writer and editor once each and accepts only checked candidates', async () => {
    const draft = buildShortScript(story); const payload = { candidates: [{ storyId: story.id, ...draft }] };
    const post = vi.fn().mockResolvedValue({ data: { choices: [{ message: { content: JSON.stringify(payload) } }] } });
    const beforeRequest = vi.fn().mockResolvedValue(undefined);
    const results = await generateShortCandidates([story], { groqApiKey: 'fake', beforeRequest }, { post } as any);
    expect(post).toHaveBeenCalledTimes(2); expect(beforeRequest).toHaveBeenCalledTimes(2);
    expect(results[0].script).toMatchObject({ provider: 'groq', checked: true });
  });
  it('does not call another provider or exceed the request allowance on quota failures', async () => {
    const post = vi.fn().mockRejectedValue({ response: { status: 429 } });
    expect((await generateShortCandidates([story], { groqApiKey: 'fake' }, { post } as any))[0].script.provider).toBe('extractive');
    expect(post).toHaveBeenCalledTimes(1); post.mockClear();
    await generateShortCandidates([story], { groqApiKey: 'fake', maxRequests: 1 }, { post } as any);
    expect(post).not.toHaveBeenCalled();
  });
  it('rejects corrupt durable request budgets', () => {
    const file = path.join(fixture(), 'ledger.json');
    writeJson(file, { version: 1, issues: {}, scriptRequests: { '2026-10-06': 3 } });
    expect(() => readLedger(file)).toThrow('request budget');
  });
});

describe('licensed real imagery and offline operation', () => {
  it('requires supported asset licenses rather than assuming all Commons content is usable', () => {
    expect(allowedLicense('CC BY 4.0', 'https://creativecommons.org/licenses/by/4.0/')).toBe(true);
    expect(allowedLicense('CC0', 'http://creativecommons.org/publicdomain/zero/1.0/deed.en')).toBe(true);
    for (const [license, url] of [['CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0/'], ['CC BY-NC', 'https://creativecommons.org/licenses/by-nc/4.0/'], ['CC0', 'not-a-url']]) {
      expect(allowedLicense(license, url)).toBe(false);
    }
  });
  it('uses bundled photos when every asset service is unavailable and reuses their exact hashes', async () => {
    const root = fixture(); const client = { get: vi.fn().mockRejectedValue(new Error('offline')) };
    const first = await collectVisuals(story, root, { client, cacheRoot: path.join(root, 'cache') });
    expect(first.assets.length).toBe(4); expect(first.assets.every(asset => asset.provider === 'library' && asset.sha256.length === 64)).toBe(true);
    client.get.mockClear();
    const second = await collectVisuals(story, root, { client, cacheRoot: path.join(root, 'cache') });
    expect(second.assets).toEqual(first.assets); expect(client.get).not.toHaveBeenCalled();
  });
  it('does not fetch services in offline mode or accept og:image as permission', async () => {
    const root = fixture(); const client = { get: vi.fn() };
    await collectVisuals(story, root, { offline: true, client, cacheRoot: path.join(root, 'cache') });
    expect(client.get).not.toHaveBeenCalled();
    expect(extractPermittedMedia('<meta property="og:image" content="https://example.com/photo.jpg"><figure><img src="/photo.jpg"></figure>', story)).toEqual([]);
  });
  it('retains individual source-image licenses and excludes third-party or unlicensed images', () => {
    const html = '<meta name="author" content="Research Team"><a rel="license" href="https://creativecommons.org/licenses/by/4.0/">License</a><figure><img src="/figure.png" alt="Measured result"></figure><figure><img src="https://other.example/photo.jpg"></figure><figure><img src="/copyright.png"><figcaption>Reproduced courtesy of someone else</figcaption></figure>';
    const assets = extractPermittedMedia(html, story);
    expect(assets).toHaveLength(1); expect(assets[0]).toMatchObject({ usage: 'actual', creator: 'Research Team', license: 'CC BY 4.0' });
  });
  it('builds timed real-image beats with complete edited phrases and full visual coverage', async () => {
    const script = buildShortScript(story); const root = fixture();
    const { assets } = await collectVisuals(story, root, { offline: true, cacheRoot: path.join(root, 'cache') });
    const words = script.narration.split(/\s+/); const timing = { duration: 28, sampleRate: 24000, profile: 'standard' as const,
      words: words.map((text, index) => ({ text, start: index * 28 / words.length, end: (index + 1) * 28 / words.length })) };
    const plan = buildPhotoStoryboard(story, script, timing, assets);
    expect(plan.scenes.length).toBeGreaterThanOrEqual(8); expect(plan.scenes.length).toBeLessThanOrEqual(12);
    expect(plan.scenes.every(scene => script.sentences.some(sentence => sentence.displayText === scene.displayText))).toBe(true);
    expect(plan.scenes.reduce((sum, scene) => sum + scene.end - scene.start, 0)).toBeCloseTo(28);
    expect(plan.scenes.every(scene => assets.some(asset => asset.id === scene.assetId))).toBe(true);
  });
});

function metric(index: number, hook: 'direct-benefit' | 'supported-surprise', percentage = 75, seconds = 21): VideoMetric {
  return { issueDate: `2026-09-${String(index + 1).padStart(2, '0')}`, videoId: 'test-video', observedAt: '2026-10-06T12:00:00Z',
    finalized: true, ageDays: 10, engagedViews: 250, averageViewPercentage: percentage, averageViewDuration: seconds, duration: 28,
    experiment: { phase: 'hook', hookStyle: hook, beatSeconds: 3, cohort: hook, formatVersion: 3, topic: 'computers' } };
}

describe('automatic retention experiments', () => {
  it('starts with a stable baseline and freezes an assigned variant across reruns', () => {
    const ledger = { version: 1 as const, issues: {} };
    const assignment = assignExperiment(ledger, '2026-10-06', initialExperiments());
    expect(assignment.phase).toBe('baseline');
    expect(assignExperiment(ledger, '2026-10-06', initialExperiments())).toEqual(assignment);
  });
  it('promotes only a sufficiently observed improvement with no viewing-second regression', () => {
    const state = initialExperiments();
    for (let index = 0; index < 10; index++) { const item = metric(index, index < 5 ? 'direct-benefit' : 'supported-surprise', index < 5 ? 60 : 75, index < 5 ? 18 : 21); state.metrics[item.issueDate] = item; }
    expect(improveExperiments(state).championHook).toBe('supported-surprise');
    expect(state.championHook).toBe('direct-benefit');
    for (const item of Object.values(state.metrics).slice(5)) item.averageViewDuration = 17;
    expect(improveExperiments(state).hookWinner).toBeUndefined();
  });
  it('finishes the ten-upload baseline even after old scripts have been compacted', () => {
    const issues = Object.fromEntries(Array.from({ length: 10 }, (_, index) => [`2026-09-${String(index + 1).padStart(2, '0')}`, {
      story, selectedAt: '2026-09-01T12:00:00Z', platforms: { youtube: { status: 'published' as const, accountId: 'account', idempotencyKey: 'key' } },
      experiment: { ...metric(index, 'direct-benefit').experiment!, phase: 'baseline' as const },
    }]));
    expect(assignExperiment({ version: 1, issues }, '2026-10-06', initialExperiments()).phase).toBe('hook');
  });
  it('holds changes when samples, comparable topics or finalized data are missing', () => {
    const state = initialExperiments();
    for (let index = 0; index < 10; index++) { const item = metric(index, index < 5 ? 'direct-benefit' : 'supported-surprise', index < 5 ? 60 : 80); item.engagedViews = 50; state.metrics[item.issueDate] = item; }
    expect(improveExperiments(state).hookWinner).toBeUndefined();
    for (const item of Object.values(state.metrics)) { item.engagedViews = 250; if (item.experiment!.hookStyle === 'supported-surprise') item.experiment!.topic = 'robotics'; }
    expect(improveExperiments(state).hookWinner).toBeUndefined();
  });
  it('survives analytics failures without changing the champion or guessing engaged views', async () => {
    const published = { ...story, publishedAt: '2026-09-01T00:00:00Z' };
    const ledger = { version: 1 as const, issues: { '2026-09-01': { story: published, selectedAt: published.publishedAt, platforms: {
      youtube: { accountId: 'account', status: 'published' as const, idempotencyKey: 'key', firstSubmittedAt: published.publishedAt,
        postUrl: 'https://www.youtube.com/watch?v=abcdefghijk' },
    } } } };
    const client = { get: vi.fn().mockRejectedValue({ response: { status: 402 } }), post: vi.fn() };
    const state = await collectAnalytics(ledger, initialExperiments(), { client: client as any, zernioApiKey: 'fake', accountId: 'account', now: new Date('2026-10-06T12:00:00Z') });
    expect(state.championHook).toBe('direct-benefit'); expect(state.metrics['2026-09-01'].finalized).toBe(false);
    expect(state.metrics['2026-09-01'].engagedViews).toBeUndefined(); expect(client.post).not.toHaveBeenCalled();
    expect(analyticsReport(state).html).toContain('retry automatically');
  });
});
