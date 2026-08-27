import { PlatformSdk } from '@buying-bot/sdk';

const DEFAULT_API = 'http://localhost:3000';
const DEFAULT_ADMIN = 'http://localhost:3004';

function stripTrailingSlash(value: string): string {
  return value.replace(/\/$/, '');
}

/**
 * Browser-facing API origin (inlined from NEXT_PUBLIC_* at build time).
 * Never return Docker-internal hostnames here — those are not reachable from browsers.
 */
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

/**
 * Server/SSR API origin. Prefer INTERNAL_API_BASE_URL (e.g. http://api:3000)
 * inside Docker so catalog SSR does not call the container loopback or rely on
 * public DNS. Falls back to the public NEXT_PUBLIC URL, then local default.
 */
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

/**
 * Admin portal origin (separate Next app). Links to `/login` — never assume
 * the visitor is authorized; Nest RBAC remains authoritative.
 */
export function getAdminPortalLoginUrl(): string {
  const configured =
    process.env.NEXT_PUBLIC_ADMIN_URL?.trim().replace(/\/$/, '') ||
    process.env.NEXT_PUBLIC_ADMIN_ORIGIN?.trim().replace(/\/$/, '') ||
    DEFAULT_ADMIN;
  if (/\/login$/i.test(configured)) {
    return configured;
  }
  return `${configured}/login`;
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
