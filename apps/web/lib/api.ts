import { PlatformSdk } from '@buying-bot/sdk';

const DEFAULT_API = 'http://localhost:3000';
const DEFAULT_ADMIN = 'http://localhost:3004';

/**
 * Resolve API base URL. In the browser, keep the page hostname so session/CSRF
 * cookies stay same-site (localhost vs 127.0.0.1 are different sites).
 */
export function getApiBaseUrl(): string {
  const configured =
    process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '') ?? DEFAULT_API;

  if (typeof window === 'undefined') {
    return configured;
  }

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
 * Admin portal origin (separate Next app). Links to `/login` — never assume
 * the visitor is authorized; Nest RBAC remains authoritative.
 */
export function getAdminPortalLoginUrl(): string {
  const configured =
    process.env.NEXT_PUBLIC_ADMIN_URL?.replace(/\/$/, '') ??
    process.env.NEXT_PUBLIC_ADMIN_ORIGIN?.replace(/\/$/, '') ??
    DEFAULT_ADMIN;
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
