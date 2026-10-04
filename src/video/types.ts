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
  role?: 'hook' | 'detail' | 'takeaway';
  displayText?: string;
}

export interface VideoScript {
  version?: 1 | 2;
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
export type GraphicLayout = 'hero' | 'panel' | 'split' | 'stat' | 'source';

export interface VideoScene {
  start: number;
  end: number;
  label: string;
  theme: GraphicTheme;
  text: string;
  displayText: string;
  excerpt: boolean;
  kind: 'headline' | 'detail' | 'source';
  variant: number;
  layout?: GraphicLayout;
  terms?: string[];
  termTimings?: { text: string; start: number; end: number }[];
  callout?: string;
}

export interface VideoStoryboard {
  version: 4;
  duration: number;
  fps: 30;
  width: 1080;
  height: 1920;
  renderWidth: 1080;
  renderHeight: 1920;
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
  selectionReason?: string;
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
  selectionReason?: string;
  contentHash?: string;
  media?: { publicUrl: string; videoSha256: string; uploadedAt: string };
  platforms: Partial<Record<Platform, PlatformPublication>>;
}

export interface VideoLedger {
  version: 1;
  issues: Record<string, VideoLedgerEntry>;
}
