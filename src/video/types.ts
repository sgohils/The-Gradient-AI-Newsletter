export interface VideoStory {
  id: string;
  rank: number;
  title: string;
  sourceUrl: string;
  sourceName: string;
  publishedAt: string;
  sourceExcerpt: string;
  summary: string;
  visualCandidates?: VisualCandidate[];
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
  version?: 1 | 2 | 3;
  provider: 'groq' | 'extractive';
  sentences: ScriptSentence[];
  narration: string;
  profile?: ShortProfile;
  title?: string;
  hookStyle?: HookStyle;
  checked?: boolean;
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
  profile?: ShortProfile;
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
  assetId?: string;
  motion?: 'push' | 'pan-left' | 'pan-right';
}

export interface VideoStoryboard {
  version: 4 | 5;
  duration: number;
  fps: 30;
  width: 1080;
  height: 1920;
  renderWidth: 1080;
  renderHeight: 1920;
  scenes: VideoScene[];
  assets?: VisualAsset[];
  profile?: ShortProfile;
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
  assets?: VisualAsset[];
  profile?: ShortProfile;
  experiment?: ExperimentAssignment;
  realVisualRatio?: number;
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
  experiment?: ExperimentAssignment;
  profile?: ShortProfile;
  recoveryRunId?: string;
  duration?: number;
  quarantineReason?: string;
  platforms: Partial<Record<Platform, PlatformPublication>>;
}

export interface VideoLedger {
  version: 1;
  issues: Record<string, VideoLedgerEntry>;
  scriptRequests?: Record<string, number>;
  youtubePause?: { at: string; reason: string };
}

export type ShortProfile = 'standard' | 'simple' | 'legacy';
export type HookStyle = 'direct-benefit' | 'supported-surprise';
export interface VisualCandidate {
  url: string; sourceUrl: string; creator: string; license: string; licenseUrl: string;
  title: string; kind: 'photo' | 'video'; usage: 'actual' | 'illustrative';
}
export interface VisualAsset extends VisualCandidate {
  id: string; file: string; sha256: string; width: number; height: number;
  downloadedAt: string; provider: 'official' | 'wikimedia' | 'pexels' | 'library';
  credit: string;
}
export interface ExperimentAssignment {
  phase: 'baseline' | 'hook' | 'pacing'; hookStyle: HookStyle; beatSeconds: 2 | 3;
  cohort: string; formatVersion: 3; topic: string;
}
export interface VideoMetric {
  issueDate: string; videoId: string; observedAt: string; finalized: boolean;
  ageDays: number; engagedViews?: number; views?: number;
  averageViewDuration?: number; averageViewPercentage?: number;
  retention?: { elapsedVideoTimeRatio: number; audienceWatchRatio: number }[];
  error?: string; experiment?: ExperimentAssignment; duration?: number;
}
export interface ExperimentState {
  version: 1; championHook: HookStyle; championBeatSeconds: 2 | 3;
  hookWinner?: HookStyle; pacingWinner?: 2 | 3; metrics: Record<string, VideoMetric>;
  decisions: { at: string; phase: string; reason: string }[];
}
