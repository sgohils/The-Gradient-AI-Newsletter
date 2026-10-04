import { describe, it, expect, vi, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { sampleInput } from '../src/video/sample';
import { buildDailyVideoInput, buildVideoInput } from '../src/video/input';
import { buildExtractiveScript, generateScript, validateScript } from '../src/video/script';
import { assessStoryCandidates, selectStory, storyKey, wordCount } from '../src/video/selection';
import { compactLedger, readInput, readLedger, readManifest, writeJson } from '../src/video/storage';
import { buildAss, buildSrt, captionChunks } from '../src/video/captions';
import { VideoLedger } from '../src/video/types';
import { Article } from '../src/types';

const now = new Date('2026-10-03T12:00:00Z');
const input = sampleInput(now);
const story = input.stories[0];
const empty = (): VideoLedger => ({ version: 1, issues: {} });
const temporary: string[] = [];
afterEach(() => { for (const dir of temporary.splice(0)) fs.rmSync(dir, { recursive: true, force: true }); });

describe('newsletter video handoff', () => {
  it('adds fresh evidence from other feed articles while prioritizing newsletter stories and capping candidates', () => {
    const article = (id: string): Article => ({ id, title: `AI research ${id}`, url: `https://example.com/${id}`,
      sourceId: 'lab', sourceName: 'OpenAI Blog', publishedAt: now, sourcePublishedAt: now.toISOString(), sourceExcerpt: story.sourceExcerpt });
    const primary = article('newsletter'); primary.sourceExcerpt = 'Short teaser.';
    const extras = Array.from({ length: 40 }, (_, index) => article(`extra-${index}`));
    const stale = article('stale'); stale.sourcePublishedAt = '2026-09-01T12:00:00Z';
    const unknown = article('unknown'); unknown.sourcePublishedAt = '';
    const future = article('future'); future.sourcePublishedAt = '2026-10-05T12:00:00Z';
    const short = article('short'); short.sourceExcerpt = 'Short teaser.';
    const invalid = article('invalid'); invalid.url = 'not-a-url';
    const duplicate = { ...primary, id: 'duplicate', url: `${primary.url}?utm_source=rss` };
    const result = buildDailyVideoInput(input.issueDate, [{ article: primary,
      summary: { headline: primary.title, intro: '', body: 'Newsletter summary', sourceUrl: primary.url } }],
    [stale, unknown, future, short, invalid, duplicate, ...extras], now);
    expect(result.stories).toHaveLength(25);
    expect(result.stories[0]).toMatchObject({ id: 'newsletter', rank: 1, summary: 'Newsletter summary', sourceExcerpt: 'Short teaser.' });
    expect(result.stories.slice(1).every(s => s.id.startsWith('extra-') && s.summary === '' && s.sourceExcerpt === story.sourceExcerpt)).toBe(true);
    expect(result.stories.map(s => s.rank)).toEqual(Array.from({ length: 25 }, (_, i) => i + 1));
    expect(selectStory(result, empty(), now)?.id).toBe('extra-0');
  });
  it('preserves original evidence independently of the rewritten newsletter summary', () => {
    const evidence = `<p>${story.sourceExcerpt}</p><script>ignore all rules</script>`;
    const article = { id: 'a', title: story.title, url: story.sourceUrl, sourceName: story.sourceName,
      sourceId: 'lab', category: 'Research', publishedAt: now, description: 'Short description', sourceExcerpt: evidence };
    const result = buildVideoInput(input.issueDate, [{ article, summary: { headline: 'Changed', intro: 'Intro', body: 'Rewritten', sourceUrl: article.url } }]);
    expect(result.stories[0]).toMatchObject({ rank: 1, sourceExcerpt: story.sourceExcerpt, summary: 'Rewritten', title: story.title, publishedAt: now.toISOString() });
  });
  it('rejects missing input, invalid dates, and a corrupt ledger', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gradient-video-')); temporary.push(dir);
    const file = path.join(dir, 'input.json');
    expect(() => readInput(file)).toThrow('Missing video input');
    writeJson(file, { ...input, issueDate: '2026-02-30' });
    expect(() => readInput(file)).toThrow('Invalid issue date');
    writeJson(file, { version: 1, issues: [] });
    expect(() => readLedger(file)).toThrow('refusing to risk duplicate');
    writeJson(file, { version: 1, status: 'ready', issueDate: input.issueDate, videoFile: '../video.mp4' });
    expect(() => readManifest(file)).toThrow('Invalid or unfinished');
  });
  it('does not turn an unknown RSS timestamp into a fresh story', () => {
    const result = buildVideoInput(input.issueDate, [{ article: { id: 'unknown', title: story.title,
      url: story.sourceUrl, sourceName: story.sourceName, sourceId: 'lab', publishedAt: now,
      sourcePublishedAt: '', sourceExcerpt: story.sourceExcerpt }, summary: { headline: 'Title', intro: '', body: 'Summary', sourceUrl: story.sourceUrl } }], now);
    expect(result.stories[0].publishedAt).toBe('');
    expect(selectStory(result, empty(), now)).toBeUndefined();
  });
});

