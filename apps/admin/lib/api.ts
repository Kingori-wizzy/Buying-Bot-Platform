import { PlatformSdk } from '@buying-bot/sdk';

const DEFAULT_API = 'http://localhost:3000';

function stripTrailingSlash(value: string): string {
  return value.replace(/\/$/, '');
}

function getBrowserApiBaseUrl(): string {
  const configured =
    process.env.NEXT_PUBLIC_API_BASE_URL?.trim().replace(/\/$/, '') ||
    DEFAULT_API;

  try {
    const api = new URL(configured);
    const pageHost = window.location.hostname;
    if (
      (api.hostname === 'localhost' || api.hostname === '127.0.0.1') &&
      (pageHost === 'localhost' || pageHost === '127.0.0.1')
    ) {
      api.hostname = pageHost;
      return api.origin;
    }
  } catch {
    // fall through to configured
  }

  return configured;
}

function getServerApiBaseUrl(): string {
  const internal = process.env.INTERNAL_API_BASE_URL?.trim();
  if (internal) {
    return stripTrailingSlash(internal);
  }
  const publicUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (publicUrl) {
    return stripTrailingSlash(publicUrl);
  }
  return DEFAULT_API;
}

/**
 * Resolve API base URL. Browser uses public origin; server may use internal Docker DNS.
 */
export function getApiBaseUrl(): string {
  if (typeof window === 'undefined') {
    return getServerApiBaseUrl();
  }
  return getBrowserApiBaseUrl();
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
