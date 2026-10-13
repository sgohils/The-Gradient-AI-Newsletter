import { afterEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { AxiosRequestConfig } from 'axios';
import { buildMarkdown } from '../src/publisher';
import { NewsletterIssue } from '../src/types';
import { buildLinkedInPost, issueUrl, prepareLinkedInPost } from '../src/linkedin/prepare';
import { publishLinkedInPost } from '../src/linkedin/publish';
import { readPublication } from '../src/linkedin/storage';
import { writeJson } from '../src/video/storage';

const date = '2026-10-06';
const now = () => new Date(`${date}T12:00:00Z`);
const temporary: string[] = [];
const organizationUrn = 'urn:li:organization:12345';
function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gradient-linkedin-'));
  temporary.push(root);
  const issue: NewsletterIssue = {
    id: `gradient-${date}`, title: `The Gradient — ${date}`, date, intro: 'Daily briefing', tags: ['AI'],
    articles: Array.from({ length: 5 }, (_, index) => ({
      id: `story-${index}`, title: `Research update ${index + 1}`, url: `https://source.example/${index}`,
      description: `**What happened:** A lab released tool ${index + 1} for evaluating AI.\n\n**Why it matters:** This is useful.\n\n**Source:** https://source.example/${index}`,
      sourceId: 'lab', sourceName: 'Lab', publishedAt: now(),
    })),
  };
  const markdown = buildMarkdown(issue);
  const post = buildLinkedInPost(markdown, date, 'https://gradient.example');
  const stateDir = path.join(root, 'state');
  const stateFile = path.join(stateDir, `${date}.json`);
  return { root, issue, markdown, post, stateDir, stateFile };
}
const published = (status = 'published') => ({ data: { post: {
  _id: 'provider-post', status, platforms: [{ platform: 'linkedin', status,
    ...(status === 'published' ? { platformPostUrl: 'https://www.linkedin.com/feed/update/test' } : {}) }],
} } });
function connected(config: AxiosRequestConfig) {
  if (config.url?.endsWith('/accounts')) return { data: { accounts: [{ _id: 'account', platform: 'linkedin', isActive: true }] } };
  if (config.url?.endsWith('/linkedin-organizations')) return { data: { organizations: [{ id: '12345', name: 'The Gradient' }] } };
  return published();
}
function options(f: ReturnType<typeof fixture>, transport = vi.fn(async (config: AxiosRequestConfig) => connected(config))) {
  return { post: f.post, stateDir: f.stateDir, apiKey: 'test-secret', accountId: 'account', organizationUrn, now, transport, sleep: vi.fn(async () => {}) };
}
afterEach(() => {
  for (const directory of temporary.splice(0)) fs.rmSync(directory, { recursive: true, force: true });
});

describe('LinkedIn post preparation', () => {
  it('creates a plain-text briefing from the first three published stories without a video input', () => {
    const f = fixture();
    const postsDir = path.join(f.root, 'posts'); fs.mkdirSync(postsDir);
    fs.writeFileSync(path.join(postsDir, `${date}.md`), f.markdown);
    const outputDir = path.join(f.root, 'preview');
    const post = prepareLinkedInPost({ issueDate: date, baseUrl: 'https://gradient.example', postsDir, outputDir });
    expect(post.content).toContain('1. Research update 1\nA lab released tool 1 for evaluating AI.');
    expect(post.content).toContain('3. Research update 3');
    expect(post.content).not.toContain('Research update 4');
    expect(post.content).not.toContain('**');
    expect(post.content).not.toContain('Why it matters');
    expect(post.content).toContain(`https://gradient.example/archive/${date}`);
    expect(fs.readFileSync(path.join(outputDir, date, 'post.txt'), 'utf8')).toBe(`${post.content}\n`);
    expect(fs.existsSync(path.join(postsDir, `${date}.video.json`))).toBe(false);
  });
  it('keeps long HTML and Unicode summaries within the LinkedIn limit and preserves the issue link', () => {
    const f = fixture();
    f.issue.articles.forEach(article => {
      article.title = '<b>AI &amp; research</b> '.repeat(60);
      article.description = `**What happened:** <p>${'An AI release 😀 with details. '.repeat(100)}</p>\n\n**Why it matters:** Context.`;
    });
    const post = buildLinkedInPost(buildMarkdown(f.issue), date, 'https://gradient.example');
    expect(post.content.length).toBeLessThanOrEqual(3000);
    expect(post.content).toContain('AI & research');
    expect(post.content).not.toContain('<p>');
    expect(post.content).toContain(post.issueUrl);
  });
  it('supports ordinary summary paragraphs from existing publisher output', () => {
    const f = fixture();
    f.issue.articles[0].description = 'The lab released a new model.\n\nIt includes a report.';
    expect(buildLinkedInPost(buildMarkdown(f.issue), date, 'https://gradient.example').content)
      .toContain('1. Research update 1\nThe lab released a new model.');
  });
  it('rejects wrong dates, missing sources, empty editions, and local newsletter URLs', () => {
    const f = fixture();
    expect(() => buildLinkedInPost(f.markdown, '2026-10-05', 'https://gradient.example')).toThrow('different date');
    expect(() => buildLinkedInPost(f.markdown.replace(/\[Read more\]\([^)]+\)/g, ''), date, 'https://gradient.example')).toThrow('incomplete');
    expect(() => buildLinkedInPost(buildMarkdown({ ...f.issue, articles: [] }), date, 'https://gradient.example')).toThrow('no stories');
    for (const base of ['', 'http://gradient.example', 'https://localhost', 'https://127.0.0.1', 'https://user:pass@gradient.example']) {
      expect(() => issueUrl(base, date)).toThrow('HTTPS');
    }
    expect(issueUrl('https://gradient.example/newsletter/', date)).toBe(`https://gradient.example/newsletter/archive/${date}`);
  });
});

