export type Work = {
  slug: string;
  title: string;
  tag: string;
  year: string;
  summary: string;
  /** imagem em /public (usada no next/image e como textura do thumbnail flutuante) */
  cover: string;
};

// TODO: placeholders — trocar por cases reais (títulos, anos, resumos e capas).
export const WORKS: Work[] = [
  {
    slug: 'plataforma-de-gestao',
    title: 'Plataforma de gestão',
    tag: 'Sistema sob medida',
    year: '2026',
    summary: 'Clientes, agenda e financeiro num lugar só, no lugar de planilhas espalhadas.',
    cover: '/works/plataforma-de-gestao.jpg',
  },
  {
    slug: 'landing-de-lancamento',
    title: 'Landing de lançamento',
    tag: 'Landing page',
    year: '2026',
    summary: 'Página enxuta e rápida, feita pra levar a visita direto até a compra.',
    cover: '/works/landing-de-lancamento.jpg',
  },
  {
    slug: 'app-de-agendamento',
    title: 'App de agendamento',
    tag: 'Produto digital',
    year: '2025',
    summary: 'Clientes marcam sozinhos, a qualquer hora, e o negócio para de perder horário vago.',
    cover: '/works/app-de-agendamento.jpg',
  },
  {
    slug: 'loja-virtual',
    title: 'Loja virtual',
    tag: 'E-commerce',
    year: '2025',
    summary: 'Catálogo, carrinho e pagamento sem atrito, pensados para vender no celular.',
    cover: '/works/loja-virtual.jpg',
  },
  {
    slug: 'site-institucional',
    title: 'Site institucional',
    tag: 'Site',
    year: '2024',
    summary: 'Uma presença digital à altura da marca, rápida e fácil de encontrar no Google.',
    cover: '/works/site-institucional.jpg',
  },
];
