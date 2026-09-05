import { spawn } from 'node:child_process';
import path from 'node:path';
import { rgPath } from '@vscode/ripgrep';

export interface TextMatch {
  filePath: string;
  lineNumber: number;
  columnNumber: number;
  lineText: string;
  matchText?: string;
}

export interface RipgrepOptions {
  isRegex?: boolean;
  caseSensitive?: boolean;
  globs?: string[];
  maxMatches?: number;
  searchPath?: string;
}

export class RipgrepSearcher {
  private workspaceRoot: string;

  constructor(workspaceRoot: string) {
    this.workspaceRoot = path.resolve(workspaceRoot);
  }

  /**
   * Performs high-speed raw text or regex search using vendored ripgrep.
   */
  public async search(query: string, options: RipgrepOptions = {}): Promise<TextMatch[]> {
    if (!query || !query.trim()) return [];

    const isRegex = options.isRegex ?? false;
    const caseSensitive = options.caseSensitive ?? false;
    const maxMatches = options.maxMatches ?? 50;
    const searchTarget = options.searchPath
      ? path.resolve(this.workspaceRoot, options.searchPath)
      : this.workspaceRoot;

    const args: string[] = ['--json', '--no-messages'];

    if (!caseSensitive) {
      args.push('--ignore-case');
    } else {
      args.push('--case-sensitive');
    }

    if (!isRegex) {
      args.push('--fixed-strings');
    }

    // Common noise ignores
    args.push(
      '--glob', '!**/.git/**',
      '--glob', '!**/node_modules/**',
      '--glob', '!**/dist/**',
      '--glob', '!**/build/**',
      '--glob', '!**/.next/**',
      '--glob', '!**/__pycache__/**',
      '--glob', '!**/*.db*'
    );

    if (options.globs && options.globs.length > 0) {
      for (const g of options.globs) {
        args.push('--glob', g);
      }
    }

    args.push('-e', query);
    args.push(searchTarget);

    return new Promise((resolve) => {
      const child = spawn(rgPath, args, {
        cwd: this.workspaceRoot,
        windowsHide: true,
      });

      const matches: TextMatch[] = [];
      let buffer = '';

      child.stdout.on('data', (chunk: Buffer) => {
        buffer += chunk.toString('utf8');
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line);
            if (data.type === 'match') {
              const relPath = path
                .relative(this.workspaceRoot, data.data.path.text)
                .replace(/\\/g, '/');

              const lineNum = data.data.line_number;
              const lineText = (data.data.lines.text || '').replace(/\r?\n$/, '');
              const submatch = data.data.submatches && data.data.submatches[0];
              const colNum = submatch ? submatch.start + 1 : 1;
              const matchText = submatch ? submatch.match.text : undefined;

              matches.push({
                filePath: relPath,
                lineNumber: lineNum,
                columnNumber: colNum,
                lineText,
                matchText,
              });

              if (matches.length >= maxMatches) {
                child.kill();
                break;
              }
            }
          } catch {
            // Ignore non-JSON lines
          }
        }
      });

      child.on('close', () => {
        resolve(matches);
      });

      child.on('error', () => {
        resolve([]);
      });
    });
  }
}
