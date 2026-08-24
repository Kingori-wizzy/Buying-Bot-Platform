import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
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
  redirects() {
    return [{ source: '/products', destination: '/', permanent: false }];
  },
};

export default nextConfig;
