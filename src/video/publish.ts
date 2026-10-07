import axios, { AxiosRequestConfig } from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { Platform, PlatformPublication, ReadyVideoManifest, VideoLedger } from './types';
import { compactLedger, fileSha256, readJson, readLedger, readManifest, sha256, writeJson } from './storage';
import { validateScript } from './script';
import { storyKey } from './selection';

const BASE_URL = 'https://zernio.com/api/v1';
type Transport = (config: AxiosRequestConfig) => Promise<{ data: any }>;
type ProviderPost = { _id: string; status: string; platforms: { platform: string; status: string; platformPostUrl?: string; error?: string }[] };

export interface TikTokApproval {
  issueDate: string;
  accountId: string;
  videoSha256: string;
  contentPreviewConfirmed: true;
  expressConsentGiven: true;
  privacyLevel: 'PUBLIC_TO_EVERYONE';
  allowComment: boolean;
  allowDuet: boolean;
  allowStitch: boolean;
}

export interface PublishOptions {
  manifestPath?: string;
  ledgerPath?: string;
  apiKey?: string;
  accounts: Partial<Record<Platform, string>>;
  platforms?: Platform[];
  tiktokApproval?: TikTokApproval;
  reconcileOnly?: boolean;
  pollSeconds?: number;
  now?: () => Date;
  checkpoint?: () => Promise<void>;
  transport?: Transport;
  sleep?: (ms: number) => Promise<void>;
}

function failureInfo(error: unknown): { status?: number; code?: string; retryAfter?: string } {
  const candidate = error as { response?: { status?: number; data?: { code?: string }; headers?: Record<string, string> } };
  return { status: candidate?.response?.status, code: candidate?.response?.data?.code, retryAfter: candidate?.response?.headers?.['retry-after'] };
}

function safeError(error: unknown): string {
  const { status } = failureInfo(error);
  if (status === 401 || status === 403) return 'Zernio authorization failed; affected publication is automatically paused.';
  if (status === 402) return 'Provider requires payment; stopped without enabling a paid fallback.';
  if (status) return `Provider request failed (HTTP ${status}); review the connected account in Zernio.`;
  // Local validation errors are useful; never print Axios request/config objects.
  if (axios.isAxiosError(error)) return 'Provider network request failed; retry with the persisted submission key.';
  return error instanceof Error ? error.message.slice(0, 300) : 'Publication failed.';
}

function providerPost(data: any): ProviderPost {
  const post = data?.post;
  if (!post || typeof post._id !== 'string' || !Array.isArray(post.platforms)) {
    throw new Error('Provider did not return a post ID; publication outcome is uncertain.');
  }
  return post;
}

function applyPost(publication: PlatformPublication, platform: Platform, post: ProviderPost): void {
  publication.postId = post._id;
  const result = post.platforms.find((item) => item.platform === platform);
  const status = result?.status || post.status;
  if (status === 'published') {
    publication.status = 'published';
    publication.error = undefined;
  } else if (status === 'failed') {
    publication.status = 'failed';
    publication.error = 'Platform rejected the video; inspect the post in Zernio before retrying.';
  } else if (status === 'cancelled' || status === 'draft') {
    publication.status = 'blocked';
    publication.error = `Provider post is ${status}; automatic resubmission is disabled.`;
  } else {
    publication.status = 'pending';
    publication.error = undefined;
  }
  if (typeof result?.platformPostUrl === 'string' && /^https:\/\//.test(result.platformPostUrl)) {
    publication.postUrl = result.platformPostUrl;
  }
}

export function validateTikTokApproval(approval: TikTokApproval | undefined, manifest: ReadyVideoManifest, accountId: string): void {
  if (!approval || approval.issueDate !== manifest.issueDate || approval.accountId !== accountId ||
      approval.videoSha256 !== manifest.videoSha256 || approval.contentPreviewConfirmed !== true ||
      approval.expressConsentGiven !== true || approval.privacyLevel !== 'PUBLIC_TO_EVERYONE' ||
      ![approval.allowComment, approval.allowDuet, approval.allowStitch].every((value) => typeof value === 'boolean')) {
    throw new Error('TikTok requires a real preview and consent receipt for this exact video and account. Unattended TikTok posting is blocked.');
  }
}

