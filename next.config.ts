import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    // AVIF preferido, WebP como fallback (o navegador escolhe pelo header Accept).
    formats: ['image/avif', 'image/webp'],
  },
};

export default nextConfig;
