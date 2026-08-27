import type { NextConfig } from 'next';

/**
 * Path-based staging mounts admin at `/admin`. Set NEXT_PUBLIC_ADMIN_BASE_PATH=/admin
 * at image build time. Local dev leaves it unset so the app stays on http://localhost:3004.
 */
function resolveAdminBasePath(): string | undefined {
  const raw = process.env.NEXT_PUBLIC_ADMIN_BASE_PATH?.trim();
  if (!raw || raw === '/') {
    return undefined;
  }
  const withSlash = raw.startsWith('/') ? raw : `/${raw}`;
  return withSlash.replace(/\/$/, '');
}

const adminBasePath = resolveAdminBasePath();

const nextConfig: NextConfig = {
  ...(adminBasePath ? { basePath: adminBasePath } : {}),
  // Standalone is required for Docker images; enabling it unconditionally breaks
  // Windows local builds (EPERM creating traced symlinks). Dockerfiles set DOCKER_BUILD=1.
  ...(process.env.DOCKER_BUILD === '1'
    ? { output: 'standalone' as const }
    : {}),
  transpilePackages: ['@buying-bot/sdk', '@buying-bot/ui'],
  reactStrictMode: true,
  eslint: {
    // Repo uses root eslint flat config; Next plugin not required for M13/M14.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
