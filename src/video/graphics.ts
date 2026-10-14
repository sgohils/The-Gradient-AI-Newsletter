import { captionChunks } from './captions';
import { GraphicLayout, GraphicTheme, NarrationTiming, VideoScene, VideoScript, VideoStoryboard, VideoStory } from './types';
import { SCRIPT_ENDING, validateScript } from './script';
import { validateNarration } from './timing';

export const GRAPHICS_VERSION = 6;

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

/** Text on the illustrations comes from the validated narration, not a model. */
export function visualTerms(text: string): string[] {
  const matches = text.match(/\b(?:toolkits?|prompts?|responses?|answers?|questions?|tests?|checks?|models?|instructions?|workflows?|code|developers?|users?|privacy|security|robots?|chips?|GPUs?|APIs?|findings|research|data|costs?|patients?|students?|workers?|shipping|submissions|rollbacks|quality|training|reasoning|agents?|tokens?)\b/gi) || [];
  const terms: string[] = [];
  for (const term of matches) {
    if (!terms.some(existing => existing.toLowerCase() === term.toLowerCase())) terms.push(term);
    if (terms.length === 2) break;
  }
  return terms;
}

export function visualHeading(spoken: string): string {
  const clean = spoken.replace(/^[,;:\s]+/, '').replace(/^(?:and|or|but|whether)\s+/i, '').trim();
  const words = clean.split(/\s+/).filter(Boolean).slice(0, 8);
  // Keep a readable source phrase, rather than the start of the next list item.
  const pause = words.findIndex((word, index) => index >= 3 && /[,;]$/.test(word));
  if (pause >= 0) words.splice(pause + 1);
  while (words.length > 1 && /^(?:and|or|the|a|an|to|for|with|using|before|after|of|in|on|by|from)$/i.test(words.at(-1)!.replace(/[.,;:!?]/g, ''))) words.pop();
  const heading = words.join(' ').replace(/[,;:]+$/, '');
  return heading ? heading[0].toUpperCase() + heading.slice(1) : spoken.trim();
}

function sceneLayout(scene: VideoScene, index: number): GraphicLayout {
  if (scene.kind === 'source') return 'source';
  if (scene.theme === 'number') return 'stat';
  if (scene.kind === 'headline') return 'hero';
  // Keep a comparison illustration intact; use source-word cards for other
  // details, with a larger illustration between them to vary the composition.
  if (scene.theme === 'comparison' || !scene.terms?.length) return 'panel';
  return scene.label === 'THE TAKEAWAY' || index % 2 ? 'split' : 'panel';
}

