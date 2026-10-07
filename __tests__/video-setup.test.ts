import { describe, expect, it, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { checkSetup } from '../src/video/setup';
import { sampleInput } from '../src/video/sample';

describe('one-time connection verification', () => {
  it('verifies existing posts and free direct analytics without creating any upload', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gradient-setup-'));
    const ledger = { version: 1 as const, issues: { '2026-10-04': { story: sampleInput().stories[0], selectedAt: '2026-10-04T12:00:00Z',
      platforms: { youtube: { accountId: 'yt', status: 'published' as const, idempotencyKey: 'existing', postId: 'known', postUrl: 'https://youtu.be/abcdefghijk' } } } } };
    const client = {
      get: vi.fn(async (url: string) => {
        if (url.endsWith('/accounts')) return { data: { accounts: [{ _id: 'yt', platform: 'youtube', isActive: true }] } };
        if (url.endsWith('/posts/known')) return { data: { post: { platforms: [{ platform: 'youtube', status: 'published' }] } } };
        if (url.startsWith('https://zernio.com')) throw { response: { status: 402 } };
        return { data: { columnHeaders: ['engagedViews', 'averageViewDuration', 'averageViewPercentage'].map(name => ({ name })), rows: [] } };
      }), post: vi.fn(async () => ({ data: { access_token: 'temporary' } })),
    };
    try {
      const result = await checkSetup(ledger, root, { ZERNIO_API_KEY: 'fake', ZERNIO_YOUTUBE_ACCOUNT_ID: 'yt',
        YOUTUBE_ANALYTICS_CLIENT_ID: 'fake', YOUTUBE_ANALYTICS_CLIENT_SECRET: 'fake', YOUTUBE_ANALYTICS_REFRESH_TOKEN: 'fake' }, client as any);
      expect(result.ready).toBe(true); expect(result.zernioAnalytics).toBe('unavailable-http-402');
      expect(result.directAnalytics).toBe('refresh-and-metrics-verified');
      expect(client.post.mock.calls.every(call => (call as any[])[0] === 'https://oauth2.googleapis.com/token')).toBe(true);
      expect(JSON.stringify(result)).not.toContain('fake');
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
  });
});
