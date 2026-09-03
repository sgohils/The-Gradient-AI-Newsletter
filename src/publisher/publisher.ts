import * as fs from 'fs';
import * as path from 'path';
import { NewsletterIssue } from '../types';
import { markdownToHtml } from './renderer';
import { generateIssueImage, ImageModel } from './image-generator';

export interface PublisherOptions {
  outputDir?: string;
  generateFeaturedImage?: boolean;
  imageModel?: ImageModel;
}

export function buildMarkdown(issue: NewsletterIssue): string {
  const frontmatter = buildFrontmatter(issue);
  const body = buildMarkdownBody(issue);
  return `${frontmatter}\n\n${body}`;
}

export function buildHtml(issue: NewsletterIssue): string {
  const date = issue.date;
  const bodyHtml = buildHtmlBody(issue);
  const renderedContent = markdownToHtml(bodyHtml);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(issue.title)}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #1a1a1a;
      max-width: 720px;
      margin: 0 auto;
      padding: 2rem 1rem;
      background: #fefefe;
    }
    header {
      border-bottom: 2px solid #1a1a1a;
      padding-bottom: 1rem;
      margin-bottom: 2rem;
    }
    h1 {
      font-size: 1.75rem;
      line-height: 1.2;
      margin: 0 0 0.5rem 0;
    }
    .date {
      color: #666;
      font-size: 0.9rem;
    }
    .intro {
      font-size: 1.1rem;
      color: #333;
      margin-bottom: 2rem;
    }
    .story {
      margin-bottom: 2rem;
      padding-bottom: 1.5rem;
      border-bottom: 1px solid #e5e5e5;
    }
    .story:last-child {
      border-bottom: none;
    }
    .story h2 {
      font-size: 1.25rem;
      margin: 0 0 0.5rem 0;
    }
    .story p {
      margin: 0 0 0.5rem 0;
    }
    .story a {
      color: #2563eb;
      text-decoration: none;
    }
    .story a:hover {
      text-decoration: underline;
    }
    .meta {
      font-size: 0.85rem;
      color: #666;
      margin-top: 0.5rem;
    }
    footer {
      margin-top: 3rem;
      padding-top: 1rem;
      border-top: 1px solid #e5e5e5;
      font-size: 0.85rem;
      color: #888;
    }
    ${issue.featuredImageUrl ? `.featured-image { width: 100%; height: auto; margin-bottom: 2rem; border-radius: 8px; }` : ''}
  </style>
</head>
<body>
  <header>
    <h1>${escapeHtml(issue.title)}</h1>
    <div class="date">${escapeHtml(date)}</div>
  </header>
  ${issue.featuredImageUrl ? `<img class="featured-image" src="${escapeHtml(issue.featuredImageUrl)}" alt="Featured image">` : ''}
  <p class="intro">${escapeHtml(issue.intro)}</p>
  <main>
    ${renderedContent}
  </main>
  <footer>
    <p>Tags: ${escapeHtml(issue.tags.join(', '))}</p>
  </footer>
</body>
</html>`;
}

export async function publish(
  issue: NewsletterIssue,
  options: PublisherOptions = {}
): Promise<{ mdPath: string; htmlPath: string; featuredImageUrl?: string }> {
  const outputDir = options.outputDir || 'posts';

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const baseName = issue.date;
  const mdPath = path.join(outputDir, `${baseName}.md`);
  const htmlPath = path.join(outputDir, `${baseName}.html`);

  const generateFeaturedImage = options.generateFeaturedImage
    ?? process.env.GRADIENT_IMAGE_GEN !== 'off';

  if (!issue.featuredImageUrl && generateFeaturedImage) {
    try {
      const generated = await generateIssueImage(issue, {
        model: options.imageModel,
      });
      if (generated) {
        issue.featuredImageUrl = generated;
      }
    } catch (err) {
      console.warn(`[publisher] Image generation skipped:`, err);
    }
  }

  const markdown = buildMarkdown(issue);
  const html = buildHtml(issue);

  fs.writeFileSync(mdPath, markdown, 'utf-8');
  fs.writeFileSync(htmlPath, html, 'utf-8');

  return { mdPath, htmlPath, featuredImageUrl: issue.featuredImageUrl };
}

function buildFrontmatter(issue: NewsletterIssue): string {
  const lines: string[] = ['---'];
  lines.push(`title: "${escapeYaml(issue.title)}"`);
  lines.push(`date: ${issue.date}`);
  lines.push(`tags:`);
  for (const tag of issue.tags) {
    lines.push(`  - ${escapeYaml(tag)}`);
  }
  if (issue.featuredImageUrl) {
    lines.push(`featuredImage: "${escapeYaml(issue.featuredImageUrl)}"`);
  }
  lines.push('---');
  return lines.join('\n');
}

function buildMarkdownBody(issue: NewsletterIssue): string {
  const parts: string[] = [issue.intro, ''];

  for (const article of issue.articles) {
    parts.push(`## ${article.title}`);
    parts.push('');
    parts.push(article.description || '');
    parts.push('');
    parts.push(`[Read more](${article.url})`);
    parts.push('');
    parts.push('---');
    parts.push('');
  }

  return parts.join('\n');
}

function buildHtmlBody(issue: NewsletterIssue): string {
  const parts: string[] = [];

  for (const article of issue.articles) {
    parts.push(`## ${article.title}`);
    parts.push('');
    parts.push(article.description || '');
    parts.push('');
    parts.push(`[Read more](${article.url})`);
    parts.push('');
    parts.push('---');
    parts.push('');
  }

  return parts.join('\n');
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeYaml(text: string): string {
  return text.replace(/"/g, '\\"');
}
