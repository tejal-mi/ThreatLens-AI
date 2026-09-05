import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs/promises';
import { IndexedFile, FileScanResult } from './types.js';
import { CodeSymbol } from './symbols.js';
import { AstExtractor } from './astExtractor.js';
import { ImportResolver, ResolvedDependency } from './importResolver.js';
import { createParser } from './parserLoader.js';
import { detectLanguage } from './languageDetector.js';

export interface StoredFileRecord {
  id: string;
  path: string;
  hash: string;
  mtime: number;
  language: string;
  size_bytes: number;
}

export interface StoredSymbolRecord {
  id: string;
  file_id: string;
  file_path: string;
  name: string;
  kind: string;
  start_line: number;
  end_line: number;
  start_col: number;
  end_col: number;
  signature: string | null;
  parameters: string | null;
  return_type: string | null;
  is_exported: number;
  is_async: number;
  parent_symbol: string | null;
}

export interface StoredDependencyRecord {
  id: string;
  source_file: string;
  target_file: string;
  raw_specifier: string;
  is_external: number;
}

export interface ReconcileStats {
  totalFiles: number;
  cachedCount: number;
  parsedCount: number;
  deletedCount: number;
  durationMs: number;
}

export class SqliteIndexStore {
  private db: Database.Database;
  private dbPath: string;

  constructor(dbPath?: string) {
    this.dbPath = dbPath || path.resolve('.threatlens_index.db');
    this.db = new Database(this.dbPath);
    this.init();
  }

