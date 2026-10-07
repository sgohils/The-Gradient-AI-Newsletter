import * as fs from 'fs';
import * as path from 'path';
import { captionChunks, buildSrt, buildAss } from './captions';
import { SCRIPT_VERSION, validateScript } from './script';
import { generateShortCandidates, simplifyShortScript } from './short-script';
import { profileFor } from './profiles';
import { collectVisuals, visualCredits } from './visuals';
import { buildPhotoStoryboard } from './photo-storyboard';
import { assignExperiment, initialExperiments, readExperiments, visualTopic } from './experiments';
import { gitCheckpoint } from './cli';
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
  offlineAssets?: boolean;
  pexelsApiKey?: string;
  experimentPath?: string;
}

export async function renderVideo(options: RenderOptions): Promise<{ manifestPath: string; manifest: VideoManifest }> {
  const input = readInput(options.inputPath);
  const ledgerPath = path.resolve(options.ledgerPath || 'video-state/ledger.json');
  const ledger = readLedger(ledgerPath);
  compactLedger(ledger, options.now);
  const directory = path.resolve(options.outputDir || 'video-output', input.issueDate);
  fs.mkdirSync(directory, { recursive: true });
  const manifestPath = path.join(directory, 'manifest.json');
  const candidates = assessStoryCandidates(input, ledger, options.now, 40);
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
  let experiments;
  try { experiments = readExperiments(options.experimentPath); } catch { experiments = initialExperiments(); }
  let assignment = assignExperiment(ledger, input.issueDate, experiments, visualTopic(story));
  let script = entry?.script?.version === SCRIPT_VERSION ? entry.script : undefined;
  if (!script) {
    const generated = await generateShortCandidates(candidates.stories, { ...options, hookStyle: assignment.hookStyle,
      maxRequests: 2 - (ledger.scriptRequests?.[input.issueDate] || 0), beforeRequest: async () => {
        ledger.scriptRequests ||= {};
        ledger.scriptRequests[input.issueDate] = (ledger.scriptRequests[input.issueDate] || 0) + 1;
        writeJson(ledgerPath, ledger);
        await gitCheckpoint(ledgerPath)?.();
      } });
    if (generated.length) { story = generated[0].story; script = generated[0].script; }
  }
  if (!script) {
    const manifest: VideoManifest = { version: 1, status: 'skipped', issueDate: input.issueDate,
      reason: `None of ${candidates.stories.length} eligible stories produced a clean short script. No raw abstract was published.` };
    writeJson(manifestPath, manifest);
    return { manifestPath, manifest };
  }
  // Freeze only a validated choice. An unusable first story must not lock the
  // date and prevent another eligible story from being tried on a later run.
  const visuals = await collectVisuals(story, directory, { offline: options.offlineAssets ?? input.sample,
    pexelsApiKey: options.pexelsApiKey || process.env.PEXELS_API_KEY });
  if (!visuals.sourceSpecific && !input.sample && script.profile === 'standard') {
    try { script = simplifyShortScript(story, script); } catch { /* A validated full explanation still beats a broken fallback. */ }
  }
  assignment = { ...assignment, hookStyle: script.provider === 'extractive' ? 'direct-benefit' : script.hookStyle || assignment.hookStyle, topic: visualTopic(story) };
  assignment.cohort = `v3-${assignment.phase}-${assignment.hookStyle}-${assignment.beatSeconds}s`;
  entry ||= ledger.issues[input.issueDate] = { story, selectedAt: (options.now || new Date()).toISOString(), platforms: {} };
  entry.script = script;
  entry.profile = profileFor(script);
  entry.experiment ||= assignment;
  entry.selectionReason ||= videoSuitability(story).reason;
  writeJson(ledgerPath, ledger);
  fs.writeFileSync(path.join(directory, 'script.txt'), entry.script.narration, 'utf8');
  const python = options.python || process.env.VIDEO_PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
  const narrationHash = () => sha256(entry.script!.narration + entry.profile + fs.readFileSync('scripts/video/narrate.py', 'utf8') +
    fs.readFileSync('scripts/video/requirements.txt', 'utf8') + fs.readFileSync('scripts/video/constraints.txt', 'utf8') +
    fs.readFileSync('assets/video/pronunciations.json', 'utf8'));
  let narrationKey = narrationHash();
  const narrationCache = path.join(directory, 'narration-cache.json');
  if (!(fs.existsSync(narrationCache) && fs.existsSync(path.join(directory, 'audio.wav')) && fs.existsSync(path.join(directory, 'timing.json')) &&
      (readJson(narrationCache) as { key?: string }).key === narrationKey)) {
    const narrate = () => runCommand(python, [path.resolve('scripts/video/narrate.py'), '--script', path.join(directory, 'script.txt'), '--output-dir', directory, '--profile', entry.profile!]);
    try { await narrate(); }
    catch (error) {
      if (entry.profile !== 'standard') throw error;
      entry.script = simplifyShortScript(story, entry.script);
      entry.profile = 'simple'; writeJson(ledgerPath, ledger);
      fs.writeFileSync(path.join(directory, 'script.txt'), entry.script.narration, 'utf8');
      narrationKey = narrationHash(); await narrate();
    }
    writeJson(narrationCache, { key: narrationKey });
  }
  const timing = readJson(path.join(directory, 'timing.json')) as NarrationTiming;
  timing.profile = entry.profile;
  writeJson(path.join(directory, 'timing.json'), timing);
  captionChunks(timing); // Fail before rendering when timing or the duration profile is invalid.
  fs.writeFileSync(path.join(directory, 'captions.srt'), buildSrt(timing), 'utf8');
  fs.writeFileSync(path.join(directory, 'captions.ass'), buildAss(timing), 'utf8');
  writeJson(path.join(directory, 'storyboard.json'), entry.script.version === 3 ?
    buildPhotoStoryboard(story, entry.script, timing, visuals.assets, entry.experiment.beatSeconds) : buildStoryboard(story, entry.script, timing));
  writeJson(path.join(directory, 'story.json'), { issueDate: input.issueDate, title: story.title, sourceName: story.sourceName, sourceHost: new URL(story.sourceUrl).hostname });
  await runCommand(python, [path.resolve('scripts/video/assets.py'), '--output-dir', directory]);
  const ffmpeg = options.ffmpeg || process.env.VIDEO_FFMPEG || 'ffmpeg';
  // All filter filenames are fixed relative names, never interpolated news text.
  fs.writeFileSync(path.join(directory, 'render.filter'),
    `[0:v]scale=1080:1920:flags=lanczos,fps=30,subtitles=captions.ass:fontsdir=fonts[v];\n` +
    `[1:a]loudnorm=I=-16:TP=-1.5:LRA=11[a]\n`, 'utf8');
  // Stream native 1080p/30fps artwork straight into the final encode.
  // Static layers and illustrations are cached; no frame sequence is stored.
  const graphicsScript = path.resolve(entry.script.version === 3 ? 'scripts/video/photos.py' : 'scripts/video/graphics.py');
  const renderArgs = [graphicsScript, '--output-dir', directory,
    '--ffmpeg', /[\\/]/.test(ffmpeg) ? path.resolve(ffmpeg) : ffmpeg, '--video-file', 'video.mp4'];
  try { await runCommand(python, renderArgs, directory); }
  catch {
    // Unsubmitted media can safely retry with static photo backgrounds. This
    // keeps the same script, facts, assets, captions and frozen choice.
    if (entry.script.version !== 3) throw new Error('Legacy graphics render failed.');
    await runCommand(python, [...renderArgs, '--simple'], directory);
  }
  const baseUrl = (process.env.NEWSLETTER_BASE_URL || 'https://gradientnews.app').replace(/\/$/, '');
  const manifest: VideoManifest = {
    version: 1, status: 'ready', issueDate: input.issueDate, story, script: entry.script,
    graphicsVersion: GRAPHICS_VERSION,
    selectionReason: entry.selectionReason,
    ...(input.sample ? { sample: true } : {}),
    duration: timing.duration, videoFile: 'video.mp4', videoSha256: fileSha256(path.join(directory, 'video.mp4')),
    captionsFile: 'captions.srt', title: entry.script.title || entry.script.sentences[0].text.slice(0, 90),
    profile: entry.profile, experiment: entry.experiment, assets: visuals.assets, realVisualRatio: 1,
    description: `${story.title}\n\nSource: ${story.sourceName}\n${story.sourceUrl}\n\nThe Gradient: ${baseUrl}/archive/${input.issueDate}\nAI-generated narration. Context imagery is illustrative unless marked as source media.\n\nVisual credits:\n${visualCredits(visuals.assets)}\n\n#AI #AINews #Shorts`,
  };
  entry.contentHash = sha256(JSON.stringify({ storyId: story.id, narration: entry.script.narration, title: manifest.title, description: manifest.description }));
  entry.duration = timing.duration;
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
