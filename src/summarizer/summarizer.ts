import axios from 'axios';
import { Article, Summary, SummarizerConfig } from '../types';

let httpClient: typeof axios = axios;

export function setHttpClient(client: typeof axios): void {
  httpClient = client;
}

const DEFAULT_MODEL = 'gpt-4o-mini';
const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_GROQ_MODEL = 'openai/gpt-oss-120b';
const DEFAULT_GROQ_TEMPERATURE = 1;
const HEADLINE_MAX_LENGTH = 80;
const MAX_FALLBACK_SENTENCES = 6;

interface OpenAIChatResponse {
  choices: [
    {
      message: {
        content: string;
      };
    }
  ];
}

export async function summarizeArticle(
  article: Article,
  config: SummarizerConfig = {}
): Promise<Summary> {
  if (config.groqApiKey) {
    return summarizeWithGroq(article, config);
  }

  if (config.openaiApiKey) {
    return summarizeWithOpenAI(article, config);
  }

  return summarizeFallback(article);
}

async function summarizeWithOpenAI(
  article: Article,
  config: SummarizerConfig
): Promise<Summary> {
  const model = config.openaiModel || DEFAULT_MODEL;
  const temperature = config.openaiTemperature ?? DEFAULT_TEMPERATURE;

  const prompt = buildPrompt(article);

  const response = await httpClient.post<OpenAIChatResponse>(
    'https://api.openai.com/v1/chat/completions',
    {
      model,
      temperature,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You are a journalist writing concise, engaging newsletters about AI. Always respond with valid JSON matching the requested schema.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    },
    {
      headers: {
        Authorization: `Bearer ${config.openaiApiKey}`,
        'Content-Type': 'application/json',
      },
    }
  );

  const content = response.data.choices?.[0]?.message?.content || '';
  let parsed: { headline: string; intro: string; body: string };

  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error('Failed to parse OpenAI response as JSON');
  }

  return {
    headline: enforceHeadlineLength(parsed.headline || article.title),
    intro: parsed.intro || '',
    body: parsed.body || '',
    sourceUrl: article.url,
  };
}

async function summarizeWithGroq(
  article: Article,
  config: SummarizerConfig
): Promise<Summary> {
  const model = config.groqModel || DEFAULT_GROQ_MODEL;
  const temperature = config.groqTemperature ?? DEFAULT_GROQ_TEMPERATURE;

  const prompt = buildPrompt(article);

  const response = await httpClient.post<OpenAIChatResponse>(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      model,
      temperature,
      messages: [
        {
          role: 'system',
          content:
            'You are a journalist writing concise, engaging newsletters about AI. Always respond with valid JSON matching the requested schema.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    },
    {
      headers: {
        Authorization: `Bearer ${config.groqApiKey}`,
        'Content-Type': 'application/json',
      },
    }
  );

  const content = response.data.choices?.[0]?.message?.content || '';
  let parsed: { headline: string; intro: string; body: string };

  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error('Failed to parse Groq response as JSON');
  }

  return {
    headline: enforceHeadlineLength(parsed.headline || article.title),
    intro: parsed.intro || '',
    body: parsed.body || '',
    sourceUrl: article.url,
  };
}

function buildPrompt(article: Article): string {
  const text = [article.content, article.description].filter(Boolean).join('\n\n');

  return `Summarize the following AI article into a newsletter-friendly summary. Return strictly JSON with keys "headline", "intro", and "body".

Article title: ${article.title}
Article text: ${text || 'No content available.'}

Rules:
- headline: engaging, factual, max 80 characters
- intro: 1-2 sentences setting the tone
- body: structured as:
  **What happened:** ...
  **Why it matters:** ...
  **Key stats:** ...
  **Source:** ${article.url}`;
}

function summarizeFallback(article: Article): Summary {
  const text = [article.description, article.content].filter(Boolean).join(' ');
  const sentences = splitIntoSentences(text);

  const headline = enforceHeadlineLength(article.title);

  const intro = sentences.slice(0, 2).join(' ') || `Read more about ${article.title}.`;

  const meaningfulSentences = sentences.slice(0, MAX_FALLBACK_SENTENCES);
  const whatHappened = meaningfulSentences.slice(0, 2).join(' ') || 'Details scarce in the original source.';
  const keyStats = extractKeyStats(meaningfulSentences);
  const body = [
    `**What happened:** ${whatHappened}`,
    `**Key stats:** ${keyStats}`,
    `**Source:** ${article.url}`,
  ].join('\n\n');

  return {
    headline,
    intro,
    body,
    sourceUrl: article.url,
  };
}

function enforceHeadlineLength(headline: string): string {
  if (headline.length <= HEADLINE_MAX_LENGTH) {
    return headline;
  }

  return headline.slice(0, HEADLINE_MAX_LENGTH - 3).trimEnd() + '...';
}

function splitIntoSentences(text: string): string[] {
  if (!text) {
    return [];
  }

  return text
    .replace(/([.!?])\s+/g, '$1|')
    .split('|')
    .map((s) => s.trim())
    .filter((s) => s.length > 10);
}

function extractKeyStats(sentences: string[]): string {
  const stats = sentences.filter((s) => /[\d]/.test(s));

  if (stats.length) {
    return stats.join(' ');
  }

  return 'No specific stats available.';
}
