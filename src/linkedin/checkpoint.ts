import * as path from 'path';
import { runCommand } from '../video/process';

export function linkedInCheckpoint(stateFile: string): (() => Promise<void>) | undefined {
  if (process.env.LINKEDIN_STATE_GIT_SYNC !== '1') return undefined;
  const relative = path.relative(process.cwd(), path.resolve(stateFile)).replace(/\\/g, '/');
  if (process.env.GITHUB_ACTIONS !== 'true' || !/^linkedin-state\/\d{4}-\d{2}-\d{2}\.json$/.test(relative)) {
    throw new Error('LinkedIn state synchronization is restricted to the Actions workflow and linkedin-state date records.');
  }
  return async () => {
    const status = await runCommand('git', ['status', '--porcelain', '--', relative]);
    const branch = (await runCommand('git', ['branch', '--show-current'])).trim();
    if (!branch || !/^[a-zA-Z0-9_./-]+$/.test(branch)) throw new Error('LinkedIn state synchronization requires a checked-out branch.');
    if (status.trim()) {
      await runCommand('git', ['add', '--', relative]);
      await runCommand('git', ['-c', 'user.name=github-actions[bot]', '-c', 'user.email=github-actions[bot]@users.noreply.github.com',
        'commit', '--only', '-m', 'chore: checkpoint daily LinkedIn publishing', '--', relative]);
    }
    await runCommand('git', ['push', 'origin', `HEAD:refs/heads/${branch}`]);
  };
}
