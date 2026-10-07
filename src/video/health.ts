import * as fs from 'fs';
import { readJson, writeJson } from './storage';

export interface PipelineHealth {
  version: 1; paused: boolean; events: { at: string; issueDate: string; phase: string; status: string; detail: string }[];
}
export function readHealth(file = 'video-state/health.json'): PipelineHealth {
  if (!fs.existsSync(file)) return { version: 1, paused: false, events: [] };
  const health = readJson(file) as PipelineHealth;
  if (health?.version !== 1 || typeof health.paused !== 'boolean' || !Array.isArray(health.events)) throw new Error('Pipeline health state is invalid.');
  return health;
}
export function recordHealth(issueDate: string, phase: string, status: string, detail: string, file = 'video-state/health.json'): void {
  const health = readHealth(file);
  health.events = [...health.events, { at: new Date().toISOString(), issueDate, phase, status, detail: detail.slice(0, 500) }].slice(-60);
  writeJson(file, health);
}
