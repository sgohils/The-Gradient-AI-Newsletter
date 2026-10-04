import * as fs from 'fs';
import * as path from 'path';
import { captionChunks, buildSrt, buildAss } from './captions';
import { generateScript, SCRIPT_VERSION, validateScript } from './script';
import { assessStoryCandidates, videoSuitability } from './selection';
import { compactLedger, fileSha256, readInput, readJson, readLedger, readManifest, sha256, writeJson } from './storage';
import { runCommand } from './process';
import { NarrationTiming, VideoManifest } from './types';
import { buildStoryboard, GRAPHICS_VERSION } from './graphics';

export interface RenderOptions {
  inputPath: string;
  outputDir?: string;
  ledgerPath?: string;
  python?: string;
  ffmpeg?: string;
  groqApiKey?: string;
  groqModel?: string;
  now?: Date;
  rebuild?: boolean;
}

export async function renderVideo(options: RenderOptions): Promise<{ manifestPath: string; manifest: VideoManifest }> {
  const input = readInput(options.inputPath);
  const ledgerPath = path.resolve(options.ledgerPath || 'video-state/ledger.json');
  const ledger = readLedger(ledgerPath);
  compactLedger(ledger, options.now);
  const directory = path.resolve(options.outputDir || 'video-output', input.issueDate);
  fs.mkdirSync(directory, { recursive: true });
  const manifestPath = path.join(directory, 'manifest.json');
  const candidates = assessStoryCandidates(input, ledger, options.now);
  let story = candidates.stories[0];
  if (!story) {
    const manifest: VideoManifest = { version: 1, status: 'skipped', issueDate: input.issueDate, reason: candidates.reason };
    writeJson(manifestPath, manifest);
    return { manifestPath, manifest };
  }
  let entry = ledger.issues[input.issueDate];
  const submitted = Boolean(entry && (entry.media || Object.values(entry.platforms).some(p => p?.firstSubmittedAt || p?.status === 'published')));
  if (options.rebuild && submitted) throw new Error('This video was already submitted; restore its original artifact instead of rebuilding it.');
  if (!options.rebuild && fs.existsSync(manifestPath)) {
    const cached = readManifest(manifestPath);
    if (cached.status === 'ready' && (cached.graphicsVersion === GRAPHICS_VERSION && cached.script.version === SCRIPT_VERSION || submitted) &&
        cached.story.id === story.id && fs.existsSync(path.join(directory, cached.videoFile)) &&
        fileSha256(path.join(directory, cached.videoFile)) === cached.videoSha256) {
      await runCommand(options.python || process.env.VIDEO_PYTHON || (process.platform === 'win32' ? 'python' : 'python3'),
        [path.resolve('scripts/video/verify.py'), '--directory', directory]);
      if (!entry) {
        validateScript(story, cached.script);
        ledger.issues[input.issueDate] = { story, script: cached.script,
          selectedAt: (options.now || new Date()).toISOString(), platforms: {} };
        writeJson(ledgerPath, ledger);
      }
      return { manifestPath, manifest: cached };
    }
  }
  if (submitted) throw new Error('The submitted video artifact is missing or changed; restore it before retrying.');
  // Submitted artifacts were handled above. Unsubmitted legacy scripts gain
  // the new structure while retaining their original frozen story choice.
  let script = entry?.script?.version === SCRIPT_VERSION ? entry.script : undefined;
  let lastFailure = '';
  for (const [index, candidate] of candidates.stories.entries()) {
    if (script) break;
    try {
      // Only the first candidate may call Groq. Later candidates use source
      // sentences locally, keeping the entire render to at most one request.
      script = await generateScript(candidate, index === 0 ? options : {});
      story = candidate;
    } catch (error) {
      lastFailure = error instanceof Error ? error.message : 'Insufficient script evidence.';
    }
  }
  if (!script) {
    const manifest: VideoManifest = { version: 1, status: 'skipped', issueDate: input.issueDate,
      reason: `None of ${candidates.stories.length} eligible stories produced a valid source-grounded script. ${lastFailure}` };
    writeJson(manifestPath, manifest);
    return { manifestPath, manifest };
  }
  // Freeze only a validated choice. An unusable first story must not lock the
  // date and prevent another eligible story from being tried on a later run.
  entry ||= ledger.issues[input.issueDate] = { story, selectedAt: (options.now || new Date()).toISOString(), platforms: {} };
  entry.script = script;
  entry.selectionReason ||= videoSuitability(story).reason;
  writeJson(ledgerPath, ledger);
  fs.writeFileSync(path.join(directory, 'script.txt'), entry.script.narration, 'utf8');
  const python = options.python || process.env.VIDEO_PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
  const narrationKey = sha256(entry.script.narration + fs.readFileSync('scripts/video/narrate.py', 'utf8') +
    fs.readFileSync('scripts/video/requirements.txt', 'utf8') + fs.readFileSync('scripts/video/constraints.txt', 'utf8'));
  const narrationCache = path.join(directory, 'narration-cache.json');
  if (!(fs.existsSync(narrationCache) && fs.existsSync(path.join(directory, 'audio.wav')) && fs.existsSync(path.join(directory, 'timing.json')) &&
      (readJson(narrationCache) as { key?: string }).key === narrationKey)) {
    await runCommand(python, [path.resolve('scripts/video/narrate.py'), '--script', path.join(directory, 'script.txt'), '--output-dir', directory]);
    writeJson(narrationCache, { key: narrationKey });
  }
  const timing = readJson(path.join(directory, 'timing.json')) as NarrationTiming;
  captionChunks(timing); // Fail before rendering when timing is broken or outside 30–45 seconds.
  fs.writeFileSync(path.join(directory, 'captions.srt'), buildSrt(timing), 'utf8');
  fs.writeFileSync(path.join(directory, 'captions.ass'), buildAss(timing), 'utf8');
  writeJson(path.join(directory, 'storyboard.json'), buildStoryboard(story, entry.script, timing));
  writeJson(path.join(directory, 'story.json'), { issueDate: input.issueDate, title: story.title, sourceName: story.sourceName, sourceHost: new URL(story.sourceUrl).hostname });
  await runCommand(python, [path.resolve('scripts/video/assets.py'), '--output-dir', directory]);
  const ffmpeg = options.ffmpeg || process.env.VIDEO_FFMPEG || 'ffmpeg';
  // All filter filenames are fixed relative names, never interpolated news text.
  fs.writeFileSync(path.join(directory, 'render.filter'),
    `[0:v]scale=1080:1920:flags=lanczos,fps=30,subtitles=captions.ass:fontsdir=fonts[v];\n` +
    `[1:a]loudnorm=I=-16:TP=-1.5:LRA=11[a]\n`, 'utf8');
  // Stream native 1080p/30fps artwork straight into the final encode.
  // Static layers and illustrations are cached; no frame sequence is stored.
  await runCommand(python, [path.resolve('scripts/video/graphics.py'), '--output-dir', directory,
    '--ffmpeg', /[\\/]/.test(ffmpeg) ? path.resolve(ffmpeg) : ffmpeg, '--video-file', 'video.mp4'], directory);
  const baseUrl = (process.env.NEWSLETTER_BASE_URL || 'https://gradientnews.app').replace(/\/$/, '');
  const manifest: VideoManifest = {
    version: 1, status: 'ready', issueDate: input.issueDate, story, script: entry.script,
    graphicsVersion: GRAPHICS_VERSION,
    selectionReason: entry.selectionReason,
    ...(input.sample ? { sample: true } : {}),
    duration: timing.duration, videoFile: 'video.mp4', videoSha256: fileSha256(path.join(directory, 'video.mp4')),
    captionsFile: 'captions.srt', title: entry.script.sentences[0].text.slice(0, 90),
    description: `${story.title}\n\nSource: ${story.sourceName}\n${story.sourceUrl}\n\nThe Gradient: ${baseUrl}/archive/${input.issueDate}\nAI-generated narration. #AI #AINews #Shorts`,
  };
  entry.contentHash = sha256(JSON.stringify({ storyId: story.id, narration: entry.script.narration, title: manifest.title, description: manifest.description }));
  writeJson(ledgerPath, ledger);
  writeJson(manifestPath, manifest);
  try {
    await runCommand(python, [path.resolve('scripts/video/verify.py'), '--directory', directory]);
  } catch (error) {
    fs.unlinkSync(manifestPath); // An unverified file must never advertise itself as ready.
    throw error;
  }
  return { manifestPath, manifest };
}
