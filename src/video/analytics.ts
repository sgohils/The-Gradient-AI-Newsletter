import axios from 'axios';
import { ExperimentState, VideoLedger, VideoMetric } from './types';

export interface AnalyticsOptions {
  zernioApiKey?: string; accountId?: string; now?: Date;
  googleClientId?: string; googleClientSecret?: string; googleRefreshToken?: string;
  client?: Pick<typeof axios, 'get' | 'post'>;
}
const dateString = (date: Date) => date.toISOString().slice(0, 10);

export function youtubeId(url?: string): string | undefined {
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    if (parsed.hostname === 'www.youtube.com' || parsed.hostname === 'youtube.com') return parsed.searchParams.get('v') || parsed.pathname.match(/^\/shorts\/([\w-]{11})/)?.[1];
    if (parsed.hostname === 'youtu.be') return parsed.pathname.slice(1);
  } catch { /* Missing IDs cannot be polled. */ }
  return undefined;
}

export async function collectAnalytics(ledger: VideoLedger, state: ExperimentState, options: AnalyticsOptions): Promise<ExperimentState> {
  const next: ExperimentState = JSON.parse(JSON.stringify(state));
  const now = options.now || new Date(); const client = options.client || axios;
  let accessToken: string | undefined;
  let googleUnavailable = false;
  let zernioUnavailable = false;
  async function googleToken(): Promise<string> {
    if (accessToken) return accessToken;
    if (googleUnavailable) throw new Error('Direct analytics is unavailable during this run.');
    if (!options.googleClientId || !options.googleClientSecret || !options.googleRefreshToken) throw new Error('Direct analytics is not configured.');
    let response;
    try { response = await client.post('https://oauth2.googleapis.com/token', new URLSearchParams({
      client_id: options.googleClientId, client_secret: options.googleClientSecret, refresh_token: options.googleRefreshToken,
      grant_type: 'refresh_token',
    }).toString(), { timeout: 10000, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }); }
    catch { googleUnavailable = true; throw new Error('Analytics authorization unavailable.'); }
    if (typeof response.data.access_token !== 'string') throw new Error('Analytics authorization unavailable.');
    accessToken = response.data.access_token; return accessToken!;
  }
  const entries = Object.entries(ledger.issues).filter(([, entry]) => entry.platforms.youtube?.status === 'published').sort(([a], [b]) => a.localeCompare(b)).slice(-60);
  let collected = 0;
  for (const [issueDate, entry] of entries) {
    const publication = entry.platforms.youtube!; const videoId = youtubeId(publication.postUrl);
    if (!videoId) continue;
    const publishedAt = new Date(publication.firstSubmittedAt || `${issueDate}T12:00:00Z`);
    const ageDays = Math.floor((now.getTime() - publishedAt.getTime()) / 86400000);
    // Snapshot the first seven UTC days only after Google's processing window.
    if (ageDays < 10 || next.metrics[issueDate]?.finalized && !next.metrics[issueDate]?.error && next.metrics[issueDate]?.engagedViews !== undefined) continue;
    if (collected++ >= 12) break;
    const fromDate = dateString(publishedAt); const toDate = dateString(new Date(publishedAt.getTime() + 6 * 86400000));
    const metric: VideoMetric = { issueDate, videoId, observedAt: now.toISOString(), finalized: false, ageDays,
      experiment: entry.experiment, duration: entry.duration };
    if (options.zernioApiKey && options.accountId && !zernioUnavailable) {
      try {
        const config = { timeout: 10000, headers: { Authorization: `Bearer ${options.zernioApiKey}` },
          params: { videoId, accountId: options.accountId, fromDate, toDate } };
        const daily = (await client.get('https://zernio.com/api/v1/analytics/youtube/daily-views', config)).data;
        const rows = daily.dailyViews || [];
        const engaged = rows.every((row: any) => Number.isFinite(row.engagedViews)) ? rows.reduce((sum: number, row: any) => sum + row.engagedViews, 0) : undefined;
        metric.views = rows.reduce((sum: number, row: any) => sum + (row.views || 0), 0);
        metric.engagedViews = engaged;
        // Never substitute public starts for engaged views when weighting Shorts.
        if (engaged && rows.length) {
          metric.averageViewDuration = rows.reduce((sum: number, row: any) => sum + row.averageViewDuration * row.engagedViews, 0) / engaged;
          metric.averageViewPercentage = rows.reduce((sum: number, row: any) => sum + row.averageViewPercentage * row.engagedViews, 0) / engaged;
        }
        const curve = (await client.get('https://zernio.com/api/v1/analytics/youtube/video-retention', config)).data;
        metric.retention = curve.retentionCurve?.filter((point: any) => Number.isFinite(point.elapsedVideoTimeRatio) && Number.isFinite(point.audienceWatchRatio))
          .slice(0, 100).map((point: any) => ({ elapsedVideoTimeRatio: point.elapsedVideoTimeRatio, audienceWatchRatio: point.audienceWatchRatio }));
        metric.duration ||= curve.durationSeconds || daily.durationSeconds;
      } catch (error: any) {
        if ([401, 402, 403, 412, 429].includes(error.response?.status)) zernioUnavailable = true;
        /* Direct read-only analytics can supply the same data for free. */
      }
    }
    if (options.googleRefreshToken) {
      try {
        const token = await googleToken();
        const base = { timeout: 10000, headers: { Authorization: `Bearer ${token}` } };
        const response = await client.get('https://youtubeanalytics.googleapis.com/v2/reports', { ...base, params: {
          ids: 'channel==MINE', startDate: fromDate, endDate: toDate, filters: `video==${videoId}`,
          metrics: 'engagedViews,views,averageViewDuration,averageViewPercentage',
        } });
        const row = response.data.rows?.[0];
        if (row) {
          const names = response.data.columnHeaders.map((column: any) => column.name);
          for (const name of ['engagedViews', 'views', 'averageViewDuration', 'averageViewPercentage'] as const) {
            const value = row[names.indexOf(name)]; if (Number.isFinite(value)) metric[name] = value;
          }
        }
        if (!metric.retention?.length) {
          const curve = await client.get('https://youtubeanalytics.googleapis.com/v2/reports', { ...base, params: {
            ids: 'channel==MINE', startDate: fromDate, endDate: toDate, filters: `video==${videoId}`,
            dimensions: 'elapsedVideoTimeRatio', metrics: 'audienceWatchRatio',
          } });
          metric.retention = (curve.data.rows || []).slice(0, 100).filter((row: number[]) => Number.isFinite(row[0]) && Number.isFinite(row[1]))
            .map((row: number[]) => ({ elapsedVideoTimeRatio: row[0], audienceWatchRatio: row[1] }));
        }
        if (!metric.duration && metric.averageViewPercentage! > 0) {
          metric.duration = metric.averageViewDuration! / (metric.averageViewPercentage! / 100);
        }
      } catch { /* Analytics never interrupts creation or publication. */ }
    }
    metric.finalized = metric.engagedViews !== undefined && Number.isFinite(metric.averageViewDuration) && Number.isFinite(metric.averageViewPercentage);
    if (!metric.finalized) metric.error = 'Finalized engaged-view analytics unavailable; keep the current format and retry automatically.';
    next.metrics[issueDate] = metric;
  }
  for (const date of Object.keys(next.metrics).sort().slice(0, -120)) delete next.metrics[date];
  return next;
}

