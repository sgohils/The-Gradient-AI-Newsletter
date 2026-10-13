import 'dotenv/config';
import { listLinkedInConnections } from '../src/linkedin/accounts';
import { appendSummary } from '../src/video/cli';
import { writeJson } from '../src/video/storage';

async function main(): Promise<void> {
  const connections = await listLinkedInConnections({ apiKey: process.env.ZERNIO_API_KEY });
  writeJson('linkedin-output/setup/accounts.json', connections);
  appendSummary(`## Connected LinkedIn accounts and company Pages\n\n\`\`\`json\n${JSON.stringify(connections, null, 2)}\n\`\`\`\n`);
  if (!connections.length) throw new Error('No active LinkedIn connection was found under this Zernio key.');
}
main().catch(error => { console.error(error instanceof Error ? error.message : 'Account lookup failed.'); process.exitCode = 1; });
