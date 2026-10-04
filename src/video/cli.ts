import * as fs from 'fs';
import * as path from 'path';
import { runCommand } from './process';

export function argument(name: string, required = false): string | undefined {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? process.argv[index + 1] : undefined;
  if (index >= 0 && (!value || value.startsWith('--'))) throw new Error(`${name} requires a value.`);
  if (required && !value) throw new Error(`${name} is required.`);
  return value;
}

export function flag(name: string): boolean { return process.argv.includes(name); }

export function appendSummary(text: string): void {
  console.log(text);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${text}\n`, 'utf8');
}

export function output(name: string, value: string): void {
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${value}\n`, 'utf8');
}

export function gitCheckpoint(ledgerPath: string): (() => Promise<void>) | undefined {
  if (process.env.VIDEO_LEDGER_GIT_SYNC !== '1') return undefined;
  if (process.env.GITHUB_ACTIONS !== 'true') throw new Error('Git ledger synchronization is restricted to the Actions workflow.');
  const relative = path.relative(process.cwd(), path.resolve(ledgerPath)).replace(/\\/g, '/');
  if (relative !== 'video-state/ledger.json') throw new Error('CI can synchronize only video-state/ledger.json.');
  return async () => {
    const status = await runCommand('git', ['status', '--porcelain', '--', relative]);
    const branch = (await runCommand('git', ['branch', '--show-current'])).trim();
    if (!branch || !/^[a-zA-Z0-9_./-]+$/.test(branch)) throw new Error('Ledger synchronization needs a checked-out branch.');
    if (status.trim()) {
      await runCommand('git', ['add', '--', relative]);
      await runCommand('git', ['-c', 'user.name=github-actions[bot]', '-c', 'user.email=github-actions[bot]@users.noreply.github.com',
        'commit', '--only', '-m', 'chore: checkpoint daily video publishing', '--', relative]);
    }
    // If another writer advanced the branch, stop instead of submitting without
    // a remotely durable intent. The artifact still preserves local recovery data.
    // Always push: an earlier commit may exist locally after a failed push.
    await runCommand('git', ['push', 'origin', `HEAD:refs/heads/${branch}`]);
  };
}
