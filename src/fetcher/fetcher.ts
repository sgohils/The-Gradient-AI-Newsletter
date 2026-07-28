import Parser from 'rss-parser';
import { Article, Source } from '../types';
import { DEFAULT_SOURCES, getEnabledSources } from './sources';

let parserInstance: any = new Parser();

export function setParserInstance(instance: any): void {
  parserInstance = instance;
}

export interface FetchOptions {
  sources?: Source[];
  onError?: (source: Source, error: Error) => void;
}

export async function fetchArticles(options: FetchOptions = {}): Promise<Article[]> {
  const { sources, onError } = options;
  const enabledSources = getEnabledSources(sources && sources.length ? sources : DEFAULT_SOURCES);

  const results = await Promise.allSettled(
    enabledSources.map(async (source) => fetchSource(source, onError))
  );

  const articles = results
    .filter((result): result is PromiseFulfilledResult<Article[]> => result.status === 'fulfilled')
    .flatMap((result) => result.value);

  return deduplicateArticles(articles);
}

async function fetchSource(
  source: Source,
  onError?: (source: Source, error: Error) => void
): Promise<Article[]> {
  try {
    const feed = await parserInstance.parseURL(source.feedUrl);

    return (feed.items as any[]).map((item) => mapFeedItemToArticle(item, source));
  } catch (error) {
    onError?.(source, error as Error);
    return [];
  }
}

function mapFeedItemToArticle(item: any, source: Source): Article {
  const title = item.title || 'Untitled';
  const url = item.link || item.guid || `${source.feedUrl}#${encodeURIComponent(title)}`;
  const publishedAt = item.pubDate ? new Date(item.pubDate) : new Date();
  const description =
    item.contentSnippet || item.content || item.summary || '';

  return {
    id: `${source.id}-${encodeURIComponent(url)}`,
    title,
    url,
    description: description.length > 500 ? description.substring(0, 500) : description,
    publishedAt,
    sourceId: source.id,
    sourceName: source.name,
    category: source.category,
    author: item.creator || item.author || undefined,
  };
}

export function deduplicateArticles(articles: Article[]): Article[] {
  const seenUrls = new Set<string>();
  const seenTitles = new Set<string>();
  const result: Article[] = [];

  for (const article of articles) {
    const normalizedUrl = normalizeUrl(article.url);
    const normalizedTitle = normalizeTitle(article.title);

    if (seenUrls.has(normalizedUrl)) {
      continue;
    }

    const isDuplicateTitle = Array.from(seenTitles).some((seenTitle) =>
      isTitleSimilar(normalizedTitle, seenTitle)
    );

    if (isDuplicateTitle) {
      continue;
    }

    seenUrls.add(normalizedUrl);
    seenTitles.add(normalizedTitle);
    result.push(article);
  }

  return result;
}

function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.origin + parsed.pathname.replace(/\/$/, '');
  } catch {
    return url.toLowerCase().trim();
  }
}

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isTitleSimilar(a: string, b: string): boolean {
  if (a === b) {
    return true;
  }

  const wordsA = a.split(' ').filter((word) => word.length > 3);
  const wordsB = b.split(' ').filter((word) => word.length > 3);

  if (wordsA.length === 0 && wordsB.length === 0) {
    return a === b;
  }

  const setB = new Set(wordsB);
  const overlap = wordsA.filter((word) => setB.has(word)).length;
  const smaller = Math.min(wordsA.length, wordsB.length);

  return smaller > 0 && overlap / smaller >= 0.7;
}
