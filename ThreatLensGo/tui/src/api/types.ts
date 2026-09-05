export type AttackType = 'ddos' | 'sqli' | 'xss' | 'data-burning' | 'origin-proxy';

// --- Auth ---
export interface PulseResponse {
  status: string;
  connect: boolean;
}

export interface PasswordLoginRequest {
  identifier: string;
  password: string;
}

export interface PasswordLoginResponse {
  status: string;
}

// --- LLM ---
export interface ChatMessage {
  role: string;
  content: any;
  tool_calls?: any[] | null;
  tool_call_id?: string | null;
}

export interface ChatRequest {
  model?: string | null;
  messages: ChatMessage[];
  tools?: any[] | null;
  temperature?: number | null;
  max_tokens?: number | null;
  stream?: boolean;
}

export interface CreateChatRequest {
  title?: string | null;
  model?: string | null;
}

export interface ChatHistoryRequest {
  chat_id: number;
  messages: any[];
}

export interface PatchUsageRequest {
  prompt_tokens: number;
  completion_tokens: number;
}

export interface UsageData {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  synced_at?: number | null;
  updated_at?: number | null;
}

export interface LimitData {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  updated_at?: number | null;
}

// --- Chat Sessions ---
export interface Chat {
  id: number;
  title?: string | null;
  model?: string | null;
  created_at?: string;
  [key: string]: any;
}

// --- Attacks ---
export interface AttackStartResponse {
  attack_id: string;
  status: string;
}

export interface AttackStopResponse {
  attack_id: string;
  status: string;
}

export interface AttackProgress {
  planned_requests?: number;
  attempted_requests?: number;
  active_requests?: number;
  [key: string]: any;
}

export interface AttackPerformance {
  requests_per_second?: number;
  average_latency_ms?: number;
  p50_latency_ms?: number;
  p95_latency_ms?: number;
  p99_latency_ms?: number;
  [key: string]: any;
}

export interface AttackStatus {
  attack_id: string;
  status: string;
  elapsed_seconds?: number;
  progress?: AttackProgress;
  requests?: {
    successful?: number;
    failed?: number;
    timeouts?: number;
    retried?: number;
    [key: string]: any;
  };
  performance?: AttackPerformance;
  status_codes?: Record<string, number>;
  errors?: Record<string, any>;
  error_message?: string | null;
  [key: string]: any;
}

export interface AttackCaseStatus {
  case: string;
  enabled: boolean;
}

// --- Git ---
export interface GitBuildResponse {
  status: string;
  count: number | null;
}
