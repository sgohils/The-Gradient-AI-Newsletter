import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { Article, NewsletterIssue } from "@/types";

const CANDIDATE_POSTS_DIRS = [
  path.join(process.cwd(), "..", "posts"),
  path.join(process.cwd(), "posts"),
];

const POSTS_DIR = CANDIDATE_POSTS_DIRS.find((dir) => fs.existsSync(dir)) || CANDIDATE_POSTS_DIRS[0];

export function getAllIssueDates(): string[] {
  if (!fs.existsSync(POSTS_DIR)) {
    return [];
  }

  const files = fs.readdirSync(POSTS_DIR);
  const dates = files
    .filter((f) => f.endsWith(".md"))
    .map((f) => f.replace(/\.md$/, ""));

  return dates.sort((a, b) => b.localeCompare(a));
}

export function getIssueByDate(date: string): NewsletterIssue | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const filePath = path.join(POSTS_DIR, `${date}.md`);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    return parseIssueFile(filePath);
  } catch {
    console.error(`Failed to parse issue file: ${filePath}`);
    return null;
  }
}

export function readIssuesFromMarkdown(): NewsletterIssue[] {
  if (!fs.existsSync(POSTS_DIR)) {
    return [];
  }

  const files = fs.readdirSync(POSTS_DIR);
  const mdFiles = files.filter((f) => f.endsWith(".md"));

  const issues: NewsletterIssue[] = [];

  for (const file of mdFiles) {
    const filePath = path.join(POSTS_DIR, file);

    try {
      const issue = parseIssueFile(filePath);
      issues.push(issue);
    } catch (err) {
      console.error(`Failed to parse issue file: ${filePath}`, err);
    }
  }

  return issues.sort((a, b) => b.date.localeCompare(a.date));
}

const issueCache = new Map<string, { version: string; issue: NewsletterIssue }>();

function parseIssueFile(filePath: string): NewsletterIssue {
  const stat = fs.statSync(filePath);
  const version = `${stat.mtimeMs}:${stat.ctimeMs}:${stat.size}`;
  const cached = issueCache.get(filePath);
  if (cached?.version === version) return cached.issue;
  const raw = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(raw);

  const date = path.basename(filePath, ".md");
  const title = typeof data.title === "string" ? data.title : "Untitled";
  const tags: string[] = Array.isArray(data.tags) ? data.tags.filter((tag): tag is string => typeof tag === "string") : [];
  const featuredImageUrl = typeof data.featuredImage === "string" ? data.featuredImage : undefined;

  const publishedAt = new Date(date);
  const articles = parseArticles(content, date, publishedAt);
  const intro = extractIntro(content, articles.length > 0 ? articles[0].title : null);

  const issue: NewsletterIssue = {
    id: date,
    date,
    title,
    intro,
    articles,
    tags,
    featuredImageUrl,
    publishedAt,
  };
  issueCache.set(filePath, { version, issue });
  return issue;
}

function parseArticles(body: string, issueDate: string, publishedAt: Date): Article[] {
  const articleRegex = /^##\s+(.+)$/gm;
  const linkRegex = /\[Read more\]\(([^)]+)\)/;
  const articles: Article[] = [];

  const headings: { title: string; index: number }[] = [];
  let match;

  while ((match = articleRegex.exec(body)) !== null) {
    headings.push({ title: match[1].trim(), index: match.index });
  }

  for (let i = 0; i < headings.length; i++) {
    const sectionStart = headings[i].index;
    const sectionEnd = i + 1 < headings.length ? headings[i + 1].index : body.length;
    const section = body.slice(sectionStart, sectionEnd);

    const urlMatch = section.match(linkRegex);
    const url = urlMatch ? urlMatch[1] : "";

    const textBeforeLink = section
      .replace(linkRegex, "")
      .replace(/(?:\r?\n)*---\s*$/, "")
      .trim()
      .replace(/^##\s+.+$/m, "")
      .trim();

    const hostFromUrl = url ? extractHost(url) : "unknown-source";

    articles.push({
      id: `${issueDate}-${i}`,
      title: headings[i].title,
      url,
      description: textBeforeLink,
      publishedAt,
      sourceId: hostFromUrl.replace(/\./g, "-"),
      sourceName: hostFromUrl,
    });
  }

  return articles;
}

function extractHost(url: string): string {
  const withoutProtocol = url.replace(/^https?:\/\//, "");
  const host = withoutProtocol.split(/[?#/]/)[0];
  return host;
}

function extractIntro(body: string, firstArticleTitle: string | null): string {
  if (!body) return "";

  const endOfIntro =
    firstArticleTitle !== null
      ? body.indexOf(`## ${firstArticleTitle}`)
      : body.indexOf("## ");

  if (endOfIntro > 0) {
    return body.slice(0, endOfIntro).trim();
  }

  return body.trim();
}
