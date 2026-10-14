import * as fs from 'fs';
import * as path from 'path';
import { captionChunks, buildSrt, buildAss } from './captions';
import { buildExtractiveScript, generateScript, SCRIPT_VERSION, validateScript } from './script';
import { assessStoryCandidates, videoSuitability, wordCount } from './selection';
import { compactLedger, fileSha256, readInput, readJson, readLedger, readManifest, sha256, writeJson } from './storage';
import { runCommand } from './process';
import { NarrationTiming, VideoManifest, VideoScript, VideoLedgerEntry } from './types';
import { buildStoryboard, GRAPHICS_VERSION } from './graphics';
import { validateNarration } from './timing';
import { buildProducerBrief } from './brief';

export interface RenderOptions {
  inputPath: string; outputDir?: string; ledgerPath?: string; python?: string; ffmpeg?: string;
  groqApiKey?: string; groqModel?: string; now?: Date; rebuild?: boolean; reviewOnly?: boolean; script?: VideoScript;
}

export function presentation(script: VideoScript, duration: number): VideoLedgerEntry['presentation'] {
  return { title: script.workingTitle || '', format: script.format, angle: script.angle,
    hookStyle: script.hookStyle, availability: script.availability, duration,
    wordCount: wordCount(script.narration), scriptVersion: script.version || 1 };
}

