# Daily Shorts: version 3

New videos target 40 seconds, accept 35–45 seconds, and contain 75–95 spoken words. They retain the current voice, palette, captions, illustrations, free generation service, and daily schedule.

## Creative structure

The working title is at most 49 characters and starts with a recognizable topic keyword. The hook starts immediately, finishes within four seconds, and asks a relevant question or introduces a supported counter-intuitive fact. It uses everyday language without greetings, paper titles, dates, or citations.

The primary format has exactly three breakthrough sentences: a concrete problem or example, the mechanism or change, and the supported result. The first example/comparison appears by eight seconds. One or two impact sentences follow around 26 seconds (one-second tolerance), distinguishing available tools from unreleased research. A topic-specific question is the final spoken line. Source attribution remains in the description and appears on screen after the hook.

The original source excerpt supports every factual sentence, name, and number. Conservative lexical checks are not a complete semantic fact checker. Neutral questions cannot introduce unsupported premises. When access cannot be confirmed from the excerpt, the impact includes “This source excerpt does not confirm public access.” Readability estimates flag potentially difficult hooks; they do not replace listening.

## Illustrations and natural timing

The opening illustration and heading are visible at frame zero. A meaningful popup, diagram step, or highlight appears about every three seconds, with up to half a second of adjustment to speech. Sentence changes can add intervening cues. The same illustration thread carries the explanation and returns in the ending. The final question stays visible through the end.

All visuals are original illustrations. Labels come from validated narration. Quantities are shown only when supported; model-version digits are not plotted as results. There are no fabricated screenshots, independent demonstrations, or invented benchmark values.

Kokoro fits the hook, breakthrough, and ending as natural speech blocks. Each block receives at most one adjustment within the existing 0.8–1.2 speed range. Predicted leading silence is trimmed while preserving a short breath. Word timings are offset to the final audio and drive captions and diagrams. The finished video must pass duration, hook, impact, early-example, cue-coverage, text-fit, and audio checks.

## Free fallback and recovery

Each render attempt makes at most one request to the configured free Groq service. Invalid output, service failure, or narration that cannot fit the primary windows uses complete source sentences locally. This source-fallback format retains the word/duration targets, illustrated cues, access limits, and closing question, but allows a simpler hook and variable explanation length. Workflow summaries identify the format.

Other eligible stories are considered if a candidate cannot produce a valid script and narration. A new story is frozen only after those checks and storyboard timing pass. Failed candidates cannot reserve an edition. Existing frozen choices retain their story, and submitted media cannot be rebuilt.

Legacy version-1/2 scripts, 30–45 second artifacts, and exact-artifact recovery remain supported. New working titles and presentation metadata persist after old evidence is compacted. The title-repair workflow restores the saved working title when present and uses the source headline for older records.

## Outputs and isolated review

Each new artifact includes script.json, script.txt, narration, word timings, captions, storyboard, scene previews, MP4, manifest, and producer-brief.md. The brief contains Working Title, timestamped Onscreen Visual Directions, and the sectioned Spoken Audio Script with its word count. Directions reflect the final rendered scenes.

Render both fictional formats offline:

~~~sh
npm run video:sample -- --format structured --output-dir .cache/shorts-structured
npm run video:sample -- --format fallback --output-dir .cache/shorts-fallback
~~~

Render a real-news review using an isolated output directory and ledger:

~~~sh
npm run video:render -- --input posts/YYYY-MM-DD.video.json --review-only --ledger .cache/shorts-review/ledger.json --output-dir .cache/shorts-review
~~~

Review-only manifests cannot be published. They never replace production publication state. Review a new, unpublished production render before deployment; existing uploads are not replaced or reuploaded by this upgrade. No new account connection is required.

## Research references

These are presentation references, not evidence that a particular edit caused views. Private retention data was unavailable. Public counts checked October 13, 2026 were rounded:

| Short | Public views | Length | Technique adapted |
|---|---:|---:|---|
| [Which AI is smartest?](https://www.youtube.com/shorts/1xI_lsZ4sxI) | 34M | 57s | Concrete task, model comparisons, clear payoff. |
| [Questions that AI can't answer](https://www.youtube.com/shorts/dzZlf2OYRnU) | 3.5M | 53s | Visible failures before the explanation. |
| [Midjourney Built What?!?](https://www.youtube.com/shorts/Qy25rSEXpPQ) | 337K | 96s | Unexpected product contrast and result before mechanism. |

[YouTube's creator discussion](https://blog.youtube/creator-and-artist-stories/youtube-shorts-deep-dive/) emphasizes the first second and compact storytelling. [Shorts discovery guidance](https://support.google.com/youtube/answer/11914225?hl=en) describes viewer choice, continued watching, and satisfaction. The three-second cue interval is our editorial target, not a universal ranking rule.

## Performance review without another connection

Use YouTube Studio exports to fill a copy of shorts-performance-template.csv. Choose the previous ten videos as baseline and the first ten new-format videos as new. Add separate observations around 24 hours and seven days; never mix observation ages.

Use the actual YouTube video ID, baseline/new cohort, 24h/7d window, legacy/structured/source-fallback format, topic, duration, engaged views, stayed-to-watch percentage, average duration, average percentage viewed, comments, and subscribers gained. Leave unavailable percentage/retention cells blank. Zero engaged views produces no per-1,000 rate. Average percentage viewed may exceed 100 because of replays.

If available, record retention drops around the opening, explanation, and ending. Keep region definitions consistent between videos and note topic differences. Do not infer a missing retention curve from public view totals. [YouTube metric definitions](https://support.google.com/youtube/answer/12220281?hl=en) explain engaged views and average viewing measures.

~~~sh
npm run video:performance -- --input .cache/shorts-performance.csv --output .cache/shorts-performance-review.md
~~~

The report compares per-video medians within each observation window, separates structured and fallback videos, and reports comments/subscribers per 1,000 engaged views. It flags cohorts with fewer than ten observations. Treat comparisons as directional, then change one variable at a time across comparable future uploads.
