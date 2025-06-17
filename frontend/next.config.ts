import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || "http://localhost:3000",
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || "your-next-auth-secret-key-here",
  },
  experimental: {
    turbo: {
      rules: {
        // Configure Turbopack rules here
      },
    },
  },
  output: 'standalone',
  images: {
    domains: ['localhost'],
  },
};

export default nextConfig;
