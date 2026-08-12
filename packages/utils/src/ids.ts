import { randomUUID } from 'node:crypto';

export function createRequestId(): string {
  return randomUUID();
}

export function createCorrelationId(existing?: string): string {
  if (existing && existing.trim().length > 0) {
    return existing.trim();
  }
  return randomUUID();
}
