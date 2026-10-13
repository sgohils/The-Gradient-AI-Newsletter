import { describe, expect, it, vi } from 'vitest';
import { AxiosRequestConfig } from 'axios';
import { listLinkedInConnections } from '../src/linkedin/accounts';

describe('LinkedIn setup account lookup', () => {
  it('reports account and company identifiers while excluding all credential fields', async () => {
    const transport = vi.fn(async (request: AxiosRequestConfig) => request.url?.includes('/linkedin-organizations') ? {
      data: { organizations: [{ id: '123', name: 'The Gradient', vanityName: 'the-gradient', token: 'hidden-token' }] },
    } : { data: { accounts: [
      { _id: 'linkedin-account', platform: 'linkedin', displayName: 'The Gradient', username: 'the-gradient',
        profileUrl: 'https://www.linkedin.com/company/the-gradient/', accessToken: 'hidden-token' },
      { _id: 'youtube-account', platform: 'youtube' },
      { _id: 'inactive-account', platform: 'linkedin', isActive: false },
    ] } });
    const result = await listLinkedInConnections({ apiKey: 'secret-key', transport });
    expect(result).toEqual([{ accountId: 'linkedin-account', name: 'The Gradient', username: 'the-gradient',
      profileUrl: 'https://www.linkedin.com/company/the-gradient/', organizations: [
        { organizationUrn: 'urn:li:organization:123', name: 'The Gradient', vanityName: 'the-gradient' },
      ] }]);
    expect(transport).toHaveBeenCalledTimes(2);
    expect(transport.mock.calls.every(([request]) => request.method === 'GET')).toBe(true);
    expect(JSON.stringify(result)).not.toMatch(/secret-key|hidden-token/);
  });
  it('stops before lookup when credentials are missing and handles an empty connection list', async () => {
    const transport = vi.fn(async () => ({ data: { accounts: [] } }));
    await expect(listLinkedInConnections({ transport })).rejects.toThrow('ZERNIO_API_KEY');
    expect(transport).not.toHaveBeenCalled();
    expect(await listLinkedInConnections({ apiKey: 'key', transport })).toEqual([]);
  });
  it('does not print provider error bodies containing credentials', async () => {
    const transport = vi.fn(async () => { throw { response: { status: 403, data: { token: 'hidden-token' } } }; });
    await expect(listLinkedInConnections({ apiKey: 'key', transport })).rejects.toThrow('HTTP 403');
    await expect(listLinkedInConnections({ apiKey: 'key', transport })).rejects.not.toThrow('hidden-token');
  });
});
