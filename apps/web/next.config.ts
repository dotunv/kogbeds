import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  turbopack: {
    root: require('path').resolve(__dirname, '../../'),
  },
  images: {
    remotePatterns: [
      { protocol: 'http',  hostname: 'localhost' },
      { protocol: 'https', hostname: '*.grizzly.app' },
      { protocol: 'https', hostname: 'grizzly.app' },
    ],
  },
};

export default nextConfig;
