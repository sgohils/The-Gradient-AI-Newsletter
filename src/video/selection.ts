import { VideoInput, VideoLedger, VideoStory } from './types';

export function storyKey(url: string): string {
  const parsed = new URL(url);
  parsed.hash = '';
  for (const key of [...parsed.searchParams.keys()]) {
    if (/^utm_/i.test(key) || /^(fbclid|gclid)$/i.test(key)) parsed.searchParams.delete(key);
  }
  parsed.searchParams.sort();
  parsed.hostname = parsed.hostname.replace(/^www\./i, '');
  return parsed.toString().replace(/\/$/, '');
}

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function isFreshPublication(publishedAt: string, now = new Date()): boolean {
  const age = now.getTime() - Date.parse(publishedAt);
  return Number.isFinite(age) && age >= -5 * 60000 && age <= 72 * 3600000;
}

/** Use original evidence, never benefits or figures from a rewritten summary. */
export function videoSuitability(story: VideoStory): { priority: number; reason: string } {
  const evidence = story.sourceExcerpt;
  const change = /\b(cuts?|cutting|reduc\w*|sav\w*|faster|cheaper|lower\w*|improv\w*)\b/i;
  const measurable = /\d[\d.,]*\s*(?:%|percent|minutes?|hours?|seconds?|times|million|billion)|[$£€]\s*\d/i;
  if (change.test(evidence) && measurable.test(evidence)) {
    return { priority: 3, reason: 'A source-backed, measurable change in time, cost, or capability.' };
  }
  if (/\b(guide|roundup|recap|opinion|interview|perspective)\b/i.test(story.title)) {
    return { priority: 0, reason: 'Guide or commentary; lower priority than a concrete development.' };
  }
  if (/\b(lets?|allows?|enables?|can|helps?)\b/i.test(evidence) &&
      /\b(build|work|creat\w*|run|compar\w*|learn|us\w*|protect\w*|access|patients?|students?|workers?)\b/i.test(evidence)) {
    return { priority: 3, reason: 'A concrete capability or everyday consequence in the original evidence.' };
  }
  if (/\b(releas\w*|launch\w*|introduc\w*|announc\w*|publish\w*|findings|research|legislation|regulat\w*)\b/i.test(evidence)) {
    return { priority: 2, reason: 'A substantive release, finding, or policy development.' };
  }
  return { priority: 1, reason: 'Fresh AI news with original evidence; no clearer video angle found.' };
}

export function assessStoryCandidates(input: VideoInput, ledger: VideoLedger, now = new Date()): {
  stories: VideoStory[]; reason: string;
} {
  const age = now.getTime() - Date.parse(input.generatedAt);
  if (!Number.isFinite(age) || age < -5 * 60000 || age > 72 * 3600000) {
    return { stories: [], reason: 'Video input is expired or has an invalid/future generation time; use a current issue.' };
  }
  // Once a date is selected, a changed newsletter cannot silently change its video.
  const selected = ledger.issues[input.issueDate]?.story;
  const used = new Set(Object.entries(ledger.issues)
    .filter(([date]) => date !== input.issueDate)
    .map(([, entry]) => storyKey(entry.story.sourceUrl)));
  const candidates = selected ? [selected] : [...input.stories].sort((a, b) =>
    videoSuitability(b).priority - videoSuitability(a).priority || a.rank - b.rank || a.id.localeCompare(b.id, 'en'));
  const rejected = { stale: 0, unknownOrFuture: 0, used: 0, insufficientEvidence: 0 };
  const stories = candidates.filter((story) => {
    const age = now.getTime() - Date.parse(story.publishedAt);
    if (!Number.isFinite(age) || age < -5 * 60000) { rejected.unknownOrFuture++; return false; }
    if (age > 72 * 3600000) { rejected.stale++; return false; }
    if (used.has(storyKey(story.sourceUrl))) { rejected.used++; return false; }
    if (wordCount(story.sourceExcerpt) < 60) { rejected.insufficientEvidence++; return false; }
    return true;
  });
  return { stories, reason: `No fresh, unused story with enough original source evidence. Checked ${candidates.length}: ` +
    `${rejected.stale} older than 72 hours, ${rejected.unknownOrFuture} with unknown/future dates, ` +
    `${rejected.used} already used, ${rejected.insufficientEvidence} with fewer than 60 source words.` };
}

export function selectStory(input: VideoInput, ledger: VideoLedger, now = new Date()): VideoStory | undefined {
  return assessStoryCandidates(input, ledger, now).stories[0];
}
