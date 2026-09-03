import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { NewsletterIssue } from '../types';
import { buildImagePrompt } from './image-template';

export type ImageModel = 'flux' | 'turbo';

export interface ImageGeneratorOptions {
  outputDir?: string;
  width?: number;
  height?: number;
  model?: ImageModel;
  retries?: number;
  timeoutMs?: number;
}

export class ImageGenerationError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'ImageGenerationError';
  }
}

const DEFAULT_OUTPUT_DIR = path.join(process.cwd(), 'web', 'public', 'issue-images');

export async function generateIssueImage(
  issue: NewsletterIssue,
  options: ImageGeneratorOptions = {}
): Promise<string | null> {
  const {
    outputDir = DEFAULT_OUTPUT_DIR,
    width = 1200,
    height = 630,
    model = 'flux',
    retries = 2,
    timeoutMs = 60_000,
  } = options;

  const fileName = `${issue.date}.png`;
  const filePath = path.join(outputDir, fileName);

  if (fs.existsSync(filePath)) {
    return publicPathFor(fileName);
  }

  const { prompt, seed } = buildImagePrompt(issue);
  const url = buildPollinationsUrl(prompt, { width, height, seed, model });

  const bytes = await fetchWithRetries(url, retries, timeoutMs);
  if (!bytes) return null;

  try {
    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(filePath, bytes);
  } catch (err) {
    console.warn(`[image-generator] Failed to write ${filePath}:`, err);
    return null;
  }

  console.log(`[image-generator] Generated ${fileName} (${bytes.length} bytes, seed=${seed})`);
  return publicPathFor(fileName);
}

export function buildPollinationsUrl(
  prompt: string,
  { width, height, seed, model }: { width: number; height: number; seed: number; model: ImageModel }
): string {
  const params = new URLSearchParams({
    width: String(width),
    height: String(height),
    seed: String(seed),
    nologo: 'true',
    enhance: 'false',
    model,
  });
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?${params.toString()}`;
}

async function fetchWithRetries(
  url: string,
  retries: number,
  timeoutMs: number
): Promise<Buffer | null> {
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await axios.get<ArrayBuffer>(url, {
        responseType: 'arraybuffer',
        timeout: timeoutMs,
        maxRedirects: 5,
        headers: { 'User-Agent': 'gradient-newsletter/1.0' },
      });
      if (response.status === 200 && response.data.byteLength > 0) {
        return Buffer.from(response.data);
      }
      lastError = new Error(`HTTP ${response.status}`);
    } catch (err) {
      lastError = err;
    }
    if (attempt < retries) {
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
    }
  }

  console.warn(`[image-generator] Pollinations fetch failed after ${retries + 1} attempts:`, lastError);
  return null;
}

function publicPathFor(fileName: string): string {
  return `/issue-images/${fileName}`;
}
