import axios, { AxiosRequestConfig } from 'axios';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { LinkedInPost } from './prepare';
import { assertPost, LinkedInPublication, readPublication } from './storage';
import { writeJson } from '../video/storage';

const BASE_URL = 'https://zernio.com/api/v1';
type Transport = (config: AxiosRequestConfig) => Promise<{ data: any }>;
export interface LinkedInPublishOptions {
  post: LinkedInPost;
  apiKey?: string;
  accountId?: string;
  organizationUrn?: string;
  stateDir?: string;
  checkpoint?: () => Promise<void>;
  transport?: Transport;
  now?: () => Date;
  sleep?: (ms: number) => Promise<void>;
}

function failureInfo(error: unknown): { status?: number; code?: string; retryAfter?: string; existingPostId?: string } {
  const response = (error as any)?.response;
  return { status: response?.status, code: response?.data?.code, retryAfter: response?.headers?.['retry-after'],
    existingPostId: response?.data?.details?.existingPostId };
}

function safeError(error: unknown): string {
  const { status } = failureInfo(error);
  if (status === 401 || status === 403) return 'Zernio authorization failed; check the API key, Page admin role, and LinkedIn connection.';
  if (status === 402) return 'Zernio requires payment; check the connected-account allowance.';
  if (status) return `Zernio request failed (HTTP ${status}); inspect the post and LinkedIn connection in Zernio.`;
  if (axios.isAxiosError(error)) return 'Zernio network request failed; rerun with the saved publication state.';
  return error instanceof Error ? error.message.slice(0, 300) : 'LinkedIn publication failed.';
}

function applyPost(entry: LinkedInPublication, data: any): void {
  const post = data?.post;
  if (!post || typeof post._id !== 'string' || !post._id || !Array.isArray(post.platforms)) {
    throw new Error('Zernio returned no usable post ID; submission outcome is uncertain.');
  }
  const platform = post.platforms.find((item: any) => item.platform === 'linkedin');
  if (!platform) throw new Error('Zernio post has no LinkedIn result; inspect it before retrying.');
  entry.postId = post._id;
  const status = platform.status || post.status;
  entry.status = status === 'published' ? 'published' : status === 'failed' ? 'failed' :
    ['cancelled', 'draft'].includes(status) ? 'blocked' : 'pending';
  entry.error = entry.status === 'failed' ? 'LinkedIn rejected the post; inspect the saved Zernio post before retrying.' :
    entry.status === 'blocked' ? `Zernio post is ${status}; automatic resubmission is disabled.` : undefined;
  if (typeof platform.platformPostUrl === 'string' && /^https:\/\/(www\.)?linkedin\.com\//i.test(platform.platformPostUrl)) {
    entry.postUrl = platform.platformPostUrl;
  }
}

