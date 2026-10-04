import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as configModule from '../src/config/loader';
import * as fetcherModule from '../src/fetcher/fetcher';
import * as curatorModule from '../src/curator';
import * as summarizerModule from '../src/summarizer/summarizer';
import * as publisherModule from '../src/publisher/publisher';
import * as mailerModule from '../src/mailer';
import * as videoStorage from '../src/video/storage';
import * as fs from 'fs';
import * as path from 'path';
import type { Config } from '../src/config';
import { Article, Source } from '../src/types';
import { runPipeline, CliOptions } from '../src/cli/orchestrator';

vi.mock('../src/mailer', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/mailer')>();
  return { ...actual, getResendSubscribers: vi.fn().mockResolvedValue([]), sendEmail: vi.fn().mockResolvedValue(undefined) };
});

function createMockConfig(sources: Source[] = []): Config {
  return {
    openaiApiKey: 'test-key',
    openaiModel: 'gpt-4o-mini',
    openaiTemperature: 0.7,
    outputDir: 'test-posts',
    sources,
    maxArticles: 5,
    mailer: {},
    imageGeneration: { enabled: false, outputDir: 'test-images', model: 'flux' },
  };
}

function createMockArticle(sourceId: string, sourceName: string): Article {
  return {
    id: `${sourceId}-1`,
    title: `Test Article from ${sourceName}`,
    url: `https://example.com/${sourceId}-1`,
    description: 'This is a test article description.',
    publishedAt: new Date(),
    sourceId,
    sourceName,
    category: 'Test',
  };
}

