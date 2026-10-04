import * as cheerio from 'cheerio';
import { Article, Summary } from '../types';
import { VideoInput } from './types';

export function plainText(value: string): string {
  const $ = cheerio.load(value);
  $('script,style,noscript').remove();
  $('p,div,li,br,h1,h2,h3').each((_index, element) => { $(element).append(' '); });
  return $.root().text().replace(/\s+/g, ' ').trim();
}

export function buildVideoInput(
  issueDate: string,
  items: { article: Article; summary: Summary }[],
  now = new Date(),
): VideoInput {
  return {
    version: 1,
    issueDate,
    generatedAt: now.toISOString(),
    stories: items.map(({ article, summary }, rank) => ({
      id: article.id,
      rank: rank + 1,
      title: plainText(article.title),
      sourceUrl: article.url,
      sourceName: article.sourceName,
      publishedAt: article.sourcePublishedAt !== undefined ?
        (Number.isFinite(Date.parse(article.sourcePublishedAt)) ? new Date(article.sourcePublishedAt).toISOString() : '') :
        (Number.isFinite(article.publishedAt.getTime()) ? article.publishedAt.toISOString() : ''),
      sourceExcerpt: plainText(article.sourceExcerpt || article.content || article.description || '').slice(0, 20000),
      summary: summary.body,
    })),
  };
}
