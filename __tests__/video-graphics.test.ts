import { describe, it, expect } from 'vitest';
import { buildStoryboard, graphicTheme, numericCallout } from '../src/video/graphics';
import { buildExtractiveScript } from '../src/video/script';
import { sampleInput } from '../src/video/sample';
import { NarrationTiming, VideoScript } from '../src/video/types';

const story = sampleInput(new Date('2026-10-03T12:00:00Z')).stories[0];
const script = buildExtractiveScript(story);
function timingFor(script: VideoScript): NarrationTiming {
  const words = script.narration.split(/\s+/);
  const step = 38 / (words.length + 1);
  return { duration: 38.85, sampleRate: 24000, words: words.map((text, i) => ({ text, start: 0.1 + i * step, end: 0.1 + i * step + 0.2 })) };
}

describe('animated story graphics', () => {
  it('changes scenes on spoken sentences and covers the entire narration', () => {
    const timing = timingFor(script);
    const plan = buildStoryboard(story, script, timing);
    expect(plan.scenes.length).toBeGreaterThanOrEqual(4);
    expect(plan.scenes[0].start).toBe(0);
    expect(plan.scenes.at(-1)?.end).toBe(timing.duration);
    expect(plan.scenes.at(-1)?.theme).toBe('link');
    for (let i = 1; i < plan.scenes.length; i++) {
      expect(plan.scenes[i].start).toBe(plan.scenes[i - 1].end);
      expect(timing.words.some(word => word.start === plan.scenes[i].start)).toBe(true);
    }
    expect(plan.scenes.filter(scene => scene.label.startsWith('KEY DETAIL')).every(scene => script.sentences.some(s => s.text === scene.text))).toBe(true);
    expect(new Set(plan.scenes.map(scene => scene.theme)).size).toBeGreaterThanOrEqual(3);
  });
  it('selects suitable illustrations from the actual story text', () => {
    for (const [text, theme] of [
      ['New GPU chips', 'chip'], ['A robot learns to grasp objects', 'robot'],
      ['A cybersecurity vulnerability', 'security'], ['New government regulation', 'policy'],
      ['An open source coding toolkit', 'code'], ['Compare model answers', 'comparison'],
      ['Research paper reports findings', 'research'], ['New language model', 'network'],
    ]) expect(graphicTheme(text)).toBe(theme);
  });
  it('only highlights explicit amounts or percentages, not dates/model versions', () => {
    expect(numericCallout('The release is GPT-4.5, dated 2026-10-03.')).toBeUndefined();
    expect(numericCallout('The company raised $2.5 billion.')).toBe('$2.5 billion');
    expect(numericCallout('The study reports 30% in its test.')).toBe('30%');
    expect(numericCallout('The model has 8 billion parameters.')).toBe('8 billion parameters');
    const numberedStory = { ...story, sourceExcerpt: story.sourceExcerpt.replace('an open toolkit', 'a toolkit with 30% coverage') };
    const numbered = { ...script, sentences: script.sentences.map((sentence, i) => ({ ...sentence,
      text: i === 0 ? sentence.text.replace('an open toolkit', 'a toolkit with 30% coverage') : sentence.text,
      evidenceQuote: i === 0 ? sentence.evidenceQuote.replace('an open toolkit', 'a toolkit with 30% coverage') : sentence.evidenceQuote })) };
    numbered.narration = script.narration.replace(script.sentences[0].text, numbered.sentences[0].text);
    const plan = buildStoryboard(numberedStory, numbered, timingFor(numbered));
    expect(plan.scenes.find(scene => scene.theme === 'number')?.callout).toBe('30%');
    expect(() => buildStoryboard(story, numbered, timingFor(numbered))).toThrow('source evidence');
  });
  it('fails when timings or scene text no longer match the narration', () => {
    const timing = timingFor(script); timing.words[3].text = 'invented';
    expect(() => buildStoryboard(story, script, timing)).toThrow('differ from the narration');
    expect(() => buildStoryboard(story, { ...script, sentences: [{ text: 'Invented sentence.', evidenceQuote: 'fake' }] }, timingFor(script))).toThrow('source evidence');
  });
});
