import dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { Source, MailerConfig } from '../types';

dotenv.config();

export interface Config {
  openaiApiKey?: string;
  openaiModel?: string;
  openaiTemperature?: number;
  groqApiKey?: string;
  groqModel?: string;
  groqTemperature?: number;
  pixazApiKey?: string;
  outputDir?: string;
  sources: Source[];
  maxArticles: number;
  mailer: MailerConfig;
  imageGeneration: {
    enabled: boolean;
    outputDir: string;
    model: 'flux' | 'turbo';
  };
}

const DEFAULT_CONFIG: Omit<Config, 'sources'> = {
  openaiApiKey: process.env.OPENAI_API_KEY,
  openaiModel: 'gpt-4o-mini',
  openaiTemperature: 0.7,
  groqApiKey: process.env.GROQ_API_KEY,
  groqModel: 'openai/gpt-oss-120b',
  groqTemperature: 1,
  pixazApiKey: process.env.PIXAZ_API_KEY,
  outputDir: process.env.OUTPUT_DIR || 'posts',
  maxArticles: 5,
  mailer: {
    resendApiKey: process.env.RESEND_API_KEY,
    fromEmail: process.env.MAILER_FROM_EMAIL || 'The Gradient <newsletter@gradientnews.app>',
    fromName: process.env.MAILER_FROM_NAME || 'The Gradient',
  },
  imageGeneration: {
    enabled: process.env.GRADIENT_IMAGE_GEN !== 'off',
    outputDir: process.env.GRADIENT_IMAGE_DIR || path.join(process.cwd(), 'web', 'public', 'issue-images'),
    model: (process.env.GRADIENT_IMAGE_MODEL === 'turbo' ? 'turbo' : 'flux') as 'flux' | 'turbo',
  },
};

export function loadConfig(): Config {
  const configPath = path.resolve(process.cwd(), 'config.json');
  let fileConfig: Partial<Config> = {};

  if (fs.existsSync(configPath)) {
    try {
      const raw = fs.readFileSync(configPath, 'utf-8');
      fileConfig = JSON.parse(raw);
    } catch (err) {
      console.warn(`Failed to parse config file at ${configPath}:`, err);
    }
  }

  return {
    ...DEFAULT_CONFIG,
    ...fileConfig,
    sources: fileConfig.sources || [],
  };
}