function buildNewStoryboard(story: VideoStory, script: VideoScript, timing: NarrationTiming): VideoStoryboard {
  const sentences = validateNarration(script, timing);
  const boundaries = new Set<number>([0, timing.duration]);
  let previousCue = 0;
  for (let target = 3; target < timing.duration - 0.5; target = previousCue + 3) {
    const near = timing.words.filter(word => Math.abs(word.start - target) <= 0.5)
      .sort((a, b) => Math.abs(a.start - target) - Math.abs(b.start - target))[0];
    previousCue = near?.start ?? target;
    boundaries.add(previousCue);
  }
  for (const sentence of sentences.slice(1)) boundaries.add(sentence.start);
  // Merge a redundant grid cue with a nearby sentence change when coverage
  // still meets the cadence, avoiding a fraction-of-a-second card flash.
  const ordered = [...boundaries].sort((a, b) => a - b);
  const mandatory = new Set([0, timing.duration, ...sentences.slice(1).map(sentence => sentence.start)]);
  for (let i = ordered.length - 2; i > 0; i--) {
    if (!mandatory.has(ordered[i]) && ordered[i + 1] - ordered[i - 1] <= 3.55 &&
        Math.min(ordered[i] - ordered[i - 1], ordered[i + 1] - ordered[i]) < 0.5) ordered.splice(i, 1);
  }
  const thread = script.angle === 'comparison' ? 'comparison' :
    graphicTheme(story.title + ' ' + script.sentences.slice(1, -1).map(s => s.text).join(' '));
  const explanation = sentences.filter(sentence => sentence.role === 'breakthrough').slice(0, 3);
  const diagramLabels = explanation.map(item => visualTerms(item.text).join(' / ') ||
    item.displayText!.split(/\s+/).filter(word => word.length <= 16).slice(0, 3).join(' '));
  const scenes: VideoScene[] = [];
  for (let i = 0; i < ordered.length - 1; i++) {
    const start = ordered[i], end = ordered[i + 1];
    if (end <= start) continue;
    const sentence = [...sentences].reverse().find(item => item.start <= start + 0.025) || sentences[0];
    const spokenWords = timing.words.filter(word => word.start >= start && word.start < end);
    const spoken = spokenWords.map(word => word.text).join(' ').replace(/\s+([,.;:!?])/g, '$1');
    const closing = sentence.role === 'engagement';
    const callout = closing ? undefined : numericCallout(spoken);
    const terms = visualTerms(spoken || sentence.text);
    const scene: VideoScene = {
      start, end, label: closing ? 'YOUR TURN' : sentence.role === 'hook' ? 'THE QUESTION' :
        sentence.role === 'impact' ? 'WHY IT MATTERS' : 'HOW IT WORKS',
      theme: callout ? 'number' : thread, text: sentence.text,
      displayText: closing ? sentence.text : sentence.displayText!,
      excerpt: false, kind: sentence.role === 'hook' ? 'headline' : 'detail', variant: i,
      role: sentence.role, cue: i % 3 === 0 ? 'popup' : i % 3 === 1 ? 'diagram' : 'highlight',
      visual: sentence.visual, sourceVisible: sentence.role !== 'hook', immediate: sentence.role === 'hook' || closing,
      threadTime: start, terms, ...(callout ? { callout } : {}),
    };
    if (!callout && sentence.role === 'breakthrough' && diagramLabels.every(Boolean)) {
      scene.diagram = { labels: diagramLabels,
        active: Math.min(explanation.length - 1, sentences.filter(item => item.role === 'breakthrough').findIndex(item => item.text === sentence.text)),
        comparison: script.angle === 'comparison' };
    }
    scene.termTimings = terms.flatMap(term => {
      const word = spokenWords.find(word => normalized(word.text) === normalized(term));
      return word ? [{ text: term, start: word.start, end: Math.min(word.end, end) }] : [];
    });
    scene.layout = callout ? 'stat' : sentence.role === 'hook' || closing ? 'hero' : scene.diagram ? 'panel' :
      sentence.visual === 'comparison' ? 'panel' : terms.length ? 'split' : 'panel';
    scenes.push(scene);
  }
  if (scenes.some(scene => scene.end - scene.start > 3.55)) throw new Error('Visual cue gap exceeds three seconds plus pacing tolerance.');
  const example = scenes.find(scene => scene.role === 'breakthrough' && ['example', 'comparison'].includes(scene.visual || ''));
  if (!example || example.start > 8) throw new Error('Storyboard needs an early illustrated example.');
  return { version: 4, scriptVersion: 3, duration: timing.duration, fps: 30, width: 1080, height: 1920,
    renderWidth: 1080, renderHeight: 1920, scenes };
}