  private init(): void {
    // Enable WAL mode for fast concurrent reads and atomic writes
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');

    // Create tables
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS files (
        id TEXT PRIMARY KEY,
        path TEXT UNIQUE NOT NULL,
        hash TEXT NOT NULL,
        mtime INTEGER NOT NULL,
        language TEXT NOT NULL,
        size_bytes INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS symbols (
        id TEXT PRIMARY KEY,
        file_id TEXT NOT NULL,
        file_path TEXT NOT NULL,
        name TEXT NOT NULL,
        kind TEXT NOT NULL,
        start_line INTEGER NOT NULL,
        end_line INTEGER NOT NULL,
        start_col INTEGER NOT NULL,
        end_col INTEGER NOT NULL,
        signature TEXT,
        parameters TEXT,
        return_type TEXT,
        is_exported INTEGER NOT NULL DEFAULT 0,
        is_async INTEGER NOT NULL DEFAULT 0,
        parent_symbol TEXT,
        FOREIGN KEY(file_id) REFERENCES files(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS dependencies (
        id TEXT PRIMARY KEY,
        source_file TEXT NOT NULL,
        target_file TEXT NOT NULL,
        raw_specifier TEXT NOT NULL,
        is_external INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY(source_file) REFERENCES files(path) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_files_path ON files(path);
      CREATE INDEX IF NOT EXISTS idx_files_hash ON files(hash);
      CREATE INDEX IF NOT EXISTS idx_symbols_name ON symbols(name);
      CREATE INDEX IF NOT EXISTS idx_symbols_file_id ON symbols(file_id);
      CREATE INDEX IF NOT EXISTS idx_symbols_kind ON symbols(kind);
      CREATE INDEX IF NOT EXISTS idx_dep_source ON dependencies(source_file);
      CREATE INDEX IF NOT EXISTS idx_dep_target ON dependencies(target_file);
    `);
  }

  /**
   * Syncs a single file, its symbols, and dependencies atomically within a transaction.
   */
  public syncFile(
    file: IndexedFile,
    symbols: CodeSymbol[],
    dependencies: ResolvedDependency[] = []
  ): void {
    const fileId = file.relativePath;

    const upsertFileStmt = this.db.prepare(`
      INSERT INTO files (id, path, hash, mtime, language, size_bytes)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(path) DO UPDATE SET
        hash = excluded.hash,
        mtime = excluded.mtime,
        language = excluded.language,
        size_bytes = excluded.size_bytes
    `);

    const deleteSymbolsStmt = this.db.prepare(`DELETE FROM symbols WHERE file_id = ?`);
    const deleteDepsStmt = this.db.prepare(`DELETE FROM dependencies WHERE source_file = ?`);

    const insertSymbolStmt = this.db.prepare(`
      INSERT INTO symbols (
        id, file_id, file_path, name, kind, start_line, end_line,
        start_col, end_col, signature, parameters, return_type,
        is_exported, is_async, parent_symbol
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertDepStmt = this.db.prepare(`
      INSERT OR REPLACE INTO dependencies (
        id, source_file, target_file, raw_specifier, is_external
      ) VALUES (?, ?, ?, ?, ?)
    `);

    const syncTransaction = this.db.transaction(() => {
      upsertFileStmt.run(
        fileId,
        file.relativePath,
        file.hash,
        Math.floor(file.modifiedTimeMs),
        file.language,
        file.sizeBytes
      );

      deleteSymbolsStmt.run(fileId);
      deleteDepsStmt.run(file.relativePath);

      for (let i = 0; i < symbols.length; i++) {
        const s = symbols[i];
        const symbolId = `${fileId}:${s.name}:${s.startLine}:${i}`;
        insertSymbolStmt.run(
          symbolId,
          fileId,
          file.relativePath,
          s.name,
          s.kind,
          s.startLine,
          s.endLine,
          s.startColumn,
          s.endColumn,
          s.signature || null,
          s.parameters ? JSON.stringify(s.parameters) : null,
          s.returnType || null,
          s.isExported ? 1 : 0,
          s.isAsync ? 1 : 0,
          s.parentSymbol || null
        );
      }

      for (let i = 0; i < dependencies.length; i++) {
        const dep = dependencies[i];
        const depId = `${dep.sourceFile}->${dep.targetFile}:${i}`;
        insertDepStmt.run(
          depId,
          dep.sourceFile,
          dep.targetFile,
          dep.rawSpecifier,
          dep.isExternal ? 1 : 0
        );
      }
    });

    syncTransaction();
  }

  /**
   * Removes a file, its symbols, and outgoing dependencies by path.
   */
  public removeFile(relativePath: string): void {
    const stmt = this.db.prepare(`DELETE FROM files WHERE path = ?`);
    stmt.run(relativePath);
  }

  /**
   * Fetches a file record by relative path.
   */
  public getFile(relativePath: string): StoredFileRecord | undefined {
    const stmt = this.db.prepare(`SELECT * FROM files WHERE path = ?`);
    return stmt.get(relativePath) as StoredFileRecord | undefined;
  }

  /**
   * Returns all stored file records in a Map keyed by path.
   */
  public getAllFilesMap(): Map<string, StoredFileRecord> {
    const stmt = this.db.prepare(`SELECT * FROM files`);
    const rows = stmt.all() as StoredFileRecord[];
    const map = new Map<string, StoredFileRecord>();
    for (const r of rows) {
      map.set(r.path, r);
    }
    return map;
  }

  /**
   * Finds symbols matching a name (exact or substring).
   */
  public findSymbols(name: string, exact = false): StoredSymbolRecord[] {
    if (exact) {
      const stmt = this.db.prepare(`SELECT * FROM symbols WHERE name = ? ORDER BY is_exported DESC, name ASC`);
      return stmt.all(name) as StoredSymbolRecord[];
    } else {
      const stmt = this.db.prepare(`SELECT * FROM symbols WHERE name LIKE ? ORDER BY is_exported DESC, name ASC`);
      return stmt.all(`%${name}%`) as StoredSymbolRecord[];
    }
  }

  /**
   * Retrieves all symbols within a specific file.
   */
  public getSymbolsInFile(relativePath: string): StoredSymbolRecord[] {
    const stmt = this.db.prepare(`SELECT * FROM symbols WHERE file_path = ? ORDER BY start_line ASC`);
    return stmt.all(relativePath) as StoredSymbolRecord[];
  }

  /**
   * Retrieves outgoing dependencies for a source file (what this file imports).
   */
  public getOutgoingDependencies(sourceFile: string): StoredDependencyRecord[] {
    const stmt = this.db.prepare(`SELECT * FROM dependencies WHERE source_file = ?`);
    return stmt.all(sourceFile) as StoredDependencyRecord[];
  }

  /**
   * Retrieves incoming dependents for a target file (what files import this target).
   */
  public getIncomingDependents(targetFile: string): StoredDependencyRecord[] {
    const stmt = this.db.prepare(`SELECT * FROM dependencies WHERE target_file = ?`);
    return stmt.all(targetFile) as StoredDependencyRecord[];
  }

  /**
   * Returns all stored dependency records.
   */
  public getAllDependencies(): StoredDependencyRecord[] {
    const stmt = this.db.prepare(`SELECT * FROM dependencies`);
    return stmt.all() as StoredDependencyRecord[];
  }

  /**
   * Total count of indexed symbols in SQLite.
   */
  public getSymbolCount(): number {
    const row = this.db.prepare(`SELECT COUNT(*) as count FROM symbols`).get() as { count: number };
    return row.count;
  }

  /**
   * Total count of indexed files in SQLite.
   */
  public getFileCount(): number {
    const row = this.db.prepare(`SELECT COUNT(*) as count FROM files`).get() as { count: number };
    return row.count;
  }

  /**
   * Reconciles workspace files: compares disk hashes against SQLite; parses ONLY new or changed files.
   */
  public async reconcile(
    scanResult: FileScanResult,
    extractor: AstExtractor,
    workspaceRoot?: string
  ): Promise<ReconcileStats> {
    const startTime = performance.now();
    const root = workspaceRoot || scanResult.rootPath;
    const allPaths = scanResult.files.map((f) => f.relativePath);
    const resolver = new ImportResolver(root, allPaths);

    const existingMap = this.getAllFilesMap();
    const currentPaths = new Set<string>();

    let cachedCount = 0;
    let parsedCount = 0;
    let deletedCount = 0;

    for (const file of scanResult.files) {
      currentPaths.add(file.relativePath);
      const existing = existingMap.get(file.relativePath);

      // Check if hash matches -> skip re-parsing
      if (existing && existing.hash === file.hash) {
        cachedCount++;
        continue;
      }

      // File is new or modified -> parse AST, extract symbols and imports
      try {
        const content = await fs.readFile(file.absolutePath, 'utf8');
        const extractResult = await extractor.extract(content, file.absolutePath);

        // Parse imports
        const lang = detectLanguage(file.absolutePath);
        const isTsx = file.relativePath.endsWith('.tsx') || file.relativePath.endsWith('.jsx');
        const parser = await createParser(lang, isTsx);

        let dependencies: ResolvedDependency[] = [];
        if (parser) {
          const tree = parser.parse(content);
          const rawImports = resolver.extractRawImports(tree, lang);
          dependencies = rawImports.map((raw) => resolver.resolve(file.relativePath, raw.rawSpecifier));
        }

        this.syncFile(file, extractResult.symbols, dependencies);
        parsedCount++;
      } catch {
        // Skip unreadable files
      }
    }

    // Clean up files deleted on disk
    for (const [existingPath] of existingMap) {
      if (!currentPaths.has(existingPath)) {
        this.removeFile(existingPath);
        deletedCount++;
      }
    }

    return {
      totalFiles: scanResult.files.length,
      cachedCount,
      parsedCount,
      deletedCount,
      durationMs: performance.now() - startTime,
    };
  }

  /**
   * Closes SQLite database connection.
   */
  public close(): void {
    this.db.close();
  }
}
