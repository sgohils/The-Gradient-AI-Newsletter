import dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { Source } from '../types';

dotenv.config();

export interface Config {
  openaiApiKey?: string;
  openaiModel?: string;
  openaiTemperature?: number;
  groqApiKey?: string;
  groqModel?: string;
  groqTemperature?: number;
  outputDir?: string;
  sources: Source[];
  maxArticles: number;
}

const DEFAULT_CONFIG: Omit<Config, 'sources'> = {
  openaiApiKey: process.env.OPENAI_API_KEY,
  openaiModel: 'gpt-4o-mini',
  openaiTemperature: 0.7,
  groqApiKey: process.env.GROQ_API_KEY,
  groqModel: 'openai/gpt-oss-120b',
  groqTemperature: 1,
  outputDir: process.env.OUTPUT_DIR || 'posts',
  maxArticles: 5,
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
