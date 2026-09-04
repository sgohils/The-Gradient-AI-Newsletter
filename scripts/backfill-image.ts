/**
 * Backfill: regenerate the featured image for a given issue date from its
 * existing .md and .html files. Also updates the markdown frontmatter and
 * HTML body to reference the generated image.
 *
 * Usage:  npm run backfill-image -- 2026-09-03
 *         npm run backfill-image -- 2026-09-03 --api-key <key>
 *         (without --api-key, uses PIXAZ_API_KEY env var)
 */
import { generateIssueImage } from '../src/publisher/image-generator';
import type { NewsletterIssue, Article } from '../src/types';
import * as fs from 'fs';
import * as path from 'path';

interface Args {
  date: string;
  apiKey?: string;
  outputDir: string;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { date: '', outputDir: path.join(process.cwd(), 'web', 'public', 'issue-images') };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--api-key' && i + 1 < argv.length) {
      args.apiKey = argv[++i];
    } else if (a === '--output-dir' && i + 1 < argv.length) {
      args.outputDir = argv[++i];
    } else if (!args.date) {
      args.date = a;
    }
  }
  if (!args.date) {
    console.error('Usage: npm run backfill-image -- <YYYY-MM-DD> [--api-key <key>]');
    process.exit(2);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(args.date)) {
    console.error(`Invalid date: ${args.date} (expected YYYY-MM-DD)`);
    process.exit(2);
  }
  return args;
}

interface Frontmatter { data: Record<string, unknown>; body: string }

function parseFrontmatter(content: string): Frontmatter {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { data: {}, body: content };
  const data: Record<string, unknown> = {};
  const lines = match[1].split(/\r?\n/);
  let listKey: string | null = null;
  let list: string[] | null = null;
  for (const line of lines) {
    const li = line.match(/^\s+-\s+(.+)$/);
    if (li && list) { list.push(li[1].replace(/^["']|["']$/g, '')); continue; }
    if (list && listKey) { data[listKey] = list; list = null; listKey = null; }
    const kv = line.match(/^([\w]+):\s*(.*)$/);
    if (!kv) continue;
    const v = kv[2].trim();
    if (v === '') { listKey = kv[1]; list = []; }
    else data[kv[1]] = v.replace(/^["']|["']$/g, '');
  }
  if (list && listKey) data[listKey] = list;
  return { data, body: match[2] };
}

function buildIssue(mdPath: string, htmlPath: string, date: string): NewsletterIssue {
  if (!fs.existsSync(mdPath)) throw new Error(`Markdown not found: ${mdPath}`);
  if (!fs.existsSync(htmlPath)) throw new Error(`HTML not found: ${htmlPath}`);
  const md = fs.readFileSync(mdPath, 'utf-8');
  const { data } = parseFrontmatter(md);

  const tags = Array.isArray(data.tags) ? (data.tags as string[]) : [];
  const introMatch = md.match(/\r?\n\r?\n(.*?)\r?\n\r?\n##/s);
  const intro = introMatch ? introMatch[1].trim() : '';

  const articleMatches = Array.from(md.matchAll(/^## (.+)$/gm));
  const articles: Article[] = articleMatches.map((m) => {
    const t = m[1].trim();
    return {
      id: `a-${t.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}`,
      title: t,
      url: '',
      publishedAt: new Date(date),
      sourceId: 'arxiv',
      sourceName: 'arXiv',
    };
  });

  const existing = typeof data.featuredImage === 'string' ? data.featuredImage : undefined;
  return {
    id: `gradient-${date}`,
    title: String(data.title ?? `The Gradient — ${date}`),
    date,
    intro,
    articles,
    tags,
    featuredImageUrl: existing,
  };
}

function writeFrontmatter(issue: NewsletterIssue, body: string): string {
  const lines: string[] = ['---'];
  lines.push(`title: "${String(issue.title).replace(/"/g, '\\"')}"`);
  lines.push(`date: ${issue.date}`);
  if (issue.tags.length > 0) {
    lines.push('tags:');
    for (const tag of issue.tags) lines.push(`  - ${tag}`);
  } else {
    lines.push('tags: []');
  }
  if (issue.featuredImageUrl) {
    lines.push(`featuredImage: "${issue.featuredImageUrl}"`);
  }
  lines.push('---');
  return `${lines.join('\n')}\n${body}`;
}

async function main() {
  const args = parseArgs(process.argv);
  const mdPath = path.join('posts', `${args.date}.md`);
  const htmlPath = path.join('posts', `${args.date}.html`);

  console.log(`[backfill] Date: ${args.date}`);
  const issue = buildIssue(mdPath, htmlPath, args.date);
  console.log(`[backfill] Issue: ${issue.title}`);
  console.log(`[backfill] Articles: ${issue.articles.length}, tags: ${issue.tags.join(', ') || '(none)'}`);
  console.log(`[backfill] Existing featuredImage: ${issue.featuredImageUrl ?? '(none)'}`);

  const apiKey = args.apiKey ?? process.env.PIXAZ_API_KEY;
  if (!apiKey) {
    console.error('[backfill] ERROR: PIXAZ_API_KEY is not set. Pass --api-key <key> or set the env var.');
    process.exit(1);
  }

  console.log(`[backfill] Generating image...`);
  const url = await generateIssueImage(issue, {
    outputDir: args.outputDir,
    apiKey,
  });
  if (!url) {
    console.error('[backfill] Image generation failed.');
    process.exit(1);
  }
  console.log(`[backfill] Image URL: ${url}`);

  const filePath = path.join(args.outputDir, `${args.date}.png`);
  if (fs.existsSync(filePath)) {
    const stat = fs.statSync(filePath);
    console.log(`[backfill] File: ${filePath} (${stat.size} bytes)`);
  }

  console.log(`[backfill] Updating ${mdPath}...`);
  const mdOriginal = fs.readFileSync(mdPath, 'utf-8');
  const { body } = parseFrontmatter(mdOriginal);
  const updatedIssue: NewsletterIssue = { ...issue, featuredImageUrl: url };
  const newMd = writeFrontmatter(updatedIssue, body);
  fs.writeFileSync(mdPath, newMd, 'utf-8');
  console.log(`[backfill] Markdown updated.`);

  console.log(`[backfill] Updating ${htmlPath}...`);
  const htmlOriginal = fs.readFileSync(htmlPath, 'utf-8');
  const styleLine = '.featured-image { width: 100%; height: auto; margin-bottom: 2rem; border-radius: 8px; }';
  const imgTag = `<img class="featured-image" src="${url}" alt="Featured image for ${updatedIssue.title}">`;
  let newHtml = htmlOriginal;
  if (!newHtml.includes(styleLine)) {
    newHtml = newHtml.replace('</style>', `    ${styleLine}\n  </style>`);
  }
  if (!newHtml.includes('class="featured-image"')) {
    newHtml = newHtml.replace('<p class="intro">', `${imgTag}\n  <p class="intro">`);
  }
  fs.writeFileSync(htmlPath, newHtml, 'utf-8');
  console.log(`[backfill] HTML updated.`);

  console.log(`[backfill] Done.`);
}

main().catch((err) => {
  console.error('[backfill] FAILED:', err);
  process.exit(1);
});
