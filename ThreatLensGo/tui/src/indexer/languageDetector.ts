import path from 'node:path';
import fs from 'node:fs/promises';
import { SupportedLanguage } from './types.js';

const EXTENSION_MAP: Record<string, SupportedLanguage> = {
  // TypeScript & JavaScript
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.mts': 'typescript',
  '.cts': 'typescript',
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.mjs': 'javascript',
  '.cjs': 'javascript',

  // Python
  '.py': 'python',
  '.pyi': 'python',

  // Go
  '.go': 'go',

  // Rust
  '.rs': 'rust',

  // Java & JVM
  '.java': 'java',

  // C / C++
  '.c': 'cpp',
  '.cpp': 'cpp',
  '.cc': 'cpp',
  '.cxx': 'cpp',
  '.h': 'cpp',
  '.hpp': 'cpp',
  '.hxx': 'cpp',

  // Config & Structured Data
  '.json': 'json',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.toml': 'toml',
  '.sql': 'sql',
  '.md': 'markdown',
  '.markdown': 'markdown',

  // Shell
  '.sh': 'shell',
  '.bash': 'shell',
  '.zsh': 'shell',
};

const EXACT_FILE_MAP: Record<string, SupportedLanguage> = {
  'dockerfile': 'shell',
  'makefile': 'shell',
  '.bashrc': 'shell',
  '.zshrc': 'shell',
};

const BINARY_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.ico',
  '.svg',
  '.pdf',
  '.wasm',
  '.zip',
  '.tar',
  '.gz',
  '.7z',
  '.rar',
  '.exe',
  '.dll',
  '.so',
  '.dylib',
  '.pyc',
  '.pyd',
  '.db',
  '.sqlite',
  '.sqlite3',
  '.bin',
  '.node',
  '.woff',
  '.woff2',
  '.ttf',
  '.eot',
  '.mp4',
  '.webm',
  '.mp3',
  '.wav',
]);

/**
 * Detects programming or configuration language from file path.
 */
export function detectLanguage(filePath: string): SupportedLanguage {
  const baseName = path.basename(filePath).toLowerCase();
  if (EXACT_FILE_MAP[baseName]) {
    return EXACT_FILE_MAP[baseName];
  }

  const ext = path.extname(filePath).toLowerCase();
  return EXTENSION_MAP[ext] || 'unknown';
}

/**
 * Checks if a file is binary based on extension.
 */
export function isBinaryExtension(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return BINARY_EXTENSIONS.has(ext);
}

/**
 * Inspects the first 512 bytes of a file to detect binary null bytes.
 */
export async function isBinaryContent(filePath: string): Promise<boolean> {
  if (isBinaryExtension(filePath)) return true;

  try {
    const handle = await fs.open(filePath, 'r');
    const buffer = Buffer.alloc(512);
    const { bytesRead } = await handle.read(buffer, 0, 512, 0);
    await handle.close();

    for (let i = 0; i < bytesRead; i++) {
      if (buffer[i] === 0) {
        return true; // Null byte found -> binary file
      }
    }
    return false;
  } catch {
    return false;
  }
}
