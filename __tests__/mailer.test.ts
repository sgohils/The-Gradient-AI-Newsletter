import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendEmail, buildNewsletterHtml, buildNewsletterText, addResendSubscriber, removeResendSubscriber, getResendSubscribers } from '../src/mailer';
import axios from 'axios';
import { NewsletterIssue, Article } from '../src/types';

vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

const mockPost = vi.fn();
const mockGet = vi.fn();
const mockDelete = vi.fn();
mockedAxios.post = mockPost;
mockedAxios.get = mockGet;
mockedAxios.delete = mockDelete;

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

  describe('addResendSubscriber', () => {
    it('should add a subscriber via Resend API', async () => {
      mockPost.mockResolvedValue({ data: { id: 'contact-123' } });

      const subscriber = await addResendSubscriber('new@example.com');

      expect(mockPost).toHaveBeenCalledWith(
        'https://api.resend.com/contacts',
        expect.objectContaining({
          email: 'new@example.com',
          firstName: 'new',
        }),
        expect.any(Object)
      );
      expect(subscriber.email).toBe('new@example.com');
      expect(subscriber.token).toBeDefined();
    });

    it('should throw error if RESEND_API_KEY is missing', async () => {
      delete process.env.RESEND_API_KEY;
      await expect(addResendSubscriber('test@example.com')).rejects.toThrow('RESEND_API_KEY is not set');
    });
  });

  describe('removeResendSubscriber', () => {
    it('should remove a subscriber via Resend API', async () => {
      mockGet.mockResolvedValue({ data: { data: [{ email: 'test@example.com' }] } });
      mockDelete.mockResolvedValue({});

      const result = await removeResendSubscriber('test@example.com');

      expect(mockGet).toHaveBeenCalledWith(
        'https://api.resend.com/contacts',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-api-key',
          }),
          params: { email: 'test@example.com' },
        })
      );
      expect(mockDelete).toHaveBeenCalledWith(
        expect.stringContaining('contacts/'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-api-key',
          }),
        })
      );
      expect(result).toBe(true);
    });

    it('should return false if removal fails', async () => {
      mockGet.mockRejectedValue(new Error('Not found'));

      const result = await removeResendSubscriber('missing@example.com');

      expect(result).toBe(false);
    });
  });

  describe('getResendSubscribers', () => {
    it('should fetch subscribers from Resend API', async () => {
      mockGet.mockResolvedValue({
        data: {
          data: [
            { email: 'user1@example.com', createdAt: '2024-01-01T00:00:00Z' },
            { email: 'user2@example.com', createdAt: '2024-01-02T00:00:00Z' },
          ],
        },
      });

      const subscribers = await getResendSubscribers();

      expect(mockGet).toHaveBeenCalledWith('https://api.resend.com/contacts', {
        headers: {
          Authorization: 'Bearer test-api-key',
        },
      });
      expect(subscribers).toHaveLength(2);
      expect(subscribers[0].email).toBe('user1@example.com');
      expect(subscribers[1].email).toBe('user2@example.com');
    });

    it('should return empty array if RESEND_API_KEY is missing', async () => {
      delete process.env.RESEND_API_KEY;
      const subscribers = await getResendSubscribers();
      expect(subscribers).toEqual([]);
    });

    it('should return empty array on API error', async () => {
      mockGet.mockRejectedValue(new Error('API error'));
      const subscribers = await getResendSubscribers();
      expect(subscribers).toEqual([]);
    });
  });
});
