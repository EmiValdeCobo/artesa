import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const isWindows = process.platform === 'win32';
const pnpmCmd = isWindows ? 'pnpm.cmd' : 'pnpm';

console.log('🚀 Iniciando backend y frontend simultáneamente con pnpm...');

function runProcess(name, dir) {
  const proc = spawn(pnpmCmd, ['run', 'dev'], {
    cwd: path.join(rootDir, dir),
    stdio: 'inherit',
    shell: true,
  });

  proc.on('error', (err) => {
    console.error(`[${name}] Error al iniciar:`, err);
  });

  proc.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.error(`[${name}] Proceso terminó con código ${code}`);
    }
  });

  return proc;
}

const backend = runProcess('backend', 'backend');
const frontend = runProcess('frontend', 'frontend');

function shutdown() {
  console.log('\n🛑 Deteniendo servicios...');
  backend.kill('SIGINT');
  frontend.kill('SIGINT');
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
