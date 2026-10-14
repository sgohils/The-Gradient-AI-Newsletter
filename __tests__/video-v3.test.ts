import { describe, it, expect, vi } from 'vitest';
import { sampleInput, sampleStructuredScript } from '../src/video/sample';
import { buildExtractiveScript, generateScript, validateScript, ACCESS_LIMIT, sourceAvailability } from '../src/video/script';
import { validateNarration } from '../src/video/timing';
import { buildStoryboard } from '../src/video/graphics';
import { buildProducerBrief, hookReadingGrade } from '../src/video/brief';
import { compactLedger, readManifest, writeJson } from '../src/video/storage';
import { wordCount } from '../src/video/selection';
import { NarrationTiming, VideoScript, VideoLedger } from '../src/video/types';
import { presentation } from '../src/video/render';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const input = sampleInput(new Date('2026-10-13T12:00:00Z'));
const story = input.stories[0];
function timingFor(script: VideoScript): NarrationTiming {
  const words: NarrationTiming['words'] = [];
  let start = 0;
  const coreWords = script.sentences.slice(1, 4).reduce((sum, sentence) => sum + wordCount(sentence.text), 0);
  script.sentences.forEach((sentence, index) => {
    const tokens = sentence.text.split(/\s+/);
    const duration = script.format === 'structured' ?
      index === 0 ? 3.3 : index < 4 ? 22.7 * tokens.length / coreWords : index === 4 ? 6.5 : 7.5 :
      40 * tokens.length / wordCount(script.narration);
    tokens.forEach((text, i) => words.push({ text, start: start + i * duration / tokens.length,
      end: start + (i + 1) * duration / tokens.length - 0.005 }));
    start += duration;
  });
  return { duration: start, sampleRate: 24000, words };
}
const sync = (script: VideoScript): VideoScript => ({ ...script, narration: script.sentences.map(sentence => sentence.text).join(' ') });

