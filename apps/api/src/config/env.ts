import type { ApiEnv } from '@buying-bot/config';

export type { ApiEnv };

export function parseOriginAllowlist(corsOrigin: string): readonly string[] {
  return corsOrigin
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}
