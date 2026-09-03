import { NewsletterIssue } from '../types';

export interface ImagePromptContext {
  prompt: string;
  seed: number;
}

const STYLE_BLOCK = [
  'abstract editorial illustration, 1200x630 social card aspect ratio',
  'minimalist composition, no text, no logos, no people, no watermarks',
  'subtle geometric shapes, soft glowing orbs, faint grid lines',
  'mood: thoughtful, calm, forward-looking',
  'color palette: deep navy #0a0f2c to cyan #22d3ee to soft violet #8b5cf6',
  'soft film grain, slight vignette, premium magazine quality',
  'no photorealism, no faces, no readable text, no UI elements',
].join(', ');

const FALLBACK_THEMES = [
  'artificial intelligence',
  'machine learning',
  'emerging technology',
];

const TOPIC_KEYWORDS = [
  'AI', 'ML', 'LLM', 'GPT', 'Claude', 'Gemini', 'Llama', 'Mistral',
  'robotics', 'chip', 'GPU', 'TPU', 'CUDA', 'NPU',
  'model', 'training', 'inference', 'fine-tuning', 'RLHF',
  'research', 'paper', 'benchmark', 'evaluation',
  'open source', 'startup', 'funding', 'acquisition',
  'safety', 'alignment', 'agents', 'agentic', 'RAG', 'retrieval',
  'vision', 'speech', 'audio', 'video', 'image',
  'transformer', 'diffusion', 'embedding', 'vector',
  'API', 'developer', 'cloud', 'edge', 'on-device',
];

export function buildImagePrompt(issue: NewsletterIssue): ImagePromptContext {
  const topThree = issue.articles.slice(0, 3).map((a) => a.title);
  const themes = extractThemes(issue);

  const themeLine = `themes: ${themes.slice(0, 4).join(', ')},`;
  const referenceLine = topThree.length > 0
    ? `subtle reference to: ${topThree.join(' | ')}`
    : 'subtle reference to: frontier AI research and product launches';

  const prompt = `${STYLE_BLOCK}, ${themeLine} ${referenceLine}`;

  return { prompt, seed: dateToSeed(issue.date) };
}

export function extractThemes(issue: NewsletterIssue): string[] {
  const tagThemes = (issue.tags || []).filter((t): t is string => !!t && t.trim().length > 0);
  if (tagThemes.length > 0) return tagThemes;

  const found = new Set<string>();
  const corpus = [
    issue.title,
    issue.intro,
    ...issue.articles.slice(0, 5).map((a) => `${a.title} ${a.description ?? ''}`),
  ].join(' ');

  for (const keyword of TOPIC_KEYWORDS) {
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`\\b${escaped}\\b`, 'i');
    if (re.test(corpus)) {
      found.add(keyword.toLowerCase());
      if (found.size >= 4) break;
    }
  }

  if (found.size === 0) return FALLBACK_THEMES;
  return Array.from(found);
}

export function dateToSeed(date: string): number {
  let h = 0;
  for (let i = 0; i < date.length; i++) {
    h = (h * 31 + date.charCodeAt(i)) | 0;
  }
  return Math.abs(h) || 42;
}