export function buildStoryboard(story: VideoStory, script: VideoScript, timing: NarrationTiming): VideoStoryboard {
  validateScript(story, script);
  if (script.version === 3) return buildNewStoryboard(story, script, timing);
  captionChunks(timing);
  const narration = normalized(script.narration);
  let offset = 0;
  const spans = timing.words.map((word) => {
    const start = offset;
    offset += normalized(word.text).length;
    return { from: start, to: offset, time: word.start, end: word.end, text: word.text };
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
    return { ...sentence, start: timeAt(index) };
  });
  const closingIndex = narration.indexOf(normalized(script.version === 2 ? SCRIPT_ENDING : 'Reporting from'), cursor);
  if (!sentences.length || closingIndex < 0) throw new Error('Graphics need a complete news script.');
  const closing = timeAt(closingIndex);
  let scenes: VideoStoryboard['scenes'] = [{ start: 0, end: sentences[0].start, label: 'TODAY IN AI',
    theme: graphicTheme(story.title), text: story.title, displayText: story.title, excerpt: false, kind: 'headline', variant: 0 }];
  for (const sentence of sentences) {
    // Leave time to read each card; captions still cover every spoken sentence.
    const previous = scenes[scenes.length - 1];
    if (scenes.length > 1 && sentence.start - previous.start < 4.5) continue;
    if (closing - sentence.start < 3) continue;
    previous.end = sentence.start;
    const callout = numericCallout(sentence.text);
    scenes.push({ start: sentence.start, end: closing, label: `KEY DETAIL ${scenes.length}`,
      theme: callout ? 'number' : graphicTheme(sentence.text), text: sentence.text, displayText: sentence.text,
      excerpt: false, kind: 'detail', variant: 0, ...(callout ? { callout } : {}) });
  }
  scenes[scenes.length - 1].end = closing;
  if (script.version === 2) {
    scenes = sentences.map((sentence, i) => {
      const callout = numericCallout(sentence.text);
      return { start: i === 0 ? 0 : sentence.start, end: sentences[i + 1]?.start || closing,
        label: sentence.role === 'hook' ? 'THE BIG IDEA' : sentence.role === 'takeaway' ? 'THE TAKEAWAY' : `KEY DETAIL ${i}`,
        theme: callout ? 'number' : graphicTheme(sentence.text), text: sentence.text,
        displayText: sentence.displayText!, excerpt: false,
        kind: sentence.role === 'hook' ? 'headline' : 'detail', variant: 0, ...(callout ? { callout } : {}) };
    });
  }
  scenes.push({ start: closing, end: timing.duration, label: 'READ THE ORIGINAL', theme: 'link',
    text: `${story.sourceName}\n${new URL(story.sourceUrl).hostname}`, displayText: story.sourceName,
    excerpt: false, kind: 'source', variant: 0 });
  if (scenes.some(scene => scene.end <= scene.start)) throw new Error('Graphics scenes have invalid durations.');
  // A long spoken sentence can still have several visual beats, without changing
  // a single narration word or adding another generation request.
  const beats: VideoStoryboard['scenes'] = [];
  for (const scene of scenes) {
    const count = scene.kind === 'detail' ? Math.max(1, Math.ceil((scene.end - scene.start) / 5)) : 1;
    const boundaries = [scene.start];
    for (let i = 1; i < count; i++) {
      const target = scene.start + (scene.end - scene.start) * i / count;
      const eligible = spans.filter(word => word.to > word.from && word.time >= boundaries[boundaries.length - 1] + 2.5 && word.time < scene.end - 2);
      // Prefer a nearby spoken phrase boundary to interrupting a phrase.
      const phrase = eligible.find(word => Math.abs(word.time - target) <= 0.8 &&
        /[,;:.!?]$/.test(spans[spans.indexOf(word) - 1]?.text || ''));
      const boundary = (phrase || eligible.find(word => word.time >= target))?.time;
      if (boundary !== undefined && boundary - boundaries[boundaries.length - 1] >= 2.5) boundaries.push(boundary);
    }
    boundaries.push(scene.end);
    for (let i = 0; i < boundaries.length - 1; i++) {
      const start = boundaries[i], end = boundaries[i + 1];
      const spoken = spans.filter(word => word.time >= start && word.time < end).map(word => word.text).join(' ')
        .replace(/\s+([,.;:!?])/g, '$1');
      const displayText = scene.kind === 'detail' && (script.version !== 2 || i > 0) ? visualHeading(spoken) : scene.displayText;
      const beat: VideoScene = { ...scene, start, end, displayText,
        excerpt: scene.kind === 'detail' && (script.version !== 2 || i > 0) && normalized(displayText) !== normalized(scene.text), variant: i,
        terms: visualTerms(spoken || scene.text) };
      const beatTheme = graphicTheme(spoken);
      if (scene.kind === 'detail' && scene.theme !== 'number' && beatTheme !== 'network') beat.theme = beatTheme;
      beat.termTimings = beat.terms!.flatMap(term => {
        const word = spans.find(word => word.time >= start && word.time < end && normalized(word.text) === normalized(term));
        return word ? [{ text: term, start: word.time, end: word.end }] : [];
      });
      beat.layout = sceneLayout(beat, beats.length);
      beats.push(beat);
    }
  }
  return { version: 4, duration: timing.duration, fps: 30, width: 1080, height: 1920,
    renderWidth: 1080, renderHeight: 1920, scenes: beats };
}
