import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '../automation/setup/api.mjs';
afterEach(() => vi.unstubAllGlobals());
describe('one-time secret storage responses', () => {
  it('accepts empty 201 creation and 204 update responses without asking for another consent', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response(null, { status: 201 })).mockResolvedValueOnce(new Response(null, { status: 204 })));
    expect(await api('https://api.github.com/initial-setup', { method: 'PUT' })).toEqual({});
    expect(await api('https://api.github.com/initial-setup', { method: 'PUT' })).toEqual({});
  });
  it('exposes only status codes when a provider returns sensitive error details', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('sensitive credential details', { status: 403 })));
    await expect(api('https://api.github.com/initial-setup')).rejects.toThrow('Connection request failed (HTTP 403).');
  });
});
