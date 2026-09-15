export type GalleryShot = {
  /** imagem em /public */
  src: string;
  alt: string;
  /** 'full' ocupa a largura toda; 'half' entra em par lado a lado no desktop */
  span: 'full' | 'half';
  /** proporção reservada no CSS (evita layout shift antes da imagem chegar) */
  ratio: string;
};

export type Metric = {
  value: string;
  label: string;
};

export type Work = {
  slug: string;
  title: string;
  /** etiqueta curta no topo do bloco (cliente ou tipo) */
  eyebrow: string;
  /** frase curta e poética, o gancho de venda do bloco */
  headline: string;
  tag: string;
  year: string;
  summary: string;
  /** imagem em /public (usada no next/image) */
  cover: string;
  /** alt descritivo da capa */
  alt: string;

  // ---- Case (/trabalhos/[slug]) ----
  /** cliente exibido nos metadados do case */
  client: string;
  /** disciplinas: "Landing page / SEO / Front-end" */
  disciplines: string[];
  /** 1–2 parágrafos em tom de venda: desafio → solução → resultado */
  concept: string[];
  /** 4–6 imagens, alternando full-width e pares */
  gallery: GalleryShot[];
  /** 2–3 resultados curtos; vazio esconde o bloco */
  metrics: Metric[];
  /** papel da Nicole no projeto */
  role: string;
  /** tecnologias usadas */
  stack: string[];
  /** link "ver ao vivo", quando existir */
  liveUrl?: string;
};

