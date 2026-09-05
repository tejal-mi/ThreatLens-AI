import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let backendProcess: ChildProcess | null = null;
let weStartedIt = false; // 🔧 tracked explicitly for the double-start guard

export function didWeStartTheBackend(): boolean {
  return weStartedIt;
}

export function resolvePythonInterpreter(cliBackendDir: string): string {
  // 1. Check explicit environment override
  if (process.env.THREATLENS_PYTHON && fs.existsSync(process.env.THREATLENS_PYTHON)) {
    return process.env.THREATLENS_PYTHON;
  }

  // 2. Prefer a project-local virtualenv if one exists
  const venvCandidates =
    process.platform === 'win32'
      ? [
          path.join(cliBackendDir, 'venv', 'Scripts', 'python.exe'),
          path.join(cliBackendDir, '.venv', 'Scripts', 'python.exe'),
        ]
      : [
          path.join(cliBackendDir, 'venv', 'bin', 'python'),
          path.join(cliBackendDir, '.venv', 'bin', 'python'),
        ];

  for (const candidate of venvCandidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  // 3. Fall back to an explicit env override, then bare python/python3
  if (process.env.THREATLENS_PYTHON) return process.env.THREATLENS_PYTHON;
  return process.platform === 'win32' ? 'python' : 'python3';
}

export async function isBackendRunning(): Promise<boolean> {
  try {
    const res = await fetch('http://localhost:1234/pulse', { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}

export async function startBackend(): Promise<void> {
  let cliBackendDir = path.resolve(__dirname, '../../../cli-backend');
  if (!fs.existsSync(cliBackendDir)) {
    const cwdCandidate = path.resolve(process.cwd(), '../cli-backend');
    if (fs.existsSync(cwdCandidate)) {
      cliBackendDir = cwdCandidate;
    } else {
      const cwdCandidate2 = path.resolve(process.cwd(), '../../cli-backend');
      if (fs.existsSync(cwdCandidate2)) {
        cliBackendDir = cwdCandidate2;
      }
    }
  }

  const pythonPath = resolvePythonInterpreter(cliBackendDir);

  backendProcess = spawn(pythonPath, ['connect.py'], {
    cwd: cliBackendDir,
    stdio: ['ignore', 'pipe', 'pipe'], // do NOT use 'inherit' — conflicts with Ink's raw mode
    env: { ...process.env },
    detached: false,
  });
  weStartedIt = true;

  backendProcess.on('error', (err) => {
    console.error(`Failed to start backend: ${err.message}`);
  });

  const maxWaitMs = 15000;
  const pollIntervalMs = 500;
  const start = Date.now();

  while (Date.now() - start < maxWaitMs) {
    if (await isBackendRunning()) return;
    await new Promise((r) => setTimeout(r, pollIntervalMs));
  }
  throw new Error('Backend did not start within 15 seconds');
}

export function cleanupBackend(): void {
  // Don't kill a process we didn't start
  if (!weStartedIt) return;
  if (backendProcess && !backendProcess.killed) {
    backendProcess.kill('SIGTERM'); // maps to TerminateProcess on Windows via Node internals
    setTimeout(() => {
      if (backendProcess && !backendProcess.killed) {
        backendProcess.kill('SIGKILL');
      }
    }, 3000);
  }
}

export async function restartBackendForFreshAuth(): Promise<void> {
  if (!weStartedIt || !backendProcess) {
    throw new Error('Cannot restart a backend process we did not start');
  }
  cleanupBackend();
  // Give the OS a moment to release the port before respawning
  await new Promise((r) => setTimeout(r, 500));
  await startBackend();
}

// Register signal handlers BEFORE importing/rendering the Ink app
process.on('SIGINT', () => {
  cleanupBackend();
  process.exit(0);
});
process.on('SIGTERM', () => {
  cleanupBackend();
  process.exit(0);
});
process.on('SIGHUP', () => {
  cleanupBackend();
  process.exit(0);
});
process.on('exit', () => {
  cleanupBackend();
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  cleanupBackend();
  process.exit(1);
});

async function main() {
  if (!(await isBackendRunning())) {
    console.log('Starting cli-backend...');
    await startBackend();
    console.log('Backend is ready.');
  } else {
    weStartedIt = false; // explicit: using an existing backend, not ours to kill
  }
  await import('./index.js');
}

const isDirectExecution =
  process.argv[1] &&
  (process.argv[1].endsWith('launcher.ts') || process.argv[1].endsWith('launcher.js'));

if (isDirectExecution) {
  main().catch((err) => {
    console.error(err.message);
    cleanupBackend();
    process.exit(1);
  });
}
