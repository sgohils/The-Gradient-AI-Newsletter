import { sentenceSpans } from './timing';
import { NarrationTiming, VideoScript, VideoStoryboard, VideoStory } from './types';
import { wordCount } from './selection';

function timestamp(seconds: number): string {
  return Math.floor(seconds / 60) + ':' + seconds.toFixed(1).padStart(4, '0');
}
export function hookReadingGrade(text: string): number {
  const words = text.match(/[a-z]+(?:'[a-z]+)?/gi) || [];
  const syllables = words.reduce((sum, word) => {
    const lower = word.toLowerCase().replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
    return sum + Math.max(1, (lower.match(/[aeiouy]+/g) || []).length);
  }, 0);
  return words.length ? Math.round((0.39 * words.length + 11.8 * syllables / words.length - 15.59) * 10) / 10 : 0;
}
export function buildProducerBrief(story: VideoStory, script: VideoScript, plan: VideoStoryboard, timing: NarrationTiming): string {
  const grade = hookReadingGrade(script.sentences[0].text);
  const lines = ['# Working Title', '', script.workingTitle || story.title, '',
    'Format: ' + (script.format || 'legacy') + ' · Angle: ' + (script.angle || 'legacy') +
      ' · Hook: ' + (script.hookStyle || 'legacy') + ' · Access: ' + (script.availability || 'legacy'),
    'Duration: ' + timing.duration.toFixed(2) + ' seconds · Spoken words: ' + wordCount(script.narration),
    'Hook reading-grade estimate: ' + grade + (grade > 8 ? ' — review for simpler wording.' : ' — short-text estimate; listen for clarity.'), '',
    '# Onscreen Visual Directions', ''];
  for (const scene of plan.scenes) {
    lines.push('- ' + timestamp(scene.start) + '–' + timestamp(scene.end) + ': ' +
      (scene.cue || 'scene') + ' — “' + scene.displayText + '”; ' + scene.theme + ' illustration, ' +
      scene.layout + ' layout' + (scene.visual ? ', ' + scene.visual : '') +
      (scene.diagram ? '; keep explanation cards visible, emphasize “' + scene.diagram.labels[scene.diagram.active] + '”' : '') +
      (scene.sourceVisible === false ? '; no citation in the hook.' : '; source footer visible.'));
  }
  lines.push('', '# Spoken Audio Script', '', 'Word count: ' + wordCount(script.narration), '');
  for (const sentence of sentenceSpans(script, timing)) {
    lines.push('**' + (sentence.role || 'detail') + ' (' + timestamp(sentence.start) + '–' + timestamp(sentence.end) + ')**', '', sentence.text, '');
  }
  lines.push('Source: [' + story.sourceName + '](' + story.sourceUrl + ')',
    '', 'Illustrations explain source-backed concepts; they are not product screenshots or independent benchmark demonstrations.', '');
  return lines.join('\n');
}
