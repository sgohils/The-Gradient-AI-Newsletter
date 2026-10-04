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

export function selectStory(input: VideoInput, ledger: VideoLedger, now = new Date()): VideoStory | undefined {
  const age = now.getTime() - Date.parse(input.generatedAt);
  if (age < -5 * 60000 || age > 72 * 3600000) return undefined;
  // Once a date is selected, a changed newsletter cannot silently change its video.
  const selected = ledger.issues[input.issueDate]?.story;
  const used = new Set(Object.entries(ledger.issues)
    .filter(([date]) => date !== input.issueDate)
    .map(([, entry]) => storyKey(entry.story.sourceUrl)));
  const candidates = selected ? [selected] : [...input.stories].sort((a, b) => a.rank - b.rank);
  return candidates.find((story) => {
    const ageHours = (now.getTime() - Date.parse(story.publishedAt)) / 3600000;
    return Number.isFinite(ageHours) && ageHours >= -5 / 60 && ageHours <= 72 &&
      !used.has(storyKey(story.sourceUrl)) && wordCount(story.sourceExcerpt) >= 60;
  });
}
