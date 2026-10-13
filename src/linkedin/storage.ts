import * as fs from 'fs';
import { assertIssueDate, readJson, sha256 } from '../video/storage';
import { LinkedInPost } from './prepare';

export type PublicationStatus = 'prepared' | 'submitting' | 'pending' | 'failed' | 'uncertain' | 'blocked' | 'published';
export interface LinkedInPublication extends LinkedInPost {
  accountId: string;
  organizationUrn: string;
  idempotencyKey: string;
  status: PublicationStatus;
  firstSubmittedAt?: string;
  postId?: string;
  postUrl?: string;
  error?: string;
}

export function assertPost(value: unknown): asserts value is LinkedInPost {
  const post = value as LinkedInPost;
  if (!post || post.version !== 1 || typeof post.content !== 'string' || !post.content.trim() ||
      post.content.length > 3000 || post.contentHash !== sha256(post.content) || typeof post.issueUrl !== 'string') {
    throw new Error('Invalid LinkedIn post or content hash.');
  }
  assertIssueDate(post.issueDate);
  const url = new URL(post.issueUrl);
  if (url.protocol !== 'https:' || url.username || url.password || !url.pathname.endsWith(`/archive/${post.issueDate}`) ||
      !post.content.includes(post.issueUrl)) throw new Error('Invalid LinkedIn newsletter link.');
}

export function readPublication(file: string, date: string): LinkedInPublication | undefined {
  if (!fs.existsSync(file)) return undefined;
  const entry = readJson(file) as LinkedInPublication;
  assertPost(entry);
  if (entry.issueDate !== date || typeof entry.accountId !== 'string' || !entry.accountId ||
      !/^urn:li:organization:\d+$/.test(entry.organizationUrn) ||
      typeof entry.idempotencyKey !== 'string' || !/^[a-f0-9-]{36}$/i.test(entry.idempotencyKey) ||
      !['prepared', 'submitting', 'pending', 'failed', 'uncertain', 'blocked', 'published'].includes(entry.status) ||
      (entry.firstSubmittedAt !== undefined && (typeof entry.firstSubmittedAt !== 'string' || !Number.isFinite(Date.parse(entry.firstSubmittedAt)))) ||
      (entry.postId !== undefined && (typeof entry.postId !== 'string' || !entry.postId)) ||
      (entry.postId !== undefined && !entry.firstSubmittedAt) ||
      (['submitting', 'pending', 'uncertain', 'published'].includes(entry.status) && !entry.firstSubmittedAt) ||
      (entry.postUrl !== undefined && (typeof entry.postUrl !== 'string' || !/^https:\/\/(www\.)?linkedin\.com\//i.test(entry.postUrl))) ||
      (entry.error !== undefined && typeof entry.error !== 'string') ||
      (entry.status === 'published' && !entry.postId)) {
    throw new Error('Invalid LinkedIn publication state; inspect the saved record before retrying.');
  }
  return entry;
}
