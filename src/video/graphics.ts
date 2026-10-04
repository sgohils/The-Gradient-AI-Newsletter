import { captionChunks } from './captions';
import { GraphicTheme, NarrationTiming, VideoScript, VideoStoryboard, VideoStory } from './types';
import { validateScript } from './script';

export const GRAPHICS_VERSION = 1;

function normalized(text: string): string {
  return text.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
}

export function graphicTheme(text: string): GraphicTheme {
  // These are illustrative topic icons, never a fabricated product screenshot.
  const choices: [GraphicTheme, RegExp][] = [
    ['robot', /\b(robot\w*|humanoid|autonomous vehicle)\b/i],
    ['chip', /\b(chips?|gpus?|processors?|semiconductors?|data centers?)\b/i],
    ['security', /\b(security|privacy|cyber\w*|vulnerabilit\w*|attack\w*|safety)\b/i],
    ['policy', /\b(regulat\w*|legislation|law|policy|government|copyright)\b/i],
    ['comparison', /\b(compare|comparison|versus|evaluate)\b/i],
    ['code', /\b(code|coding|toolkits?|developers?|software|github|apis?|applications?)\b/i],
    ['research', /\b(research|papers?|stud\w*|reports?|benchmarks?|tests?|testing|evaluation|findings)\b/i],
  ];
  return choices.find(([, pattern]) => pattern.test(text))?.[0] || 'network';
}

/** Promote explicit quantities, never model-version digits or invented charts. */
export function numericCallout(text: string): string | undefined {
  return text.match(/(?:[$£€]\s*\d[\d,.]*(?:\s*(?:million|billion|trillion))?|\b\d[\d,.]*\s*(?:%|percent\b|(?:million|billion|trillion)\b(?:\s+(?:users|parameters|dollars|tokens))?))/i)?.[0];
}

export function buildStoryboard(story: VideoStory, script: VideoScript, timing: NarrationTiming): VideoStoryboard {
  validateScript(story, script);
  captionChunks(timing);
  const narration = normalized(script.narration);
  let offset = 0;
  const spans = timing.words.map((word) => {
    const start = offset;
    offset += normalized(word.text).length;
    return { from: start, to: offset, time: word.start };
  });
  if (normalized(timing.words.map(word => word.text).join(' ')) !== narration) {
    throw new Error('Graphics cannot synchronize: timed words differ from the narration.');
  }
  function timeAt(index: number): number {
    const span = spans.find(word => word.from <= index && word.to > index);
    if (!span) throw new Error('Graphics sentence has no matching narration timing.');
    return span.time;
  }
  let cursor = 0;
  const sentences = script.sentences.map(sentence => {
    const text = normalized(sentence.text);
    const index = narration.indexOf(text, cursor);
    if (index < 0 || !text) throw new Error('Graphics sentence is missing from the narration.');
    cursor = index + text.length;
    return { text: sentence.text, start: timeAt(index) };
  });
  const closingIndex = narration.indexOf(normalized('Reporting from'), cursor);
  if (!sentences.length || closingIndex < 0) throw new Error('Graphics need a complete news script.');
  const closing = timeAt(closingIndex);
  const scenes: VideoStoryboard['scenes'] = [{ start: 0, end: sentences[0].start, label: 'THE HEADLINE',
    theme: graphicTheme(story.title), text: 'The key details, in under a minute.' }];
  for (const sentence of sentences) {
    // Leave time to read each card; captions still cover every spoken sentence.
    const previous = scenes[scenes.length - 1];
    if (scenes.length > 1 && sentence.start - previous.start < 4.5) continue;
    if (closing - sentence.start < 3) continue;
    previous.end = sentence.start;
    const callout = numericCallout(sentence.text);
    scenes.push({ start: sentence.start, end: closing, label: `KEY DETAIL ${scenes.length}`,
      theme: callout ? 'number' : graphicTheme(sentence.text), text: sentence.text, ...(callout ? { callout } : {}) });
  }
  scenes[scenes.length - 1].end = closing;
  scenes.push({ start: closing, end: timing.duration, label: 'READ THE ORIGINAL', theme: 'link',
    text: `${story.sourceName}\n${new URL(story.sourceUrl).hostname}` });
  if (scenes.some(scene => scene.end <= scene.start)) throw new Error('Graphics scenes have invalid durations.');
  return { version: 1, duration: timing.duration, fps: 12, width: 780, height: 560, scenes };
}
