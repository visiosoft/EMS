/**
 * Starts Vite after the Nest API on :3001 is reachable.
 * If nothing is listening, spawns `npm run dev:backend` automatically.
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const API_HEALTH_URL = 'http://127.0.0.1:3001/api';
const MAX_WAIT_MS = 120_000;
const POLL_MS = 400;

async function isApiUp() {
  try {
    const res = await fetch(API_HEALTH_URL, { signal: AbortSignal.timeout(2500) });
    return res.status > 0 && res.status < 600;
  } catch {
    return false;
  }
}

async function waitForApi(label) {
  const started = Date.now();
  while (Date.now() - started < MAX_WAIT_MS) {
    if (await isApiUp()) {
      console.log(`[dev] ${label} API ready at ${API_HEALTH_URL}`);
      return true;
    }
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
  return false;
}

function spawnBackend() {
  console.log('[dev] No API on port 3001 — starting Nest backend (npm run dev:backend)…');
  const child = spawn('npm', ['run', 'dev:backend'], {
    cwd: repoRoot,
    stdio: 'inherit',
    shell: true,
    env: process.env,
  });
  child.on('exit', (code, signal) => {
    if (code != null && code !== 0) {
      console.error(`[dev] Backend exited with code ${code}`);
      process.exit(code);
    }
    if (signal) {
      console.error(`[dev] Backend killed by signal ${signal}`);
      process.exit(1);
    }
  });
  return child;
}

function spawnVite() {
  const child = spawn('npx', ['vite'], {
    cwd: repoRoot,
    stdio: 'inherit',
    shell: true,
    env: process.env,
  });
  child.on('exit', (code) => process.exit(code ?? 0));
  return child;
}

async function main() {
  let backendChild = null;

  if (!(await isApiUp())) {
    backendChild = spawnBackend();
    const ready = await waitForApi('Started');
    if (!ready) {
      console.error(
        '\n[dev] Timed out waiting for API on http://127.0.0.1:3001.\n' +
          '      Check backend/.env (copy from .env.example) and MSSQL connectivity, then retry.\n',
      );
      if (backendChild) backendChild.kill('SIGTERM');
      process.exit(1);
    }
  } else {
    console.log(`[dev] API already running at ${API_HEALTH_URL}`);
  }

  const viteChild = spawnVite();

  const shutdown = () => {
    viteChild.kill('SIGTERM');
    if (backendChild) backendChild.kill('SIGTERM');
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('[dev] Failed to start:', err);
  process.exit(1);
});
