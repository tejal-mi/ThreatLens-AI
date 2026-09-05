export interface AgentConfig {
  /** Strict timeout for fast AST search, symbol lookup, and file reads (in ms) */
  fastToolTimeoutMs: number;
  /** Configurable timeout for standard security probes (sqli, xss, exfil) (in ms) */
  securityProbeTimeoutMs: number;
  /** Timeout for stress / DDoS simulation probes (in ms) */
  stressTestTimeoutMs: number;
  /** Maximum number of tool iterations per agent turn */
  maxIterations: number;
  /** Maximum token limit per file content read */
  maxFileTokens: number;
}

export const DEFAULT_AGENT_CONFIG: AgentConfig = {
  fastToolTimeoutMs: 10_000,
  securityProbeTimeoutMs: 60_000,
  stressTestTimeoutMs: 300_000,
  maxIterations: 15,
  maxFileTokens: 8_000,
};
