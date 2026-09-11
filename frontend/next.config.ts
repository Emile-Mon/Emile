import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.BACKEND_URL || 'http://127.0.0.1:8000';
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/github',
        destination: 'https://github.com/Emile-Mon/Emile',
        permanent: false,
      },
      {
        source: '/x',
        destination: 'https://x.com/emilelearns?s=11',
        permanent: false,
      },
      {
        source: '/twitter',
        destination: 'https://x.com/emilelearns?s=11',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;

