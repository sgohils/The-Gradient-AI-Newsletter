import * as fs from 'fs';
import { Subscriber } from '../types';

const DEFAULT_PATH = 'subscribers.json';

export function loadSubscribers(filePath = DEFAULT_PATH): Subscriber[] {
  if (!fs.existsSync(filePath)) {
    return [];
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveSubscribers(subscribers: Subscriber[], filePath = DEFAULT_PATH): void {
  fs.writeFileSync(filePath, JSON.stringify(subscribers, null, 2), 'utf-8');
}

export function addSubscriber(email: string, filePath = DEFAULT_PATH): Subscriber {
  const subscribers = loadSubscribers(filePath);
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
  saveSubscribers(subscribers, filePath);
  return newSubscriber;
}

export function unsubscribe(email: string, filePath = DEFAULT_PATH): boolean {
  const subscribers = loadSubscribers(filePath);
  const index = subscribers.findIndex((s) => s.email === email && !s.unsubscribedAt);
  if (index === -1) {
    return false;
  }
  subscribers[index] = {
    ...subscribers[index],
    unsubscribedAt: new Date().toISOString(),
  };
  saveSubscribers(subscribers, filePath);
  return true;
}

export function unsubscribeByToken(token: string, filePath = DEFAULT_PATH): boolean {
  const subscribers = loadSubscribers(filePath);
  const index = subscribers.findIndex((s) => s.token === token && !s.unsubscribedAt);
  if (index === -1) {
    return false;
  }
  subscribers[index] = {
    ...subscribers[index],
    unsubscribedAt: new Date().toISOString(),
  };
  saveSubscribers(subscribers, filePath);
  return true;
}

export function getActiveSubscribers(filePath = DEFAULT_PATH): Subscriber[] {
  return loadSubscribers(filePath).filter((s) => !s.unsubscribedAt);
}

export function findSubscriberByToken(token: string, filePath = DEFAULT_PATH): Subscriber | undefined {
  return loadSubscribers(filePath).find((s) => s.token === token);
}

function generateToken(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}
