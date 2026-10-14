import { captionChunks } from './captions';
import { NarrationTiming, ScriptSentence, VideoScript } from './types';

const clean = (text: string): string => text.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
export interface SentenceSpan extends ScriptSentence { start: number; end: number }

/** Match complete sentences to actual timed tokens, including repeated words. */
export function sentenceSpans(script: VideoScript, timing: NarrationTiming): SentenceSpan[] {
  captionChunks(timing);
  if (clean(timing.words.map(word => word.text).join(' ')) !== clean(script.narration)) {
    throw new Error('Graphics cannot synchronize: timed words differ from the narration.');
  }
  let offset = 0;
  const words = timing.words.map(word => {
    const from = offset;
    offset += clean(word.text).length;
    return { ...word, from, to: offset };
  });
  let cursor = 0;
  const narration = clean(script.narration);
  return script.sentences.map(sentence => {
    const text = clean(sentence.text);
    const index = narration.indexOf(text, cursor);
    if (!text || index < 0) throw new Error('Graphics sentence is missing from the narration.');
    cursor = index + text.length;
    const first = words.find(word => word.from <= index && word.to > index);
    const last = words.find(word => word.from < cursor && word.to >= cursor);
    if (!first || !last) throw new Error('Graphics sentence has no matching narration timing.');
    return { ...sentence, start: first.start, end: last.end };
  });
}

export function validateNarration(script: VideoScript, timing: NarrationTiming): SentenceSpan[] {
  if (script.version === 3 && (timing.duration < 35 || timing.duration > 45)) throw new Error('New narration must last 35–45 seconds.');
  const spans = sentenceSpans(script, timing);
  if (script.version !== 3) return spans;
  if (timing.duration < 35 || timing.duration > 45) throw new Error('New narration must last 35–45 seconds.');
  if (spans[0].start > 0.25 || spans[0].end > 4.025) throw new Error('The spoken hook must start immediately and finish within four seconds.');
  if (!spans[1] || spans[1].start > 8 || !['example', 'comparison'].includes(spans[1].visual || '')) {
    throw new Error('Narration needs an example or comparison by eight seconds.');
  }
  if (script.format === 'structured') {
    const impact = spans.find(sentence => sentence.role === 'impact');
    if (!impact || impact.start < 25 || impact.start > 27) throw new Error('Structured impact must start around 26 seconds (±1 second).');
    if (spans[1].start > 5) throw new Error('The breakthrough must follow the hook around five seconds.');
  }
  return spans;
}
