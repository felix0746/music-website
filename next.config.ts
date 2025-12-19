import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 明確禁用 Turbopack（使用傳統 webpack）
  // 注意：這可能需要重啟開發伺服器才能生效
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
