import type { NextConfig } from 'next';

const internalApiUrl = process.env.INTERNAL_API_URL || 'http://127.0.0.1:4000';

const nextConfig: NextConfig = {
  output: 'standalone',
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {},
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${internalApiUrl}/api/:path*`,
      },
      {
        source: '/docs/:path*',
        destination: `${internalApiUrl}/docs/:path*`,
      },
    ];
  },
};

export default nextConfig;
