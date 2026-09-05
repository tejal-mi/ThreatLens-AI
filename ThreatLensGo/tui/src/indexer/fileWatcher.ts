import chokidar, { FSWatcher } from 'chokidar';
import path from 'node:path';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import ignore, { Ignore } from 'ignore';
import { SqliteIndexStore } from './sqliteStore.js';
import { AstExtractor } from './astExtractor.js';
import { detectLanguage, isBinaryContent } from './languageDetector.js';
import { IndexedFile } from './types.js';

export type WatcherEventType = 'file_indexed' | 'file_deleted' | 'file_skipped' | 'ready' | 'error';

export interface WatcherEvent {
  type: WatcherEventType;
  filePath?: string;
  symbolCount?: number;
  durationMs?: number;
  error?: string;
}

export interface FileWatcherOptions {
  customIgnores?: string[];
  debounceMs?: number;
}

const DEFAULT_WATCH_IGNORES = [
  '**/.git/**',
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/.next/**',
  '**/target/**',
  '**/__pycache__/**',
  '**/*.pyc',
  '**/.threatlens_index.db*',
  '**/.test_threatlens_index.db*',
];

export class FileWatcher {
  private rootDir: string;
  private store: SqliteIndexStore;
  private extractor: AstExtractor;
  private watcher: FSWatcher | null = null;
  private ig: Ignore;
  private debounceMs: number;
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private listeners: Set<(event: WatcherEvent) => void> = new Set();

  constructor(
    rootDir: string,
    store: SqliteIndexStore,
    extractor?: AstExtractor,
    options: FileWatcherOptions = {}
  ) {
    this.rootDir = path.resolve(rootDir);
    this.store = store;
    this.extractor = extractor || new AstExtractor();
    this.debounceMs = options.debounceMs ?? 50;

    this.ig = ignore();
    this.ig.add([
      '.git',
      'node_modules',
      'dist',
      'build',
      '.next',
      'target',
      '__pycache__',
      '*.pyc',
      '.threatlens_index.db',
      '.threatlens_index.db-wal',
      '.threatlens_index.db-shm',
    ]);
    if (options.customIgnores) {
      this.ig.add(options.customIgnores);
    }
  }

  public onEvent(listener: (event: WatcherEvent) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(event: WatcherEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (err) {
        console.error('Error in FileWatcher event listener:', err);
      }
    }
  }

  private isIgnored(relPath: string): boolean {
    const normalized = relPath.replace(/\\/g, '/');
    return this.ig.ignores(normalized);
  }

  private async computeHash(fullPath: string): Promise<string> {
    try {
      const buffer = await fs.readFile(fullPath);
      return crypto.createHash('sha256').update(buffer).digest('hex');
    } catch {
      return '';
    }
  }

  /**
   * Processes an added or modified file with debouncing.
   */
  private async processFileChange(fullPath: string): Promise<void> {
    const startTime = performance.now();
    const relPath = path.relative(this.rootDir, fullPath).replace(/\\/g, '/');

    if (this.isIgnored(relPath)) {
      this.emit({ type: 'file_skipped', filePath: relPath });
      return;
    }

    try {
      const isBinary = await isBinaryContent(fullPath);
      if (isBinary) {
        this.emit({ type: 'file_skipped', filePath: relPath });
        return;
      }

      const stats = await fs.stat(fullPath);
      const hash = await this.computeHash(fullPath);
      if (!hash) return;

      const existingRecord = this.store.getFile(relPath);
      if (existingRecord && existingRecord.hash === hash) {
        // Hash unchanged -> skip
        this.emit({ type: 'file_skipped', filePath: relPath });
        return;
      }

      const content = await fs.readFile(fullPath, 'utf8');
      const language = detectLanguage(fullPath);
      const ext = path.extname(fullPath).toLowerCase();

      const extractResult = await this.extractor.extract(content, fullPath);

      const indexedFile: IndexedFile = {
        relativePath: relPath,
        absolutePath: fullPath,
        extension: ext,
        language,
        sizeBytes: stats.size,
        hash,
        modifiedTimeMs: stats.mtimeMs,
        isBinary: false,
      };

      this.store.syncFile(indexedFile, extractResult.symbols);

      this.emit({
        type: 'file_indexed',
        filePath: relPath,
        symbolCount: extractResult.symbols.length,
        durationMs: performance.now() - startTime,
      });
    } catch (err: any) {
      this.emit({
        type: 'error',
        filePath: relPath,
        error: err?.message || 'Error processing file change',
      });
    }
  }

  private handleFileUnlink(fullPath: string): void {
    const relPath = path.relative(this.rootDir, fullPath).replace(/\\/g, '/');
    this.store.removeFile(relPath);
    this.emit({ type: 'file_deleted', filePath: relPath });
  }

  /**
   * Starts watching the root directory.
   */
  public start(): Promise<void> {
    return new Promise((resolve) => {
      this.watcher = chokidar.watch(this.rootDir, {
        ignored: DEFAULT_WATCH_IGNORES,
        ignoreInitial: true,
        persistent: true,
        awaitWriteFinish: {
          stabilityThreshold: 40,
          pollInterval: 10,
        },
      });

      this.watcher.on('add', (filePath: string) => {
        this.scheduleDebounced(filePath, () => this.processFileChange(filePath));
      });

      this.watcher.on('change', (filePath: string) => {
        this.scheduleDebounced(filePath, () => this.processFileChange(filePath));
      });

      this.watcher.on('unlink', (filePath: string) => {
        const timer = this.debounceTimers.get(filePath);
        if (timer) {
          clearTimeout(timer);
          this.debounceTimers.delete(filePath);
        }
        this.handleFileUnlink(filePath);
      });

      this.watcher.on('ready', () => {
        this.emit({ type: 'ready' });
        resolve();
      });

      this.watcher.on('error', (err: any) => {
        this.emit({ type: 'error', error: err?.message || String(err) });
      });
    });
  }

  private scheduleDebounced(filePath: string, fn: () => void): void {
    const existing = this.debounceTimers.get(filePath);
    if (existing) {
      clearTimeout(existing);
    }

    const timer = setTimeout(() => {
      this.debounceTimers.delete(filePath);
      fn();
    }, this.debounceMs);

    this.debounceTimers.set(filePath, timer);
  }

  /**
   * Closes the watcher and cleans up all pending timers.
   */
  public async close(): Promise<void> {
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();

    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
    }
  }
}