export async function publishVideo(options: PublishOptions): Promise<VideoLedger> {
  const ledgerPath = path.resolve(options.ledgerPath || 'video-state/ledger.json');
  const ledger = readLedger(ledgerPath);
  const now = options.now || (() => new Date());
  const sleep = options.sleep || ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));
  const transport: Transport = options.transport || ((config) => axios.request(config));
  async function persist(): Promise<void> {
    compactLedger(ledger, now());
    writeJson(ledgerPath, ledger);
    // CI pushes each intent before the corresponding external write.
    await options.checkpoint?.();
  }
  async function request(config: AxiosRequestConfig, authenticated = true): Promise<any> {
    for (let attempt = 0; ; attempt++) {
      try {
        // Recreate a consumed file stream on each PUT retry.
        const requestConfig = { ...config };
        if (typeof requestConfig.data === 'function') requestConfig.data = requestConfig.data();
        const result = await transport({ timeout: 60000, maxBodyLength: Infinity, ...requestConfig,
          headers: { ...(authenticated ? { Authorization: `Bearer ${options.apiKey}` } : {}), ...config.headers } });
        return result.data;
      } catch (error) {
        const info = failureInfo(error);
        const retryable = info.status === undefined || info.status === 429 || (info.status >= 500) ||
          (info.status === 409 && info.code === 'idempotency_conflict');
        if (!retryable || attempt >= 2) throw error;
        let delay = 1000 * 2 ** attempt;
        if (info.retryAfter) {
          const seconds = Number(info.retryAfter);
          delay = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(info.retryAfter) - now().getTime();
          // Do not retry earlier than a long provider delay; let a later run resume.
          if (delay > 60000) throw error;
        }
        await sleep(Math.max(0, delay) + Math.floor(Math.random() * 250));
      }
    }
  }

  // Always reconcile known pending IDs, including when today's input was skipped.
  if (options.apiKey) {
    for (const entry of Object.values(ledger.issues)) {
      for (const [platform, publication] of Object.entries(entry.platforms)) {
        if (publication?.firstSubmittedAt && !publication.postId && publication.status !== 'published' &&
            now().getTime() - Date.parse(publication.firstSubmittedAt) >= 24 * 3600000) {
          entry.quarantineReason = 'The 24-hour idempotency window expired with an unknown upload outcome; quarantined without creating another upload.';
          publication.status = 'uncertain'; publication.error = entry.quarantineReason; await persist(); continue;
        }
        if (!publication?.postId || publication.status === 'published' || publication.status === 'failed' || publication.status === 'blocked') continue;
        try {
          applyPost(publication, platform as Platform, providerPost(await request({ method: 'GET', url: `${BASE_URL}/posts/${encodeURIComponent(publication.postId)}` })));
        } catch (error) {
          publication.error = safeError(error);
        }
        await persist();
      }
    }
  }
  if (options.reconcileOnly) return ledger;
  if (!options.manifestPath) throw new Error('--manifest is required for publication.');
  const manifest = readManifest(options.manifestPath);
  if (manifest.status === 'skipped') return ledger;
  if (manifest.sample) throw new Error('Sample videos cannot be published. Render a real newsletter issue.');
  validateScript(manifest.story, manifest.script);
  const entry = ledger.issues[manifest.issueDate];
  if (!entry || storyKey(entry.story.sourceUrl) !== storyKey(manifest.story.sourceUrl)) {
    throw new Error('Render with this publication ledger before uploading.');
  }
  const expectedHash = sha256(JSON.stringify({ storyId: manifest.story.id, narration: manifest.script.narration, title: manifest.title, description: manifest.description }));
  if (entry.contentHash !== expectedHash) throw new Error('Manifest content differs from the frozen ledger. Render or restore the original artifact.');
  const videoPath = path.resolve(path.dirname(options.manifestPath), manifest.videoFile);
  if (!fs.existsSync(videoPath) || fileSha256(videoPath) !== manifest.videoSha256) throw new Error('Video file is missing or has changed since rendering.');
  if (fs.statSync(videoPath).size > 50 * 1024 * 1024) throw new Error('Video exceeds the 50 MB upload budget.');
  if (entry.media && entry.media.videoSha256 !== manifest.videoSha256) throw new Error('Uploaded video differs from this render; restore the original artifact before retrying.');

  const configured = options.platforms || ['youtube', 'tiktok'];
  if (ledger.youtubePause && configured.every(platform => platform === 'youtube')) return ledger;
  let connected: { _id: string; platform: string; isActive?: boolean }[] | undefined;
  let connectionError: unknown;
  if (options.apiKey) {
    try { connected = (await request({ method: 'GET', url: `${BASE_URL}/accounts` })).accounts; }
    catch (error) { connectionError = error; }
  }
  for (const platform of configured) {
    if (platform === 'youtube' && ledger.youtubePause) continue;
    const accountId = options.accounts[platform] || '';
    let publication = entry.platforms[platform];
    if (publication?.status === 'published') continue;
    if (entry.quarantineReason) continue;
    if (publication && publication.accountId !== accountId && publication.firstSubmittedAt) {
      throw new Error(`The ${platform} account changed after submission; refusing to publish to a different account.`);
    }
    if (!publication || publication.accountId !== accountId) {
      publication = { accountId, status: 'prepared', idempotencyKey: randomUUID() };
      entry.platforms[platform] = publication;
    }
    try {
      if (!options.apiKey) throw new Error('ZERNIO_API_KEY is missing; connect accounts and add the GitHub secret.');
      if (connectionError) throw connectionError;
      if (!accountId || !Array.isArray(connected) || !connected.some((account) => account._id === accountId && account.platform === platform && account.isActive !== false)) {
        throw new Error(`No active ${platform} account matches the configured ID; connect it in Zernio.`);
      }
      // Known posts are inspected, never recreated. A missing receipt cannot undo
      // an earlier legitimate upload, but is required before a retry of that upload.
      if (publication.postId) {
        const post = providerPost(await request({ method: 'GET', url: `${BASE_URL}/posts/${encodeURIComponent(publication.postId)}` }));
        applyPost(publication, platform, post);
        await persist();
        if (publication.status === 'published' || publication.status === 'blocked') continue;
        if (publication.status === 'failed') {
          assertFresh(manifest, now());
          if (platform === 'tiktok') validateTikTokApproval(options.tiktokApproval, manifest, accountId);
          publication.status = 'submitting';
          await persist();
          applyPost(publication, platform, providerPost(await request({ method: 'POST', url: `${BASE_URL}/posts/${encodeURIComponent(publication.postId)}/retry`, headers: { 'Idempotency-Key': `${publication.idempotencyKey}-retry` } })));
        }
      } else {
        assertFresh(manifest, now());
        if (publication.firstSubmittedAt && now().getTime() - Date.parse(publication.firstSubmittedAt) >= 24 * 3600000) {
          entry.quarantineReason = 'Submission outcome is unknown and the 24-hour idempotency window expired; automatically quarantined.';
          throw new Error(entry.quarantineReason);
        }
        let tiktokSettings: Record<string, unknown> | undefined;
        if (platform === 'tiktok') {
          validateTikTokApproval(options.tiktokApproval, manifest, accountId);
          const approval = options.tiktokApproval!;
          const creator = await request({ method: 'GET', url: `${BASE_URL}/accounts/${encodeURIComponent(accountId)}/tiktok/creator-info` });
          if (creator.creator?.canPostMore !== true || !creator.privacyLevels?.some((level: { value: string }) => level.value === approval.privacyLevel) ||
              typeof creator.postingLimits?.maxVideoDurationSec !== 'number' || manifest.duration > creator.postingLimits.maxVideoDurationSec) {
            throw new Error('TikTok creator limits do not allow this public video right now.');
          }
          const interactions = creator.postingLimits.interactionSettings;
          for (const [key, value] of [['allow_comment', approval.allowComment], ['allow_duet', approval.allowDuet], ['allow_stitch', approval.allowStitch]] as const) {
            if (value && interactions?.[key]?.enabled !== true) throw new Error(`TikTok has disabled ${key} for this creator.`);
          }
          tiktokSettings = { privacy_level: approval.privacyLevel, allow_comment: approval.allowComment,
            allow_duet: approval.allowDuet, allow_stitch: approval.allowStitch, content_preview_confirmed: true,
            express_consent_given: true, video_made_with_ai: true, commercialContentType: 'none' };
        }
        if (!entry.media) {
          const presign = await request({ method: 'POST', url: `${BASE_URL}/media/presign`, data: {
            filename: `${manifest.issueDate}.mp4`, contentType: 'video/mp4', size: fs.statSync(videoPath).size,
          } });
          if (typeof presign.uploadUrl !== 'string' || typeof presign.publicUrl !== 'string' ||
              new URL(presign.uploadUrl).protocol !== 'https:' || new URL(presign.publicUrl).protocol !== 'https:') {
            throw new Error('Provider returned invalid media upload URLs.');
          }
          await request({ method: 'PUT', url: presign.uploadUrl, data: () => fs.createReadStream(videoPath),
            headers: { 'Content-Type': 'video/mp4', 'Content-Length': String(fs.statSync(videoPath).size) } }, false);
          entry.media = { publicUrl: presign.publicUrl, videoSha256: manifest.videoSha256, uploadedAt: now().toISOString() };
          await persist();
        }
        publication.request ||= {
          content: manifest.description,
          mediaItems: [{ type: 'video', url: entry.media.publicUrl }],
          platforms: [{ platform, accountId, ...(platform === 'youtube' ? { platformSpecificData: {
            title: manifest.title, visibility: 'public', madeForKids: false, containsSyntheticMedia: true, categoryId: '28',
          } } : {}) }],
          ...(tiktokSettings ? { tiktokSettings } : {}),
          publishNow: true,
        };
        publication.status = 'submitting';
        publication.firstSubmittedAt ||= now().toISOString();
        publication.error = undefined;
        // A checkpoint failure throws before POST, so intent must be durable first.
        await persist();
        try {
          applyPost(publication, platform, providerPost(await request({ method: 'POST', url: `${BASE_URL}/posts`, data: publication.request,
            headers: { 'Idempotency-Key': publication.idempotencyKey } })));
        } catch (error) {
          const duplicate = (error as any)?.response?.data?.details?.existingPostId;
          if (failureInfo(error).status === 409 && typeof duplicate === 'string') {
            applyPost(publication, platform, providerPost(await request({ method: 'GET', url: `${BASE_URL}/posts/${encodeURIComponent(duplicate)}` })));
          } else throw error;
        }
      }
      await persist();
      const deadline = Date.now() + Math.max(0, options.pollSeconds ?? 180) * 1000;
      while (publication.status === 'pending' && publication.postId && Date.now() + 10000 <= deadline) {
        await sleep(10000);
        applyPost(publication, platform, providerPost(await request({ method: 'GET', url: `${BASE_URL}/posts/${encodeURIComponent(publication.postId)}` })));
        await persist();
      }
    } catch (error) {
      const { status } = failureInfo(error);
      // Never downgrade a known successful upload because a later checkpoint failed.
      if (publication.status !== 'published') {
        if (publication.postId) publication.status = publication.status === 'failed' ? 'failed' : 'pending';
        // An earlier retry may have reached the provider even if the final error
        // is a 4xx. Only a known post ID can safely resolve that ambiguity.
        else if (publication.firstSubmittedAt) publication.status = 'uncertain';
        else publication.status = status && status >= 400 ? 'failed' : 'blocked';
      }
      publication.error = safeError(error);
      if (platform === 'youtube' && [401, 402, 403].includes(status || 0)) ledger.youtubePause = { at: now().toISOString(), reason: publication.error };
      await persist();
    }
  }
  return ledger;
}

function assertFresh(manifest: ReadyVideoManifest, now: Date): void {
  const age = now.getTime() - Date.parse(manifest.story.publishedAt);
  if (!Number.isFinite(age) || age < -5 * 60000 || age > 72 * 3600000) {
    throw new Error('Story is outside the 72-hour freshness window; no new publication will be attempted.');
  }
}

export function readApproval(file?: string): TikTokApproval | undefined {
  return file ? readJson(file) as TikTokApproval : undefined;
}

export function publicationSummary(ledger: VideoLedger, date?: string): string {
  const lines = ['## Daily video publishing', '', '| Issue | Platform | Status | Result |', '| --- | --- | --- | --- |'];
  for (const [issueDate, entry] of Object.entries(ledger.issues)) {
    if (date && issueDate !== date) continue;
    for (const [platform, publication] of Object.entries(entry.platforms)) {
      if (!publication) continue;
      const detail = publication.postUrl || publication.error || (publication.postId ? `Provider post ${publication.postId}` : '');
      lines.push(`| ${issueDate} | ${platform} | ${publication.status} | ${detail.replace(/[|\r\n]/g, ' ')} |`);
    }
  }
  return `${lines.join('\n')}\n`;
}
