import * as fs from 'fs';
import * as path from 'path';
import { plainText } from '../text';
import { assertIssueDate, sha256, writeJson } from '../video/storage';

export interface LinkedInPost {
  version: 1;
  issueDate: string;
  issueUrl: string;
  content: string;
  contentHash: string;
}

function text(value: string): string {
  return plainText(value.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\*\*|`/g, ''));
}

function shorten(value: string, limit: number): string {
  if (value.length <= limit) return value;
  const slice = value.slice(0, limit - 1);
  const boundary = slice.lastIndexOf(' ');
  return `${slice.slice(0, boundary > limit * 0.6 ? boundary : slice.length).trimEnd()}…`;
}

export function issueUrl(baseUrl: string, issueDate: string): string {
  assertIssueDate(issueDate);
  let base: URL;
  try { base = new URL(baseUrl); }
  catch { throw new Error('NEWSLETTER_BASE_URL must be the public HTTPS URL of your newsletter.'); }
  if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash ||
      /^(localhost|127\..*|\[::1\])$/i.test(base.hostname) || base.hostname.endsWith('.local')) {
    throw new Error('NEWSLETTER_BASE_URL must be a public HTTPS URL without credentials, query, or fragment.');
  }
  base.pathname = `${base.pathname.replace(/\/+$/, '')}/`;
  const url = new URL(`archive/${issueDate}`, base).href;
  if (url.length > 500) throw new Error('Newsletter URL is too long for the LinkedIn post.');
  return url;
}

/** Reuses the published edition; no feeds, LLM calls, email, or video dependencies. */
export function buildLinkedInPost(markdown: string, date: string, baseUrl: string): LinkedInPost {
  assertIssueDate(date);
  const frontmatter = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!frontmatter || !new RegExp(`^date: ${date}\\r?$`, 'm').test(frontmatter[1])) {
    throw new Error('Newsletter Markdown belongs to a different date or is missing frontmatter.');
  }
  const url = issueUrl(baseUrl, date);
  const stories = markdown.slice(frontmatter[0].length).split(/^##\s+/m).slice(1).slice(0, 3).map((section, index) => {
    const [heading, ...bodyLines] = section.split(/\r?\n/);
    const body = bodyLines.join('\n');
    const source = body.match(/\[Read more\]\((https?:\/\/[^\s)]+)\)/)?.[1];
    if (!source || !text(heading)) throw new Error('Newsletter story is incomplete; a headline and Read more source are required.');
    const happened = body.match(/\*\*What happened:\*\*\s*([\s\S]*?)(?=\*\*(?:Why it matters|Key stats|Source):|\[Read more\]|\n---|$)/)?.[1];
    const fallback = body.split(/\[Read more\]|\n---/)[0].trim().split(/\n\s*\n/)[0];
    const summary = shorten(text(happened || fallback), 320);
    if (!summary) throw new Error('Newsletter story has no summary.');
    return `${index + 1}. ${shorten(text(heading), 180)}\n${summary}`;
  });
  if (!stories.length) throw new Error('Newsletter has no stories for LinkedIn.');
  const content = [
    `Today's AI briefing from The Gradient | ${date}`,
    ...stories,
    `Read the full briefing and original sources:\n${url}`,
    '#AI #ArtificialIntelligence #TheGradient',
  ].join('\n\n');
  if (content.length > 3000) throw new Error('LinkedIn post exceeds 3,000 characters.');
  return { version: 1, issueDate: date, issueUrl: url, content, contentHash: sha256(content) };
}

export function prepareLinkedInPost(options: { issueDate: string; baseUrl: string; postsDir?: string; outputDir?: string }): LinkedInPost {
  assertIssueDate(options.issueDate);
  const source = path.join(options.postsDir || 'posts', `${options.issueDate}.md`);
  if (!fs.existsSync(source)) throw new Error(`Missing newsletter: ${source}. Publish the edition first.`);
  if (fs.statSync(source).size > 2 * 1024 * 1024) throw new Error('Newsletter exceeds its size limit.');
  const post = buildLinkedInPost(fs.readFileSync(source, 'utf8'), options.issueDate, options.baseUrl);
  writeLinkedInPreview(post, options.outputDir);
  return post;
}

export function writeLinkedInPreview(post: LinkedInPost, outputDir = 'linkedin-output'): void {
  const directory = path.join(outputDir, post.issueDate);
  writeJson(path.join(directory, 'post.json'), post);
  fs.writeFileSync(path.join(directory, 'post.txt'), `${post.content}\n`, 'utf8');
}
