/** Runs once after launch approval; no subscription or credential creation. */
const account = process.env.CLOUDFLARE_ACCOUNT_ID;
const token = process.env.CLOUDFLARE_API_TOKEN;
if (!/^[a-f0-9]{32}$/.test(account || '') || !token) throw new Error('Cloudflare setup has not been completed.');
const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/workers/scripts/gradient-video-watchdog/secrets`, {
  method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'PAUSED', text: 'false', type: 'secret_text' }), signal: AbortSignal.timeout(20000),
});
if (!response.ok || !(await response.json()).success) throw new Error('Independent recovery activation failed.');
console.log('Independent recovery activated; no future owner actions are scheduled.');
