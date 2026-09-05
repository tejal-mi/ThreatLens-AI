import { SqliteIndexStore, StoredSymbolRecord } from './sqliteStore.js';
import { RipgrepSearcher, TextMatch, RipgrepOptions } from './ripgrepSearcher.js';
import { DependencyGraph, DependencyTreeResult, DependentTreeResult } from './dependencyGraph.js';

export interface UnifiedSearchResult {
  query: string;
  exactSymbols: StoredSymbolRecord[];
  partialSymbols: StoredSymbolRecord[];
  textMatches: TextMatch[];
  dependencyTree?: DependencyTreeResult;
  dependentTree?: DependentTreeResult;
  durationMs: number;
}

export class UnifiedSearchEngine {
  private store: SqliteIndexStore;
  private ripgrep: RipgrepSearcher;
  private graph: DependencyGraph;

  constructor(workspaceRoot: string, store: SqliteIndexStore) {
    this.store = store;
    this.ripgrep = new RipgrepSearcher(workspaceRoot);
    this.graph = new DependencyGraph(store);
  }

  /**
   * Search for AST symbols directly from SQLite (Step 9).
   */
  public searchSymbols(name: string, exact = false): StoredSymbolRecord[] {
    return this.store.findSymbols(name, exact);
  }

  /**
   * Fast raw text or regex search using vendored ripgrep.
   */
  public async searchText(query: string, options: RipgrepOptions = {}): Promise<TextMatch[]> {
    return this.ripgrep.search(query, options);
  }

  /**
   * Queries outgoing dependencies for a file.
   */
  public getDependencies(filePath: string): DependencyTreeResult {
    return this.graph.getDependencies(filePath);
  }

  /**
   * Queries incoming dependents for a file.
   */
  public getDependents(filePath: string): DependentTreeResult {
    return this.graph.getDependents(filePath);
  }

  /**
   * Multi-modal unified search ranking exact symbols above partial symbols and raw text matches.
   */
  public async query(queryText: string, options: { maxTextMatches?: number } = {}): Promise<UnifiedSearchResult> {
    const startTime = performance.now();
    const cleanQuery = queryText.trim();

    if (!cleanQuery) {
      return {
        query: '',
        exactSymbols: [],
        partialSymbols: [],
        textMatches: [],
        durationMs: 0,
      };
    }

    // 1. Symbol Search (Exact + Partial)
    const allSymbols = this.store.findSymbols(cleanQuery, false);
    const exactSymbols: StoredSymbolRecord[] = [];
    const partialSymbols: StoredSymbolRecord[] = [];

    const lowerQuery = cleanQuery.toLowerCase();
    for (const sym of allSymbols) {
      if (sym.name.toLowerCase() === lowerQuery) {
        exactSymbols.push(sym);
      } else {
        partialSymbols.push(sym);
      }
    }

    // 2. Ripgrep Raw Text Search
    const textMatches = await this.ripgrep.search(cleanQuery, {
      maxMatches: options.maxTextMatches || 25,
    });

    // 3. Optional Dependency Graph query if query looks like a file path
    let dependencyTree: DependencyTreeResult | undefined;
    let dependentTree: DependentTreeResult | undefined;

    const fileRecord = this.store.getFile(cleanQuery);
    if (fileRecord) {
      dependencyTree = this.graph.getDependencies(fileRecord.path);
      dependentTree = this.graph.getDependents(fileRecord.path);
    }

    return {
      query: cleanQuery,
      exactSymbols,
      partialSymbols,
      textMatches,
      dependencyTree,
      dependentTree,
      durationMs: performance.now() - startTime,
    };
  }
}
