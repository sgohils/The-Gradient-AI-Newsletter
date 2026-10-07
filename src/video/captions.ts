import { NarrationTiming, WordTiming } from './types';
import { validDuration } from './profiles';

interface Caption { start: number; end: number; text: string; words: WordTiming[] }

export function captionChunks(timing: NarrationTiming): Caption[] {
  if (!timing || !validDuration(timing.duration, timing.profile || 'legacy') ||
      !Array.isArray(timing.words) || !timing.words.length) throw new Error('Invalid narration timing or duration.');
  let previous = 0;
  const words: WordTiming[] = [];
  for (const token of timing.words) {
    if (typeof token.text !== 'string' || !token.text.trim() || !Number.isFinite(token.start) || !Number.isFinite(token.end) ||
        token.start < 0 || token.start < previous - 0.025 || token.end <= token.start || token.end > timing.duration + 0.025) {
      throw new Error('Caption timing is incomplete or out of order.');
    }
    previous = token.end;
    // Kokoro may give punctuation its own timing; keep it attached to the word.
    if (/^[,.;:!?%]+$/.test(token.text.trim()) && words.length) {
      words[words.length - 1].text += token.text.trim();
      words[words.length - 1].end = token.end;
    } else words.push({ ...token });
  }
  const groups: WordTiming[][] = [];
  let group: WordTiming[] = [];
  for (const word of words) {
    if (group.length && (group.length >= 5 || group.map((item) => item.text).join(' ').length + word.text.length > 38 || word.start - group[group.length - 1].end > 0.5)) {
      groups.push(group); group = [];
    }
    group.push(word);
    if (/[.!?]$/.test(word.text)) { groups.push(group); group = []; }
  }
  if (group.length) groups.push(group);
  return groups.map((words) => ({ start: words[0].start, end: words[words.length - 1].end, text: words.map((word) => word.text).join(' '), words }));
}

function timestamp(value: number, ass = false): string {
  const total = Math.round(value * (ass ? 100 : 1000));
  const base = ass ? 100 : 1000;
  const hours = Math.floor(total / (3600 * base));
  const minutes = Math.floor(total / (60 * base)) % 60;
  const seconds = Math.floor(total / base) % 60;
  return `${ass ? hours : String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}${ass ? '.' : ','}${String(total % base).padStart(ass ? 2 : 3, '0')}`;
}

export function buildSrt(timing: NarrationTiming): string {
  return captionChunks(timing).map((chunk, index) => `${index + 1}\n${timestamp(chunk.start)} --> ${timestamp(chunk.end)}\n${chunk.text}\n`).join('\n');
}

export function buildAss(timing: NarrationTiming): string {
  const header = `[Script Info]\nScriptType: v4.00+\nPlayResX: 1080\nPlayResY: 1920\nWrapStyle: 2\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Caption,DejaVu Sans,64,&H00FFFFFF,&H00FFFFFF,&H00212420,&H00212420,-1,0,0,0,100,100,0,0,3,12,0,5,100,220,0,1\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n`;
  const events = captionChunks(timing).flatMap(chunk => {
    // Split at real word boundaries, including gaps, so only the currently
    // spoken word is highlighted. The whole chunk stays in the same position.
    const boundaries = [...new Set(chunk.words.flatMap(word => [word.start, word.end]))].sort((a, b) => a - b);
    return boundaries.slice(0, -1).flatMap((start, i) => {
      const end = boundaries[i + 1];
      if (timestamp(start, true) === timestamp(end, true)) return [];
      const text = chunk.words.map(word => {
        const clean = word.text.replace(/[{}\\\r\n]/g, '');
        return word.start <= start + 0.00001 && word.end > start + 0.00001 ?
          `{\\1c&HCBEFB4&}${clean}{\\1c&HFFFFFF&}` : clean;
      }).join(' ');
      return [`Dialogue: 0,${timestamp(start, true)},${timestamp(end, true)},Caption,,0,0,0,,{\\pos(482,1290)}${text}`];
    });
  });
  return header + events.join('\n') + '\n';
}
