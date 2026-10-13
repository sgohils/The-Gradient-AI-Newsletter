import axios, { AxiosRequestConfig } from 'axios';

export interface LinkedInConnection {
  accountId: string;
  name: string;
  username: string;
  profileUrl?: string;
  organizations: { organizationUrn: string; name: string; vanityName?: string }[];
}

/** Read only public connection identifiers; never return OAuth tokens or the API key. */
export async function listLinkedInConnections(options: {
  apiKey?: string;
  transport?: (config: AxiosRequestConfig) => Promise<{ data: any }>;
}): Promise<LinkedInConnection[]> {
  if (!options.apiKey) throw new Error('ZERNIO_API_KEY is missing from Actions Secrets.');
  const transport = options.transport || ((config: AxiosRequestConfig) => axios.request(config));
  async function get(endpoint: string): Promise<any> {
    try {
      return (await transport({ method: 'GET', url: `https://zernio.com/api/v1/${endpoint}`,
        timeout: 30000, headers: { Authorization: `Bearer ${options.apiKey}` } })).data;
    } catch (error) {
      const status = (error as any)?.response?.status;
      throw new Error(status ? `Zernio account lookup failed (HTTP ${status}); check the key and LinkedIn connection.` :
        'Zernio account lookup failed; check connectivity and try again.');
    }
  }
  const accounts = (await get('accounts?platform=linkedin&excludeHidden=true')).accounts;
  if (!Array.isArray(accounts)) throw new Error('Zernio did not return a connected-account list.');
  const results: LinkedInConnection[] = [];
  for (const account of accounts) {
    if (account.platform !== 'linkedin' || account.isActive === false || typeof account._id !== 'string' || !account._id) continue;
    const organizations = (await get(`accounts/${encodeURIComponent(account._id)}/linkedin-organizations`)).organizations;
    if (!Array.isArray(organizations)) throw new Error('Zernio did not return the administered company Pages.');
    results.push({ accountId: account._id, name: typeof account.displayName === 'string' ? account.displayName : '',
      username: typeof account.username === 'string' ? account.username : '',
      ...(typeof account.profileUrl === 'string' && /^https:\/\/(www\.)?linkedin\.com\//i.test(account.profileUrl) ? { profileUrl: account.profileUrl } : {}),
      organizations: organizations.filter((organization: any) => /^\d+$/.test(String(organization.id))).map((organization: any) => ({
        organizationUrn: `urn:li:organization:${organization.id}`,
        name: typeof organization.name === 'string' ? organization.name : '',
        ...(typeof organization.vanityName === 'string' ? { vanityName: organization.vanityName } : {}),
      })),
    });
  }
  return results;
}
