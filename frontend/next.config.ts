import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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

