import axios from 'axios';
import { NewsletterIssue } from '../types';

export interface SendEmailOptions {
  to: string[];
  subject: string;
  html: string;
  text: string;
}

export async function sendEmail({ to, subject, html, text }: SendEmailOptions): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not set');
  }

  const from = process.env.MAILER_FROM_EMAIL || 'The Gradient <newsletter@thegradient.ai>';

  await axios.post(
    'https://api.resend.com/emails',
    {
      from,
      to,
      subject,
      html,
      text,
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    }
  );
}

export function buildNewsletterHtml(issue: NewsletterIssue): string {
  const bodyHtml = issue.articles
    .map(
      (article) => `
    <tr>
      <td style="padding: 0 0 24px 0;">
        <h2 style="margin: 0 0 8px 0; font-size: 1.25rem; line-height: 1.3; color: #1a1a1a;">
          <a href="${escapeHtml(article.url)}" style="color: #2563eb; text-decoration: none;">${escapeHtml(article.title)}</a>
        </h2>
        <p style="margin: 0 0 8px 0; color: #444; line-height: 1.6;">${escapeHtml(article.description || '')}</p>
        <p style="margin: 0; font-size: 0.85rem; color: #666;">
          <a href="${escapeHtml(article.url)}" style="color: #2563eb; text-decoration: none;">Read more</a>
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding: 0 0 24px 0; border-bottom: 1px solid #e5e5e5;"></td>
    </tr>
  `
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(issue.title)}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 720px; margin: 0 auto; padding: 2rem 1rem; background: #fefefe;">
  <header style="border-bottom: 2px solid #1a1a1a; padding-bottom: 1rem; margin-bottom: 2rem;">
    <h1 style="font-size: 1.75rem; line-height: 1.2; margin: 0 0 0.5rem 0;">${escapeHtml(issue.title)}</h1>
    <div style="color: #666; font-size: 0.9rem;">${escapeHtml(issue.date)}</div>
  </header>
  ${issue.featuredImageUrl ? `<img src="${escapeHtml(issue.featuredImageUrl)}" alt="Featured image" style="width: 100%; max-width: 720px; height: auto; margin-bottom: 2rem; border-radius: 8px;" />` : ''}
  <p style="font-size: 1.1rem; color: #333; margin-bottom: 2rem;">${escapeHtml(issue.intro)}</p>
  <main>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
      ${bodyHtml}
    </table>
  </main>
  <footer style="margin-top: 3rem; padding-top: 1rem; border-top: 1px solid #e5e5e5; font-size: 0.85rem; color: #888;">
    <p>Tags: ${escapeHtml(issue.tags.join(', '))}</p>
    <p style="margin-top: 1rem;">
      <a href="{{unsubscribe_url}}" style="color: #888; text-decoration: underline;">Unsubscribe</a>
    </p>
  </footer>
</body>
</html>`;
}

export function buildNewsletterText(issue: NewsletterIssue): string {
  const lines: string[] = [issue.title, `Date: ${issue.date}`, '', issue.intro, ''];

  for (const article of issue.articles) {
    lines.push(`## ${article.title}`);
    lines.push('');
    lines.push(article.description || '');
    lines.push('');
    lines.push(`Read more: ${article.url}`);
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  lines.push(`Tags: ${issue.tags.join(', ')}`);
  lines.push('');
  lines.push('Unsubscribe: {{unsubscribe_url}}');

  return lines.join('\n');
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
