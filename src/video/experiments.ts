import * as fs from 'fs';
import { ExperimentAssignment, ExperimentState, HookStyle, VideoLedger, VideoMetric } from './types';
import { readJson, sha256 } from './storage';
import { visualTopic } from './visuals';

export function initialExperiments(): ExperimentState {
  return { version: 1, championHook: 'direct-benefit', championBeatSeconds: 3, metrics: {}, decisions: [] };
}

export function readExperiments(file = 'video-state/experiments.json'): ExperimentState {
  if (!fs.existsSync(file)) return initialExperiments();
  const state = readJson(file) as ExperimentState;
  if (state?.version !== 1 || !['direct-benefit', 'supported-surprise'].includes(state.championHook) ||
      ![2, 3].includes(state.championBeatSeconds) || !state.metrics || !Array.isArray(state.decisions)) throw new Error('Invalid experiment state.');
  return state;
}

export function assignExperiment(ledger: VideoLedger, issueDate: string, state: ExperimentState, topic = 'computers'): ExperimentAssignment {
  const frozen = ledger.issues[issueDate]?.experiment;
  if (frozen) return frozen;
  const count = Object.values(ledger.issues).filter(entry => (entry.experiment?.formatVersion === 3 || entry.script?.version === 3) && entry.platforms.youtube?.status === 'published').length;
  const phase = count < 10 ? 'baseline' : state.hookWinner ? 'pacing' : 'hook';
  // Stable date-based allocation avoids changing the variant after a failed run.
  const alternate = parseInt(sha256(issueDate).slice(0, 4), 16) % 2 === 0;
  const hookStyle: HookStyle = phase === 'hook' ? alternate ? 'direct-benefit' : 'supported-surprise' : state.championHook;
  const beatSeconds: 2 | 3 = phase === 'pacing' && !state.pacingWinner ? alternate ? 2 : 3 : state.championBeatSeconds;
  return { phase, hookStyle, beatSeconds, formatVersion: 3, topic, cohort: `v3-${phase}-${hookStyle}-${beatSeconds}s` };
}

function usable(metric: VideoMetric): boolean {
  return metric.finalized && metric.ageDays >= 7 && !metric.error && Number.isFinite(metric.averageViewDuration) &&
    Number.isFinite(metric.averageViewPercentage) && (metric.engagedViews || 0) > 0 && !!metric.experiment &&
    Number.isFinite(metric.duration) && metric.duration! >= 18 && metric.duration! <= 30;
}

export function improveExperiments(state: ExperimentState, now = new Date()): ExperimentState {
  const next: ExperimentState = JSON.parse(JSON.stringify(state));
  const phase = next.hookWinner ? 'pacing' : 'hook';
  if (phase === 'pacing' && next.pacingWinner) return next;
  const metrics = Object.values(next.metrics).filter(metric => usable(metric) && metric.experiment!.phase === phase);
  const variants = phase === 'hook' ? ['direct-benefit', 'supported-surprise'] : ['2', '3'];
  const variant = (metric: VideoMetric) => phase === 'hook' ? metric.experiment!.hookStyle : String(metric.experiment!.beatSeconds);
  const bucket = (metric: VideoMetric) => `${metric.experiment!.topic}:${Math.floor(metric.duration! / 3)}`;
  // Compare only topic/duration strata represented in both variants.
  const common = new Set(metrics.filter(metric => variant(metric) === variants[0]).map(bucket)
    .filter(key => metrics.some(metric => variant(metric) === variants[1] && bucket(metric) === key)));
  const groups = variants.map(key => metrics.filter(metric => variant(metric) === key && common.has(bucket(metric))));
  if (groups.some(group => group.length < 5 || group.reduce((sum, metric) => sum + metric.engagedViews!, 0) < 1000)) return next;
  const score = (group: VideoMetric[], key: 'averageViewPercentage' | 'averageViewDuration') =>
    group.reduce((sum, metric) => sum + metric[key]! * metric.engagedViews!, 0) / group.reduce((sum, metric) => sum + metric.engagedViews!, 0);
  const percentages = groups.map(group => score(group, 'averageViewPercentage'));
  const winner = percentages[0] >= percentages[1] ? 0 : 1;
  if (Math.abs(percentages[0] - percentages[1]) < 10 || score(groups[winner], 'averageViewDuration') < score(groups[1 - winner], 'averageViewDuration')) return next;
  if (phase === 'hook') next.championHook = next.hookWinner = variants[winner] as HookStyle;
  else next.championBeatSeconds = next.pacingWinner = Number(variants[winner]) as 2 | 3;
  next.decisions.push({ at: now.toISOString(), phase, reason: `${variants[winner]} improved percentage viewed by ${Math.abs(percentages[0] - percentages[1]).toFixed(1)} points without reducing viewing seconds; matched topic/length groups passed minimum sample gates.` });
  next.decisions = next.decisions.slice(-30);
  return next;
}

export { visualTopic };
