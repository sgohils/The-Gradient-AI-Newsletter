/** One-time, loopback-only connection helper. Credentials never reach logs or files. */
import http from 'node:http';
import { randomBytes, createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import sodium from 'libsodium-wrappers';
import { githubJwt } from '../watchdog/worker.mjs';
import { api } from './api.mjs';

const repo = 'sgohils/The-Gradient-AI-Newsletter';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const port = 8766;
const origin = `http://127.0.0.1:${port}`;
const session = process.env.GRADIENT_SETUP_SESSION || randomBytes(32).toString('hex');
const pkce = randomBytes(48).toString('base64url');
let app, google, status = 'Complete these connections once. Keep keys out of chat.';
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const field = `<input type="hidden" name="session" value="${session}">`;

function githubCredential() {
  const credential = execFileSync('git', ['credential', 'fill'], { input: 'protocol=https\nhost=github.com\n\n', encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], timeout: 15000, windowsHide: true });
  const token = credential.split(/\r?\n/).find(line => line.startsWith('password='))?.slice(9);
  if (!token) throw new Error('The existing GitHub sign-in is unavailable. Sign in to GitHub during setup.');
  return token;
}
async function saveSecrets(values) {
  await sodium.ready;
  const headers = { Authorization: `Bearer ${githubCredential()}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
  const key = await api(`https://api.github.com/repos/${repo}/actions/secrets/public-key`, { headers });
  for (const [name, value] of Object.entries(values)) {
    const sealed = sodium.to_base64(sodium.crypto_box_seal(sodium.from_string(value), sodium.from_base64(key.key, sodium.base64_variants.ORIGINAL)), sodium.base64_variants.ORIGINAL);
    await api(`https://api.github.com/repos/${repo}/actions/secrets/${name}`, { method: 'PUT', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ key_id: key.key_id, encrypted_value: sealed }) });
  }
}
async function installation() {
  if (!app) throw new Error('Create the dedicated GitHub App first.');
  const headers = { Authorization: `Bearer ${githubJwt(app.id, app.pem, new Date())}`, Accept: 'application/vnd.github+json', 'User-Agent': 'GradientSetup' };
  const installed = (await api('https://api.github.com/app/installations', { headers })).find(item => item.account?.login === 'sgohils');
  if (!installed || installed.repository_selection !== 'selected') throw new Error('Install this app on only The-Gradient-AI-Newsletter repository, then continue.');
  const token = await api(`https://api.github.com/app/installations/${installed.id}/access_tokens`, { method: 'POST', headers,
    body: JSON.stringify({ repositories: ['The-Gradient-AI-Newsletter'], permissions: { actions: 'write', contents: 'read', variables: 'read' } }) });
  const installationHeaders = { ...headers, Authorization: `Bearer ${token.token}` };
  const repositories = await api('https://api.github.com/installation/repositories', { headers: installationHeaders });
  if (repositories.total_count !== 1 || repositories.repositories?.[0]?.full_name !== repo) throw new Error('The app installation must be restricted to this repository.');
  await api(`https://api.github.com/repos/${repo}/actions/runs?per_page=1`, { headers: installationHeaders });
  await api(`https://api.github.com/repos/${repo}/actions/variables`, { headers: installationHeaders });
  await api(`https://api.github.com/repos/${repo}/contents/video-state/ledger.json`, { headers: installationHeaders });
  return String(installed.id);
}
async function deploy(accountId, token) {
  if (!/^[a-f0-9]{32}$/.test(accountId)) throw new Error('Enter the 32-character Cloudflare account ID.');
  const installationId = await installation();
  const headers = { Authorization: `Bearer ${token}` };
  const base = `https://api.cloudflare.com/client/v4/accounts/${accountId}`;
  const subscriptions = await api(`${base}/subscriptions`, { headers });
  if (!subscriptions.success || !Array.isArray(subscriptions.result)) throw new Error('Free account status could not be checked.');
  if (subscriptions.result.some(item => /workers/i.test(JSON.stringify(item.rate_plan)) &&
      (/paid|standard|unbound/i.test(JSON.stringify(item.rate_plan)) || Number(item.price || item.rate_plan?.price || 0) > 0))) {
    throw new Error('This account has a paid Workers subscription. Use a Workers Free account; setup never changes billing.');
  }
  const metadata = { main_module: 'worker.mjs', compatibility_date: '2026-10-06', compatibility_flags: ['nodejs_compat'],
    bindings: [{ name: 'COORDINATOR', type: 'durable_object_namespace', class_name: 'RecoveryCoordinator' }, { name: 'PAUSED', type: 'secret_text', text: 'true' },
      ...Object.entries({ GITHUB_APP_ID: String(app.id), GITHUB_APP_PRIVATE_KEY: app.pem, GITHUB_INSTALLATION_ID: installationId }).map(([name, text]) => ({ name, text, type: 'secret_text' }))],
    migrations: { new_tag: 'v1', new_sqlite_classes: ['RecoveryCoordinator'] } };
  const form = new FormData();
  form.set('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.set('worker.mjs', new Blob([readFileSync(resolve(root, 'automation/watchdog/worker.mjs'))], { type: 'application/javascript+module' }), 'worker.mjs');
  const uploaded = await api(`${base}/workers/scripts/gradient-video-watchdog`, { method: 'PUT', headers, body: form });
  if (!uploaded.success) throw new Error('Worker deployment was rejected; no schedule was activated.');
  const scheduled = await api(`${base}/workers/scripts/gradient-video-watchdog/schedules`, { method: 'PUT',
    headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify([{ cron: '*/15 * * * *' }]) });
  if (!scheduled.success) throw new Error('The independent schedule was not installed.');
  // Deployment remains paused until the one-time launch approval.
  await saveSecrets({ CLOUDFLARE_ACCOUNT_ID: accountId, CLOUDFLARE_API_TOKEN: token });
  mkdirSync(resolve(root, '.cache/setup'), { recursive: true });
  writeFileSync(resolve(root, '.cache/setup/watchdog.json'), JSON.stringify({ checkedAt: new Date().toISOString(), deployed: true, paused: true, appTokenVerified: true, schedule: '*/15 * * * *', freePlanVerified: true }, null, 2));
  status = 'Independent recovery is deployed and tested, and remains paused until launch approval. Its GitHub tokens renew automatically.';
}
function page() {
  const manifest = { name: `Gradient Shorts Recovery ${session.slice(0, 6)}`, url: `https://github.com/${repo}`,
    hook_attributes: { url: `https://github.com/${repo}`, active: false }, redirect_url: `${origin}/github/callback`, setup_url: `${origin}/installed?state=${session}`,
    public: false, default_permissions: { actions: 'write', contents: 'read', variables: 'read' }, default_events: [] };
  return `<!doctype html><html><head><meta charset="utf-8"><title>The Gradient setup</title><style>body{font:17px system-ui;max-width:840px;margin:40px auto;padding:20px;background:#f4f7f0;color:#193d2d}section{background:white;padding:24px;margin:24px 0;border-radius:16px}label{display:block;margin:18px 0}input{display:block;width:96%;padding:12px;font:inherit}button{font:inherit;background:#193d2d;color:white;padding:14px 20px;border:0;border-radius:8px}p{line-height:1.6}a{color:#193d2d}</style></head><body><h1>One setup, automatic videos afterward</h1><p>${escape(status)}</p>
    <section><h2>1. Independent recovery</h2><p>Create a dedicated GitHub App, then install it on <b>only The-Gradient-AI-Newsletter</b>. It can start recovery runs and read pipeline state. It cannot change repository content.</p>
    ${app ? `<p>App created. <a href="${escape(app.html_url)}/installations/new" target="_blank" rel="noreferrer">Install on this repository</a></p>` : `<form method="post" action="https://github.com/settings/apps/new?state=${session}"><input type="hidden" name="manifest" value="${escape(JSON.stringify(manifest))}"><button>Create dedicated GitHub App</button></form>`}
    <p>Use a <a href="https://dash.cloudflare.com/" target="_blank" rel="noreferrer">Workers Free account</a>. Create an account-scoped API token with <b>Workers Scripts Edit</b> and <b>Billing Read</b> permissions, with no expiration. Billing Read only verifies that Workers is free; it cannot change billing. No billing upgrade is required.</p>
    <form method="post" action="/cloudflare">${field}<label>Cloudflare account ID<input name="accountId" required pattern="[a-f0-9]{32}" autocomplete="off"></label><label>Scoped Cloudflare API token<input name="token" type="password" required autocomplete="off"></label><button>Test and install paused recovery</button></form></section>
    <section><h2>2. Free read-only YouTube analytics</h2><p>In <a href="https://console.cloud.google.com/" target="_blank" rel="noreferrer">Google Cloud</a>, enable YouTube Analytics API. Create a Web application OAuth client with redirect URI <b>${origin}/google/callback</b>. Set its consent screen publishing status to <b>Production</b> before connecting. Use the channel owner account for the consent step.</p>
    <form method="post" action="/google">${field}<label>OAuth client ID<input name="clientId" required autocomplete="off"></label><label>OAuth client secret<input name="clientSecret" type="password" required autocomplete="off"></label><label><input style="width:auto;display:inline" type="checkbox" name="production" required> My OAuth consent screen is in Production</label><button>Connect read-only analytics</button></form></section>
    <p>Keys are held in memory and saved encrypted in GitHub Secrets or Cloudflare Worker secrets. Nothing is published by this helper. Close it after setup.</p></body></html>`;
}
const server = http.createServer(async (request, response) => {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Referrer-Policy', 'no-referrer');
  response.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; form-action 'self' https://github.com; frame-ancestors 'none'; base-uri 'none'");
  try {
    if (request.headers.host !== `127.0.0.1:${port}`) throw new Error('Use the loopback setup address.');
    const url = new URL(request.url, origin);
    const cookie = request.headers.cookie?.split(';').some(item => item.trim() === `gradient_setup=${session}`);
    if (url.searchParams.get('session') === session) response.setHeader('Set-Cookie', `gradient_setup=${session}; HttpOnly; SameSite=Lax; Path=/`);
    if (!cookie && url.searchParams.get('session') !== session && url.searchParams.get('state') !== session) {
      response.writeHead(401, { 'Content-Type': 'text/plain' }); response.end('Open the setup address printed in the terminal.'); return;
    }
    if (request.method === 'POST') {
      if (request.headers.origin !== origin) throw new Error('Setup forms must come from this local page.');
      let body = ''; for await (const chunk of request) { body += chunk; if (body.length > 20000) throw new Error('Setup form is too large.'); }
      const values = new URLSearchParams(body);
      if (values.get('session') !== session) throw new Error('Setup session does not match.');
      if (url.pathname === '/cloudflare') await deploy(values.get('accountId')?.trim(), values.get('token')?.trim());
      else if (url.pathname === '/google') {
        if (values.get('production') !== 'on') throw new Error('Production OAuth is required for unattended refresh.');
        google = { clientId: values.get('clientId')?.trim(), clientSecret: values.get('clientSecret')?.trim() };
        const authorize = new URL('https://accounts.google.com/o/oauth2/v2/auth');
        authorize.search = new URLSearchParams({ client_id: google.clientId, redirect_uri: `${origin}/google/callback`, response_type: 'code', scope: 'https://www.googleapis.com/auth/yt-analytics.readonly',
          access_type: 'offline', prompt: 'consent', state: session, code_challenge: createHash('sha256').update(pkce).digest('base64url'), code_challenge_method: 'S256' }).toString();
        response.writeHead(303, { Location: authorize.toString() }); response.end(); return;
      } else throw new Error('Unknown setup action.');
    } else if (url.pathname === '/github/callback') {
      if (url.searchParams.get('state') !== session || !/^[a-zA-Z0-9]+$/.test(url.searchParams.get('code') || '')) throw new Error('GitHub callback did not match this setup session.');
      app = await api(`https://api.github.com/app-manifests/${url.searchParams.get('code')}/conversions`, { method: 'POST', headers: { Accept: 'application/vnd.github+json' } });
      status = 'GitHub App created. Install it on this repository, then enter the Cloudflare account and scoped token below.';
    } else if (url.pathname === '/google/callback') {
      if (!google || url.searchParams.get('state') !== session || !url.searchParams.get('code')) throw new Error('Google authorization was not completed.');
      const token = await api('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({
        client_id: google.clientId, client_secret: google.clientSecret, code: url.searchParams.get('code'), code_verifier: pkce, redirect_uri: `${origin}/google/callback`, grant_type: 'authorization_code',
      }) });
      if (!token.refresh_token) throw new Error('Google did not return an offline refresh token.');
      const report = new URL('https://youtubeanalytics.googleapis.com/v2/reports'); report.search = new URLSearchParams({ ids: 'channel==MINE', startDate: new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10),
        endDate: new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10), metrics: 'engagedViews,views,averageViewDuration,averageViewPercentage' }).toString();
      const metrics = await api(report, { headers: { Authorization: `Bearer ${token.access_token}` } });
      if (!metrics.columnHeaders?.some(column => column.name === 'engagedViews')) throw new Error('Engaged-view analytics could not be verified.');
      const refreshed = await api('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({
        client_id: google.clientId, client_secret: google.clientSecret, refresh_token: token.refresh_token, grant_type: 'refresh_token' }) });
      if (!refreshed.access_token) throw new Error('Automatic token renewal could not be verified.');
      await saveSecrets({ YOUTUBE_ANALYTICS_CLIENT_ID: google.clientId, YOUTUBE_ANALYTICS_CLIENT_SECRET: google.clientSecret, YOUTUBE_ANALYTICS_REFRESH_TOKEN: token.refresh_token });
      google = undefined; status = 'Read-only analytics and automatic token refresh are verified. The credentials are encrypted in GitHub Secrets.';
    }
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); response.end(page());
  } catch (error) {
    // Only controlled errors are shown. Provider response bodies/configurations stay private.
    status = error instanceof Error && !error.cause ? error.message.slice(0, 220) : 'Connection could not be completed. Retry this initial setup step.';
    response.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' }); response.end(page());
  }
});
server.listen(port, '127.0.0.1', () => console.log(`One-time setup: ${origin}/?session=${session}`));
