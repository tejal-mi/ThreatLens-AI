import { LLMClient, LLMMessage, LLMStreamCallbacks } from './llmClient.js';
import { parseOpenAISSEStream } from './sseParser.js';
import { backendClient } from '../../api/backendClient.js';

export class BackendGatewayLLMClient implements LLMClient {
  private model?: string;

  constructor(model?: string) {
    this.model = model;
  }

  public async chat(
    messages: LLMMessage[],
    tools: Array<{ type: 'function'; function: any }>,
    callbacks?: LLMStreamCallbacks
  ): Promise<LLMMessage> {
    const payload = {
      model: this.model,
      messages,
      tools: tools.length > 0 ? tools : undefined,
      max_tokens: 4096,
      stream: true,
      // 🔧 PATCH — required or usage tracking (Step 3c / 8b) will never
      // populate. Most OpenAI-compatible SSE gateways only emit a `usage`
      // field in the final chunk when this is explicitly requested.
      stream_options: { include_usage: true },
    };

    const res = await backendClient.rawRequest('/llm/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorText = await res.text();
      let msg = errorText;
      try {
        const parsed = JSON.parse(errorText);
        msg = parsed.detail || parsed.error?.message || parsed.message || errorText;
      } catch {
        // retain raw text
      }
      throw new Error(`Backend LLM Gateway Error (${res.status}): ${msg}`);
    }
    if (!res.body) {
      throw new Error('Backend LLM Gateway returned empty body');
    }
    return parseOpenAISSEStream(res.body, callbacks);
  }
}
