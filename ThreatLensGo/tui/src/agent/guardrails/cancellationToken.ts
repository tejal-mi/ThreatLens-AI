export class CancellationTokenSource {
  private controller: AbortController;
  private timer: NodeJS.Timeout | null = null;

  constructor(timeoutMs?: number) {
    this.controller = new AbortController();
    if (timeoutMs && timeoutMs > 0) {
      this.timer = setTimeout(() => {
        this.cancel(`Operation timed out after ${timeoutMs}ms`);
      }, timeoutMs);
    }
  }

  public get signal(): AbortSignal {
    return this.controller.signal;
  }

  public get isCancelled(): boolean {
    return this.controller.signal.aborted;
  }

  public cancel(reason?: string): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (!this.controller.signal.aborted) {
      this.controller.abort(reason || 'Operation cancelled');
    }
  }

  public dispose(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}

/**
 * Wraps a promise with an enforced timeout and cancellation signal.
 */
export async function withTimeout<T>(
  action: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
  label = 'Operation'
): Promise<T> {
  const cts = new CancellationTokenSource(timeoutMs);

  try {
    const result = await action(cts.signal);
    return result;
  } catch (err: any) {
    if (cts.isCancelled) {
      throw new Error(`${label} timed out after ${timeoutMs}ms.`);
    }
    throw err;
  } finally {
    cts.dispose();
  }
}