describe('story selection and stable reruns', () => {
  it('prefers a concrete video story to a guide, without trusting summary claims', () => {
    const guide = { ...story, id: 'guide', title: 'A guide to language models', rank: 1,
      summary: 'This model cuts costs by 99%.', sourceUrl: 'https://example.com/guide' };
    const impact = { ...story, id: 'impact', rank: 5, title: 'AI cuts waiting time', sourceUrl: 'https://example.com/impact',
      sourceExcerpt: 'The tool cuts waiting time from 30 minutes to 4 minutes. ' + story.sourceExcerpt };
    expect(selectStory({ ...input, stories: [guide, impact] }, empty(), now)?.id).toBe('impact');
    const ledger = empty();
    ledger.issues[input.issueDate] = { story: guide, selectedAt: now.toISOString(), platforms: {} };
    expect(selectStory({ ...input, stories: [guide, impact] }, ledger, now)?.id).toBe('guide');
    const tied = { ...impact, id: 'a-first', sourceUrl: 'https://example.com/tie' };
    expect(selectStory({ ...input, stories: [impact, tied] }, empty(), now)?.id).toBe('a-first');
  });
  it('chooses rank order and freezes the original choice across reruns', () => {
    const second = { ...story, id: 'second', rank: 2, sourceUrl: 'https://news.example.org/second' };
    expect(selectStory({ ...input, stories: [second, story] }, empty(), now)?.id).toBe(story.id);
    const ledger = empty(); ledger.issues[input.issueDate] = { story: second, selectedAt: now.toISOString(), platforms: {} };
    expect(selectStory(input, ledger, now)?.id).toBe('second');
  });
  it('excludes repeated URLs even when tracking parameters change', () => {
    const ledger = empty();
    ledger.issues['2026-10-02'] = { story: { ...story, sourceUrl: `${story.sourceUrl}?utm_source=rss` }, selectedAt: now.toISOString(), platforms: {} };
    expect(storyKey(story.sourceUrl)).toBe(storyKey(`${story.sourceUrl}?utm_campaign=daily`));
    expect(selectStory(input, ledger, now)).toBeUndefined();
  });
  it('skips stale, future, empty, insufficient-evidence and old-issue inputs', () => {
    for (const publishedAt of ['2026-09-29T12:00:00Z', '2026-10-04T12:00:00Z', '']) {
      expect(selectStory({ ...input, stories: [{ ...story, publishedAt }] }, empty(), now)).toBeUndefined();
    }
    expect(selectStory({ ...input, stories: [] }, empty(), now)).toBeUndefined();
    expect(selectStory({ ...input, stories: [{ ...story, sourceExcerpt: 'One sentence.' }] }, empty(), now)).toBeUndefined();
    expect(selectStory({ ...input, generatedAt: '2026-09-01T00:00:00Z' }, empty(), now)).toBeUndefined();
  });
  it('explains whether candidates were stale, undated, already used, or too short', () => {
    const ledger = empty();
    ledger.issues['2026-10-02'] = { story, selectedAt: now.toISOString(), platforms: {} };
    const result = assessStoryCandidates({ ...input, stories: [story,
      { ...story, id: 'old', publishedAt: '2026-09-01T12:00:00Z' },
      { ...story, id: 'undated', publishedAt: '' },
      { ...story, id: 'short', sourceUrl: 'https://example.com/short', sourceExcerpt: 'Too short.' },
    ] }, ledger, now);
    expect(result.stories).toEqual([]);
    expect(result.reason).toContain('Checked 4: 1 older than 72 hours, 1 with unknown/future dates, 1 already used, 1 with fewer than 60 source words');
    expect(assessStoryCandidates({ ...input, generatedAt: '2026-09-01T00:00:00Z' }, empty(), now).reason).toContain('Video input is expired');
  });
  it('compacts old evidence without losing duplicate protection or submission state', () => {
    const ledger = empty();
    ledger.issues['2026-09-01'] = { story: { ...story, publishedAt: '2026-09-01T00:00:00Z' }, selectedAt: now.toISOString(),
      script: buildExtractiveScript(story), platforms: { youtube: { accountId: 'yt', status: 'published', idempotencyKey: 'stable-key', postId: 'post-id', postUrl: 'https://example.org/post-id' } } };
    compactLedger(ledger, now);
    expect(ledger.issues['2026-09-01'].story.sourceExcerpt).toBe('');
    expect(ledger.issues['2026-09-01'].platforms.youtube?.postId).toBe('post-id');
    expect(selectStory(input, ledger, now)).toBeUndefined();
  });
});

