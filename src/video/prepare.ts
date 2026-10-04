import * as fs from 'fs';
import * as path from 'path';
import { loadConfig } from '../config';
import { fetchArticles } from '../fetcher/fetcher';
import { Article } from '../types';
import { buildVideoInput } from './input';
import { storyKey } from './selection';
import { assertIssueDate, readInput, writeJson } from './storage';
import { VideoInput } from './types';

interface NewsletterStory { rank: number; title: string; summary: string; sourceUrl: string }

function newsletterStories(markdown: string, issueDate: string): NewsletterStory[] {
  const header = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1];
  const date = header?.match(/^date:\s*["']?(\d{4}-\d{2}-\d{2})["']?\s*$/m)?.[1];
  if (date !== issueDate) throw new Error('Newsletter date does not match the requested video issue.');
  const stories = markdown.split(/^##\s+/m).slice(1).map((section, index) => {
    const titleEnd = section.indexOf('\n');
    // Read more is written by the publisher from the original article URL;
    // a URL inside a generated summary is not evidence of story identity.
    const source = section.match(/^\[Read more\]\((https?:\/\/\S+)\)[ \t]*$/m);
    if (titleEnd < 0 || !source || source.index === undefined) throw new Error('Newsletter story lacks its original Read more URL.');
    return { rank: index + 1, title: section.slice(0, titleEnd).trim(),
      summary: section.slice(titleEnd + 1, source.index).trim(), sourceUrl: source[1] };
  });
  if (!stories.length || stories.length > 25) throw new Error('Newsletter has no usable ranked stories.');
  return stories;
}

export interface PrepareOptions {
  issueDate: string;
  postsDir?: string;
  now?: Date;
  fetch?: () => Promise<Article[]>;
}

/** Recover only matching original RSS evidence; never rerun newsletter/email. */
export async function prepareVideoInput(options: PrepareOptions): Promise<{
  inputPath: string; input: VideoInput; recovered: boolean; missingStories: number;
}> {
  assertIssueDate(options.issueDate);
  const posts = path.resolve(options.postsDir || 'posts');
  const inputPath = path.join(posts, `${options.issueDate}.video.json`);
  if (fs.existsSync(inputPath)) {
    const input = readInput(inputPath);
    if (input.issueDate !== options.issueDate) throw new Error('Video input date does not match the requested issue.');
    return { inputPath, input, recovered: false, missingStories: 0 };
  }
  const newsletterPath = path.join(posts, `${options.issueDate}.md`);
  if (!fs.existsSync(newsletterPath)) {
    throw new Error(`No newsletter or video input exists for ${options.issueDate}. Use issue_date=sample for a fictional preview, or choose a published issue.`);
  }
  const stories = newsletterStories(fs.readFileSync(newsletterPath, 'utf8'), options.issueDate);
  const articles = await (options.fetch || (() => fetchArticles({ sources: loadConfig().sources,
    onError: (source) => console.warn(`[video:prepare] RSS unavailable: ${source.name}`),
  })))();
  const byUrl = new Map(articles.map(article => [storyKey(article.url), article]));
  const items = stories.flatMap(story => {
    const article = byUrl.get(storyKey(story.sourceUrl));
    // Do not promote rewritten newsletter text to original source evidence.
    if (!article?.sourceExcerpt?.trim()) return [];
    return [{ rank: story.rank, article, summary: { headline: story.title, intro: '',
      body: story.summary, sourceUrl: story.sourceUrl } }];
  });
  if (!items.length) {
    throw new Error(`Missing video input for ${options.issueDate}; its original stories are no longer available in the configured RSS feeds. Use issue_date=sample for a fictional preview, or choose an issue with a .video.json export. Newsletter delivery was not rerun.`);
  }
  const input = buildVideoInput(options.issueDate, items, options.now);
  input.stories.forEach((story, index) => { story.rank = items[index].rank; });
  writeJson(inputPath, input);
  return { inputPath, input, recovered: true, missingStories: stories.length - items.length };
}
