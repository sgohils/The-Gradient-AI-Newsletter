import axios from 'axios';
import { collectVisuals, readLibrary } from './visuals';
import { youtubeId } from './analytics';
import { VideoLedger } from './types';

export interface SetupResult { checkedAt: string; publishing: string; zernioAnalytics: string; directAnalytics: string; imagery: string; ready: boolean; }
export async function checkSetup(ledger: VideoLedger, directory: string, env: NodeJS.ProcessEnv = process.env,
  client: Pick<typeof axios, 'get' | 'post'> = axios): Promise<SetupResult> {
  const result: SetupResult = { checkedAt: new Date().toISOString(), publishing: 'missing-connection', zernioAnalytics: 'not-tested', directAnalytics: 'missing-connection', imagery: 'not-tested', ready: false };
  const headers = { Authorization: `Bearer ${env.ZERNIO_API_KEY}` };
  const published = Object.entries(ledger.issues).filter(([, entry]) => entry.platforms.youtube?.status === 'published');
  if (env.ZERNIO_API_KEY && env.ZERNIO_YOUTUBE_ACCOUNT_ID) {
    try {
      const data = (await client.get('https://zernio.com/api/v1/accounts', { timeout: 15000, headers })).data;
      const account = data.accounts?.find((item: any) => item._id === env.ZERNIO_YOUTUBE_ACCOUNT_ID && item.platform === 'youtube' && item.isActive !== false);
      result.publishing = account ? 'connected' : 'account-unavailable';
      const existing = published.find(([, entry]) => entry.platforms.youtube?.accountId === env.ZERNIO_YOUTUBE_ACCOUNT_ID);
      if (account && existing?.[1].platforms.youtube?.postId) {
        const post = (await client.get(`https://zernio.com/api/v1/posts/${encodeURIComponent(existing[1].platforms.youtube.postId!)}`, { timeout: 15000, headers })).data.post;
        if (post?.platforms?.some((item: any) => item.platform === 'youtube' && item.status === 'published')) result.publishing = 'connected-and-existing-publication-verified';
      }
    } catch (error: any) { result.publishing = `unavailable-http-${error.response?.status || 'network'}`; }
    const id = published.map(([, entry]) => youtubeId(entry.platforms.youtube?.postUrl)).find(Boolean);
    if (id) {
      const params = { videoId: id, accountId: env.ZERNIO_YOUTUBE_ACCOUNT_ID };
      try {
        const daily = (await client.get('https://zernio.com/api/v1/analytics/youtube/daily-views', { timeout: 15000, headers, params })).data;
        const curve = (await client.get('https://zernio.com/api/v1/analytics/youtube/video-retention', { timeout: 15000, headers, params })).data;
        result.zernioAnalytics = daily.scopeStatus?.hasAnalyticsScope !== false && curve.scopeStatus?.hasAnalyticsScope !== false ?
          daily.dailyViews?.some((row: any) => Number.isFinite(row.engagedViews)) ? 'ready-with-engaged-views' : 'accessible-engaged-views-missing-use-direct-backup' : 'reauthorization-required';
      } catch (error: any) { result.zernioAnalytics = `unavailable-http-${error.response?.status || 'network'}`; }
    } else result.zernioAnalytics = 'no-published-video-to-test';
  }
  if (env.YOUTUBE_ANALYTICS_CLIENT_ID && env.YOUTUBE_ANALYTICS_CLIENT_SECRET && env.YOUTUBE_ANALYTICS_REFRESH_TOKEN) {
    try {
      const token = (await client.post('https://oauth2.googleapis.com/token', new URLSearchParams({
        client_id: env.YOUTUBE_ANALYTICS_CLIENT_ID, client_secret: env.YOUTUBE_ANALYTICS_CLIENT_SECRET,
        refresh_token: env.YOUTUBE_ANALYTICS_REFRESH_TOKEN, grant_type: 'refresh_token',
      }).toString(), { timeout: 15000, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })).data;
      const end = new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10);
      const start = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
      const response = (await client.get('https://youtubeanalytics.googleapis.com/v2/reports', { timeout: 15000,
        headers: { Authorization: `Bearer ${token.access_token}` }, params: { ids: 'channel==MINE', startDate: start, endDate: end,
          metrics: 'engagedViews,views,averageViewDuration,averageViewPercentage' } })).data;
      result.directAnalytics = ['engagedViews', 'averageViewDuration', 'averageViewPercentage'].every(name => response.columnHeaders?.some((column: any) => column.name === name)) ? 'refresh-and-metrics-verified' : 'required-metrics-unavailable';
    } catch (error: any) { result.directAnalytics = `unavailable-http-${error.response?.status || 'network'}`; }
  }
  try {
    const library = readLibrary();
    await collectVisuals({ id: 'setup-check', rank: 1, title: 'Computer research', sourceName: 'Setup fixture', sourceUrl: 'https://example.com/setup',
      publishedAt: result.checkedAt, summary: '', sourceExcerpt: '' }, directory, { offline: true });
    result.imagery = `offline-library-verified-${library.length}-photos`;
  } catch { result.imagery = 'library-invalid'; }
  result.ready = result.publishing === 'connected-and-existing-publication-verified' && result.imagery.startsWith('offline-library-verified') &&
    (result.zernioAnalytics === 'ready-with-engaged-views' || result.directAnalytics === 'refresh-and-metrics-verified');
  return result;
}