describe('new Short structure and evidence', () => {
  it('accepts a source-backed main script with three breakthrough sentences and a final question', () => {
    const script = sampleStructuredScript(story);
    expect(() => validateScript(story, script)).not.toThrow();
    expect(wordCount(script.narration)).toBeGreaterThanOrEqual(75);
    expect(wordCount(script.narration)).toBeLessThanOrEqual(95);
    expect(script.workingTitle!.length).toBeLessThan(50);
    expect(script.sentences.filter(sentence => sentence.role === 'breakthrough')).toHaveLength(3);
    expect(script.narration.endsWith('?')).toBe(true);
    expect(script.narration).not.toContain('Source in the description');
  });
  it('uses the single free request for the new format and omits rewritten newsletter claims', async () => {
    const script = sampleStructuredScript(story);
    const client = { post: vi.fn().mockResolvedValue({ data: { choices: [{ message: { content: JSON.stringify(script) } }] } }) };
    const result = await generateScript({ ...story, summary: 'An invented claim about 100x performance.' }, { groqApiKey: 'fake' }, client);
    expect(result.format).toBe('structured');
    expect(client.post).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(client.post.mock.calls)).not.toContain('invented claim');
  });
  it.each([429, 401, 500])('keeps the source fallback when the free service returns %s', async status => {
    const client = { post: vi.fn().mockRejectedValue({ response: { status } }) };
    const result = await generateScript(story, { groqApiKey: 'fake' }, client);
    expect(result.format).toBe('source-fallback');
    expect(client.post).toHaveBeenCalledTimes(1);
    expect(() => validateScript(story, result)).not.toThrow();
  });
  it('rejects extra breakthrough sentences and a missing final question', () => {
    const extra = sampleStructuredScript(story); extra.sentences[4].role = 'breakthrough';
    expect(() => validateScript(story, extra)).toThrow();
    const end = sampleStructuredScript(story); end.sentences.at(-1)!.text = 'Would you trust these model checks in your workflow.';
    expect(() => validateScript(story, sync(end))).toThrow('final question');
  });
  it.each(['Hello, would you use this toolkit?', 'According to arXiv, would you use this toolkit?', 'Could the 2026 toolkit help you compare answers?'])('rejects formal or generic hook introductions: %s', text => {
    const script = sampleStructuredScript(story); script.sentences[0].text = text;
    expect(() => validateScript(story, sync(script))).toThrow();
  });
  it('rejects title hype, invented title claims, new names, and unsupported numeric questions', () => {
    for (const title of ['AI toolkit changes everything', 'AI toolkit replaces all doctors', 'Meta toolkit', 'AI toolkit 100x faster']) {
      const script = sampleStructuredScript(story); script.workingTitle = title;
      expect(() => validateScript(story, script)).toThrow();
    }
    const question = sampleStructuredScript(story); question.sentences[0].text = 'Could AI make these model checks 100x faster?';
    expect(() => validateScript(story, sync(question))).toThrow('unsupported figure');
    question.sentences[0].text = 'Would you trust model checks to replace doctors?';
    expect(() => validateScript(story, sync(question))).toThrow('unsupported premise');
  });
  it('rejects a display label not found in the narration and excess word count', () => {
    const label = sampleStructuredScript(story); label.sentences[1].displayText = 'Unlimited performance';
    expect(() => validateScript(story, label)).toThrow('not supported');
    const long = sampleStructuredScript(story);
    const impact = long.sentences[4].text.replace(/\.$/, '');
    long.sentences[4].text = impact + ' and ' + impact + ' and ' + impact + '.';
    expect(() => validateScript(story, sync(long))).toThrow('75–95');
  });
  it('states access limits for unreleased research without implying downloads are available', () => {
    const research = { ...story, sourceExcerpt: story.sourceExcerpt
      .replace('has released an open toolkit', 'has studied an experimental toolkit')
      .replace('Developers can run the checks locally and share their findings with collaborators.',
        'The team has not released the toolkit or published its code.') };
    expect(sourceAvailability(research)).toBe('research');
    const script = buildExtractiveScript(research);
    expect(script.narration).toContain(ACCESS_LIMIT);
    const impact = script.sentences.find(sentence => sentence.role === 'impact')!;
    impact.text = 'You can download this toolkit and build today.';
    expect(() => validateScript(research, sync(script))).toThrow('public availability');
  });
  it('does not turn source negation into an affirmative factual claim', () => {
    const negative = { ...story, sourceExcerpt: story.sourceExcerpt + ' The model cannot replace developers or revise software code.' };
    const script = sampleStructuredScript(negative);
    script.sentences[2].text = 'The model can replace developers and revise software code.';
    script.sentences[2].evidenceQuote = 'The model cannot replace developers or revise software code.';
    expect(() => validateScript(negative, sync(script))).toThrow('limitation');
  });
});