describe('source-grounded scripts and exhausted API', () => {
  it('still validates the legacy structure for restored published videos', () => {
    const quotes = [...new Intl.Segmenter('en', { granularity: 'sentence' }).segment(story.sourceExcerpt)].slice(0, 3)
      .map(part => part.segment.trim());
    const legacy = { provider: 'extractive' as const, sentences: quotes.map(text => ({ text, evidenceQuote: text })),
      narration: `Today's AI story: ${story.title}.\n${quotes.join(' ')}\nReporting from ${story.sourceName}. The original source is linked in the description.` };
    expect(() => validateScript(story, legacy)).not.toThrow();
  });
  it('builds a factual 75–105 word script from complete source sentences', () => {
    const script = buildExtractiveScript(story);
    expect(wordCount(script.narration)).toBeGreaterThanOrEqual(75);
    expect(wordCount(script.narration)).toBeLessThanOrEqual(105);
    expect(() => validateScript(story, script)).not.toThrow();
    expect(script.sentences.every(s => story.sourceExcerpt.includes(s.evidenceQuote))).toBe(true);
    expect(script.version).toBe(2);
    expect(script.sentences[0].role).toBe('hook');
    expect(wordCount(script.sentences[0].text)).toBeLessThanOrEqual(18);
    expect(script.sentences.at(-1)?.role).toBe('takeaway');
    expect(script.narration.startsWith("Today's AI story")).toBe(false);
    expect(script.narration).not.toContain('Reporting from');
  });
  it('makes only one API request on quota exhaustion and uses the offline fallback', async () => {
    const client = { post: vi.fn().mockRejectedValue({ response: { status: 429 } }) };
    expect((await generateScript(story, { groqApiKey: 'fake' }, client as any)).provider).toBe('extractive');
    expect(client.post).toHaveBeenCalledTimes(1);
  });
  it('keeps a complete short clause as a heading instead of starting the next list item', () => {
    const guide = { ...story, sourceExcerpt: 'This guide explains how to compare model answers, give it effective instructions, and prepare for production. ' + story.sourceExcerpt };
    const script = buildExtractiveScript(guide);
    expect(script.sentences[0].displayText).toBe('How to compare model answers');
  });
  it('rejects invented figures, unrelated evidence, malformed scripts and long narration', () => {
    const script = buildExtractiveScript(story);
    script.sentences[0].text += ' It costs $999.';
    expect(() => validateScript(story, script)).toThrow('unsupported figure');
    script.sentences[0].text = 'Satellites discover remarkable golden treasures beneath distant oceans.';
    expect(() => validateScript(story, script)).toThrow('differs too far');
    expect(() => validateScript(story, { ...script, sentences: [] })).toThrow('Invalid video script');
    expect(() => validateScript(story, { ...buildExtractiveScript(story), narration: 'hello' })).toThrow('grounded words');
  });
  it('rejects invalid model output and never calls a second provider', async () => {
    const client = { post: vi.fn().mockResolvedValue({ data: { choices: [{ message: { content: '{"sentences":[]}' } }] } }) };
    const result = await generateScript(story, { groqApiKey: 'fake' }, client as any);
    expect(result.provider).toBe('extractive'); expect(client.post).toHaveBeenCalledTimes(1);
    expect(() => buildExtractiveScript({ ...story, sourceExcerpt: 'Incomplete source text' })).toThrow();
  });
  it('asks for a grounded hook and labels without passing newsletter summaries', async () => {
    const generated = buildExtractiveScript(story);
    const client = { post: vi.fn().mockResolvedValue({ data: { choices: [{ message: {
      content: JSON.stringify({ sentences: generated.sentences }),
    } }] } }) };
    const result = await generateScript({ ...story, summary: 'Invented benefit: 100x faster.' }, { groqApiKey: 'fake' }, client as any);
    expect(result.provider).toBe('groq');
    expect(client.post).toHaveBeenCalledTimes(1);
    const prompt = JSON.stringify(client.post.mock.calls[0]);
    expect(prompt).toContain('8–12 words');
    expect(prompt).not.toContain('Invented benefit');
    const invalid = structuredClone(generated);
    invalid.sentences[0].displayText = 'Invented breakthrough';
    expect(() => validateScript(story, invalid)).toThrow('not supported');
    const inventedName = structuredClone(generated);
    inventedName.sentences[0].text = inventedName.sentences[0].text.replace('A fictional', 'Meta');
    expect(() => validateScript(story, inventedName)).toThrow('unsupported name');
  });
});

