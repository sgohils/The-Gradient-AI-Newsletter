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

export function addSubscriber(email: string): Subscriber {
  const subscribers = loadSubscribers();
  const existing = subscribers.find((s) => s.email === email && !s.unsubscribedAt);
  if (existing) {
    return existing;
  }
  const newSubscriber: Subscriber = {
    email,
    token: generateToken(),
    subscribedAt: new Date().toISOString(),
  };
  subscribers.push(newSubscriber);
  saveSubscribers(subscribers);
  return newSubscriber;
}

export function unsubscribeByToken(token: string): boolean {
  const subscribers = loadSubscribers();
  const index = subscribers.findIndex((s) => s.token === token && !s.unsubscribedAt);
  if (index === -1) {
    return false;
  }
  subscribers[index] = {
    ...subscribers[index],
    unsubscribedAt: new Date().toISOString(),
  };
  saveSubscribers(subscribers);
  return true;
}

export function findSubscriberByToken(token: string): Subscriber | undefined {
  return loadSubscribers().find((s) => s.token === token);
}

function loadSubscribers(): Subscriber[] {
  if (!fs.existsSync(SUBSCRIBERS_PATH)) {
    return [];
  }
  try {
    const raw = fs.readFileSync(SUBSCRIBERS_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveSubscribers(subscribers: Subscriber[]): void {
  fs.writeFileSync(SUBSCRIBERS_PATH, JSON.stringify(subscribers, null, 2), 'utf-8');
}

function generateToken(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}
