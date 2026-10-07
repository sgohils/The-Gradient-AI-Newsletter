import { argument } from '../src/video/cli';
import { recordHealth } from '../src/video/health';
recordHealth(process.env.ISSUE_DATE || new Date().toISOString().slice(0, 10), argument('--phase') || 'daily',
  argument('--status') || 'unknown', argument('--detail') || 'Automatic pipeline status.');