describe('LinkedIn company Page publication', () => {
  it('checkpoints the exact intent before POST and explicitly targets the configured company Page', async () => {
    const f = fixture(); const config = options(f);
    const checkpoint = vi.fn(async () => {
      const state = readPublication(f.stateFile, date)!;
      if (state.status === 'submitting') {
        expect(state.firstSubmittedAt).toBe(now().toISOString());
        expect(config.transport.mock.calls.filter(([request]) => request.method === 'POST')).toHaveLength(0);
      }
    });
    const result = await publishLinkedInPost({ ...config, checkpoint });
    expect(result.status).toBe('published');
    expect(result.postUrl).toBe('https://www.linkedin.com/feed/update/test');
    const request = config.transport.mock.calls.find(([item]) => item.method === 'POST')![0];
    expect(request.data).toEqual({ content: f.post.content, platforms: [{ platform: 'linkedin', accountId: 'account',
      platformSpecificData: { organizationUrn } }], publishNow: true });
    expect(request.headers?.['Idempotency-Key']).toBe(result.idempotencyKey);
    expect(JSON.stringify(readPublication(f.stateFile, date))).not.toContain('test-secret');
    expect(checkpoint).toHaveBeenCalledTimes(2);
    config.transport.mockClear();
    expect((await publishLinkedInPost({ ...config, apiKey: undefined })).status).toBe('published');
    expect(config.transport).not.toHaveBeenCalled();
  });
  it('requires credentials and an explicit company Page target before any API call', async () => {
    const f = fixture(); const config = options(f);
    await expect(publishLinkedInPost({ ...config, apiKey: undefined })).rejects.toThrow('ZERNIO_API_KEY');
    await expect(publishLinkedInPost({ ...config, accountId: undefined })).rejects.toThrow('ACCOUNT_ID');
    await expect(publishLinkedInPost({ ...config, organizationUrn: undefined })).rejects.toThrow('company Page');
    await expect(publishLinkedInPost({ ...config, organizationUrn: 'urn:li:person:12345' })).rejects.toThrow('company Page');
    expect(config.transport).not.toHaveBeenCalled();
  });
  it('blocks inactive or wrong-platform accounts and a Page the member does not administer', async () => {
    for (const account of [{ _id: 'account', platform: 'youtube' }, { _id: 'account', platform: 'linkedin', isActive: false }]) {
      const f = fixture();
      const config = options(f, vi.fn(async () => ({ data: { accounts: [account] } })));
      expect((await publishLinkedInPost(config)).status).toBe('blocked');
      expect(config.transport.mock.calls.every(([request]) => request.method === 'GET')).toBe(true);
    }
    const f = fixture();
    const config = options(f, vi.fn(async request => request.url?.endsWith('/linkedin-organizations') ?
      { data: { organizations: [{ id: '9999' }] } } : connected(request)));
    const result = await publishLinkedInPost(config);
    expect(result.status).toBe('blocked'); expect(result.error).toContain('does not administer');
    expect(config.transport.mock.calls.every(([request]) => request.method === 'GET')).toBe(true);
  });
  it('does not POST when durable state cannot be pushed', async () => {
    const f = fixture(); const config = options(f);
    await expect(publishLinkedInPost({ ...config, checkpoint: async () => { throw new Error('Git push rejected'); } })).rejects.toThrow('push rejected');
    expect(config.transport.mock.calls.every(([request]) => request.method === 'GET')).toBe(true);
  });
  it('reuses the same frozen request and key after network ambiguity, including a later scheduled attempt', async () => {
    const f = fixture();
    const requests: AxiosRequestConfig[] = [];
    let fail = true;
    const config = options(f, vi.fn(async request => {
      if (request.method === 'POST') {
        requests.push(request);
        if (fail) throw Object.assign(new Error('network failure'), { isAxiosError: true });
      }
      return connected(request);
    }));
    expect((await publishLinkedInPost(config)).status).toBe('uncertain');
    expect(requests).toHaveLength(3);
    fail = false;
    expect((await publishLinkedInPost(config)).status).toBe('published');
    expect(requests).toHaveLength(4);
    expect(new Set(requests.map(request => request.headers?.['Idempotency-Key'])).size).toBe(1);
    expect(new Set(requests.map(request => JSON.stringify(request.data))).size).toBe(1);
  });
  it('honors rate-limit delays and defers long Retry-After values to a later attempt', async () => {
    const f = fixture(); let calls = 0;
    const config = options(f, vi.fn(async request => {
      if (request.method === 'POST' && calls++ === 0) throw { response: { status: 429, headers: { 'retry-after': '2' } } };
      return connected(request);
    }));
    expect((await publishLinkedInPost(config)).status).toBe('published');
    expect(config.sleep).toHaveBeenCalledWith(2000);
    const other = fixture();
    const long = options(other, vi.fn(async request => {
      if (request.method === 'POST') throw { response: { status: 429, headers: { 'retry-after': '90' } } };
      return connected(request);
    }));
    expect((await publishLinkedInPost(long)).status).toBe('uncertain');
    expect(long.sleep).not.toHaveBeenCalled();
    expect(long.transport.mock.calls.filter(([request]) => request.method === 'POST')).toHaveLength(1);
  });
  it('reconciles a known pending or failed post without creating a replacement, including older editions', async () => {
    const f = fixture();
    const config = options(f, vi.fn(async request => request.method === 'POST' ? published('pending') : connected(request)));
    expect((await publishLinkedInPost(config)).status).toBe('pending');
    config.transport.mockClear();
    const result = await publishLinkedInPost({ ...config, now: () => new Date('2026-10-08T12:00:00Z') });
    expect(result.status).toBe('published');
    expect(config.transport).toHaveBeenCalledTimes(1);
    expect(config.transport.mock.calls[0][0]).toMatchObject({ method: 'GET', url: expect.stringContaining('/posts/provider-post') });
  });
  it('resolves duplicate-content responses through the existing provider ID', async () => {
    const f = fixture();
    const config = options(f, vi.fn(async request => {
      if (request.method === 'POST') throw { response: { status: 409, data: { details: { existingPostId: 'provider-post' } } } };
      return connected(request);
    }));
    expect((await publishLinkedInPost(config)).status).toBe('published');
    expect(config.transport.mock.calls.filter(([request]) => request.method === 'POST')).toHaveLength(1);
  });
  it('keeps a known failed post available for repair without automatically creating or retrying a post', async () => {
    const f = fixture();
    const config = options(f, vi.fn(async request => request.method === 'POST' ? published('failed') : connected(request)));
    expect((await publishLinkedInPost(config)).status).toBe('failed');
    config.transport.mockClear();
    config.transport.mockImplementation(async () => published('failed'));
    expect((await publishLinkedInPost(config)).status).toBe('failed');
    expect(config.transport).toHaveBeenCalledTimes(1);
    expect(config.transport.mock.calls[0][0].method).toBe('GET');
  });
  it('refuses uncertain resubmission after 24 hours and first publication of an older edition', async () => {
    const f = fixture();
    const config = options(f, vi.fn(async request => {
      if (request.method === 'POST') throw { response: { status: 503 } };
      return connected(request);
    }));
    expect((await publishLinkedInPost(config)).status).toBe('uncertain');
    config.transport.mockClear();
    const result = await publishLinkedInPost({ ...config, now: () => new Date('2026-10-07T12:00:00Z') });
    expect(result.status).toBe('uncertain'); expect(result.error).toContain('24-hour');
    expect(config.transport).not.toHaveBeenCalled();
    const other = fixture(); const old = options(other);
    const blocked = await publishLinkedInPost({ ...old, now: () => new Date('2026-10-07T12:00:00Z') });
    expect(blocked.status).toBe('blocked'); expect(blocked.error).toContain('UTC edition');
    expect(old.transport).not.toHaveBeenCalled();
  });
  it('rejects target/content changes and corrupted saved state after a submission', async () => {
    const f = fixture();
    const config = options(f, vi.fn(async request => request.method === 'POST' ? published('pending') : connected(request)));
    await publishLinkedInPost(config); config.transport.mockClear();
    await expect(publishLinkedInPost({ ...config, organizationUrn: 'urn:li:organization:999' })).rejects.toThrow('changed after submission');
    const different = buildLinkedInPost(f.markdown, date, 'https://other.example');
    await expect(publishLinkedInPost({ ...config, post: different })).rejects.toThrow('changed after submission');
    const state = readPublication(f.stateFile, date)!;
    writeJson(f.stateFile, { ...state, content: 'tampered' });
    await expect(publishLinkedInPost(config)).rejects.toThrow('content hash');
    expect(config.transport).not.toHaveBeenCalled();
  });
  it('does not expose response credentials or count a malformed response as success', async () => {
    const f = fixture();
    const unauthorized = options(f, vi.fn(async () => { throw { response: { status: 401, data: { error: 'test-secret' } } }; }));
    const blocked = await publishLinkedInPost(unauthorized);
    expect(blocked.status).toBe('blocked'); expect(blocked.error).not.toContain('test-secret');
    const other = fixture();
    const malformed = options(other, vi.fn(async request => request.method === 'POST' ? { data: {} } : connected(request)));
    expect((await publishLinkedInPost(malformed)).status).toBe('uncertain');
  });
});
