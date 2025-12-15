import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // 強制使用 webpack 而不是 Turbopack
  webpack: (config, { isServer }) => {
    return config;
  },
};

export default nextConfig;
