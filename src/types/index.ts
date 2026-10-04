export interface Article {
  id: string;
  title: string;
  url: string;
  description?: string;
  content?: string;
  /** Original feed text retained for video evidence; not sent to the newsletter LLM. */
  sourceExcerpt?: string;
  /** Original feed timestamp; empty means unknown, even if curation uses a fallback date. */
  sourcePublishedAt?: string;
  publishedAt: Date;
  sourceId: string;
  sourceName: string;
  category?: string;
  author?: string;
}

export interface Source {
  id: string;
  name: string;
  feedUrl: string;
  category: string;
  priorityWeight: number;
  enabled: boolean;
}

export interface NewsletterIssue {
  id: string;
  title: string;
  date: string;
  intro: string;
  articles: Article[];
  tags: string[];
  featuredImageUrl?: string;
}

export interface Subscriber {
  email: string;
  token: string;
  subscribedAt: string;
  unsubscribedAt?: string;
}

export interface MailerConfig {
  resendApiKey?: string;
  fromEmail?: string;
  fromName?: string;
}

export interface Summary {
  headline: string;
  intro: string;
  body: string;
  sourceUrl: string;
}

export interface SummarizerConfig {
  openaiApiKey?: string;
  openaiModel?: string;
  openaiTemperature?: number;
  groqApiKey?: string;
  groqModel?: string;
  groqTemperature?: number;
}

export type { VideoInput, VideoManifest } from '../video/types';
