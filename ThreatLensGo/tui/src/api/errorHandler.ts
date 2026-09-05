import { BackendError, RateLimitError } from './backendClient.js';

/**
 * Standardized error formatting helper for ThreatLens.
 * Distinguishes network connectivity errors ("Backend is not reachable")
 * from server errors (displaying parsed detail or message), RateLimitError,
 * and generic exceptions.
 */
export function formatBackendError(err: unknown): string {
  if (!err) {
    return 'An unknown error occurred';
  }

  // 1. RateLimitError with countdown
  if (err instanceof RateLimitError) {
    return `Rate limit exceeded. Retry after ${err.retryAfterSeconds} seconds.`;
  }

  // 2. Structured BackendError
  if (err instanceof BackendError) {
    if (err.detail && err.detail.trim()) {
      return err.detail.trim();
    }
    return err.message;
  }

  const message =
    typeof err === 'object' && err !== null && 'message' in err
      ? String((err as any).message)
      : String(err);

  // 3. Network / Connection failures (TypeError in fetch, ECONNREFUSED, socket hang up)
  if (
    err instanceof TypeError ||
    message.includes('fetch failed') ||
    message.includes('Failed to fetch') ||
    message.includes('ECONNREFUSED') ||
    message.includes('ENOTFOUND') ||
    message.includes('socket hang up') ||
    message.includes('Connection refused') ||
    message.includes('Backend offline') ||
    message.includes('network error')
  ) {
    return 'Backend is not reachable';
  }

  // 4. Clean up "HTTP <status>: <detail>" if present in string error message
  const httpMatch = message.match(/^HTTP \d+:\s*(.+)$/i);
  if (httpMatch && httpMatch[1]) {
    return httpMatch[1].trim();
  }

  return message;
}
