import { describe, it, expect } from 'vitest';
import { buildImagePrompt, extractThemes, dateToSeed } from '../src/publisher/image-template';
import { generateIssueImage, ImageGenerationError, buildPollinationsUrl } from '../src/publisher/image-generator';
import type { NewsletterIssue, Article } from '../src/types';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

function makeArticle(overrides: Partial<Article> = {}): Article {
  return {
    id: 'a1',
    title: 'Test Article',
    url: 'https://example.com/a',
    description: 'A test article',
    publishedAt: new Date('2026-09-01'),
    sourceId: 'openai',
    sourceName: 'OpenAI',
    category: 'AI',
    ...overrides,
  };
}

function makeIssue(overrides: Partial<NewsletterIssue> = {}): NewsletterIssue {
  return {
    id: 'gradient-2026-09-01',
    title: 'The Gradient — 2026-09-01',
    date: '2026-09-01',
    intro: 'Daily AI news',
    articles: [makeArticle()],
    tags: [],
    ...overrides,
  };
}

describe('image-template', () => {
  describe('dateToSeed', () => {
    it('returns a positive integer for a valid date', () => {
      const seed = dateToSeed('2026-09-01');
      expect(seed).toBeTypeOf('number');
      expect(seed).toBeGreaterThan(0);
    });

    it('is deterministic — same date, same seed', () => {
      expect(dateToSeed('2026-09-01')).toBe(dateToSeed('2026-09-01'));
    });

    it('differs across dates', () => {
      expect(dateToSeed('2026-09-01')).not.toBe(dateToSeed('2026-09-02'));
    });

    it('never returns zero (falls back to 42)', () => {
      expect(dateToSeed('')).toBe(42);
    });
  });

  describe('extractThemes', () => {
    it('returns tags when present', () => {
      const issue = makeIssue({ tags: ['Research', 'Open Source'] });
      expect(extractThemes(issue)).toEqual(['Research', 'Open Source']);
    });

    it('derives from titles when tags are empty', () => {
      const issue = makeIssue({
        tags: [],
        articles: [
          makeArticle({ title: 'New LLM benchmarks released' }),
          makeArticle({ title: 'Open source robotics platform' }),
        ],
      });
      const themes = extractThemes(issue);
      expect(themes.length).toBeGreaterThan(0);
      expect(themes.length).toBeLessThanOrEqual(4);
    });

    it('falls back to default themes when nothing matches', () => {
      const issue = makeIssue({
        tags: [],
        intro: 'Nothing relevant here',
        articles: [makeArticle({ title: 'xyz', description: 'abc' })],
      });
      const themes = extractThemes(issue);
      expect(themes.length).toBeGreaterThan(0);
    });
  });

  describe('buildImagePrompt', () => {
    it('returns a prompt and seed', () => {
      const ctx = buildImagePrompt(makeIssue());
      expect(ctx.prompt).toBeTypeOf('string');
      expect(ctx.prompt.length).toBeGreaterThan(0);
      expect(ctx.seed).toBeGreaterThan(0);
    });

    it('embeds the Gradient News style tokens', () => {
      const { prompt } = buildImagePrompt(makeIssue());
      expect(prompt).toMatch(/abstract editorial illustration/i);
      expect(prompt).toMatch(/navy|cyan|violet/i);
      expect(prompt).toMatch(/no text, no logos, no people/i);
    });

    it('includes the top article titles in the prompt', () => {
      const issue = makeIssue({
        articles: [
          makeArticle({ title: 'GPT-6 announced' }),
          makeArticle({ title: 'New chip from NVIDIA' }),
        ],
      });
      const { prompt } = buildImagePrompt(issue);
      expect(prompt).toContain('GPT-6 announced');
    });

    it('is deterministic — same issue, same prompt and seed', () => {
      const issue = makeIssue();
      const a = buildImagePrompt(issue);
      const b = buildImagePrompt(issue);
      expect(a.prompt).toBe(b.prompt);
      expect(a.seed).toBe(b.seed);
    });

    it('varies the prompt with the date', () => {
      const a = buildImagePrompt(makeIssue({ date: '2026-09-01' }));
      const b = buildImagePrompt(makeIssue({ date: '2026-09-02' }));
      expect(a.seed).not.toBe(b.seed);
    });
  });
});

describe('image-generator (Pixazo)', () => {
  it('returns null and warns when PIXAZ_API_KEY is missing', async () => {
    const original = process.env.PIXAZ_API_KEY;
    delete process.env.PIXAZ_API_KEY;
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gradient-img-test-'));
    try {
      const issue = makeIssue({ date: '2099-01-01' });
      const result = await generateIssueImage(issue, { outputDir: tmp });
      expect(result).toBeNull();
    } finally {
      if (original) process.env.PIXAZ_API_KEY = original;
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('is idempotent — returns existing file path without calling the API', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gradient-img-test-'));
    try {
      const fileName = '2099-01-02.png';
      const filePath = path.join(tmp, fileName);
      fs.writeFileSync(filePath, Buffer.from([0x89, 0x50, 0x4e, 0x47]));
      const issue = makeIssue({ date: '2099-01-02' });
      const result = await generateIssueImage(issue, { outputDir: tmp, apiKey: 'fake-key' });
      expect(result).toBe(`/issue-images/${fileName}`);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('throws ImageGenerationError from the deprecated URL builder', () => {
    expect(() =>
      buildPollinationsUrl('prompt', { width: 1, height: 1, seed: 1, model: 'flux' })
    ).toThrow(ImageGenerationError);
  });
});
