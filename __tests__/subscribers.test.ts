import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  loadSubscribers,
  saveSubscribers,
  addSubscriber,
  unsubscribe,
  unsubscribeByToken,
  getActiveSubscribers,
  findSubscriberByToken,
} from '../src/subscribers';
import * as fs from 'fs';

vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

import * as mockedFs from 'fs';

const mockFileContent = (content: string) => {
  vi.mocked(mockedFs.existsSync).mockReturnValue(true);
  vi.mocked(mockedFs.readFileSync).mockReturnValue(content);
};

describe('subscribers', () => {
  beforeEach(() => {
    vi.mocked(mockedFs.writeFileSync).mockClear();
    vi.mocked(mockedFs.readFileSync).mockClear();
    vi.mocked(mockedFs.existsSync).mockClear();
  });

  describe('loadSubscribers', () => {
    it('should return empty array when file does not exist', () => {
      vi.mocked(mockedFs.existsSync).mockReturnValue(false);
      const result = loadSubscribers();
      expect(result).toEqual([]);
    });

    it('should parse and return subscribers from file', () => {
      mockFileContent(JSON.stringify([{ email: 'a@b.com', token: 'abc', subscribedAt: '2024-01-01' }]));
      const result = loadSubscribers();
      expect(result).toHaveLength(1);
      expect(result[0].email).toBe('a@b.com');
    });

    it('should return empty array on parse error', () => {
      mockFileContent('invalid json');
      const result = loadSubscribers();
      expect(result).toEqual([]);
    });
  });

  describe('saveSubscribers', () => {
    it('should write subscribers to file', () => {
      const subscribers = [{ email: 'a@b.com', token: 'abc', subscribedAt: '2024-01-01' }];
      saveSubscribers(subscribers);
      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        'subscribers.json',
        JSON.stringify(subscribers, null, 2),
        'utf-8'
      );
    });
  });

  describe('addSubscriber', () => {
    it('should add a new subscriber', () => {
      vi.mocked(mockedFs.existsSync).mockReturnValue(false);
      const subscriber = addSubscriber('new@example.com');
      expect(subscriber.email).toBe('new@example.com');
      expect(subscriber.token).toBeDefined();
      expect(subscriber.subscribedAt).toBeDefined();
      expect(mockedFs.writeFileSync).toHaveBeenCalled();
    });

    it('should not duplicate active subscribers', () => {
      const existing = [{ email: 'existing@example.com', token: 'abc', subscribedAt: '2024-01-01' }];
      mockFileContent(JSON.stringify(existing));
      const subscriber = addSubscriber('existing@example.com');
      expect(subscriber.token).toBe('abc');
    });
  });

  describe('unsubscribe', () => {
    it('should mark subscriber as unsubscribed', () => {
      const existing = [{ email: 'a@b.com', token: 'abc', subscribedAt: '2024-01-01' }];
      mockFileContent(JSON.stringify(existing));
      const result = unsubscribe('a@b.com');
      expect(result).toBe(true);
      expect(mockedFs.writeFileSync).toHaveBeenCalled();
    });

    it('should return false for non-existent subscriber', () => {
      mockFileContent(JSON.stringify([]));
      const result = unsubscribe('missing@example.com');
      expect(result).toBe(false);
    });
  });

  describe('unsubscribeByToken', () => {
    it('should mark subscriber as unsubscribed by token', () => {
      const existing = [{ email: 'a@b.com', token: 'token123', subscribedAt: '2024-01-01' }];
      mockFileContent(JSON.stringify(existing));
      const result = unsubscribeByToken('token123');
      expect(result).toBe(true);
    });

    it('should return false for invalid token', () => {
      mockFileContent(JSON.stringify([]));
      const result = unsubscribeByToken('invalid');
      expect(result).toBe(false);
    });
  });

  describe('getActiveSubscribers', () => {
    it('should return only active subscribers', () => {
      const subscribers = [
        { email: 'a@b.com', token: 'abc', subscribedAt: '2024-01-01' },
        { email: 'b@c.com', token: 'def', subscribedAt: '2024-01-01', unsubscribedAt: '2024-01-02' },
      ];
      mockFileContent(JSON.stringify(subscribers));
      const result = getActiveSubscribers();
      expect(result).toHaveLength(1);
      expect(result[0].email).toBe('a@b.com');
    });
  });

  describe('findSubscriberByToken', () => {
    it('should find subscriber by token', () => {
      const subscribers = [{ email: 'a@b.com', token: 'token123', subscribedAt: '2024-01-01' }];
      mockFileContent(JSON.stringify(subscribers));
      const result = findSubscriberByToken('token123');
      expect(result?.email).toBe('a@b.com');
    });

    it('should return undefined for missing token', () => {
      mockFileContent(JSON.stringify([]));
      const result = findSubscriberByToken('missing');
      expect(result).toBeUndefined();
    });
  });
});
