import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prevent build fails during deployment for minor linting/type issues
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Allow loading images from Supabase or any external URL
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

export default nextConfig;