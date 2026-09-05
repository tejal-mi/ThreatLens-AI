import { SqliteIndexStore, StoredDependencyRecord } from './sqliteStore.js';

export interface DependencyNode {
  file: string;
  isExternal: boolean;
  rawSpecifier: string;
  depth: number;
}

export interface DependencyTreeResult {
  rootFile: string;
  directDependencies: string[];
  transitiveDependencies: string[];
  externalPackages: string[];
  hasCycle: boolean;
  cycleNodes?: string[];
}

export interface DependentTreeResult {
  targetFile: string;
  directDependents: string[];
  transitiveDependents: string[];
}

export class DependencyGraph {
  private store: SqliteIndexStore;

  constructor(store: SqliteIndexStore) {
    this.store = store;
  }

  /**
   * Retrieves outgoing dependencies for a file with transitive traversal and cycle protection.
   */
  public getDependencies(rootFile: string, maxDepth = 10): DependencyTreeResult {
    const normalizedRoot = rootFile.replace(/\\/g, '/');
    const directDependencies: string[] = [];
    const transitiveSet = new Set<string>();
    const externalSet = new Set<string>();
    const visited = new Set<string>();
    let hasCycle = false;
    const cycleNodes: string[] = [];

    const traverse = (currentFile: string, currentDepth: number, pathStack: string[]) => {
      if (currentDepth > maxDepth) return;

      if (pathStack.includes(currentFile)) {
        hasCycle = true;
        cycleNodes.push(currentFile);
        return;
      }

      if (visited.has(currentFile)) return;
      visited.add(currentFile);

      const records = this.store.getOutgoingDependencies(currentFile);
      const nextStack = [...pathStack, currentFile];

      for (const rec of records) {
        if (rec.is_external) {
          externalSet.add(rec.target_file);
          continue;
        }

        if (currentDepth === 1) {
          directDependencies.push(rec.target_file);
        } else {
          transitiveSet.add(rec.target_file);
        }

        traverse(rec.target_file, currentDepth + 1, nextStack);
      }
    };

    const initialRecords = this.store.getOutgoingDependencies(normalizedRoot);
    for (const rec of initialRecords) {
      if (rec.is_external) {
        externalSet.add(rec.target_file);
      } else {
        directDependencies.push(rec.target_file);
        traverse(rec.target_file, 2, [normalizedRoot]);
      }
    }

    return {
      rootFile: normalizedRoot,
      directDependencies,
      transitiveDependencies: Array.from(transitiveSet),
      externalPackages: Array.from(externalSet),
      hasCycle,
      cycleNodes: hasCycle ? cycleNodes : undefined,
    };
  }

  /**
   * Retrieves incoming dependents for a file (what files import this target).
   */
  public getDependents(targetFile: string, maxDepth = 10): DependentTreeResult {
    const normalizedTarget = targetFile.replace(/\\/g, '/');
    const directDependents: string[] = [];
    const transitiveSet = new Set<string>();
    const visited = new Set<string>();

    const traverse = (currentFile: string, currentDepth: number) => {
      if (currentDepth > maxDepth || visited.has(currentFile)) return;
      visited.add(currentFile);

      const incoming = this.store.getIncomingDependents(currentFile);
      for (const rec of incoming) {
        if (currentDepth === 1) {
          directDependents.push(rec.source_file);
        } else {
          transitiveSet.add(rec.source_file);
        }
        traverse(rec.source_file, currentDepth + 1);
      }
    };

    const initialIncoming = this.store.getIncomingDependents(normalizedTarget);
    for (const rec of initialIncoming) {
      directDependents.push(rec.source_file);
      traverse(rec.source_file, 2);
    }

    return {
      targetFile: normalizedTarget,
      directDependents,
      transitiveDependents: Array.from(transitiveSet),
    };
  }
}
