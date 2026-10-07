import { ShortProfile } from './types';

export const PROFILES = {
  standard: { min: 25, max: 30, target: 28, minWords: 55, maxWords: 65 },
  simple: { min: 18, max: 24, target: 21, minWords: 38, maxWords: 50 },
  legacy: { min: 30, max: 45, target: 37, minWords: 75, maxWords: 105 },
} as const;

export function profileFor(script: { version?: number; profile?: ShortProfile }): ShortProfile {
  if (script.version !== 3) return 'legacy';
  if (script.profile !== 'standard' && script.profile !== 'simple') throw new Error('New videos require a standard or simple duration profile.');
  return script.profile;
}

export function validDuration(duration: number, profile: ShortProfile): boolean {
  const limits = PROFILES[profile];
  return Number.isFinite(duration) && duration >= limits.min && duration <= limits.max;
}