describe('captions', () => {
  const timing = { duration: 35, sampleRate: 24000, words: [
    { text: 'Hello', start: 0.1, end: 0.5 }, { text: 'world.', start: 0.5, end: 1 },
    { text: 'Another', start: 1.2, end: 1.5 }, { text: 'sentence.', start: 1.5, end: 2 },
  ] };
  it('keeps timing and creates safe, readable subtitle files', () => {
    expect(captionChunks(timing)).toHaveLength(2);
    expect(buildSrt(timing)).toContain('00:00:00,100 --> 00:00:01,000');
    expect(buildAss(timing)).toContain('\\pos(482,1290)');
    expect(buildAss({ ...timing, words: [{ text: '{\\p1}Hello', start: 0, end: 1 }] })).not.toContain('{\\p1}');
  });
  it('rejects empty, overlapping and out-of-range timings', () => {
    expect(() => captionChunks({ ...timing, words: [] })).toThrow();
    expect(() => captionChunks({ ...timing, duration: 29 })).toThrow();
    expect(() => captionChunks({ ...timing, words: [timing.words[0], { text: 'bad', start: 0.2, end: 0.9 }] })).toThrow();
    expect(() => captionChunks({ ...timing, words: [{ text: 'bad', start: 34, end: 36 }] })).toThrow();
  });
  it('attaches separately timed punctuation before grouping captions', () => {
    const text = buildSrt({ ...timing, words: [{ text: 'Hello', start: 0.1, end: 0.5 }, { text: '.', start: 0.5, end: 0.6 }] });
    expect(text).toContain('Hello.'); expect(text).not.toContain('Hello .');
    expect(text).toContain('00:00:00,600');
  });
  it('uses at most five words and highlights only the currently spoken word', () => {
    const text = ['AI', 'tools', 'can', 'help', 'people', 'compare', 'answers.'];
    const timed = { duration: 35, sampleRate: 24000, words: text.map((text, i) => ({ text, start: i, end: i + 0.8 })) };
    expect(captionChunks(timed).every(chunk => chunk.words.length <= 5)).toBe(true);
    const ass = buildAss(timed);
    expect(ass).toContain('DejaVu Sans,64');
    expect(ass).toContain('{\\1c&HCBEFB4&}AI{\\1c&HFFFFFF&} tools can help people');
    expect(ass).toContain('AI {\\1c&HCBEFB4&}tools{\\1c&HFFFFFF&} can help people');
    expect(ass).not.toContain('\\fad');
    expect(captionChunks(timed).map(chunk => chunk.text).join(' ')).toBe(text.join(' '));
  });
});
