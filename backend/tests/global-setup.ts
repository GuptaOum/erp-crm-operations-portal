import { execFileSync } from 'child_process';
import path from 'path';
import './env';

export default function globalSetup() {
  const cwd = path.resolve(__dirname, '..');

  execFileSync('npx', ['prisma', 'migrate', 'deploy'], {
    cwd,
    env: process.env,
    stdio: 'inherit',
    shell: true,
  });
}
