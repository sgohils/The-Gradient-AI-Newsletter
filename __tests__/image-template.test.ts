import { describe, it, expect } from 'vitest';
import { buildImagePrompt, extractThemes, dateToSeed } from '../src/publisher/image-template';
import { buildPollinationsUrl } from '../src/publisher/image-generator';
import type { NewsletterIssue, Article } from '../src/types';

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

describe('image-generator url builder', () => {
  it('builds a Pollinations URL with expected params', () => {
    const url = buildPollinationsUrl('abstract gradient, navy to cyan', {
      width: 1200,
      height: 630,
      seed: 42,
      model: 'flux',
    });
    expect(url.startsWith('https://image.pollinations.ai/prompt/')).toBe(true);
    expect(url).toContain('width=1200');
    expect(url).toContain('height=630');
    expect(url).toContain('seed=42');
    expect(url).toContain('model=flux');
    expect(url).toContain('nologo=true');
    expect(url).toContain('enhance=false');
  });

  it('URI-encodes the prompt safely', () => {
    const url = buildPollinationsUrl('hello world & special/chars', {
      width: 100, height: 100, seed: 1, model: 'turbo',
    });
    expect(url).toContain(encodeURIComponent('hello world & special/chars'));
  });
});
