import { spawn } from 'child_process';

export function runCommand(command: string, args: string[], cwd?: string, timeout = 15 * 60000): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, windowsHide: true, shell: false, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => { child.kill(); reject(new Error(`${command} exceeded its time limit.`)); }, timeout);
    child.stdout.on('data', (chunk: Buffer) => { stdout = (stdout + chunk.toString()).slice(-200000); });
    child.stderr.on('data', (chunk: Buffer) => { stderr = (stderr + chunk.toString()).slice(-8000); });
    child.on('error', (error) => { clearTimeout(timer); reject(new Error(`Cannot run ${command}: ${error.message}`)); });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) reject(new Error(`${command} exited with ${code}: ${stderr}`));
      else resolve(stdout);
    });
  });
}
