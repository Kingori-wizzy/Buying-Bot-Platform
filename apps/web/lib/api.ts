import { PlatformSdk } from '@buying-bot/sdk';

const DEFAULT_API = 'http://localhost:3000';

export function getApiBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '') ?? DEFAULT_API
  );
}

/** Browser SDK — cookie sessions + CSRF for mutations. */
export function createBrowserSdk(): PlatformSdk {
  return new PlatformSdk({
    baseUrl: getApiBaseUrl(),
    credentials: 'include',
  });
}

/** Server SDK for public catalog reads (no cookies). */
export function createServerSdk(): PlatformSdk {
  return new PlatformSdk({
    baseUrl: getApiBaseUrl(),
    credentials: 'omit',
  });
}

export function cartSubtotalMinor(
  lines: readonly { lineTotalMinor: number }[],
): number {
  return lines.reduce((sum, line) => sum + line.lineTotalMinor, 0);
}