/** Durable intent and one frozen request/key per edition, independent of video publishing. */
export async function publishLinkedInPost(options: LinkedInPublishOptions): Promise<LinkedInPublication> {
  assertPost(options.post);
  const stateFile = path.join(options.stateDir || 'linkedin-state', `${options.post.issueDate}.json`);
  let entry = readPublication(stateFile, options.post.issueDate);
  if (entry?.status === 'published') return entry;
  if (!options.apiKey) throw new Error('ZERNIO_API_KEY is missing; add it as an Actions secret.');
  if (!options.accountId) throw new Error('ZERNIO_LINKEDIN_ACCOUNT_ID is missing; select the connected LinkedIn account.');
  if (!options.organizationUrn || !/^urn:li:organization:\d+$/.test(options.organizationUrn)) {
    throw new Error('ZERNIO_LINKEDIN_ORGANIZATION_URN must name the company Page (urn:li:organization:123456789).');
  }
  if (entry?.firstSubmittedAt && (entry.accountId !== options.accountId || entry.organizationUrn !== options.organizationUrn ||
      entry.contentHash !== options.post.contentHash)) {
    throw new Error('LinkedIn content or target changed after submission. Restore the frozen content and Page before retrying.');
  }
  if (!entry?.firstSubmittedAt) {
    entry = { ...options.post, accountId: options.accountId, organizationUrn: options.organizationUrn,
      idempotencyKey: entry?.idempotencyKey || randomUUID(), status: 'prepared' };
  }
  const publication = entry!;
  const now = options.now || (() => new Date());
  const transport: Transport = options.transport || ((config) => axios.request(config));
  const sleep = options.sleep || ((ms) => new Promise(resolve => setTimeout(resolve, ms)));
  async function persist(): Promise<void> {
    writeJson(stateFile, publication);
    await options.checkpoint?.();
  }
  async function request(config: AxiosRequestConfig): Promise<any> {
    for (let attempt = 0; ; attempt++) {
      try {
        return (await transport({ timeout: 60000, ...config,
          headers: { Authorization: `Bearer ${options.apiKey}`, ...config.headers } })).data;
      } catch (error) {
        const info = failureInfo(error);
        const retryable = info.status === undefined || info.status === 429 || info.status >= 500 ||
          (info.status === 409 && info.code === 'idempotency_conflict');
        if (!retryable || attempt >= 2) throw error;
        let delay = 1000 * 2 ** attempt;
        if (info.retryAfter) {
          const seconds = Number(info.retryAfter);
          delay = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(info.retryAfter) - now().getTime();
          if (!Number.isFinite(delay) || delay > 60000) throw error;
        }
        await sleep(Math.max(0, delay));
      }
    }
  }
  try {
    // Known posts are inspected rather than recreated, even on old editions.
    if (publication.postId) {
      applyPost(publication, await request({ method: 'GET', url: `${BASE_URL}/posts/${encodeURIComponent(publication.postId)}` }));
      await persist();
      // Failed posts remain visible for manual repair; never create a replacement.
      return publication;
    }
    if (publication.firstSubmittedAt && now().getTime() - Date.parse(publication.firstSubmittedAt) >= 24 * 3600000) {
      publication.status = 'uncertain';
      publication.error = 'The 24-hour idempotency window expired without a post ID. Find the original in Zernio and record its postId before retrying.';
      await persist();
      return publication;
    }
    const today = now().toISOString().slice(0, 10);
    if (publication.issueDate !== today) throw new Error('Only today\'s UTC edition can create a LinkedIn post; older submissions can still be reconciled.');
    const accounts = (await request({ method: 'GET', url: `${BASE_URL}/accounts` })).accounts;
    if (!Array.isArray(accounts) || !accounts.some((account: any) =>
      account._id === publication.accountId && account.platform === 'linkedin' && account.isActive !== false)) {
      throw new Error('No active LinkedIn account matches ZERNIO_LINKEDIN_ACCOUNT_ID; reconnect it in Zernio.');
    }
    const organizations = (await request({ method: 'GET', url: `${BASE_URL}/accounts/${encodeURIComponent(publication.accountId)}/linkedin-organizations` })).organizations;
    if (!Array.isArray(organizations) || !organizations.some((organization: any) =>
      `urn:li:organization:${organization.id}` === publication.organizationUrn)) {
      throw new Error('The connected LinkedIn member does not administer the configured company Page.');
    }
    publication.status = 'submitting';
    publication.firstSubmittedAt ||= now().toISOString();
    publication.error = undefined;
    // A rejected Git push throws before the external POST.
    await persist();
    try {
      applyPost(publication, await request({ method: 'POST', url: `${BASE_URL}/posts`,
        headers: { 'Idempotency-Key': publication.idempotencyKey }, data: {
          content: publication.content,
          platforms: [{ platform: 'linkedin', accountId: publication.accountId,
            platformSpecificData: { organizationUrn: publication.organizationUrn } }],
          publishNow: true,
        } }));
    } catch (error) {
      const { status, existingPostId } = failureInfo(error);
      if (status === 409 && typeof existingPostId === 'string') {
        applyPost(publication, await request({ method: 'GET', url: `${BASE_URL}/posts/${encodeURIComponent(existingPostId)}` }));
      } else throw error;
    }
    await persist();
  } catch (error) {
    if (publication.status !== 'published') {
      publication.status = publication.postId ? publication.status : publication.firstSubmittedAt ? 'uncertain' : 'blocked';
    }
    publication.error = safeError(error);
    await persist();
  }
  return publication;
}
