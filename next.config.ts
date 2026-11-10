import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // CSS total é pequeno (~10 KB): inline no <head> remove as requisições de CSS que bloqueiam a
  // renderização (insight "Solicitações que bloquearam a renderização" do Lighthouse).
  experimental: { inlineCss: true },
  // O badge do dev overlay ("N") ocupa o canto inferior-esquerdo. É só de dev — desligar não
  // muda nada em produção e ainda mostra erros de compilação/runtime.
  devIndicators: false,
  images: {
    // AVIF preferido, WebP como fallback (o navegador escolhe pelo header Accept).
    formats: ['image/avif', 'image/webp'],
    // Obrigatório no Next 16: valor fora da lista é coagido para o mais próximo. As capas e a
    // galeria são screenshots de interface, cheios de texto pequeno — em 75 o texto borra.
    qualities: [75, 90, 95],
  },
};

export default nextConfig;
