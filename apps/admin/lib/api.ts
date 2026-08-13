import { PlatformSdk } from '@buying-bot/sdk';

const DEFAULT_API = 'http://localhost:3000';

export function getApiBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '') ?? DEFAULT_API
  );
}

export function createBrowserSdk(): PlatformSdk {
  return new PlatformSdk({
    baseUrl: getApiBaseUrl(),
    credentials: 'include',
  });
}

export function createServerSdk(): PlatformSdk {
  return new PlatformSdk({
    baseUrl: getApiBaseUrl(),
    credentials: 'omit',
  });
}

export function hasPermission(
  permissions: readonly { resource: string; action: string }[],
  resource: string,
  action: string,
): boolean {
  return permissions.some(
    (p) => p.resource === resource && p.action === action,
  );
}