describe('orchestrator', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(videoStorage, 'writeJson').mockImplementation(() => {});
    vi.mocked(mailerModule.getResendSubscribers).mockReset().mockResolvedValue([]);
    vi.mocked(mailerModule.sendEmail).mockReset().mockResolvedValue(undefined);
  });

  describe('argument parsing', () => {
    it('should parse --sources flag', async () => {
      const source1: Source = { id: 'openai-blog', name: 'OpenAI Blog', feedUrl: 'https://example.com/rss1', category: 'Company Blog', priorityWeight: 5, enabled: true };
      const source2: Source = { id: 'anthropic-blog', name: 'Anthropic Blog', feedUrl: 'https://example.com/rss2', category: 'Company Blog', priorityWeight: 5, enabled: true };

      vi.spyOn(configModule, 'loadConfig').mockReturnValue(createMockConfig([source1, source2]));
      vi.spyOn(fetcherModule, 'fetchArticles').mockResolvedValue([]);
      vi.spyOn(curatorModule, 'curate').mockReturnValue([]);

      await runPipeline({ sources: ['openai-blog', 'anthropic-blog'], dryRun: true } as any);

      expect(fetcherModule.fetchArticles).toHaveBeenCalledWith({ sources: [source1, source2] });
    });

    it('should parse --output-dir flag', async () => {
      vi.spyOn(configModule, 'loadConfig').mockReturnValue(createMockConfig([]));
      vi.spyOn(fetcherModule, 'fetchArticles').mockResolvedValue([]);

      await runPipeline({ outputDir: 'custom-posts', dryRun: true } as any);

      expect(configModule.loadConfig).toHaveBeenCalled();
    });

    it('should parse --dry-run flag', async () => {
      vi.spyOn(configModule, 'loadConfig').mockReturnValue(createMockConfig([]));
      vi.spyOn(fetcherModule, 'fetchArticles').mockResolvedValue([]);

      const result = await runPipeline({ dryRun: true } as any);
      expect(result.issuesPublished).toBe(0);
    });
  });

  describe('pipeline flow', () => {
    it('continues newsletter delivery when the optional video export fails', async () => {
      const article = createMockArticle('lab', 'Lab');
      const config = createMockConfig(); config.mailer.resendApiKey = 'configured-test-key';
      vi.spyOn(configModule, 'loadConfig').mockReturnValue(config);
      vi.spyOn(fetcherModule, 'fetchArticles').mockResolvedValue([article]);
      vi.spyOn(curatorModule, 'curate').mockReturnValue([{ ...article, score: 1 } as any]);
      vi.spyOn(summarizerModule, 'summarizeArticle').mockResolvedValue({ headline: article.title, intro: 'Intro', body: 'Body', sourceUrl: article.url });
      vi.spyOn(publisherModule, 'publish').mockResolvedValue({ mdPath: 'test-posts/issue.md', htmlPath: 'test-posts/issue.html' });
      vi.mocked(videoStorage.writeJson).mockImplementation(() => { throw new Error('Video export disk failure'); });
      vi.mocked(mailerModule.getResendSubscribers).mockResolvedValue([{ email: 'reader@example.com', token: 'token', subscribedAt: '2026-01-01' }]);
      const result = await runPipeline({ dryRun: false });
      expect(result.issuesPublished).toBe(1); expect(result.videoInputPath).toBeUndefined();
      expect(mailerModule.sendEmail).toHaveBeenCalledTimes(1);
    });
    it('should run the full pipeline successfully', async () => {
      const source1: Source = { id: 'openai-blog', name: 'OpenAI Blog', feedUrl: 'https://example.com/rss', category: 'Company Blog', priorityWeight: 5, enabled: true };
      const source2: Source = { id: 'anthropic-blog', name: 'Anthropic Blog', feedUrl: 'https://example.com/rss2', category: 'Company Blog', priorityWeight: 5, enabled: true };

      const mockConfig = createMockConfig([source1, source2]);

      const article1 = createMockArticle('openai-blog', 'OpenAI Blog');
      const article2 = createMockArticle('anthropic-blog', 'Anthropic Blog');
      article2.publishedAt = new Date(Date.now() - 1000 * 60 * 60 * 2);

      const mockCurated = [
        { ...article1, score: 0.9, scoreDetails: { source: 1, recency: 1, keywords: 1, engagement: 1 } },
        { ...article2, score: 0.8, scoreDetails: { source: 1, recency: 1, keywords: 1, engagement: 1 } },
      ];

      vi.spyOn(configModule, 'loadConfig').mockReturnValue(mockConfig);
      vi.spyOn(fetcherModule, 'fetchArticles').mockResolvedValue([article1, article2]);
      vi.spyOn(curatorModule, 'curate').mockReturnValue(mockCurated as any);
      vi.spyOn(summarizerModule, 'summarizeArticle').mockResolvedValue({
        headline: 'Test Headline',
        intro: 'Test intro',
        body: 'Test body',
        sourceUrl: 'https://example.com',
      });
      vi.spyOn(publisherModule, 'publish').mockResolvedValue({
        mdPath: 'test-posts/2024-01-01.md',
        htmlPath: 'test-posts/2024-01-01.html',
      });

      const result = await runPipeline({ dryRun: false } as any);

      expect(fetcherModule.fetchArticles).toHaveBeenCalledWith({ sources: [source1, source2] });
      expect(curatorModule.curate).toHaveBeenCalledWith([article1, article2]);
      expect(summarizerModule.summarizeArticle).toHaveBeenCalledTimes(2);
      expect(publisherModule.publish).toHaveBeenCalledTimes(1);
      expect(result.issuesPublished).toBe(1);
      expect(result.mdPath).toContain('.md');
      expect(result.htmlPath).toContain('.html');
      expect(result.videoInputPath).toMatch(/\.video\.json$/);
      expect(videoStorage.writeJson).toHaveBeenCalledWith(result.videoInputPath, expect.objectContaining({
        version: 1, stories: expect.arrayContaining([expect.objectContaining({ sourceExcerpt: article1.description, summary: 'Test body' })]),
      }));
    });

    it('should reuse fallback when summarizer fails', async () => {
      const source1: Source = { id: 'openai-blog', name: 'OpenAI Blog', feedUrl: 'https://example.com/rss', category: 'Company Blog', priorityWeight: 5, enabled: true };
      const article1 = createMockArticle('openai-blog', 'OpenAI Blog');

      vi.spyOn(configModule, 'loadConfig').mockReturnValue(createMockConfig([source1]));
      vi.spyOn(fetcherModule, 'fetchArticles').mockResolvedValue([article1]);
      vi.spyOn(curatorModule, 'curate').mockReturnValue([
        { ...article1, score: 0.9, scoreDetails: { source: 1, recency: 1, keywords: 1, engagement: 1 } } as any,
      ]);

      vi.spyOn(summarizerModule, 'summarizeArticle')
        .mockRejectedValueOnce(new Error('LLM error'))
        .mockResolvedValueOnce({
          headline: 'Fallback Headline',
          intro: 'Fallback intro',
          body: 'Fallback body',
          sourceUrl: article1.url,
        });

      vi.spyOn(publisherModule, 'publish').mockResolvedValue({
        mdPath: 'test-posts/2024-01-01.md',
        htmlPath: 'test-posts/2024-01-01.html',
      });

      await runPipeline({ dryRun: false } as any);

      expect(summarizerModule.summarizeArticle).toHaveBeenCalledTimes(2);
      expect(publisherModule.publish).toHaveBeenCalledTimes(1);
    });

    it('should handle empty curated results gracefully', async () => {
      const source1: Source = { id: 'openai-blog', name: 'OpenAI Blog', feedUrl: 'https://example.com/rss', category: 'Company Blog', priorityWeight: 5, enabled: true };
      const article1 = createMockArticle('openai-blog', 'OpenAI Blog');

      const summarizeSpy = vi.spyOn(summarizerModule, 'summarizeArticle');
      const publishSpy = vi.spyOn(publisherModule, 'publish');

      vi.spyOn(configModule, 'loadConfig').mockReturnValue(createMockConfig([source1]));
      vi.spyOn(fetcherModule, 'fetchArticles').mockResolvedValue([article1]);
      vi.spyOn(curatorModule, 'curate').mockReturnValue([]);

      const result = await runPipeline({ dryRun: false } as any);

      expect(result.issuesPublished).toBe(0);
      expect(summarizeSpy).not.toHaveBeenCalled();
      expect(publishSpy).not.toHaveBeenCalled();
    });

    it('should handle fetcher errors gracefully', async () => {
      const source1: Source = { id: 'openai-blog', name: 'OpenAI Blog', feedUrl: 'https://example.com/rss', category: 'Company Blog', priorityWeight: 5, enabled: true };

      vi.spyOn(configModule, 'loadConfig').mockReturnValue(createMockConfig([source1]));
      vi.spyOn(fetcherModule, 'fetchArticles').mockRejectedValue(new Error('Network error'));

      await expect(runPipeline({ dryRun: false } as any)).rejects.toThrow('Network error');
    });
  });

  describe('source filtering', () => {
    it('should filter fetcher sources by source IDs when provided', async () => {
      const source1: Source = { id: 'openai-blog', name: 'OpenAI Blog', feedUrl: 'https://example.com/rss1', category: 'Company Blog', priorityWeight: 5, enabled: true };
      const source2: Source = { id: 'anthropic-blog', name: 'Anthropic Blog', feedUrl: 'https://example.com/rss2', category: 'Company Blog', priorityWeight: 5, enabled: true };

      vi.spyOn(configModule, 'loadConfig').mockReturnValue(createMockConfig([source1, source2]));
      vi.spyOn(fetcherModule, 'fetchArticles').mockResolvedValue([]);
      vi.spyOn(curatorModule, 'curate').mockReturnValue([]);

      await runPipeline({ sources: ['openai-blog'], dryRun: false } as any);

      expect(fetcherModule.fetchArticles).toHaveBeenCalledWith({ sources: [source1] });
    });

    it('should throw on unknown source IDs', async () => {
      const source1: Source = { id: 'openai-blog', name: 'OpenAI Blog', feedUrl: 'https://example.com/rss', category: 'Company Blog', priorityWeight: 5, enabled: true };

      vi.spyOn(configModule, 'loadConfig').mockReturnValue(createMockConfig([source1]));

      await expect(runPipeline({ sources: ['unknown-source'], dryRun: false } as any)).rejects.toThrow('Unknown source IDs: unknown-source');
    });
  });

  describe('dry-run mode', () => {
    it('should write files to a temp directory in dry-run mode', async () => {
      const source1: Source = { id: 'openai-blog', name: 'OpenAI Blog', feedUrl: 'https://example.com/rss', category: 'Company Blog', priorityWeight: 5, enabled: true };
      const article1 = createMockArticle('openai-blog', 'OpenAI Blog');

      const config = createMockConfig([source1]);
      config.mailer.resendApiKey = 'configured-test-key';
      vi.spyOn(configModule, 'loadConfig').mockReturnValue(config);
      vi.mocked(mailerModule.getResendSubscribers).mockResolvedValue([{ email: 'reader@example.com', token: 'test', subscribedAt: '2026-01-01' }]);
      vi.spyOn(fetcherModule, 'fetchArticles').mockResolvedValue([article1]);
      vi.spyOn(curatorModule, 'curate').mockReturnValue([
        { ...article1, score: 0.9, scoreDetails: { source: 1, recency: 1, keywords: 1, engagement: 1 } } as any,
      ]);
      vi.spyOn(summarizerModule, 'summarizeArticle').mockResolvedValue({
        headline: 'Test Headline',
        intro: 'Test intro',
        body: 'Test body',
        sourceUrl: article1.url,
      });

      const result = await runPipeline({ dryRun: true } as any);

      expect(result.issuesPublished).toBe(1);
      expect(result.mdPath).toContain('.md');
      expect(result.htmlPath).toContain('.html');
      expect(fs.readFileSync(result.mdPath, 'utf-8')).toContain('Test body');
      expect(fs.readFileSync(result.htmlPath, 'utf-8')).toContain('Test body');
      expect(mailerModule.getResendSubscribers).not.toHaveBeenCalled();
      expect(mailerModule.sendEmail).not.toHaveBeenCalled();
      expect(result.videoInputPath).toBeUndefined();
      expect(videoStorage.writeJson).not.toHaveBeenCalled();
      fs.unlinkSync(result.mdPath);
      fs.unlinkSync(result.htmlPath);
      fs.rmdirSync(path.dirname(result.mdPath));
    });
  });
});
