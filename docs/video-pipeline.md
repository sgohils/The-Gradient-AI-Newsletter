# Daily AI news videos

The newsletter writes `posts/YYYY-MM-DD.video.json` with up to 25 ranked video candidates, original RSS evidence, source URLs, and publication times. Newsletter stories come first, followed by other fresh, relevant articles from the same feeds; these extra candidates need no summary API calls. Full RSS content is retained when it contains more evidence than the short description. The existing 07:00 UTC schedule and UTC issue dates are unchanged. Video work runs only after the newsletter commit succeeds. Use **Re-run failed jobs** to retry video failures without rerunning newsletter delivery.

Live publishing starts disabled because the accounts are not connected. Connect and verify them before activation.

## Free runtime and costs

The target is $0 additional monthly cost. Script generation makes at most one request to the existing Groq free account, then uses source sentences if that request fails, exhausts its quota, or returns an invalid script. No paid provider is substituted. Keep the Groq account on its free plan; the code cannot override account billing settings.

[Kokoro](https://huggingface.co/hexgrad/Kokoro-82M) runs locally on CPU using American English `af_heart`. Configuration, weights, and voice are pinned to revision `f3ff3571791e39611d31c381e3a41a3af07b4987`. Python dependencies and CPU Torch are pinned and cached in Actions. FFmpeg renders 1080×1920 H.264/AAC at 30 fps, with the paper, ink, and evergreen palette, moving headlines, simple graphics, and captions from Kokoro's predicted word timings. There is no music, host, transcription service, or paid graphics API.

[Zernio's free plan](https://zernio.com/pricing) currently advertises two accounts and unlimited posts. Connect one TikTok account and one YouTube channel. [GitHub standard runners](https://docs.github.com/en/billing/concepts/product-billing/github-actions) are free for public repositories; private repositories have allowances. Artifacts expire after seven days and videos are capped at 50 MB. Model caches also use Actions storage. Check allowances and disable paid overages if this repository is private. This implementation enables no subscription or paid fallback.

## Preview and local commands

After committing the implementation, open **Actions → Video preview and activation check → Run workflow** with `issue_date=sample` and `publish=false`. Download the `video-preview` artifact and inspect the MP4, captions, and narration. The fictional sample cannot be published. CI also renders and verifies an offline sample.

For a real preview, use a date with a committed `.video.json` from the updated newsletter. If an older issue has only Markdown/HTML, the manual workflow first tries to recover its original stories from the configured RSS feeds, matching the publisher's **Read more** URLs and preserving newsletter rank and actual RSS publication times. It never uses a rewritten newsletter summary as original evidence or sends the newsletter again. Recovery is possible only while those original stories remain in the feeds. If none can be recovered, use `issue_date=sample` for a fictional preview or choose a later issue with an exported `.video.json`. Input checks run before the CPU runtime is installed. Leave `publish=false` during review. The workflow freezes the selected story and script in `video-state/ledger.json`.

Local requirements: Node 20+, **Python 3.11**, FFmpeg with libass, ffprobe, and fonts. This Kokoro version does not support Python 3.13. Linux setup:

```sh
sudo apt-get install ffmpeg espeak-ng fonts-dejavu-core
python3.11 -m venv .cache/video-venv
. .cache/video-venv/bin/activate
pip install torch==2.8.0 --index-url https://download.pytorch.org/whl/cpu
pip install -r scripts/video/requirements.txt
npm ci
npm run video:sample
```

On Windows, set `VIDEO_PYTHON` to the venv's `Scripts/python.exe`, and set `VIDEO_FFMPEG` and `VIDEO_FFPROBE` if they are not on PATH. Arial/Georgia are supported; Linux uses DejaVu. The first render downloads the pinned model; later renders reuse it.

```sh
npm run video:render -- --input posts/YYYY-MM-DD.video.json
npm run video:publish -- --manifest video-output/YYYY-MM-DD/manifest.json --platforms youtube
```

Recover an older issue's input locally without publishing or emailing:

```sh
npm run video:prepare -- --issue-date YYYY-MM-DD
```

Recovered inputs are included in preview artifacts. A recovered issue may be skipped when its stories are stale or its excerpts are too short. Future scheduled newsletters export inputs directly. When `source_run_id` is supplied, the workflow requires a ready, unchanged video for the exact requested date; it never substitutes a new render when a reviewed artifact is unavailable. Restored artifacts are copied into the standard output directory so successive reviews retain the same layout and media hash.

Rendering never uploads. Outputs include the MP4, WAV, word timing JSON, SRT/ASS captions, script, layout, and typed manifest. Publishing is an explicit, separate command. With downloaded artifacts, point `--manifest` at the extracted file and `--ledger` at the current repository ledger. Keep the MP4 beside its manifest. Never replace the current ledger with an older artifact copy.

Each video includes full-screen compositions synchronized to the narration: a bold opening fact, large animated illustrations, short source-derived display labels, and a source-link ending. Longer sentences are divided into visual beats on word boundaries, usually every three to five seconds. Original graphics cover AI networks, code, comparisons, research, chips, robotics, security, and policy. Explicit amounts and percentages from the validated script can become large number callouts; diagrams do not invent performance data or resemble official product screenshots. Paper, ink, and evergreen backgrounds alternate with moving signals, brief crossfades, and a progress indicator.

New version-2 scripts start immediately with a supported hook, explain the development, and end with a grounded takeaway plus “Source in the description.” They contain 75–105 words, including that ending. The single Groq request also produces short display labels; rewritten newsletter summaries are excluded from its prompt. Local fallback uses complete source sentences or self-contained release/guide clauses, with source opinions attributed instead of speaking as the company. Each sentence keeps its original evidence quote. Caption chunks contain at most five words, start at 64px, and are measured to fit two lines inside the mobile safe area. The currently spoken word is highlighted in mint using Kokoro timings; speech gaps are not highlighted. No transcription API is used.

Graphics are drawn locally at 720×1280 and 15 fps, then streamed directly into one FFmpeg encode. The final video remains 1080×1920 at 30 fps, with captions drawn at the final resolution. This avoids storing hundreds of PNG frames or an intermediate video. Backgrounds and fonts are reused during the render, and a failed encode preserves the previous completed MP4. There are no new dependencies, paid graphics services, or additional API calls. `storyboard.json`, scene previews, `card.png`, and `graphics-layout.json` are included in the output. Once an output directory has been prepared, regenerate only its visual previews with `python scripts/video/graphics.py --output-dir video-output/YYYY-MM-DD --preview-only`; this skips video encoding and narration.

Renders reuse verified completed artifacts. Older previews gain the new graphics automatically when they have never been submitted. `--rebuild` regenerates visuals while reusing unchanged narration and is rejected after submission. Review the new MP4 before recording consent: changing the video invalidates an earlier TikTok receipt. `video:sample` accepts `--issue-date YYYY-MM-DD` for a labeled sample edition.

## Connect accounts and verify public posting

1. Create a free [Zernio](https://zernio.com) account and connect your YouTube channel and TikTok account through its account connection flow. Keep the free two-account plan.
2. Create a Zernio API key. Add it as GitHub **Settings → Secrets and variables → Actions → Secrets → `ZERNIO_API_KEY`**. Keep keys out of chat, files, and repository variables.
3. Find the account IDs in Zernio's dashboard or authenticated `GET https://zernio.com/api/v1/accounts`. Set repository **Variables** `ZERNIO_YOUTUBE_ACCOUNT_ID` and `ZERNIO_TIKTOK_ACCOUNT_ID` to the matching `_id` values. YouTube also accepts a repository **Secret** named `ZERNIO_YOUTUBE_ACCOUNT_ID`; a nonempty variable takes precedence.
4. Render and review a real preview. Run the manual workflow with that date, `publish=true`, and `source_run_id` set to the preview run's numeric ID. It restores the exact reviewed artifact. Initially leave `tiktok=false`. The story must still be within 72 hours. Confirm a public Short on the intended YouTube channel using the live workflow-summary URL.
5. Complete the TikTok review below and publish the reviewed artifact. Confirm its public URL on the intended account. Leave daily publishing off until both platforms have been verified.
6. Set repository variable `VIDEO_ENABLED=true` to render after future newsletters. After activation checks, set `VIDEO_PUBLISH_ENABLED=true` for daily YouTube publication. Keep `VIDEO_TIKTOK_ENABLED` unset unless every submitted video has its own genuine consent receipt. Missing consent records TikTok as `blocked` and preserves successful YouTube uploads.

The default branch must permit the Actions bot to push `video-state/ledger.json`. Daily and manual video workflows share a concurrency group. Each posting intent is committed and pushed before its external request. A rejected ledger push stops submission. Resolve branch protection or bot permissions before activation.

## TikTok consent blocks fully unattended publication

[Zernio's TikTok requirements](https://docs.zernio.com/platforms/tiktok) require a preview of the actual content, explicit posting consent, and creator privacy/interaction choices. The code never manufactures these confirmations. A blanket flag is insufficient. **Fully unattended TikTok posting remains blocked while fresh human review is required per video.** YouTube can run unattended once connected and verified.

After viewing the exact MP4 and metadata, the account owner can record their actual choices in `video-state/approvals/YYYY-MM-DD.json` for Actions, or a local JSON file for `--tiktok-approval`. Copy the date and SHA-256 from that reviewed manifest and the connected account ID. Set confirmations only after those actions really happened:

```json
{
  "issueDate": "YYYY-MM-DD",
  "accountId": "connected-tiktok-account-id",
  "videoSha256": "64-character-sha256-from-the-reviewed-manifest",
  "contentPreviewConfirmed": true,
  "expressConsentGiven": true,
  "privacyLevel": "PUBLIC_TO_EVERYONE",
  "allowComment": false,
  "allowDuet": false,
  "allowStitch": false
}
```

The example is not a consent record. Choose interactions yourself; the API checks current creator limits. Commit an actual receipt when using Actions, then run the manual workflow with `publish=true`, `tiktok=true`, the date, and the previous `source_run_id`. Use the exact artifact you reviewed. Locally:

```sh
npm run video:publish -- --manifest extracted/video-output/YYYY-MM-DD/manifest.json --platforms youtube,tiktok --tiktok-approval approval.json
```

Both requests include source attribution and AI disclosure. YouTube receives synthetic-media metadata, and TikTok receives its AI flag. Each platform gets its own immediate-publication request. Neither account has been publicly tested here because they are not connected yet.

## Selection, retries, and recovery

Unused stories within 72 hours and with at least 60 words of original evidence are ranked for video: measurable changes and practical capabilities first, substantive releases/findings/policy next, and guides or commentary last. Only original evidence and titles inform this deterministic ranking; newsletter rank and story ID break ties. The chosen reason is recorded in the manifest, ledger, and workflow summary. If its script fails validation, the next eligible story is tried using the offline fallback; the entire render still makes at most one Groq request. A story is frozen only after its script passes validation, and an existing choice is preserved across reruns. Unsubmitted legacy scripts gain the new structure on their next render; submitted media and publication records remain unchanged. Canonical source URLs suppress repeats across dates, including changed tracking parameters. Missing input fails; empty, stale, repeated, or insufficient-evidence input skips. Skip messages report candidate counts and rejection reasons. A skipped issue never uploads an earlier video.

Daily YouTube automation attempts a new video after each scheduled newsletter when repository **Variables** `VIDEO_ENABLED=true` and `VIDEO_PUBLISH_ENABLED=true` are set. It cannot guarantee an upload every day: the feeds must contain a fresh, unused story with enough evidence for a validated 75–105 word script. Re-running an old issue does not fetch new candidates when its exported input already exists; use the next current newsletter issue for new stories.

The small ledger stores story identity, content hash, media, submission keys, provider IDs, platform states, and live URLs. Published platforms are never reposted. Temporary failures use bounded backoff and the same frozen request/key. Known failed posts use the existing-post retry endpoint. Reconcile pending IDs without uploads using:

```sh
npm run video:publish -- --reconcile-only
```

[Provider idempotency](https://docs.zernio.com/guides/idempotency) expires after 24 hours. An unknown outcome with an expired key stops instead of risking a duplicate. Find the original post in Zernio, record its actual `postId` in the matching platform ledger entry, and reconcile. If Zernio confirms no post exists, an operator must explicitly resolve the uncertainty before a new submission. Never delete a successful entry or reset the ledger to force a retry.

Workflow summaries distinguish `blocked`, `failed`, `uncertain`, `pending`, and `published`, with live URLs when available. Save recovery artifacts before their seven-day expiry if investigation needs longer.

After the first ten videos with the new format, compare their opening retention and average percentage viewed with the previous ten in the platform's analytics. Use the results to adjust hooks, visual pacing, and topic choices; the renderer itself cannot promise higher view counts.

## Checks

Run `npm run lint`, `npm run typecheck`, and `npm test`. Tests cover original evidence, missing/stale/repeated inputs, invalid scripts and invented figures, API exhaustion, expired credentials, partial publication, bounded retries, durable intent, consent matching, reconciliation, and reruns. `scripts/video/verify.py` checks the actual encoded dimensions/codecs/frame rate/duration, caption token coverage, and non-silent audio. The `video-smoke` CI job exercises Kokoro, graphics, and FFmpeg together. Review the exported sample visually and listen before activation; numerical checks do not replace review.
