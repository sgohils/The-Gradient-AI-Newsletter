import { describe, expect, it, vi } from 'vitest';
import { generateKeyPairSync, verify } from 'node:crypto';
import { easternTime, githubJwt, runWatchdog, RecoveryCoordinator } from '../automation/watchdog/worker.mjs';

const pem = generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey.export({ format: 'pem', type: 'pkcs8' }).toString();
let installation = 0;
function setup(entry?: object) {
  const values = new Map<string, any>();
  const env = { GITHUB_APP_ID: '123', GITHUB_APP_PRIVATE_KEY: pem, GITHUB_INSTALLATION_ID: String(++installation),
    STATE: { get: async (key: string) => values.get(key), put: async (key: string, value: string) => { values.set(key, JSON.parse(value)); } } };
  const fetcher = vi.fn(async (url: string, options?: any) => {
    if (url.includes('/access_tokens')) return Response.json({ token: 'ephemeral', expires_at: '2026-10-06T17:00:00Z' });
    if (url.includes('/variables')) return Response.json({ variables: [{ name: 'VIDEO_ENABLED', value: 'true' }] });
    if (url.includes('/actions/runs')) return Response.json({ workflow_runs: [] });
    if (url.includes('/contents/posts/')) return Response.json({ size: 100 });
    if (url.includes('/contents/')) return Response.json({ content: Buffer.from(JSON.stringify({ issues: { '2026-10-06': entry } })).toString('base64') });
    if (options?.method === 'POST') return new Response(null, { status: 204 });
    throw new Error(`Unexpected URL ${url}`);
  });
  return { env, fetcher, values };
}
const now = new Date('2026-10-06T15:00:00Z');
describe('independent recovery watchdog', () => {
  it('targets Eastern dates and hours through both daylight-saving transitions', () => {
    expect(easternTime(new Date('2026-03-08T11:00:00Z'))).toEqual({ issueDate: '2026-03-08', hour: 7 });
    expect(easternTime(new Date('2026-11-01T12:00:00Z'))).toEqual({ issueDate: '2026-11-01', hour: 7 });
    expect(easternTime(new Date('2026-10-07T03:00:00Z'))).toEqual({ issueDate: '2026-10-06', hour: 23 });
  });
  it('signs short-lived app authentication and renews installation tokens without user input', async () => {
    const jwt = githubJwt('123', pem, now); const parts = jwt.split('.');
    expect(verify('RSA-SHA256', Buffer.from(parts.slice(0, 2).join('.')), pem, Buffer.from(parts[2], 'base64url'))).toBe(true);
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    expect(payload.exp - payload.iat).toBe(600);
    const { env, fetcher } = setup({ platforms: { youtube: { status: 'published' } } });
    await runWatchdog(env, now, fetcher); await runWatchdog(env, new Date('2026-10-06T16:00:00Z'), fetcher);
    expect(fetcher.mock.calls.filter(([url]) => url.includes('/access_tokens'))).toHaveLength(1);
    await runWatchdog(env, new Date('2026-10-06T17:00:00Z'), fetcher);
    expect(fetcher.mock.calls.filter(([url]) => url.includes('/access_tokens'))).toHaveLength(2);
  });
  it('never dispatches completed, quarantined, paused or active editions', async () => {
    for (const entry of [{ platforms: { youtube: { status: 'published' } } }, { quarantineReason: 'uncertain' }]) {
      const { env, fetcher } = setup(entry); await runWatchdog(env, now, fetcher);
      expect(fetcher.mock.calls.some(([url]) => url.includes('/dispatches'))).toBe(false);
    }
    const { env, fetcher } = setup();
    expect((await runWatchdog({ ...env, PAUSED: 'true' }, now, fetcher)).status).toContain('paused'); expect(fetcher).not.toHaveBeenCalled();
    fetcher.mockImplementation(async (url: string) => {
      if (url.includes('/access_tokens')) return Response.json({ token: 'ephemeral', expires_at: '2026-10-06T17:00:00Z' });
      if (url.includes('/variables')) return Response.json({ variables: [{ name: 'VIDEO_ENABLED', value: 'true' }] });
      return Response.json({ workflow_runs: [{ name: 'Daily Newsletter Publisher', status: 'in_progress' }] });
    });
    expect((await runWatchdog(env, now, fetcher)).status).toBe('pipeline-active');
  });
  it('reserves uncertain dispatches, enforces cooldown, and caps recovery at six', async () => {
    const { env, fetcher, values } = setup();
    await runWatchdog(env, now, fetcher); await runWatchdog(env, now, fetcher);
    expect(fetcher.mock.calls.filter(([url]) => url.includes('/dispatches'))).toHaveLength(1);
    values.set('recovery:2026-10-06', { attempts: 6, lastDispatch: 0 });
    expect((await runWatchdog(env, now, fetcher)).status).toBe('recovery-budget-or-cooldown');
    values.delete('recovery:2026-10-06');
    fetcher.mockImplementationOnce(async () => Response.json({ variables: [{ name: 'VIDEO_ENABLED', value: 'true' }] }));
    // Reservation remains durable even when the dispatch response is lost.
    const original = fetcher.getMockImplementation()!;
    fetcher.mockImplementation(async (url: string, options?: any) => { if (url.includes('/dispatches')) throw new Error('lost response'); return original(url, options); });
    await expect(runWatchdog(env, now, fetcher)).rejects.toThrow('lost response');
    expect(values.get('recovery:2026-10-06').attempts).toBe(1);
  });
  it('serializes duplicate cron deliveries using strongly consistent storage', async () => {
    const { env, fetcher } = setup(); const storage = new Map<string, any>();
    const coordinator = new RecoveryCoordinator({ storage: {
      get: async (key: string) => storage.get(key), put: async (key: string, value: any) => { storage.set(key, value); },
      list: async () => new Map([...storage].filter(([key]) => key.startsWith('recovery:'))), delete: async (key: string) => storage.delete(key),
    } }, env);
    vi.stubGlobal('fetch', fetcher);
    try {
      const request = () => new Request('https://watchdog.internal/check', { method: 'POST', body: JSON.stringify({ scheduledTime: now.getTime() }) });
      await Promise.all([coordinator.fetch(request()), coordinator.fetch(request())]);
      expect(fetcher.mock.calls.filter(([url]) => url.includes('/dispatches'))).toHaveLength(1);
    } finally { vi.unstubAllGlobals(); }
  });
  it('still recovers a missing newsletter when video publication is already complete', async () => {
    const { env, fetcher } = setup({ platforms: { youtube: { status: 'published' } } });
    const original = fetcher.getMockImplementation()!;
    fetcher.mockImplementation(async (url: string, options?: any) => url.includes('/contents/posts/') ? new Response(null, { status: 404 }) : original(url, options));
    expect((await runWatchdog(env, now, fetcher)).status).toBe('dispatched');
  });
});
