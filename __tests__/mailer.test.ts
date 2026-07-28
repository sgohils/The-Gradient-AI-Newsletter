import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendEmail, buildNewsletterHtml, buildNewsletterText } from '../src/mailer';
import axios from 'axios';
import { NewsletterIssue, Article } from '../src/types';

vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

const mockPost = vi.fn();
mockedAxios.post = mockPost;

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
  title: 'The Gradient — 2024-01-01',
  date: '2024-01-01',
  intro: 'Welcome to today\'s newsletter.',
  articles: [createBaseArticle()],
  tags: ['AI'],
  ...overrides,
});

describe('mailer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RESEND_API_KEY = 'test-api-key';
    process.env.MAILER_FROM_EMAIL = 'The Gradient <newsletter@thegradient.ai>';
  });

  describe('sendEmail', () => {
    it('should send email via Resend API', async () => {
      mockPost.mockResolvedValue({ data: { id: 'email-123' } });

      await sendEmail({
        to: ['user@example.com'],
        subject: 'Test Subject',
        html: '<p>Test</p>',
        text: 'Test',
      });

      expect(mockPost).toHaveBeenCalledWith(
        'https://api.resend.com/emails',
        expect.objectContaining({
          from: 'The Gradient <newsletter@thegradient.ai>',
          to: ['user@example.com'],
          subject: 'Test Subject',
        }),
        expect.any(Object)
      );
    });

    it('should throw error if RESEND_API_KEY is missing', async () => {
      delete process.env.RESEND_API_KEY;
      await expect(
        sendEmail({
          to: ['user@example.com'],
          subject: 'Test',
          html: '<p>Test</p>',
          text: 'Test',
        })
      ).rejects.toThrow('RESEND_API_KEY is not set');
    });
  });

  describe('buildNewsletterHtml', () => {
    it('should generate valid HTML email', () => {
      const issue = createBaseIssue();
      const html = buildNewsletterHtml(issue);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html lang="en">');
      expect(html).toContain('The Gradient — 2024-01-01');
      expect(html).toContain('Test AI Article');
      expect(html).toContain('https://example.com/ai-article');
      expect(html).toContain('{{unsubscribe_url}}');
    });

    it('should include featured image when present', () => {
      const issue = createBaseIssue({ featuredImageUrl: 'https://example.com/image.jpg' });
      const html = buildNewsletterHtml(issue);
      expect(html).toContain('https://example.com/image.jpg');
    });

    it('should escape HTML special characters', () => {
      const issue = createBaseIssue({ title: 'Title with <special> chars & "quotes"' });
      const html = buildNewsletterHtml(issue);
      expect(html).toContain('&lt;special&gt;');
      expect(html).toContain('&amp;');
    });
  });

  describe('buildNewsletterText', () => {
    it('should generate plain text email', () => {
      const issue = createBaseIssue();
      const text = buildNewsletterText(issue);

      expect(text).toContain('The Gradient — 2024-01-01');
      expect(text).toContain('Welcome to today\'s newsletter.');
      expect(text).toContain('## Test AI Article');
      expect(text).toContain('https://example.com/ai-article');
      expect(text).toContain('{{unsubscribe_url}}');
    });
  });
});
