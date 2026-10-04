import { Article, Summary } from '../types';
import { curate } from '../curator';
import { plainText } from '../text';
import { isFreshPublication, storyKey, wordCount } from './selection';
import { VideoInput } from './types';

export { plainText } from '../text';

function publicationTime(article: Article): string {
  if (article.sourcePublishedAt !== undefined) {
    return Number.isFinite(Date.parse(article.sourcePublishedAt)) ? new Date(article.sourcePublishedAt).toISOString() : '';
  }
  return Number.isFinite(article.publishedAt.getTime()) ? article.publishedAt.toISOString() : '';
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
      publishedAt: publicationTime(article),
      sourceExcerpt: plainText(article.sourceExcerpt || article.content || article.description || '').slice(0, 20000),
      summary: summary.body,
    })),
  };
}

/** Prefer newsletter stories, then consider other fresh, relevant feed articles.
 * Additional candidates use original evidence without extra summary API calls.
 */
export function buildDailyVideoInput(
  issueDate: string,
  items: { article: Article; summary: Summary }[],
  articles: Article[],
  now = new Date(),
): VideoInput {
  const input = buildVideoInput(issueDate, items, now);
  const seen = new Set<string>();
  const validKey = (url: string): string | undefined => {
    try {
      if (!/^https?:$/.test(new URL(url).protocol)) return undefined;
      return storyKey(url);
    } catch { return undefined; }
  };
  input.stories = input.stories.filter(story => {
    const key = validKey(story.sourceUrl);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 25);

  const eligible = articles.filter(article => {
    const key = validKey(article.url);
    return key && !seen.has(key) && isFreshPublication(publicationTime(article), now) &&
      wordCount(plainText(article.sourceExcerpt || article.content || article.description || '').slice(0, 20000)) >= 60;
  });
  const fallback = curate(eligible, { rules: { maxStories: 25 } });
  for (const story of buildVideoInput(issueDate, fallback.map(article => ({
    article, summary: { headline: article.title, intro: '', body: '', sourceUrl: article.url },
  })), now).stories) {
    const key = validKey(story.sourceUrl);
    if (input.stories.length >= 25) break;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    input.stories.push(story);
  }
  input.stories.forEach((story, rank) => { story.rank = rank + 1; });
  return input;
}
