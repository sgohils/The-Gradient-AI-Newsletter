import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';
import { VideoInput, VideoLedger, VideoManifest } from './types';
import { profileFor, validDuration } from './profiles';

export function assertIssueDate(value: unknown): asserts value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
      !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) {
    throw new Error('Invalid issue date; expected YYYY-MM-DD.');
  }
}

export function readJson(file: string, maxBytes = 2 * 1024 * 1024): unknown {
  if (fs.statSync(file).size > maxBytes) throw new Error('Video JSON exceeds its size limit.');
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

export function writeJson(file: string, value: unknown): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  fs.renameSync(temporary, file);
}

export function sha256(value: string | Buffer): string {
  return createHash('sha256').update(value).digest('hex');
}

export function fileSha256(file: string): string {
  return sha256(fs.readFileSync(file));
}

export function readInput(file: string): VideoInput {
  if (!fs.existsSync(file)) throw new Error(`Missing video input: ${file}. For an existing newsletter, run npm run video:prepare -- --issue-date YYYY-MM-DD; for a fictional preview, run npm run video:sample.`);
  const input = readJson(file) as VideoInput;
  if (!input || input.version !== 1 || !Array.isArray(input.stories) || input.stories.length > 25) {
    throw new Error('Invalid VideoInput version or stories.');
  }
  assertIssueDate(input.issueDate);
  if (!Number.isFinite(Date.parse(input.generatedAt))) throw new Error('Invalid generation time.');
  for (const story of input.stories) {
    if (!story || !['id', 'title', 'sourceUrl', 'sourceName', 'publishedAt', 'sourceExcerpt', 'summary']
      .every((key) => typeof story[key as keyof typeof story] === 'string') ||
      !Number.isFinite(story.rank) || story.sourceExcerpt.length > 20000) {
      throw new Error('Invalid video story.');
    }
    if (!/^https?:$/.test(new URL(story.sourceUrl).protocol)) throw new Error('Invalid source URL.');
  }
  return input;
}

export function readManifest(file: string): VideoManifest {
  const manifest = readJson(file) as VideoManifest;
  if (!manifest || manifest.version !== 1) throw new Error('Invalid VideoManifest version.');
  assertIssueDate(manifest.issueDate);
  if (manifest.status === 'skipped' && typeof manifest.reason === 'string') return manifest;
  if (manifest.status !== 'ready' || !manifest.story || !manifest.script ||
      typeof manifest.script.narration !== 'string' || !Array.isArray(manifest.script.sentences) ||
      !validDuration(manifest.duration, profileFor(manifest.script)) ||
      !/^[a-f0-9]{64}$/.test(manifest.videoSha256) || typeof manifest.title !== 'string' ||
      typeof manifest.description !== 'string' || typeof manifest.videoFile !== 'string' ||
      path.basename(manifest.videoFile) !== manifest.videoFile) {
    throw new Error('Invalid or unfinished video manifest.');
  }
  return manifest;
}

export function readLedger(file: string): VideoLedger {
  if (!fs.existsSync(file)) return { version: 1, issues: {} };
  const ledger = readJson(file, 32 * 1024 * 1024) as VideoLedger;
  if (!ledger || ledger.version !== 1 || !ledger.issues || Array.isArray(ledger.issues) ||
      typeof ledger.issues !== 'object') throw new Error('Invalid publication ledger; refusing to risk duplicate posts.');
  for (const [date, entry] of Object.entries(ledger.issues)) {
    assertIssueDate(date);
    if (!entry.story || typeof entry.story.sourceUrl !== 'string' || !entry.platforms) {
      throw new Error('Incomplete publication ledger; restore it before publishing.');
    }
  }
  if (ledger.scriptRequests && (Array.isArray(ledger.scriptRequests) || Object.entries(ledger.scriptRequests).some(([date, requests]) => {
    assertIssueDate(date); return !Number.isInteger(requests) || requests < 0 || requests > 2;
  }))) throw new Error('Invalid per-edition script request budget.');
  return ledger;
}

/** Older source text remains in posts; keep durable identity and submission state. */
export function compactLedger(ledger: VideoLedger, now = new Date()): void {
  for (const date of Object.keys(ledger.scriptRequests || {})) {
    if (now.getTime() - Date.parse(date) > 7 * 86400000) delete ledger.scriptRequests![date];
  }
  for (const entry of Object.values(ledger.issues)) {
    const age = now.getTime() - Date.parse(entry.story.publishedAt);
    if (!Number.isFinite(age) || age <= 7 * 86400000) continue;
    entry.story.sourceExcerpt = '';
    entry.story.summary = '';
    entry.script = undefined;
    for (const publication of Object.values(entry.platforms)) {
      if (publication?.status === 'published') publication.request = undefined;
    }
  }
}
