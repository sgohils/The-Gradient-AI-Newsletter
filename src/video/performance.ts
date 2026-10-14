export interface PerformanceRow {
  videoId: string; cohort: 'baseline' | 'new'; window: '24h' | '7d'; format: 'legacy' | 'structured' | 'source-fallback';
  topic: string; duration: number; engagedViews: number;
  stayedToWatch: number | null; averageDuration: number | null; averagePercentage: number | null;
  comments: number; subscribers: number; openingDrop: number | null; coreDrop: number | null; closingDrop: number | null;
}

/** Normalized manual Studio export; no authentication or analytics API required. */
export function parsePerformanceCsv(text: string): PerformanceRow[] {
  const records: string[][] = [];
  let row: string[] = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i++; } else quoted = !quoted;
    } else if (!quoted && (char === ',' || char === '\n')) {
      row.push(cell.trim()); cell = '';
      if (char === '\n') { if (row.some(Boolean)) records.push(row); row = []; }
    } else if (char !== '\r') cell += char;
  }
  if (quoted) throw new Error('Unclosed CSV quote.');
  row.push(cell.trim()); if (row.some(Boolean)) records.push(row);
  if (!records.length) throw new Error('Performance CSV needs a header.');
  const header = records.shift()!.map(value => value.replace(/^\uFEFF/, ''));
  const required = ['video_id', 'cohort', 'window', 'format', 'topic', 'duration_seconds', 'engaged_views',
    'stayed_to_watch_percent', 'average_view_duration_seconds', 'average_percentage_viewed', 'comments', 'subscribers_gained',
    'opening_drop_percent', 'core_drop_percent', 'closing_drop_percent'];
  if (required.some(key => !header.includes(key)) || new Set(header).size !== header.length) throw new Error('Performance CSV header is incomplete or duplicated.');
  const seen = new Set<string>();
  return records.map((values, index) => {
    if (values.length !== header.length) throw new Error('Performance CSV row ' + (index + 2) + ' has the wrong number of columns.');
    const data = Object.fromEntries(header.map((key, i) => [key, values[i]]));
    if (!data.video_id || !['baseline', 'new'].includes(data.cohort) || !['24h', '7d'].includes(data.window) ||
        !['legacy', 'structured', 'source-fallback'].includes(data.format)) throw new Error('Invalid cohort, observation window, format, or video ID.');
    const key = data.video_id + '/' + data.window;
    if (seen.has(key)) throw new Error('Duplicate video and observation window.');
    seen.add(key);
    function number(key: string, optional = false, percentage = false): number | null {
      if (!data[key] && optional) return null;
      const value = Number(data[key].replace(/%$/, ''));
      if (!data[key] || !Number.isFinite(value) || value < 0 || percentage && value > 100) throw new Error('Invalid performance value: ' + key);
      return value;
    }
    const duration = number('duration_seconds')!;
    if (!duration) throw new Error('Duration must be positive.');
    return { videoId: data.video_id, cohort: data.cohort as PerformanceRow['cohort'], window: data.window as PerformanceRow['window'],
      format: data.format as PerformanceRow['format'], topic: data.topic, duration, engagedViews: number('engaged_views')!,
      stayedToWatch: number('stayed_to_watch_percent', true, true), averageDuration: number('average_view_duration_seconds', true),
      // Replays can produce average percentage viewed greater than 100.
      averagePercentage: number('average_percentage_viewed', true), comments: number('comments')!, subscribers: number('subscribers_gained')!,
      openingDrop: number('opening_drop_percent', true, true), coreDrop: number('core_drop_percent', true, true),
      closingDrop: number('closing_drop_percent', true, true) };
  });
}

export function median(values: (number | null)[]): number | null {
  const sorted = values.filter((value): value is number => value !== null).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function performanceReport(rows: PerformanceRow[]): string {
  const lines = ['# Shorts performance review', '',
    'Compare equal observation windows. These observational results do not prove that an editing choice caused a change.', ''];
  for (const window of ['24h', '7d'] as const) {
    lines.push('## ' + window + ' observations', '',
      '| Group | Videos | Engaged views | Stayed to watch % | Average duration (s) | Average viewed % | Comments / 1,000 engaged | Subscribers / 1,000 engaged |',
      '|---|---:|---:|---:|---:|---:|---:|---:|');
    for (const group of ['baseline', 'new', 'structured', 'source-fallback']) {
      const matches = rows.filter(row => row.window === window && (group === 'baseline' || group === 'new' ?
        row.cohort === group : row.cohort === 'new' && row.format === group));
      const values = [median(matches.map(row => row.engagedViews)), median(matches.map(row => row.stayedToWatch)),
        median(matches.map(row => row.averageDuration)), median(matches.map(row => row.averagePercentage)),
        median(matches.map(row => row.engagedViews ? row.comments / row.engagedViews * 1000 : null)),
        median(matches.map(row => row.engagedViews ? row.subscribers / row.engagedViews * 1000 : null))];
      lines.push('| ' + group + ' | ' + matches.length + ' | ' + values.map(value => value === null ? '—' : value.toFixed(2)).join(' | ') + ' |');
    }
    const baseline = rows.filter(row => row.window === window && row.cohort === 'baseline').length;
    const recent = rows.filter(row => row.window === window && row.cohort === 'new').length;
    if (baseline < 10 || recent < 10) lines.push('', 'Baseline review incomplete: collect ten videos in each cohort for this window.');
    lines.push('', '| Video | Format | Topic | Opening drop % | Core drop % | Closing drop % |',
      '|---|---|---|---:|---:|---:|');
    for (const row of rows.filter(row => row.window === window)) {
      const safe = (text: string): string => text.replace(/[|\r\n]/g, ' ');
      lines.push('| ' + safe(row.videoId) + ' | ' + row.format + ' | ' + safe(row.topic) + ' | ' +
        [row.openingDrop, row.coreDrop, row.closingDrop].map(value => value === null ? '—' : value.toFixed(2)).join(' | ') + ' |');
    }
    lines.push('');
  }
  return lines.join('\n');
}
