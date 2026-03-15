import type { NextConfig } from "next";

const backendUrl = process.env.BACKEND_URL ?? "http://localhost:9090";
const backend = new URL(backendUrl);

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: backend.protocol.replace(":", "") as "http" | "https",
        hostname: backend.hostname,
        port: backend.port || undefined,
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