// TODO: placeholders — trocar por cases reais (títulos, anos, resumos e capas).
// A copy de `concept`, `metrics`, `role` e `stack` é placeholder de estrutura: o tom está certo
// (venda, sem jargão), os números não. Trocar por dados reais antes de publicar.
export const WORKS: Work[] = [
  {
    slug: 'plataforma-de-gestao',
    title: 'Plataforma de gestão',
    eyebrow: 'Utopia · Sistema',
    headline: 'Onde gestão vira leveza.',
    tag: 'Sistema sob medida',
    year: '2026',
    summary: 'Clientes, agenda e financeiro num lugar só, no lugar de planilhas espalhadas.',
    cover: '/works/plataforma-de-gestao.jpg',
    alt: 'Painel da plataforma de gestão com agenda e indicadores do negócio.',
    client: 'Utopia',
    disciplines: ['Produto', 'Front-end', 'Design de interface'],
    concept: [
      'A operação vivia em cinco planilhas e três grupos de mensagem. Ninguém sabia dizer, sem abrir tudo, quanto o mês já tinha faturado nem qual cliente estava esperando retorno.',
      'Montei um painel único: agenda, clientes e financeiro na mesma tela, com os números do mês sempre à vista. O time parou de procurar informação e voltou a atender.',
    ],
    gallery: [
      {
        src: '/works/plataforma-de-gestao.jpg',
        alt: 'Visão geral do painel, com os indicadores do mês no topo.',
        span: 'full',
        ratio: '16 / 10',
      },
      {
        src: '/works/landing-de-lancamento.jpg',
        alt: 'Tela de agenda com os atendimentos da semana.',
        span: 'half',
        ratio: '4 / 5',
      },
      {
        src: '/works/app-de-agendamento.jpg',
        alt: 'Ficha de cliente com histórico de atendimentos.',
        span: 'half',
        ratio: '4 / 5',
      },
      {
        src: '/works/loja-virtual.jpg',
        alt: 'Relatório financeiro com entradas e saídas do mês.',
        span: 'full',
        ratio: '16 / 10',
      },
    ],
    metrics: [
      { value: '5 → 1', label: 'planilhas substituídas' },
      { value: '−8h', label: 'de trabalho manual por semana' },
      { value: '100%', label: 'da operação em uma tela' },
    ],
    role: 'Produto, interface e desenvolvimento',
    stack: ['Next.js', 'TypeScript', 'PostgreSQL'],
  },
  {
    slug: 'landing-de-lancamento',
    title: 'Landing de lançamento',
    eyebrow: 'Aurora · Landing page',
    headline: 'Uma página. Uma decisão.',
    tag: 'Landing page',
    year: '2026',
    summary: 'Página enxuta e rápida, feita pra levar a visita direto até a compra.',
    cover: '/works/landing-de-lancamento.jpg',
    alt: 'Landing page de lançamento aberta no notebook, com chamada principal em destaque.',
    client: 'Aurora',
    disciplines: ['Landing page', 'SEO', 'Front-end'],
    concept: [
      'O lançamento tinha data marcada e a página anterior demorava sete segundos para abrir no celular — onde estava quase todo o público.',
      'Refiz a página inteira em cima de uma única decisão: comprar. Texto curto, uma chamada por vez e carregamento quase instantâneo, mesmo em 4G.',
    ],
    gallery: [
      {
        src: '/works/landing-de-lancamento.jpg',
        alt: 'Topo da landing page com a chamada principal e o botão de compra.',
        span: 'full',
        ratio: '16 / 10',
      },
      {
        src: '/works/loja-virtual.jpg',
        alt: 'Seção de benefícios do produto, em duas colunas.',
        span: 'half',
        ratio: '4 / 5',
      },
      {
        src: '/works/site-institucional.jpg',
        alt: 'Depoimentos de clientes na metade da página.',
        span: 'half',
        ratio: '4 / 5',
      },
      {
        src: '/works/plataforma-de-gestao.jpg',
        alt: 'Chamada final da página, com o formulário de compra.',
        span: 'full',
        ratio: '16 / 10',
      },
    ],
    metrics: [
      { value: '1,2s', label: 'para abrir no celular' },
      { value: '+40%', label: 'de conversão no lançamento' },
    ],
    role: 'Design e desenvolvimento',
    stack: ['Next.js', 'GSAP', 'SCSS'],
  },
  {
    slug: 'app-de-agendamento',
    title: 'App de agendamento',
    eyebrow: 'Fluxo · Produto digital',
    headline: 'Sua agenda trabalhando sozinha.',
    tag: 'Produto digital',
    year: '2025',
    summary: 'Clientes marcam sozinhos, a qualquer hora, e o negócio para de perder horário vago.',
    cover: '/works/app-de-agendamento.jpg',
    alt: 'Tela de agendamento no celular, com horários disponíveis para escolher.',
    client: 'Fluxo',
    disciplines: ['Produto digital', 'Mobile', 'Integrações'],
    concept: [
      'Todo agendamento passava por mensagem, um a um, fora do horário comercial. Quando ninguém respondia a tempo, o horário simplesmente ficava vazio.',
      'Criei um fluxo em que o próprio cliente escolhe o horário livre e recebe a confirmação na hora. A agenda se preenche sozinha, inclusive de madrugada.',
    ],
    gallery: [
      {
        src: '/works/app-de-agendamento.jpg',
        alt: 'Lista de horários disponíveis na tela do celular.',
        span: 'full',
        ratio: '16 / 10',
      },
      {
        src: '/works/plataforma-de-gestao.jpg',
        alt: 'Confirmação do agendamento enviada ao cliente.',
        span: 'half',
        ratio: '4 / 5',
      },
      {
        src: '/works/landing-de-lancamento.jpg',
        alt: 'Painel do profissional com a agenda do dia.',
        span: 'half',
        ratio: '4 / 5',
      },
    ],
    metrics: [
      { value: '−70%', label: 'de horários ociosos' },
      { value: '24h', label: 'de agendamento disponível' },
    ],
    role: 'Produto e desenvolvimento',
    stack: ['React', 'Node', 'API de pagamentos'],
  },
  {
    slug: 'loja-virtual',
    title: 'Loja virtual',
    eyebrow: 'Vitrine · E-commerce',
    headline: 'Do carrinho ao pix, sem atrito.',
    tag: 'E-commerce',
    year: '2025',
    summary: 'Catálogo, carrinho e pagamento sem atrito, pensados para vender no celular.',
    cover: '/works/loja-virtual.jpg',
    alt: 'Loja virtual no celular mostrando o catálogo de produtos e o carrinho.',
    client: 'Vitrine',
    disciplines: ['E-commerce', 'Pagamentos', 'Front-end'],
    concept: [
      'A loja recebia visita, enchia carrinho e perdia a venda no fim: o checkout pedia cadastro completo antes de mostrar o valor do frete.',
      'Reconstruí o caminho da compra em três telas, com pix à vista e frete calculado logo no carrinho. Quem decide comprar consegue terminar em menos de um minuto.',
    ],
    gallery: [
      {
        src: '/works/loja-virtual.jpg',
        alt: 'Catálogo de produtos da loja no celular.',
        span: 'full',
        ratio: '16 / 10',
      },
      {
        src: '/works/site-institucional.jpg',
        alt: 'Página de produto com fotos e descrição.',
        span: 'half',
        ratio: '4 / 5',
      },
      {
        src: '/works/app-de-agendamento.jpg',
        alt: 'Carrinho com o frete já calculado.',
        span: 'half',
        ratio: '4 / 5',
      },
      {
        src: '/works/landing-de-lancamento.jpg',
        alt: 'Tela final de pagamento com a opção de pix.',
        span: 'full',
        ratio: '16 / 10',
      },
    ],
    metrics: [
      { value: '3 telas', label: 'do carrinho ao pagamento' },
      { value: '+28%', label: 'de carrinhos finalizados' },
    ],
    role: 'Interface e desenvolvimento',
    stack: ['Next.js', 'Stripe', 'CMS headless'],
  },
  {
    slug: 'site-institucional',
    title: 'Site institucional',
    eyebrow: 'Matriz · Site',
    headline: 'A marca, no tamanho certo.',
    tag: 'Site',
    year: '2024',
    summary: 'Uma presença digital à altura da marca, rápida e fácil de encontrar no Google.',
    cover: '/works/site-institucional.jpg',
    alt: 'Home do site institucional em tela cheia, com a identidade da marca.',
    client: 'Matriz',
    disciplines: ['Site institucional', 'SEO', 'Conteúdo'],
    concept: [
      'A empresa tinha vinte anos de história e um site que não contava nenhuma delas — nem aparecia no Google quando alguém buscava pelo nome.',
      'Reescrevi a estrutura em torno do que o cliente procura antes de fechar negócio, com páginas rápidas e conteúdo que o buscador entende. Hoje a marca aparece na primeira página pelo próprio nome.',
    ],
    gallery: [
      {
        src: '/works/site-institucional.jpg',
        alt: 'Home do site com a apresentação da empresa.',
        span: 'full',
        ratio: '16 / 10',
      },
      {
        src: '/works/plataforma-de-gestao.jpg',
        alt: 'Página de serviços em duas colunas.',
        span: 'half',
        ratio: '4 / 5',
      },
      {
        src: '/works/loja-virtual.jpg',
        alt: 'Página de contato com o formulário.',
        span: 'half',
        ratio: '4 / 5',
      },
    ],
    metrics: [
      { value: '1ª página', label: 'no Google pelo nome da marca' },
      { value: '+3×', label: 'de contatos pelo site' },
    ],
    role: 'Estrutura, conteúdo e desenvolvimento',
    stack: ['Next.js', 'SCSS', 'CMS headless'],
  },
];

/** Case pelo slug. */
export function findWork(slug: string): Work | undefined {
  return WORKS.find((work) => work.slug === slug);
}

/** Próximo case da lista (volta ao primeiro no fim) — alimenta o navegador do fim da página. */
export function nextWork(slug: string): Work {
  const i = WORKS.findIndex((work) => work.slug === slug);
  return WORKS[(i + 1) % WORKS.length];
}

/** Número exibido do case: "01", "02"… na ordem da lista. */
export function workNumber(slug: string): string {
  return String(WORKS.findIndex((work) => work.slug === slug) + 1).padStart(2, '0');
}
