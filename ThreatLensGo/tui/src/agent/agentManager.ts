import 'dotenv/config';
import path from 'node:path';
import { SqliteIndexStore } from '../indexer/sqliteStore.js';
import { FileScanner } from '../indexer/fileScanner.js';
import { AstExtractor } from '../indexer/astExtractor.js';
import { UnifiedSearchEngine } from '../indexer/unifiedSearch.js';
import { FileWatcher } from '../indexer/fileWatcher.js';
import { ToolRegistry } from './tools/toolRegistry.js';
import { AutonomousAgentLoop } from './AutonomousAgentLoop.js';
import { AgentController } from './types.js';
import { LLMClient, OpenAILLMClient } from './llm/llmClient.js';
import { BackendGatewayLLMClient } from './llm/backendGatewayClient.js';
import { backendClient } from '../api/backendClient.js';
import { MockAgentController } from './MockAgentController.js';
import { DEFAULT_AGENT_CONFIG, AgentConfig } from './config.js';

export interface AgentManagerStats {
  workspaceRoot: string;
  totalFiles: number;
  totalSymbols: number;
  totalDependencies: number;
  modelName: string;
  isLive: boolean;
}

export class ThreatLensAgentManager {
  private workspaceRoot: string;
  private store: SqliteIndexStore | null = null;
  private searchEngine: UnifiedSearchEngine | null = null;
  private toolRegistry: ToolRegistry | null = null;
  private watcher: FileWatcher | null = null;
  private controller: AgentController | null = null;
  private config: AgentConfig;
  private isLive = false;
  private modelName = 'Mock / Scripted';

  constructor(workspaceRoot?: string, config: AgentConfig = DEFAULT_AGENT_CONFIG) {
    this.workspaceRoot = path.resolve(workspaceRoot || process.cwd());
    this.config = config;
  }

  /**
   * Initializes the full codebase indexing, dependency graph, SQLite store, and AutonomousAgentLoop.
   */
  public async init(options?: { customLLM?: LLMClient }): Promise<AgentController> {
    const dbPath = path.join(this.workspaceRoot, '.threatlens_index.db');
    this.store = new SqliteIndexStore(dbPath);

    const scanner = new FileScanner(this.workspaceRoot);
    const extractor = new AstExtractor();

    // 1. Startup hash reconciliation (sub-millisecond if unchanged)
    const scanResult = await scanner.scan();
    await this.store.reconcile(scanResult, extractor, this.workspaceRoot);

    // 2. Initialize Search & Tool Registry
    this.searchEngine = new UnifiedSearchEngine(this.workspaceRoot, this.store);
    this.toolRegistry = new ToolRegistry(
      {
        workspaceRoot: this.workspaceRoot,
        searchEngine: this.searchEngine,
        store: this.store,
      },
      this.config
    );

    // 3. Start Live File Watcher
    this.watcher = new FileWatcher(this.workspaceRoot, this.store, extractor);
    await this.watcher.start();

    // 4. Resolve LLM Client priority:
    // (1) options.customLLM if provided
    // (2) BackendGatewayLLMClient if backend is online
    // (3) OpenAILLMClient if local API keys exist
    // (4) MockAgentController otherwise
    let llmClient: LLMClient;

    if (options?.customLLM) {
      llmClient = options.customLLM;
      this.isLive = true;
      this.modelName = 'Custom LLM';
    } else {
      let isBackendOnline = false;
      try {
        const pulse = await backendClient.pulse();
        isBackendOnline = pulse.connect === true || pulse.status === 'Live';
      } catch {
        isBackendOnline = false;
      }

      if (isBackendOnline) {
        this.isLive = true;
        const model = process.env.LLM_MODEL || 'default';
        this.modelName = `Backend Gateway (${model})`;
        llmClient = new BackendGatewayLLMClient(process.env.LLM_MODEL);
      } else {
        const openRouterKey = process.env.OPENROUTER_API_KEY;
        const openAiKey = process.env.OPENAI_API_KEY;
        const anthropicKey = process.env.ANTHROPIC_API_KEY;
        const apiKey = openRouterKey || openAiKey || anthropicKey;

        if (apiKey) {
          this.isLive = true;
          this.modelName = process.env.LLM_MODEL || (openRouterKey ? 'anthropic/claude-3.5-sonnet' : 'gpt-4o');
          const baseUrl = process.env.LLM_BASE_URL || (openRouterKey ? 'https://openrouter.ai/api/v1' : 'https://api.openai.com/v1');

          llmClient = new OpenAILLMClient({
            apiKey,
            baseUrl,
            model: this.modelName,
          });
        } else {
          // Fallback to MockAgentController if no API keys are provided in terminal environment
          this.isLive = false;
          this.modelName = 'Simulated Agent (Set OPENROUTER_API_KEY for live LLM)';
          this.controller = new MockAgentController();
          return this.controller;
        }
      }
    }

    this.controller = new AutonomousAgentLoop(llmClient, this.toolRegistry, this.config);
    return this.controller;
  }

  public getController(): AgentController {
    if (!this.controller) {
      throw new Error('ThreatLensAgentManager not initialized. Call init() first.');
    }
    return this.controller;
  }

  public getStats(): AgentManagerStats {
    return {
      workspaceRoot: this.workspaceRoot,
      totalFiles: this.store ? this.store.getFileCount() : 0,
      totalSymbols: this.store ? this.store.getSymbolCount() : 0,
      totalDependencies: this.store ? this.store.getAllDependencies().length : 0,
      modelName: this.modelName,
      isLive: this.isLive,
    };
  }

  /**
   * Shuts down watcher, close database connection, and cleans up resources.
   */
  public async shutdown(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
    }
    if (this.store) {
      this.store.close();
      this.store = null;
    }
  }
}
