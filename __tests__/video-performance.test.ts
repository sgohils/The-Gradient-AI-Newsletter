import { describe, expect, it } from 'vitest';
import { median, parsePerformanceCsv, performanceReport } from '../src/video/performance';

const header = 'video_id,cohort,window,format,topic,duration_seconds,engaged_views,stayed_to_watch_percent,average_view_duration_seconds,average_percentage_viewed,comments,subscribers_gained,opening_drop_percent,core_drop_percent,closing_drop_percent';
describe('manual Shorts analytics comparisons', () => {
  it('parses quoted topics, missing retention, percentages, and replay viewing over 100 percent', () => {
    const [row] = parsePerformanceCsv(header + '\na,new,24h,structured,"AI, code",40,1000,75%,42,105,20,5,12,,8');
    expect(row.topic).toBe('AI, code');
    expect(row.averagePercentage).toBe(105);
    expect(row.coreDrop).toBeNull();
    expect(row.stayedToWatch).toBe(75);
  });
  it('keeps observation windows and fallback cohorts separate and uses per-video medians', () => {
    const rows = parsePerformanceCsv(header +
      '\na,baseline,24h,legacy,AI,40,100,50,20,50,2,1,,,' +
      '\nb,new,24h,structured,Code,40,1000,75,36,90,20,5,,,' +
      '\nc,new,24h,source-fallback,Robots,40,0,,,,0,0,,,' +
      '\nb,new,7d,structured,Code,40,5000,78,37,92,50,10,,,');
    const report = performanceReport(rows);
    expect(report).toContain('| structured | 1 | 1000.00 | 75.00 | 36.00 | 90.00 | 20.00 | 5.00 |');
    expect(report).toContain('| source-fallback | 1 | 0.00 | — | — | — | — | — |');
    expect(report).toContain('5000.00');
    expect(report).toContain('collect ten videos');
    expect(report).not.toContain('Infinity');
    expect(median([100, 2, 4, null])).toBe(4);
    expect(median([2, 4])).toBe(3);
  });
  it('rejects duplicate windows, invalid percentages, missing columns, and malformed quotes', () => {
    const row = 'a,new,24h,structured,AI,40,100,75,36,90,2,1,,,';
    expect(() => parsePerformanceCsv(header + '\n' + row + '\n' + row)).toThrow('Duplicate');
    expect(() => parsePerformanceCsv(header + '\n' + row.replace(',75,', ',101,'))).toThrow('Invalid performance');
    expect(() => parsePerformanceCsv('video_id\nx')).toThrow('header');
    expect(() => parsePerformanceCsv(header + '\n"unfinished')).toThrow('quote');
  });
});
