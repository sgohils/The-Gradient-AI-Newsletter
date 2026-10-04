import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchArticles, setParserInstance, deduplicateArticles } from '../src/fetcher/fetcher';
import { DEFAULT_SOURCES } from '../src/fetcher/sources';
import { Article } from '../src/types';

describe('fetcher', () => {
  const mockParseURL = vi.fn();

  const createMockParser = () => ({
    parseURL: mockParseURL,
  });

  beforeEach(() => {
    mockParseURL.mockReset();
    setParserInstance(createMockParser() as any);
  });

  describe('source registration', () => {
    it('retains full RSS evidence without expanding the newsletter summary prompt', async () => {
      const content = 'Original source evidence. '.repeat(50);
      mockParseURL.mockResolvedValue({ items: [{ title: 'Original evidence', link: 'https://example.com/evidence', contentSnippet: content }] });
      const articles = await fetchArticles({ sources: [DEFAULT_SOURCES[0]] });
      expect(articles[0].description).toHaveLength(500);
      expect(articles[0].sourceExcerpt).toBe(content);
      expect(articles[0].sourcePublishedAt).toBe('');
    });
    it('should include all expected RSS sources', () => {
      const ids = DEFAULT_SOURCES.map((s) => s.id);
      expect(ids).toContain('techcrunch-ai');
      expect(ids).toContain('arstechnica-ai');
      expect(ids).toContain('arxiv-csai');
      expect(ids).toContain('arxiv-cslg');
      expect(ids).toContain('openai-blog');
      expect(ids).toContain('anthropic-blog');
      expect(ids).toContain('google-ai-blog');
      expect(ids).toContain('reddit-artificial');
      expect(ids).toContain('reddit-machinelearning');
    });

    it('should have valid source fields', () => {
      DEFAULT_SOURCES.forEach((source) => {
        expect(source.id).toBeTruthy();
        expect(source.name).toBeTruthy();
        expect(source.feedUrl).toBeTruthy();
        expect(source.category).toBeTruthy();
        expect(typeof source.priorityWeight).toBe('number');
        expect(source.priorityWeight).toBeGreaterThan(0);
        expect(typeof source.enabled).toBe('boolean');
      });
    });

    it('should filter out disabled sources', async () => {
      mockParseURL.mockResolvedValue({
        items: [{ title: 'Test', link: 'https://example.com/test', pubDate: new Date().toISOString() }],
      });

      const allSources = [...DEFAULT_SOURCES];
      allSources.push({
        id: 'disabled-source',
        name: 'Disabled',
        feedUrl: 'https://disabled.com/rss',
        category: 'Test',
        priorityWeight: 1,
        enabled: false,
      });

      await fetchArticles({ sources: allSources });

      expect(mockParseURL).not.toHaveBeenCalledWith('https://disabled.com/rss');
    });
  });

  describe('deduplication', () => {
    it('should remove duplicate URLs', () => {
      const articles: Article[] = [
        {
          id: 's1-https://example.com/1',
          title: 'Article One',
          url: 'https://example.com/article',
          publishedAt: new Date(),
          sourceId: 's1',
          sourceName: 'Source 1',
        },
        {
          id: 's2-https://example.com/2',
          title: 'Article One (Updated)',
          url: 'https://example.com/article',
          publishedAt: new Date(),
          sourceId: 's2',
          sourceName: 'Source 2',
        },
      ];

      const result = deduplicateArticles(articles);
      expect(result).toHaveLength(1);
      expect(result[0].sourceId).toBe('s1');
    });

    it('should remove articles with highly similar titles', () => {
      const articles: Article[] = [
        {
          id: '1',
          title: 'OpenAI announces GPT-5 with breakthrough capabilities',
          url: 'https://example.com/1',
          publishedAt: new Date(),
          sourceId: 's1',
          sourceName: 'Source 1',
        },
        {
          id: '2',
          title: 'OpenAI announces GPT-5 breakthrough capabilities',
          url: 'https://example.com/2',
          publishedAt: new Date(),
          sourceId: 's2',
          sourceName: 'Source 2',
        },
      ];

      const result = deduplicateArticles(articles);
      expect(result).toHaveLength(1);
    });

    it('should keep articles with different titles and URLs', () => {
      const articles: Article[] = [
        {
          id: '1',
          title: 'Apple announces new iPhone',
          url: 'https://example.com/1',
          publishedAt: new Date(),
          sourceId: 's1',
          sourceName: 'Source 1',
        },
        {
          id: '2',
          title: 'Google announces new Pixel',
          url: 'https://example.com/2',
          publishedAt: new Date(),
          sourceId: 's2',
          sourceName: 'Source 2',
        },
      ];

      const result = deduplicateArticles(articles);
      expect(result).toHaveLength(2);
    });

    it('should be case-insensitive for title similarity', () => {
      const articles: Article[] = [
        {
          id: '1',
          title: 'OpenAI releases new model',
          url: 'https://example.com/1',
          publishedAt: new Date(),
          sourceId: 's1',
          sourceName: 'Source 1',
        },
        {
          id: '2',
          title: 'OPENAI RELEASES NEW MODEL',
          url: 'https://example.com/2',
          publishedAt: new Date(),
          sourceId: 's2',
          sourceName: 'Source 2',
        },
      ];

      const result = deduplicateArticles(articles);
      expect(result).toHaveLength(1);
    });
  });

  describe('error handling', () => {
    it('should skip failed sources and continue with others', async () => {
      const failingParser = {
        parseURL: vi
          .fn()
          .mockRejectedValueOnce(new Error('Network error'))
          .mockResolvedValueOnce({
            items: [
              {
                title: 'Working Feed Article',
                link: 'https://example.com/working',
                pubDate: new Date().toISOString(),
              },
            ],
          }),
      };
      setParserInstance(failingParser as any);

      const sources = [DEFAULT_SOURCES[0], DEFAULT_SOURCES[4]];

      const result = await fetchArticles({ sources });

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Working Feed Article');
    });

    it('should not crash when all sources fail', async () => {
      const failingParser = {
        parseURL: vi.fn().mockRejectedValue(new Error('Network error')),
      };
      setParserInstance(failingParser as any);

      const sources = [DEFAULT_SOURCES[0]];

      const result = await fetchArticles({ sources });

      expect(result).toHaveLength(0);
    });

    it('should invoke onError callback when a source fails', async () => {
      const failingParser = {
        parseURL: vi.fn().mockRejectedValue(new Error('Network error')),
      };
      setParserInstance(failingParser as any);

      const sources = [DEFAULT_SOURCES[0]];
      const onError = vi.fn();

      await fetchArticles({ sources, onError });

      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'techcrunch-ai' }),
        expect.any(Error)
      );
    });
  });

  describe('article mapping', () => {
    it('should map feed items to Article objects with correct structure', async () => {
      const mockParser = {
        parseURL: vi.fn().mockResolvedValue({
          items: [
            {
              title: 'Test Article',
              link: 'https://example.com/test',
              pubDate: 'Mon, 01 Jan 2024 00:00:00 GMT',
            },
          ],
        }),
      };
      setParserInstance(mockParser as any);

      const result = await fetchArticles({ sources: [DEFAULT_SOURCES[0]] });

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        title: 'Test Article',
        url: 'https://example.com/test',
        sourceId: 'techcrunch-ai',
        sourceName: 'TechCrunch AI',
      });
      expect(result[0].publishedAt).toBeInstanceOf(Date);
      expect(result[0].id).toBeTruthy();
    });

    it('should handle items with missing optional fields', async () => {
      const mockParser = {
        parseURL: vi.fn().mockResolvedValue({
          items: [
            {
              title: 'Barebones Article',
            },
          ],
        }),
      };
      setParserInstance(mockParser as any);

      const result = await fetchArticles({ sources: [DEFAULT_SOURCES[0]] });

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Barebones Article');
      expect(result[0].url).toBeTruthy();
      expect(result[0].publishedAt).toBeInstanceOf(Date);
    });
  });
});
