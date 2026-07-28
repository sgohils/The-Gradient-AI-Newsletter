import fs from 'fs';
import path from 'path';

const CANDIDATE_SUBSCRIBERS_DIRS = [
  path.join(process.cwd(), '..', 'subscribers.json'),
  path.join(process.cwd(), 'subscribers.json'),
];

const SUBSCRIBERS_PATH = CANDIDATE_SUBSCRIBERS_DIRS.find((dir) => fs.existsSync(dir)) || CANDIDATE_SUBSCRIBERS_DIRS[0];

export interface Subscriber {
  email: string;
  token: string;
  subscribedAt: string;
  unsubscribedAt?: string;
}

export function getActiveSubscribers(): Subscriber[] {
  if (!fs.existsSync(SUBSCRIBERS_PATH)) {
    return [];
  }

  try {
    const raw = fs.readFileSync(SUBSCRIBERS_PATH, 'utf-8');
    const subscribers: Subscriber[] = JSON.parse(raw);
    return subscribers.filter((s) => !s.unsubscribedAt);
  } catch {
    return [];
  }
}