describe('measured pacing and illustrated cues', () => {
  it.each(['structured', 'source-fallback'])('covers %s audio with an early example and visible final question', format => {
    const script = format === 'structured' ? sampleStructuredScript(story) : buildExtractiveScript(story);
    const timing = timingFor(script);
    const spans = validateNarration(script, timing);
    const plan = buildStoryboard(story, script, timing);
    expect(spans[0].end).toBeLessThan(4);
    expect(plan.scenes[0]).toMatchObject({ start: 0, immediate: true, sourceVisible: false });
    expect(plan.scenes.find(scene => scene.role === 'breakthrough')!.start).toBeLessThan(8);
    expect(plan.scenes.at(-1)).toMatchObject({ end: timing.duration, role: 'engagement', immediate: true });
    expect(plan.scenes.at(-1)!.displayText).toBe(script.sentences.at(-1)!.text);
    for (let i = 0; i < plan.scenes.length; i++) {
      expect(plan.scenes[i].end - plan.scenes[i].start).toBeLessThanOrEqual(3.55);
      if (i) expect(plan.scenes[i].start).toBe(plan.scenes[i - 1].end);
    }
    expect(new Set(plan.scenes.map(scene => scene.cue))).toEqual(new Set(['popup', 'diagram', 'highlight']));
    const illustrated = plan.scenes.filter(scene => scene.diagram);
    expect(illustrated.length).toBeGreaterThan(3);
    expect(new Set(illustrated.map(scene => JSON.stringify(scene.diagram!.labels))).size).toBe(1);
    for (const scene of illustrated) {
      expect(scene.displayText).toBe(script.sentences.find(sentence => sentence.text === scene.text)!.displayText);
      expect(scene.diagram!.labels[scene.diagram!.active]).toBeTruthy();
    }
    const brief = buildProducerBrief(story, script, plan, timing);
    for (const title of ['# Working Title', '# Onscreen Visual Directions', '# Spoken Audio Script']) expect(brief).toContain(title);
    expect(brief).toContain('Word count: ' + wordCount(script.narration));
  });
  it('rejects short audio, a delayed or overlong hook, and late impact', () => {
    const script = sampleStructuredScript(story);
    expect(() => validateNarration(script, { ...timingFor(script), duration: 34.9 })).toThrow('35–45');
    const late = timingFor(script); late.words.forEach(word => { word.start += 1; word.end += 1; }); late.duration++;
    expect(() => validateNarration(script, late)).toThrow('immediately');
    const long = timingFor(script); long.words.forEach(word => { word.start *= 1.2; word.end *= 1.2; }); long.duration *= 1.2;
    expect(() => validateNarration(script, long)).toThrow();
    const impact = timingFor(script);
    const firstImpact = impact.words.findIndex(word => word.text === 'Developers');
    impact.words.slice(firstImpact).forEach(word => { word.start += 1.5; word.end += 1.5; }); impact.duration += 1.5;
    expect(() => validateNarration(script, impact)).toThrow('around 26');
  });
  it('rejects altered spoken words even if duration looks valid', () => {
    const script = sampleStructuredScript(story), timing = timingFor(script);
    timing.words[2].text = 'invented';
    expect(() => validateNarration(script, timing)).toThrow('differ');
  });
  it('keeps presentation metadata after old evidence is compacted', () => {
    const script = sampleStructuredScript(story), metadata = presentation(script, 40);
    const ledger: VideoLedger = { version: 1, issues: { [input.issueDate]: {
      story: { ...story }, script, presentation: metadata, selectedAt: input.generatedAt, platforms: {},
    } } };
    compactLedger(ledger, new Date('2026-10-30T12:00:00Z'));
    expect(ledger.issues[input.issueDate].script).toBeUndefined();
    expect(ledger.issues[input.issueDate].presentation).toEqual(metadata);
  });
  it('requires the chosen title and new minimum duration in restored manifests', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gradient-v3-manifest-'));
    try {
      const script = sampleStructuredScript(story), file = path.join(root, 'manifest.json');
      const manifest = { version: 1, status: 'ready', issueDate: input.issueDate, story, script,
        title: script.workingTitle, duration: 40, description: 'Source', videoFile: 'video.mp4',
        videoSha256: 'a'.repeat(64), captionsFile: 'captions.srt' };
      writeJson(file, manifest); expect(readManifest(file)).toMatchObject({ duration: 40 });
      writeJson(file, { ...manifest, title: story.title }); expect(() => readManifest(file)).toThrow('working title');
      writeJson(file, { ...manifest, duration: 34 }); expect(() => readManifest(file)).toThrow('35–45');
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
  });
  it('flags complex hook wording without treating a short readability score as proof', () => {
    expect(hookReadingGrade('Would you use this tool?')).toBeLessThan(8);
    expect(hookReadingGrade('Could computational interoperability revolutionize autonomous orchestration?')).toBeGreaterThan(8);
  });
});
