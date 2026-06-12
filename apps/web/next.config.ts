import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'http',  hostname: 'localhost' },
      { protocol: 'https', hostname: '*.grizzly.app' },
      { protocol: 'https', hostname: 'grizzly.app' },
    ],
  },
  // Allow the frontend to run on port 3001 while the API runs on 3000
};

export default nextConfig;
