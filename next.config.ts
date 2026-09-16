import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // O badge do dev overlay fica no canto inferior-esquerdo e, durante o intro, lia como um
  // SEGUNDO "N" ao lado do contador (o "N" duplicado que apareceu no preview). É só de dev —
  // desligar não muda nada em produção e ainda mostra erros de compilação/runtime.
  devIndicators: false,
  images: {
    // AVIF preferido, WebP como fallback (o navegador escolhe pelo header Accept).
    formats: ['image/avif', 'image/webp'],
  },
};

export default nextConfig;
