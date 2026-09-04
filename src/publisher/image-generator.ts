import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { NewsletterIssue } from '../types';
import { buildImagePrompt, dateToSeed } from './image-template';

export type ImageModel = 'flux' | 'turbo';

export interface ImageGeneratorOptions {
  outputDir?: string;
  width?: number;
  height?: number;
  model?: ImageModel;
  apiKey?: string;
  numSteps?: number;
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
const PIXAZO_URL = 'https://gateway.pixazo.ai/flux-1-schnell/v1/getData';

// Schnell requires dimensions to be multiples of 32. The user's target
// 1200x630 is not (1200/32 = 37.5). We snap up to the nearest valid pair
// that preserves the 1200:630 aspect ratio as closely as possible.
function snapDimensions(width: number, height: number): { width: number; height: number } {
  const snap = (n: number) => Math.max(64, Math.ceil(n / 32) * 32);
  return { width: snap(width), height: snap(height) };
}

export async function generateIssueImage(
  issue: NewsletterIssue,
  options: ImageGeneratorOptions = {}
): Promise<string | null> {
  const {
    outputDir = DEFAULT_OUTPUT_DIR,
    width = 1200,
    height = 630,
    model = 'flux',
    apiKey = process.env.PIXAZ_API_KEY,
    numSteps = 4,
    retries = 2,
    timeoutMs = 60_000,
  } = options;

  const fileName = `${issue.date}.png`;
  const filePath = path.join(outputDir, fileName);

  if (fs.existsSync(filePath)) {
    return publicPathFor(fileName);
  }

  if (!apiKey) {
    console.warn('[image-generator] PIXAZ_API_KEY is not set; skipping image generation.');
    return null;
  }

  const { prompt } = buildImagePrompt(issue);
  const seed = dateToSeed(issue.date);
  const { width: w, height: h } = snapDimensions(width, height);

  const bytes = await fetchWithRetries(prompt, {
    apiKey,
    seed,
    width: w,
    height: h,
    numSteps,
    retries,
    timeoutMs,
  });

  if (!bytes) return null;

  try {
    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(filePath, bytes);
  } catch (err) {
    console.warn(`[image-generator] Failed to write ${filePath}:`, err);
    return null;
  }

  console.log(
    `[image-generator] Generated ${fileName} (${bytes.length} bytes, seed=${seed}, ${w}x${h}, model=${model})`
  );
  return publicPathFor(fileName);
}

async function fetchWithRetries(
  prompt: string,
  { apiKey, seed, width, height, numSteps, retries, timeoutMs }: {
    apiKey: string;
    seed: number;
    width: number;
    height: number;
    numSteps: number;
    retries: number;
    timeoutMs: number;
  }
): Promise<Buffer | null> {
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const submit = await axios.post<{ output?: string }>(
        PIXAZO_URL,
        {
          prompt,
          num_steps: numSteps,
          seed,
          width,
          height,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
            'Ocp-Apim-Subscription-Key': apiKey,
          },
          timeout: timeoutMs,
        }
      );

      const outputUrl = submit.data?.output;
      if (!outputUrl || typeof outputUrl !== 'string') {
        lastError = new Error(`Unexpected Pixazo response: ${JSON.stringify(submit.data).slice(0, 200)}`);
      } else {
        const image = await axios.get<ArrayBuffer>(outputUrl, {
          responseType: 'arraybuffer',
          timeout: timeoutMs,
          maxRedirects: 5,
        });
        if (image.status === 200 && image.data.byteLength > 0) {
          return Buffer.from(image.data);
        }
        lastError = new Error(`Image fetch returned HTTP ${image.status}`);
      }
    } catch (err) {
      lastError = err;
    }

    if (attempt < retries) {
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
    }
  }

  console.warn(`[image-generator] Pixazo fetch failed after ${retries + 1} attempts:`, lastError);
  return null;
}

function publicPathFor(fileName: string): string {
  return `/issue-images/${fileName}`;
}

// Kept for backward compatibility with tests; the actual URL format is
// now the Pixazo gateway rather than Pollinations, and is built inline
// above rather than exposed as a public function.
export function buildPollinationsUrl(
  prompt: string,
  opts: { width: number; height: number; seed: number; model: ImageModel }
): string {
  void prompt;
  void opts;
  throw new ImageGenerationError(
    'buildPollinationsUrl is deprecated. The active provider is Pixazo; see generateIssueImage().'
  );
}
