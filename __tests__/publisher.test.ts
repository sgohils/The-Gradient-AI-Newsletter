import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  buildMarkdown,
  buildHtml,
  publish,
  markdownToHtml,
} from '../src/publisher';
import { NewsletterIssue, Article } from '../src/types';
import * as path from 'path';

vi.mock('fs', () => ({
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

import * as fs from 'fs';

const createBaseArticle = (overrides: Partial<Article> = {}): Article => ({
  id: '1',
  title: 'Test AI Article',
  url: 'https://example.com/ai-article',
  description: 'A description of the AI breakthrough with some details.',
  publishedAt: new Date('2024-01-01'),
  sourceId: 'test-source',
  sourceName: 'Test Source',
  category: 'AI',
  ...overrides,
});

const createBaseIssue = (overrides: Partial<NewsletterIssue> = {}): NewsletterIssue => ({
  id: 'issue-1',
  title: 'The Gradient — 2024-01-01: Big AI Breakthrough',
  date: '2024-01-01',
  intro: 'Welcome to today\'s newsletter about the latest in AI.',
  articles: [createBaseArticle()],
  tags: ['AI', 'Research'],
  featuredImageUrl: 'https://example.com/featured.jpg',
  ...overrides,
});

describe('publisher', () => {
  beforeEach(() => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.mkdirSync).mockClear();
    vi.mocked(fs.writeFileSync).mockClear();
  });

  describe('buildMarkdown', () => {
    it('should include YAML frontmatter with title, date, and tags', () => {
      const issue = createBaseIssue();
      const markdown = buildMarkdown(issue);

      expect(markdown).toContain('---');
      expect(markdown).toContain('title: "The Gradient — 2024-01-01: Big AI Breakthrough"');
      expect(markdown).toContain('date: 2024-01-01');
      expect(markdown).toContain('tags:');
      expect(markdown).toContain('  - AI');
      expect(markdown).toContain('  - Research');
    });

    it('should include featured image in frontmatter when present', () => {
      const issue = createBaseIssue({ featuredImageUrl: 'https://example.com/featured.jpg' });
      const markdown = buildMarkdown(issue);

      expect(markdown).toContain('featuredImage: "https://example.com/featured.jpg"');
    });

    it('should omit featured image from frontmatter when absent', () => {
      const issue = createBaseIssue({ featuredImageUrl: undefined });
      const markdown = buildMarkdown(issue);

      expect(markdown).not.toContain('featuredImage');
    });

    it('should include intro paragraph', () => {
      const issue = createBaseIssue();
      const markdown = buildMarkdown(issue);

      expect(markdown).toContain("Welcome to today's newsletter about the latest in AI.");
    });

    it('should include article headline, summary, and source link', () => {
      const issue = createBaseIssue();
      const markdown = buildMarkdown(issue);

      expect(markdown).toContain('## Test AI Article');
      expect(markdown).toContain('A description of the AI breakthrough with some details.');
      expect(markdown).toContain('[Read more](https://example.com/ai-article)');
    });

    it('should include horizontal separator between stories', () => {
      const issue = createBaseIssue({
        articles: [
          createBaseArticle({ id: '1', title: 'First Article' }),
          createBaseArticle({ id: '2', title: 'Second Article' }),
        ],
      });
      const markdown = buildMarkdown(issue);

      expect(markdown).toContain('---');
    });

    it('should handle special characters in frontmatter by escaping quotes', () => {
      const issue = createBaseIssue({ title: 'Title with "quotes" and special chars' });
      const markdown = buildMarkdown(issue);

      expect(markdown).toContain('title: "Title with \\"quotes\\" and special chars"');
    });
  });

  describe('buildHtml', () => {
    it('should generate valid HTML with DOCTYPE and html tags', () => {
      const issue = createBaseIssue();
      const html = buildHtml(issue);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html lang="en">');
      expect(html).toContain('</html>');
    });

    it('should include the issue title in h1', () => {
      const issue = createBaseIssue();
      const html = buildHtml(issue);

      expect(html).toContain('<h1>The Gradient — 2024-01-01: Big AI Breakthrough</h1>');
    });

    it('should include the date', () => {
      const issue = createBaseIssue();
      const html = buildHtml(issue);

      expect(html).toContain('<div class="date">2024-01-01</div>');
    });

    it('should include the intro paragraph', () => {
      const issue = createBaseIssue();
      const html = buildHtml(issue);

      expect(html).toContain("Welcome to today&#039;s newsletter about the latest in AI.");
    });

    it('should include article content as HTML', () => {
      const issue = createBaseIssue();
      const html = buildHtml(issue);

      expect(html).toContain('<h2>Test AI Article</h2>');
      expect(html).toContain(
        '<a href="https://example.com/ai-article">Read more</a>'
      );
    });

    it('should include tags in footer', () => {
      const issue = createBaseIssue();
      const html = buildHtml(issue);

      expect(html).toContain('Tags: AI, Research');
    });

    it('should include featured image when present', () => {
      const issue = createBaseIssue({ featuredImageUrl: 'https://example.com/featured.jpg' });
      const html = buildHtml(issue);

      expect(html).toContain(
        '<img class="featured-image" src="https://example.com/featured.jpg"'
      );
    });

    it('should not include featured image when absent', () => {
      const issue = createBaseIssue({ featuredImageUrl: undefined });
      const html = buildHtml(issue);

      expect(html).not.toContain('featured-image');
    });

    it('should escape HTML special characters', () => {
      const issue = createBaseIssue({
        title: 'Title with <special> chars & "quotes"',
        intro: 'Intro with <b> tags',
      });
      const html = buildHtml(issue);

      expect(html).toContain('&lt;special&gt;');
      expect(html).toContain('&amp;');
      expect(html).not.toContain('<b>');
    });

    it('should include styled CSS', () => {
      const issue = createBaseIssue();
      const html = buildHtml(issue);

      expect(html).toContain('<style>');
      expect(html).toContain('font-family');
      expect(html).toContain('</style>');
    });
  });

  describe('markdownToHtml', () => {
    it('should convert headers to h1 through h6', () => {
      expect(markdownToHtml('# Heading 1')).toContain('<h1>Heading 1</h1>');
      expect(markdownToHtml('## Heading 2')).toContain('<h2>Heading 2</h2>');
      expect(markdownToHtml('###### Heading 6')).toContain('<h6>Heading 6</h6>');
    });

    it('should convert bold and italic text', () => {
      const html = markdownToHtml('**bold** and *italic*');
      expect(html).toContain('<strong>bold</strong>');
      expect(html).toContain('<em>italic</em>');
    });

    it('should convert inline code', () => {
      const html = markdownToHtml('`code`');
      expect(html).toContain('<code>code</code>');
    });

    it('should convert links', () => {
      const html = markdownToHtml('[text](url)');
      expect(html).toContain('<a href="url">text</a>');
    });

    it('should convert unordered lists', () => {
      const html = markdownToHtml('- item 1\n- item 2');
      expect(html).toContain('<ul>');
      expect(html).toContain('<li>item 1</li>');
      expect(html).toContain('<li>item 2</li>');
      expect(html).toContain('</ul>');
    });

    it('should convert horizontal rules', () => {
      const html = markdownToHtml('---');
      expect(html).toContain('<hr>');
    });

    it('should escape HTML special characters', () => {
      const html = markdownToHtml('<script>alert("xss")</script>');
      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
    });

    it('should wrap non-special lines in paragraphs', () => {
      const html = markdownToHtml('plain text');
      expect(html).toContain('<p>plain text</p>');
    });
  });

  describe('publish', () => {
    it('should write markdown and html files to the output directory', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const issue = createBaseIssue();
      const result = await publish(issue, { outputDir: 'posts' });

      expect(fs.mkdirSync).toHaveBeenCalledWith('posts', { recursive: true });
      expect(fs.writeFileSync).toHaveBeenCalledTimes(2);
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        path.join('posts', '2024-01-01.md'),
        expect.any(String),
        'utf-8'
      );
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        path.join('posts', '2024-01-01.html'),
        expect.any(String),
        'utf-8'
      );
      expect(result.mdPath).toBe(path.join('posts', '2024-01-01.md'));
      expect(result.htmlPath).toBe(path.join('posts', '2024-01-01.html'));
    });

    it('should use default output directory "posts" when not specified', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const issue = createBaseIssue();
      await publish(issue);

      expect(fs.mkdirSync).toHaveBeenCalledWith('posts', { recursive: true });
      expect(fs.writeFileSync).toHaveBeenCalledTimes(2);
    });

    it('should create the output directory if it does not exist', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      const issue = createBaseIssue();
      await publish(issue, { outputDir: 'output' });

      expect(fs.mkdirSync).toHaveBeenCalledWith('output', { recursive: true });
      expect(fs.writeFileSync).toHaveBeenCalledTimes(2);
    });
  });
});
