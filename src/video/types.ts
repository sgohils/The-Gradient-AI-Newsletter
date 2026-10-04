export interface VideoStory {
  id: string;
  rank: number;
  title: string;
  sourceUrl: string;
  sourceName: string;
  publishedAt: string;
  sourceExcerpt: string;
  summary: string;
}

export interface VideoInput {
  version: 1;
  issueDate: string;
  generatedAt: string;
  stories: VideoStory[];
  sample?: boolean;
}

export interface ScriptSentence {
  text: string;
  evidenceQuote: string;
}

export interface VideoScript {
  provider: 'groq' | 'extractive';
  sentences: ScriptSentence[];
  narration: string;
}

export interface WordTiming {
  text: string;
  start: number;
  end: number;
}

export interface NarrationTiming {
  duration: number;
  sampleRate: number;
  words: WordTiming[];
}

export type GraphicTheme = 'network' | 'code' | 'comparison' | 'research' | 'chip' | 'robot' | 'security' | 'policy' | 'number' | 'link';

export interface VideoScene {
  start: number;
  end: number;
  label: string;
  theme: GraphicTheme;
  text: string;
  callout?: string;
}

export interface VideoStoryboard {
  version: 1;
  duration: number;
  fps: 12;
  width: 780;
  height: 560;
  scenes: VideoScene[];
}

export interface ReadyVideoManifest {
  version: 1;
  status: 'ready';
  issueDate: string;
  story: VideoStory;
  script: VideoScript;
  duration: number;
  videoFile: string;
  videoSha256: string;
  captionsFile: string;
  title: string;
  description: string;
  sample?: boolean;
  graphicsVersion?: number;
}

export interface SkippedVideoManifest {
  version: 1;
  status: 'skipped';
  issueDate: string;
  reason: string;
}

export type VideoManifest = ReadyVideoManifest | SkippedVideoManifest;
export type Platform = 'youtube' | 'tiktok';
export type PublishStatus = 'prepared' | 'submitting' | 'pending' | 'published' | 'failed' | 'blocked' | 'uncertain';

export interface PlatformPublication {
  accountId: string;
  status: PublishStatus;
  idempotencyKey: string;
  firstSubmittedAt?: string;
  postId?: string;
  postUrl?: string;
  error?: string;
  request?: Record<string, unknown>;
}

export interface VideoLedgerEntry {
  story: VideoStory;
  selectedAt: string;
  script?: VideoScript;
  contentHash?: string;
  media?: { publicUrl: string; videoSha256: string; uploadedAt: string };
  platforms: Partial<Record<Platform, PlatformPublication>>;
}

export interface VideoLedger {
  version: 1;
  issues: Record<string, VideoLedgerEntry>;
}
