import type { NextConfig } from "next";

const backendUrl = process.env.BACKEND_URL ?? "http://localhost:9090";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "9090",
        pathname: "/static/**",
      },
    ],
  },
  async rewrites() {
    return [
      // Proxy backend qua /api/backend/* → tránh CORS (giống seller: gọi same-origin)
      // /api/auth/* giữ cho NextAuth
      {
        source: "/api/backend/:path*",
        destination: `${backendUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
