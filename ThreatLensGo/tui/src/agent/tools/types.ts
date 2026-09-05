import { DiffApprovalPayload } from '../types.js';
import { UnifiedSearchEngine } from '../../indexer/unifiedSearch.js';
import { SqliteIndexStore } from '../../indexer/sqliteStore.js';

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  requiresApproval?: DiffApprovalPayload;
}

export interface ToolContext {
  workspaceRoot: string;
  searchEngine: UnifiedSearchEngine;
  store: SqliteIndexStore;
  signal?: AbortSignal;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
  execute: (args: any, context: ToolContext) => Promise<ToolResult>;
}