export async function renderVideo(options: RenderOptions): Promise<{ manifestPath: string; manifest: VideoManifest }> {
  const input = readInput(options.inputPath);
  if (options.script && !input.sample && !options.reviewOnly) throw new Error('Script fixtures are only allowed in samples or isolated reviews.');
  const ledgerPath = path.resolve(options.ledgerPath || 'video-state/ledger.json');
  if (options.reviewOnly && (!options.ledgerPath || ledgerPath === path.resolve('video-state/ledger.json') || !options.outputDir ||
      path.resolve(options.outputDir) === path.resolve('video-output'))) {
    throw new Error('Review previews require an isolated ledger and output directory.');
  }
  const ledger = readLedger(ledgerPath);
  compactLedger(ledger, options.now);
  const directory = path.resolve(options.outputDir || 'video-output', input.issueDate);
  fs.mkdirSync(directory, { recursive: true });
  const manifestPath = path.join(directory, 'manifest.json');
  const candidates = assessStoryCandidates(input, ledger, options.now);
  async function skipped(reason: string): Promise<{ manifestPath: string; manifest: VideoManifest }> {
    const manifest: VideoManifest = { version: 1, status: 'skipped', issueDate: input.issueDate, reason };
    writeJson(manifestPath, manifest);
    return { manifestPath, manifest };
  }
  if (!candidates.stories.length) return skipped(candidates.reason);
  let story = candidates.stories[0];
  let entry = ledger.issues[input.issueDate];
  const submitted = Boolean(entry && (entry.media || Object.values(entry.platforms).some(p => p?.firstSubmittedAt || p?.status === 'published')));
  const python = options.python || process.env.VIDEO_PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
  if (options.rebuild && submitted) throw new Error('This video was already submitted; restore its original artifact instead of rebuilding it.');
  if (!options.rebuild && fs.existsSync(manifestPath)) {
    const cached = readManifest(manifestPath);
    if (cached.status === 'ready' && Boolean(cached.reviewOnly) === Boolean(options.reviewOnly) &&
        (cached.graphicsVersion === GRAPHICS_VERSION && cached.script.version === SCRIPT_VERSION || submitted) &&
        cached.story.id === story.id && fs.existsSync(path.join(directory, cached.videoFile)) &&
        fileSha256(path.join(directory, cached.videoFile)) === cached.videoSha256) {
      await runCommand(python, [path.resolve('scripts/video/verify.py'), '--directory', directory]);
      if (!entry) {
        validateScript(story, cached.script);
        ledger.issues[input.issueDate] = { story, script: cached.script, presentation: presentation(cached.script, cached.duration),
          selectedAt: (options.now || new Date()).toISOString(), platforms: {} };
        writeJson(ledgerPath, ledger);
      }
      return { manifestPath, manifest: cached };
    }
  }
  if (submitted) throw new Error('The submitted video artifact is missing or changed; restore it before retrying.');
  async function narrate(script: VideoScript): Promise<NarrationTiming> {
    validateScript(story, script);
    fs.writeFileSync(path.join(directory, 'script.txt'), script.narration, 'utf8');
    writeJson(path.join(directory, 'script.json'), script);
    const key = sha256(JSON.stringify(script) + fs.readFileSync('scripts/video/narrate.py', 'utf8') +
      fs.readFileSync('scripts/video/requirements.txt', 'utf8') + fs.readFileSync('scripts/video/constraints.txt', 'utf8'));
    const cache = path.join(directory, 'narration-cache.json');
    if (!(fs.existsSync(cache) && fs.existsSync(path.join(directory, 'audio.wav')) && fs.existsSync(path.join(directory, 'timing.json')) &&
        (readJson(cache) as { key?: string }).key === key)) {
      await runCommand(python, [path.resolve('scripts/video/narrate.py'), '--script', path.join(directory, 'script.txt'),
        '--script-json', path.join(directory, 'script.json'), '--output-dir', directory]);
    }
    const timing = readJson(path.join(directory, 'timing.json')) as NarrationTiming;
    validateNarration(script, timing);
    // Cache only after timing passes, so a failed voice attempt cannot be reused.
    writeJson(cache, { key });
    return timing;
  }
  let script: VideoScript | undefined;
  let timing: NarrationTiming | undefined;
  let lastFailure = '';
  for (const [index, candidate] of candidates.stories.entries()) {
    story = candidate;
    let proposed: VideoScript;
    try {
      // Existing unpublished choices retain their story; only legacy scripts upgrade.
      proposed = index === 0 && options.script ? options.script : entry?.script?.version === SCRIPT_VERSION ? entry.script :
        await generateScript(candidate, index === 0 ? options : {});
      try {
        timing = await narrate(proposed);
      } catch (error) {
        if (proposed.format !== 'structured') throw error;
        console.warn('[video] Structured narration could not fit naturally; trying the local source fallback. ' +
          (error instanceof Error ? error.message.slice(-400) : 'Timing failed.'));
        proposed = buildExtractiveScript(candidate);
        timing = await narrate(proposed);
      }
      // Check visual timing before freezing the story as well.
      buildStoryboard(story, proposed, timing);
      script = proposed;
      break;
    } catch (error) {
      lastFailure = error instanceof Error ? error.message : 'Insufficient script or narration evidence.';
    }
  }
  if (!script || !timing) return skipped('None of ' + candidates.stories.length +
    ' eligible stories produced a valid source-grounded script and narration. ' + lastFailure);
  entry ||= ledger.issues[input.issueDate] = { story, selectedAt: (options.now || new Date()).toISOString(), platforms: {} };
  entry.script = script;
  entry.presentation = presentation(script, timing.duration);
  entry.selectionReason ||= videoSuitability(story).reason;
  writeJson(ledgerPath, ledger);
  captionChunks(timing);
  fs.writeFileSync(path.join(directory, 'captions.srt'), buildSrt(timing), 'utf8');
  fs.writeFileSync(path.join(directory, 'captions.ass'), buildAss(timing), 'utf8');
  const storyboard = buildStoryboard(story, script, timing);
  writeJson(path.join(directory, 'storyboard.json'), storyboard);
  fs.writeFileSync(path.join(directory, 'producer-brief.md'), buildProducerBrief(story, script, storyboard, timing), 'utf8');
  writeJson(path.join(directory, 'story.json'), { issueDate: input.issueDate, title: story.title,
    sourceName: story.sourceName, sourceHost: new URL(story.sourceUrl).hostname });
  await runCommand(python, [path.resolve('scripts/video/assets.py'), '--output-dir', directory]);
  const ffmpeg = options.ffmpeg || process.env.VIDEO_FFMPEG || 'ffmpeg';
  fs.writeFileSync(path.join(directory, 'render.filter'),
    '[0:v]scale=1080:1920:flags=lanczos,fps=30,subtitles=captions.ass:fontsdir=fonts[v];\n[1:a]loudnorm=I=-16:TP=-1.5:LRA=11[a]\n', 'utf8');
  await runCommand(python, [path.resolve('scripts/video/graphics.py'), '--output-dir', directory,
    '--ffmpeg', /[\\/]/.test(ffmpeg) ? path.resolve(ffmpeg) : ffmpeg, '--video-file', 'video.mp4'], directory);
  const baseUrl = (process.env.NEWSLETTER_BASE_URL || 'https://gradientnews.app').replace(/\/$/, '');
  const manifest: VideoManifest = {
    version: 1, status: 'ready', issueDate: input.issueDate, story, script, graphicsVersion: GRAPHICS_VERSION,
    selectionReason: entry.selectionReason, ...(input.sample ? { sample: true } : {}),
    ...(options.reviewOnly ? { reviewOnly: true } : {}),
    duration: timing.duration, videoFile: 'video.mp4', videoSha256: fileSha256(path.join(directory, 'video.mp4')),
    captionsFile: 'captions.srt', briefFile: 'producer-brief.md', title: script.workingTitle!,
    description: story.title + '\n\nSource: ' + story.sourceName + '\n' + story.sourceUrl +
      '\n\nThe Gradient: ' + baseUrl + '/archive/' + input.issueDate + '\nAI-generated narration. #AI #AINews #Shorts',
  };
  entry.contentHash = sha256(JSON.stringify({ storyId: story.id, narration: script.narration, title: manifest.title, description: manifest.description }));
  writeJson(ledgerPath, ledger);
  writeJson(manifestPath, manifest);
  try {
    await runCommand(python, [path.resolve('scripts/video/verify.py'), '--directory', directory]);
  } catch (error) {
    fs.unlinkSync(manifestPath);
    throw error;
  }
  return { manifestPath, manifest };
}
