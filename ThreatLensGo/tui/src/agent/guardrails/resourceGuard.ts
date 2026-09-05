import { LLMMessage } from '../llm/llmClient.js';

export interface TruncateOptions {
  maxLines?: number;
  maxBytes?: number;
}

export const DEFAULT_MAX_FILE_BYTES = 32 * 1024; // 32KB preview cap
export const DEFAULT_MAX_LINES = 800;
export const DEFAULT_MAX_TOOL_BYTES = 16 * 1024; // 16KB

/**
 * Truncates long file content safely preserving line boundaries.
 */
export function truncateFileContent(
  content: string,
  options: TruncateOptions = {}
): { text: string; isTruncated: boolean; originalLines: number; originalBytes: number } {
  const maxLines = options.maxLines || DEFAULT_MAX_LINES;
  const maxBytes = options.maxBytes || DEFAULT_MAX_FILE_BYTES;

  const originalBytes = Buffer.byteLength(content, 'utf8');
  const lines = content.split('\n');
  const originalLines = lines.length;

  if (originalLines <= maxLines && originalBytes <= maxBytes) {
    return { text: content, isTruncated: false, originalLines, originalBytes };
  }

  let accumulatedBytes = 0;
  const slicedLines: string[] = [];

  for (let i = 0; i < Math.min(lines.length, maxLines); i++) {
    const lineBytes = Buffer.byteLength(lines[i], 'utf8') + 1;
    if (accumulatedBytes + lineBytes > maxBytes) {
      break;
    }
    accumulatedBytes += lineBytes;
    slicedLines.push(lines[i]);
  }

  const remainingLines = originalLines - slicedLines.length;
  slicedLines.push(`\n... [${remainingLines} lines (${originalBytes - accumulatedBytes} bytes) truncated by ResourceGuard] ...`);

  return {
    text: slicedLines.join('\n'),
    isTruncated: true,
    originalLines,
    originalBytes,
  };
}

/**
 * Safely caps tool result payloads before injecting into LLM conversation history.
 */
export function truncateToolData(data: any, maxBytes = DEFAULT_MAX_TOOL_BYTES): any {
  if (!data) return data;

  try {
    const jsonStr = JSON.stringify(data);
    if (Buffer.byteLength(jsonStr, 'utf8') <= maxBytes) {
      return data;
    }

    if (Array.isArray(data)) {
      return data.slice(0, 15).concat([{ _truncated: `Array truncated to first 15 items` }]);
    }

    if (typeof data === 'object') {
      const truncated: Record<string, any> = {};
      for (const [k, v] of Object.entries(data)) {
        if (typeof v === 'string' && v.length > 500) {
          truncated[k] = v.substring(0, 500) + '... [truncated]';
        } else {
          truncated[k] = v;
        }
      }
      return truncated;
    }

    return String(data).substring(0, maxBytes) + '... [truncated]';
  } catch {
    return data;
  }
}

/**
 * Prunes conversation history keeping system prompt and the most recent N turns.
 */
export function pruneMessageHistory(messages: LLMMessage[], maxMessages = 25): LLMMessage[] {
  if (messages.length <= maxMessages) {
    return messages;
  }

  const systemMessage = messages.find((m) => m.role === 'system');
  const nonSystem = messages.filter((m) => m.role !== 'system');

  const recent = nonSystem.slice(-maxMessages + 1);

  if (systemMessage) {
    return [systemMessage, ...recent];
  }
  return recent;
}
