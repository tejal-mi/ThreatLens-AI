import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import ignore, { Ignore } from 'ignore';
import { FileScanResult, IndexedFile, LanguageSummary, ScanOptions, SupportedLanguage } from './types.js';
import { detectLanguage, isBinaryContent } from './languageDetector.js';

const DEFAULT_IGNORES = [
  '.git',
  '.git/**',
  '.svn',
  '.hg',
  'node_modules',
  'node_modules/**',
  'dist',
  'dist/**',
  'build',
  'build/**',
  'out',
  'out/**',
  'target',
  'target/**',
  '.next',
  '.next/**',
  '.nuxt',
  '.turbo',
  '.cache',
  'coverage',
  'coverage/**',
  '.venv',
  '.venv/**',
  'venv',
  'venv/**',
  '__pycache__',
  '__pycache__/**',
  '*.pyc',
  '.DS_Store',
  'Thumbs.db',
];

export class FileScanner {
  private rootPath: string;
  private options: Required<ScanOptions>;
  private ig: Ignore;

  constructor(rootPath: string, options: ScanOptions = {}) {
    this.rootPath = path.resolve(rootPath);
    this.options = {
      customIgnores: options.customIgnores || [],
      maxFileSizeBytes: options.maxFileSizeBytes || 10 * 1024 * 1024, // 10MB default
      includeBinary: options.includeBinary ?? false,
    };

    this.ig = ignore();
    this.ig.add(DEFAULT_IGNORES);
    if (this.options.customIgnores.length > 0) {
      this.ig.add(this.options.customIgnores);
    }
  }

  /**
   * Loads root .gitignore and any parent .gitignore files if present.
   */
  private async loadGitignore(): Promise<void> {
    const gitignorePath = path.join(this.rootPath, '.gitignore');
    try {
      const content = await fs.readFile(gitignorePath, 'utf8');
      const lines = content
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith('#'));
      this.ig.add(lines);
    } catch {
      // No .gitignore present, continue with defaults
    }
  }

  /**
   * Computes SHA-256 hash of a file.
   */
  private async computeFileHash(filePath: string): Promise<string> {
    try {
      const fileBuffer = await fs.readFile(filePath);
      return crypto.createHash('sha256').update(fileBuffer).digest('hex');
    } catch {
      return '';
    }
  }

  /**
   * Scans the repository and returns a structured FileScanResult.
   */
  public async scan(): Promise<FileScanResult> {
    const startTime = Date.now();
    await this.loadGitignore();

    const indexedFiles: IndexedFile[] = [];
    let totalSizeBytes = 0;
    let ignoredCount = 0;
    const languageStats: Record<string, LanguageSummary> = {};

    const walk = async (currentDir: string): Promise<void> => {
      let entries: import('node:fs').Dirent[];
      try {
        entries = await fs.readdir(currentDir, { withFileTypes: true });
      } catch (err) {
        return;
      }

      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        const relPath = path.relative(this.rootPath, fullPath).replace(/\\/g, '/');

        // Check if path is ignored
        const isDirectory = entry.isDirectory();
        const testPath = isDirectory ? `${relPath}/` : relPath;

        if (this.ig.ignores(testPath)) {
          ignoredCount++;
          continue;
        }

        if (isDirectory) {
          await walk(fullPath);
        } else if (entry.isFile()) {
          try {
            const stats = await fs.stat(fullPath);
            if (stats.size > this.options.maxFileSizeBytes) {
              ignoredCount++;
              continue;
            }

            const isBinary = await isBinaryContent(fullPath);
            if (isBinary && !this.options.includeBinary) {
              ignoredCount++;
              continue;
            }

            const language = detectLanguage(fullPath);
            const hash = await this.computeFileHash(fullPath);
            const ext = path.extname(fullPath).toLowerCase();

            const indexedFile: IndexedFile = {
              relativePath: relPath,
              absolutePath: fullPath,
              extension: ext,
              language,
              sizeBytes: stats.size,
              hash,
              modifiedTimeMs: stats.mtimeMs,
              isBinary,
            };

            indexedFiles.push(indexedFile);
            totalSizeBytes += stats.size;

            // Update language stats
            if (!languageStats[language]) {
              languageStats[language] = {
                language,
                fileCount: 0,
                totalSizeBytes: 0,
              };
            }
            languageStats[language].fileCount++;
            languageStats[language].totalSizeBytes += stats.size;
          } catch {
            // File read/stat error, skip
          }
        }
      }
    };

    await walk(this.rootPath);

    return {
      rootPath: this.rootPath,
      files: indexedFiles,
      languageStats,
      totalFiles: indexedFiles.length,
      totalSizeBytes,
      ignoredCount,
      durationMs: Date.now() - startTime,
    };
  }
}
