import { NarrationTiming, VideoScript, VideoStory, VideoStoryboard, VisualAsset } from './types';
import { validateShortScript } from './short-script';
import { captionChunks } from './captions';
import { graphicTheme, numericCallout } from './graphics';

const normalized = (text: string) => text.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');

export function buildPhotoStoryboard(story: VideoStory, script: VideoScript, timing: NarrationTiming,
  assets: VisualAsset[], beatSeconds: 2 | 3 = 3): VideoStoryboard {
  validateShortScript(story, script); captionChunks(timing);
  if (assets.length < 2 || assets.some(asset => !asset.file || !asset.sha256)) throw new Error('A photo storyboard needs licensed real assets.');
  if (normalized(timing.words.map(word => word.text).join(' ')) !== normalized(script.narration)) throw new Error('Timed words differ from the script.');
  const text = normalized(script.narration);
  let offset = 0;
  const spans = timing.words.map(word => { const start = offset; offset += normalized(word.text).length; return { ...word, from: start, to: offset }; });
  let cursor = 0;
  const sentenceStarts = script.sentences.map(sentence => {
    const found = text.indexOf(normalized(sentence.text), cursor); cursor = found + normalized(sentence.text).length;
    const span = spans.find(word => word.from <= found && word.to > found);
    if (found < 0 || !span) throw new Error('Sentence has no narration timing.');
    return span.start;
  });
  const count = Math.max(8, Math.min(12, Math.round(timing.duration / beatSeconds)));
  const boundaries = [0];
  for (let i = 1; i < count; i++) {
    const target = timing.duration * i / count;
    const words = spans.filter(word => word.start > boundaries.at(-1)! + 1.5 && word.start < timing.duration - 1.5);
    const closest = words.reduce<typeof spans[number] | undefined>((best, word) =>
      !best || Math.abs(word.start - target) < Math.abs(best.start - target) ? word : best, undefined);
    if (closest) boundaries.push(closest.start);
  }
  boundaries.push(timing.duration);
  const scenes = boundaries.slice(0, -1).map((start, index) => {
    const end = boundaries[index + 1];
    const sentenceIndex = sentenceStarts.reduce((last, time, position) => time <= start + 0.05 ? position : last, 0);
    const sentence = script.sentences[sentenceIndex];
    // Keep each headline a complete edited phrase. A visual cut may cross a
    // spoken sentence boundary; concatenating those words produces fragments.
    const displayText = sentence.displayText!;
    const callout = numericCallout(sentence.text);
    return { start, end, label: sentence.role === 'hook' ? 'THE BIG IDEA' : sentence.role === 'takeaway' ? 'THE TAKEAWAY' : 'WHAT CHANGED',
      theme: graphicTheme(sentence.text), text: sentence.text, displayText, excerpt: false,
      kind: index === 0 ? 'headline' as const : 'detail' as const, variant: index,
      assetId: assets[index % assets.length].id,
      motion: (['push', 'pan-left', 'pan-right'] as const)[index % 3], ...(callout ? { callout } : {}) };
  });
  return { version: 5, duration: timing.duration, fps: 30, width: 1080, height: 1920, renderWidth: 1080, renderHeight: 1920,
    scenes, assets, profile: script.profile };
}
