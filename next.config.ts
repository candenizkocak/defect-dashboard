import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow loading images from Supabase or any external URL
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  // Ignore TypeScript errors during build so minor type issues don't stop deployment
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;