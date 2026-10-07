# Automatic Shorts

Daily production targets **7 AM America/New_York**, including daylight saving time. Rendering follows the newsletter. Initial account setup and launch approval happen once; future image selection, reviews, analytics exports, experiments, maintenance, and reruns require no routine owner work.

## Current format

Standard editions use 25–30 seconds and 55–65 words; simpler editions use 18–24 seconds and 38–50 words. Narration and real imagery start immediately. Supported hooks, concrete details, and a grounded takeaway replace feed metadata and academic boilerplate. Research limitations remain in the explanation. Eight to twelve visual beats use full-screen licensed imagery, camera movement, edited headings, small branding, and synchronized captions.

Titles are separate from narration. Every sentence carries an exact source quote. The existing free Groq connection makes at most two requests per edition: writer, then evidence editor. The allowance is committed before requests, so recovery cannot reset it. Invalid drafts try other candidates and complete source-clause templates. Unsupported figures, names, unrelated claims, broken grammar, raw URLs and LaTeX are rejected. These checks reduce errors but cannot prove every paraphrase correct.

## Images require no new API key

Pexels is optional for existing keys. [New key issuance is paused](https://help.pexels.com/hc/en-us/articles/900004904026-How-do-I-get-an-API-key).

The pipeline checks selected source pages for individually permitted assets, then a narrow Wikimedia license subset, then its permanent library of fourteen licensed photos. Supported terms are public domain, CC0, and CC BY. Unlicensed product screenshots, og:image thumbnails, unknown permissions, and unsupported licenses are excluded. Context images are labeled illustrative; they are never evidence of the actual product or event. Source, creator, license, attribution, usage, and checksum are retained and credited. [Wikimedia guidance](https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia/en)

Photos cap at 4 MB, clips at 12 MB, and images at 40 million pixels. At most two clips are selected, preserving photo recovery. The disposable cache caps at 100 MB and fourteen days. Submitted edition media stays in its exact artifact.

## Complete once today

Run `npm run video:connect` and open its printed loopback URL. The helper listens only on 127.0.0.1:8766, masks credential fields, rejects other hosts and unauthorized forms, and saves credentials encrypted in GitHub or Cloudflare. Keep it open until setup is finished. Never put keys in chat or repository files.

1. Existing Zernio posting credentials are reused. Connection checks verify the active YouTube account and a prior successful provider post without uploading anything.
2. Create the dedicated GitHub App through the helper and install it on **only this repository**. Permissions are Actions write, Contents read, and Variables read. Variables read lets the scheduler honor pause settings. Short-lived installation tokens renew automatically. [GitHub authentication](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/differences-between-github-apps-and-oauth-apps)
3. Use Cloudflare Workers Free. Create an account-scoped token with **Workers Scripts Edit** and **Billing Read**, with no expiration. Billing Read verifies free-plan status and cannot alter billing. The helper checks App access, installs a paused Worker and fifteen-minute cron, and creates a SQLite Durable Object to serialize duplicate deliveries. [Free-plan support](https://developers.cloudflare.com/durable-objects/platform/pricing/)
4. Create a Google Cloud project, enable YouTube Analytics API, and create a Web application OAuth client. Set the redirect URI to `http://127.0.0.1:8766/google/callback`. Put its consent screen in **Production** before connecting the channel owner. The helper requests only yt-analytics.readonly with offline access, verifies engaged-view metrics and refresh, and encrypts the three analytics credentials into repository Secrets. Testing-mode refresh tokens can expire after seven days. [Google OAuth guidance](https://developers.google.com/identity/protocols/oauth2)
5. Review the completed format and approve launch once. Merge the verified implementation, then activate the paused Worker with `automation/watchdog/activate.mjs` and the two stored Cloudflare secrets. Future videos and supported experiments publish automatically.

`One-time Shorts connection checks` tests posting, provider analytics, direct OAuth refresh, required metrics, and the offline library. Its artifact contains sanitized status only. Project checks also runs this probe when manually dispatched, allowing branch verification before activation.

Zernio's documented daily metrics omit engaged views. Missing metrics or paid analytics endpoints use the free direct connection. Empty low-view retention curves are acceptable. [Daily metrics](https://docs.zernio.com/analytics/get-youtube-daily-views), [retention documentation](https://docs.zernio.com/analytics/get-youtube-video-retention)

## Unattended recovery and maintenance

GitHub retries at :17 and :37 during 7–11 AM Eastern. Independent Cloudflare checks run every fifteen minutes during 7 AM–11 PM Eastern, avoid active pipeline runs, respect `VIDEO_AUTOPILOT_PAUSED=true`, and cap dispatches at six per Eastern day with a thirty-minute cooldown. The Durable Object uses strongly consistent storage.

Committed newsletters are never emailed again. Known provider posts are reconciled. Submitted artifacts are restored automatically and checked against the current ledger and hash. Missing original artifacts or expired 24-hour idempotency windows quarantine uncertain uploads; no blind replacement is created. Successful publication records remain unchanged.

Temporary posting errors use bounded retries and provider delays. Failed renders retry with static photos. Missing imagery uses the bundled library. Missing analytics keeps the current format. Authorization denial and payment requirements record a durable publication pause without assigning the owner a future task.

Weekly maintenance removes expired pipeline artifacts and caps owned caches at 8 GB. Stable same-minor JavaScript and Python library patches must pass lint, types, regressions, caption layout, pronunciation timing, extraction safeguards, and a CPU render before adoption. Failed candidates retain the previous pins. Major upgrades and model changes are outside patch adoption.

Health state keeps sixty events. The ledger compacts old source text and scripts while preserving publication identity and experiment assignments. Legacy inputs, scripts, manifests, and submitted media remain supported.

## Automatic retention tests

First-seven-day UTC snapshots finalize after a ten-day processing wait. Metrics include actual duration, assigned format, engaged views, viewing seconds, percentage viewed, and available curves. Each run processes at most twelve snapshots. State caps at 120 metrics and thirty decisions.

The first ten version-3 uploads establish the baseline. Successful uploads then alternate direct-benefit and supported-surprise hooks; each assignment is frozen for its edition. Extractive fallback records its actual direct-benefit hook. Comparable topic/length groups need five videos and 1,000 engaged views per variant, with identical stratum weights and at least 1,000 matched views. Promotion requires ten percentage points more viewed without reducing viewing seconds. Insufficient evidence extends the test automatically. Visual pacing is tested separately afterward. Reports are optional.

The 65–75% average-viewed and 18–22-second goals are experimental targets, not guarantees.

## Checks and previews

Use Node 20+, Python 3.11, CPU Kokoro, FFmpeg with libass, ffprobe, and DejaVu fonts. The existing video-runtime action installs pinned dependencies. Output is 1080×1920, 30 fps, H.264/AAC, with normalized audio and a 50 MB upload cap.

```sh
npm run lint
npm run typecheck
npm test
python -m unittest discover -s scripts/video -p 'test_*.py'
npm run video:sample -- --kind product --profile standard --output-dir video-output/product
npm run video:sample -- --kind research --profile standard --output-dir video-output/research
npm run video:sample -- --kind context --profile simple --output-dir video-output/context
npm run video:setup
npm run video:analytics
```

On Windows, set VIDEO_PYTHON, VIDEO_FFMPEG, VIDEO_FFPROBE, and optionally VIDEO_BODY_FONT. Samples are fictional and cannot be published. Rendering does not upload. Submitted media cannot be rebuilt. Daily unattended publication targets YouTube; legacy TikTok submission retains its genuine per-video consent requirement outside this workflow.

Routine future work is removed. Channel suspension, permanent revocation, or removal of essential access cannot be repaired by automation alone; the affected operation records the issue and pauses. No path buys a subscription or switches to a paid service. Keep connected accounts on free plans; code cannot prevent someone separately changing billing.
