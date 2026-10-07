import { createPrivateKey, sign } from 'node:crypto';

const repo = 'sgohils/The-Gradient-AI-Newsletter';
const api = `https://api.github.com/repos/${repo}`;
let cachedToken;
let privateKey;
const base64url = value => Buffer.from(value).toString('base64url');

export function easternTime(now) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23',
  }).formatToParts(now).map(part => [part.type, part.value]));
  return { issueDate: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour) };
}

export function githubJwt(appId, pem, now) {
  if (!privateKey || privateKey.pem !== pem) privateKey = { pem, key: createPrivateKey(pem) };
  const timestamp = Math.floor(now.getTime() / 1000);
  const payload = `${base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${base64url(JSON.stringify({ iat: timestamp - 60, exp: timestamp + 540, iss: String(appId) }))}`;
  return `${payload}.${sign('RSA-SHA256', Buffer.from(payload), privateKey.key).toString('base64url')}`;
}

async function token(env, now, fetcher) {
  if (cachedToken && cachedToken.installation === env.GITHUB_INSTALLATION_ID && cachedToken.app === env.GITHUB_APP_ID && cachedToken.expires > now.getTime() + 60000) return cachedToken.value;
  const jwt = githubJwt(env.GITHUB_APP_ID, env.GITHUB_APP_PRIVATE_KEY, now);
  const response = await fetcher(`https://api.github.com/app/installations/${env.GITHUB_INSTALLATION_ID}/access_tokens`, {
    signal: AbortSignal.timeout(10000),
    method: 'POST', headers: { Authorization: `Bearer ${jwt}`, Accept: 'application/vnd.github+json', 'User-Agent': 'GradientWatchdog' },
    body: JSON.stringify({ repositories: ['The-Gradient-AI-Newsletter'], permissions: { actions: 'write', contents: 'read', variables: 'read' } }),
  });
  if (!response.ok) throw new Error(`GitHub App authentication failed (${response.status}).`);
  const result = await response.json();
  if (!result.token || !result.expires_at) throw new Error('GitHub App returned an invalid token.');
  cachedToken = { value: result.token, expires: Date.parse(result.expires_at), installation: env.GITHUB_INSTALLATION_ID, app: env.GITHUB_APP_ID }; return cachedToken.value;
}

/** One strongly consistent coordinator serializes duplicate cron deliveries. */
export class RecoveryCoordinator {
  constructor(state, env) { this.state = state; this.env = env; this.pending = Promise.resolve(); }
  async fetch(request) {
    if (request.method === 'GET') return Response.json(await this.state.storage.get('health') || { status: 'not-checked-yet' });
    const scheduled = new Date((await request.json()).scheduledTime);
    if (!Number.isFinite(scheduled.getTime())) return new Response('Invalid scheduled time', { status: 400 });
    const check = async () => {
      const cutoff = easternTime(new Date(scheduled.getTime() - 3 * 86400000)).issueDate;
      const keys = await this.state.storage.list({ prefix: 'recovery:' });
      for (const key of keys.keys()) if (key.slice(9) < cutoff) await this.state.storage.delete(key);
      const STATE = { get: key => this.state.storage.get(key), put: (key, value) => this.state.storage.put(key, JSON.parse(value)) };
      const result = await runWatchdog({ ...this.env, STATE }, scheduled);
      await this.state.storage.put('health', { ...result, checkedAt: scheduled.toISOString() });
      return Response.json(result);
    };
    const result = this.pending.then(check);
    this.pending = result.catch(() => undefined);
    return result;
  }
}

