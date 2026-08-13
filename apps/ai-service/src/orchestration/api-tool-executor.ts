import type {
  ToolExecutorContext,
  ToolExecutorPort,
} from '@buying-bot/ai-core';

/**
 * Tool executor that calls Nest API tool gateway with service JWT.
 * Never invents commerce facts — API is the source of truth.
 */
export class ApiToolExecutor implements ToolExecutorPort {
  constructor(private readonly apiBaseUrl: string) {}

  async execute(
    toolName: string,
    args: Record<string, unknown>,
    context: ToolExecutorContext,
  ): Promise<{ readonly resultJson: string; readonly ok: boolean }> {
    const url = `${this.apiBaseUrl.replace(/\/$/, '')}/v1/ai/tools/${encodeURIComponent(toolName)}`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${context.serviceJwt}`,
          'content-type': 'application/json',
          'x-acting-subject': context.actingSubjectId,
          'x-acting-realm': context.realm,
          ...(context.correlationId
            ? { 'x-correlation-id': context.correlationId }
            : {}),
          ...(context.conversationId
            ? { 'x-conversation-id': context.conversationId }
            : {}),
        },
        body: JSON.stringify(args),
      });
      const text = await response.text();
      if (!response.ok) {
        return {
          ok: false,
          resultJson: JSON.stringify({
            ok: false,
            status: response.status,
            error: text.slice(0, 500),
          }),
        };
      }
      return { ok: true, resultJson: text };
    } catch (error: unknown) {
      return {
        ok: false,
        resultJson: JSON.stringify({
          ok: false,
          error: error instanceof Error ? error.message : 'tool call failed',
        }),
      };
    }
  }
}
