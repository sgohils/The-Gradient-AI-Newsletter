import * as fs from 'fs';
import * as path from 'path';
import { assertIssueDate, fileSha256, readManifest } from './storage';
import { ReadyVideoManifest } from './types';

/** Normalize prior artifact layouts without changing reviewed media or the live ledger. */
export function restoreReviewedVideo(issueDate: string, restoredDir: string, outputDir = 'video-output'): {
  manifestPath: string; manifest: ReadyVideoManifest;
} {
  assertIssueDate(issueDate);
  const root = path.resolve(restoredDir);
  const candidates = [path.join(root, 'video-output', issueDate, 'manifest.json'),
    // Earlier preview workflows uploaded an extra restored-video prefix.
    path.join(root, 'restored-video', 'video-output', issueDate, 'manifest.json'),
    path.join(root, issueDate, 'manifest.json')];
  const source = candidates.find(candidate => fs.existsSync(candidate));
  if (!source) throw new Error(`The selected run has no reviewed video for ${issueDate}. Run a new preview with source_run_id empty and publish=false; no replacement video will be generated for this publication request.`);
  const manifest = readManifest(source);
  if (manifest.issueDate !== issueDate || manifest.status !== 'ready') throw new Error('The reviewed video is not ready or has a different issue date.');
  const video = path.join(path.dirname(source), manifest.videoFile);
  if (!fs.existsSync(video) || fileSha256(video) !== manifest.videoSha256) throw new Error('The reviewed video artifact is missing or changed; restore the original file.');
  const destination = path.resolve(outputDir, issueDate);
  fs.mkdirSync(destination, { recursive: true });
  fs.cpSync(path.dirname(source), destination, { recursive: true });
  return { manifestPath: path.join(destination, 'manifest.json'), manifest };
}