export function analyticsReport(state: ExperimentState): { html: string; csv: string } {
  const escape = (text: string) => text.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));
  const csvValue = (value: unknown) => '"' + String(value ?? '').replace(/"/g, '""') + '"';
  const rows = Object.values(state.metrics).sort((a, b) => a.issueDate.localeCompare(b.issueDate));
  const table = rows.map(metric => `<tr><td>${escape(metric.issueDate)}</td><td>${escape(metric.experiment?.cohort || 'legacy')}</td><td>${metric.engagedViews ?? '—'}</td><td>${metric.averageViewDuration?.toFixed(1) ?? '—'}</td><td>${metric.averageViewPercentage?.toFixed(1) ?? '—'}</td><td>${escape(metric.error || 'Finalized seven-day snapshot')}</td></tr>`).join('');
  return {
    html: `<!doctype html><html><head><meta charset="utf-8"><title>The Gradient retention report</title><style>body{font:16px system-ui;max-width:1100px;margin:40px auto;padding:20px;color:#17382b}table{border-collapse:collapse;width:100%}td,th{padding:12px;border-bottom:1px solid #ddd;text-align:left}p{line-height:1.6}</style></head><body><h1>The Gradient retention report</h1><p>Current hook: ${escape(state.championHook)}. Visual beat: ${state.championBeatSeconds}s. Targets: 65–75% average viewed and 18–22s average viewing. Targets are not guarantees. Missing analytics holds experiments, never publishing.</p><table><tr><th>Edition</th><th>Format</th><th>Engaged views</th><th>Average seconds</th><th>Average %</th><th>Status</th></tr>${table}</table><h2>Automatic decisions</h2>${state.decisions.map(decision => `<p>${escape(decision.at)}: ${escape(decision.reason)}</p>`).join('') || '<p>Collecting sufficient matched evidence.</p>'}</body></html>`,
    csv: [['edition', 'cohort', 'engaged_views', 'average_seconds', 'average_percentage', 'status'].join(','),
      ...rows.map(metric => [metric.issueDate, metric.experiment?.cohort, metric.engagedViews, metric.averageViewDuration, metric.averageViewPercentage, metric.error || 'finalized'].map(csvValue).join(','))].join('\n') + '\n',
  };
}