export async function runWatchdog(env, now = new Date(), fetcher = fetch) {
  const { issueDate, hour } = easternTime(now);
  if (env.PAUSED === 'true' || hour < 7 || hour >= 23) return { status: 'paused-or-outside-window', issueDate };
  if (!env.STATE || !env.GITHUB_APP_ID || !env.GITHUB_APP_PRIVATE_KEY || !env.GITHUB_INSTALLATION_ID) return { status: 'setup-incomplete', issueDate };
  const access = await token(env, now, fetcher);
  const headers = { Authorization: `Bearer ${access}`, Accept: 'application/vnd.github+json', 'User-Agent': 'GradientWatchdog', 'X-GitHub-Api-Version': '2022-11-28' };
  async function read(url) {
    const response = await fetcher(url, { headers, signal: AbortSignal.timeout(10000) });
    if (response.status === 404) return undefined;
    if (!response.ok) throw new Error(`Repository check failed (${response.status}).`);
    return response.json();
  }
  const variables = await read(`${api}/actions/variables`);
  const vars = Object.fromEntries((variables?.variables || []).map(variable => [variable.name, variable.value]));
  if (vars.VIDEO_AUTOPILOT_PAUSED === 'true' || vars.VIDEO_ENABLED !== 'true') return { status: 'explicitly-paused', issueDate };
  const runs = await read(`${api}/actions/runs?per_page=30`);
  if ((runs?.workflow_runs || []).some(run => ['queued', 'in_progress', 'waiting', 'pending', 'requested'].includes(run.status) &&
      ['Daily Newsletter Publisher', 'Video preview and activation check'].includes(run.name))) return { status: 'pipeline-active', issueDate };
  const ledger = await read(`${api}/contents/video-state/ledger.json?ref=main`);
  const decoded = ledger?.content ? JSON.parse(Buffer.from(ledger.content.replace(/\s/g, ''), 'base64').toString('utf8')) : undefined;
  const markdown = await read(`${api}/contents/posts/${issueDate}.md?ref=main`);
  const html = await read(`${api}/contents/posts/${issueDate}.html?ref=main`);
  const newsletterComplete = markdown?.size > 0 && html?.size > 0;
  if (decoded?.youtubePause && newsletterComplete) return { status: 'publication-paused', issueDate };
  const entry = decoded?.issues?.[issueDate];
  if (entry?.platforms?.youtube?.status === 'published' && newsletterComplete) return { status: 'complete', issueDate };
  if (entry?.quarantineReason && newsletterComplete) return { status: 'quarantined', issueDate };
  const key = `recovery:${issueDate}`;
  const state = await env.STATE.get(key, 'json') || { attempts: 0, lastDispatch: 0 };
  if (state.attempts >= 6 || now.getTime() - state.lastDispatch < 30 * 60000) return { status: 'recovery-budget-or-cooldown', issueDate };
  // Reserve before dispatch. A lost HTTP response cannot cause a burst of runs.
  await env.STATE.put(key, JSON.stringify({ attempts: state.attempts + 1, lastDispatch: now.getTime() }), { expirationTtl: 3 * 86400 });
  const response = await fetcher(`${api}/actions/workflows/daily-publish.yml/dispatches`, {
    signal: AbortSignal.timeout(10000),
    method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ref: 'main', inputs: { issue_date: issueDate } }),
  });
  if (!response.ok) throw new Error(`Recovery dispatch failed (${response.status}).`);
  return { status: 'dispatched', issueDate, attempt: state.attempts + 1 };
}

export default {
  async scheduled(controller, env, ctx) {
    if (!env.COORDINATOR) { console.error('Watchdog coordinator is not configured.'); return; }
    const stub = env.COORDINATOR.get(env.COORDINATOR.idFromName('gradient-daily-recovery'));
    ctx.waitUntil(stub.fetch('https://watchdog.internal/check', { method: 'POST', body: JSON.stringify({ scheduledTime: controller.scheduledTime }) })
      .then(async response => { if (!response.ok) throw new Error(`Watchdog check failed (${response.status}).`); console.log(JSON.stringify(await response.json())); })
      .catch(error => console.error(error.message)));
  },
  async fetch() { return new Response('The Gradient watchdog is running. Recovery is scheduled, not exposed over HTTP.'); },
};
