import type { StaticImageData } from 'next/image';

import artDecor01 from '@/assets/works/art-decor/art-decor-01.webp';
import artDecor02 from '@/assets/works/art-decor/art-decor-02.webp';
import artDecor03 from '@/assets/works/art-decor/art-decor-03.webp';
import artDecor04 from '@/assets/works/art-decor/art-decor-04.webp';
import bldg4u01 from '@/assets/works/bldg4u/bldg4u-01.png';
import bldg4u02 from '@/assets/works/bldg4u/bldg4u-02.png';
import bldg4u03 from '@/assets/works/bldg4u/bldg4u-03.png';
import bldg4u04 from '@/assets/works/bldg4u/bldg4u-04.png';
import bldg4u06 from '@/assets/works/bldg4u/bldg4u-06.png';
import bldg4u08 from '@/assets/works/bldg4u/bldg4u-08.png';
import bldg4u10 from '@/assets/works/bldg4u/bldg4u-10.png';
import wodcheck01 from '@/assets/works/wodcheck/wodcheck-01.png';
import wodcheck02 from '@/assets/works/wodcheck/wodcheck-02.png';
import wodcheck03 from '@/assets/works/wodcheck/wodcheck-03.png';
import wodcheck04 from '@/assets/works/wodcheck/wodcheck-04.png';

export type GalleryShot = {
  /** imagem importada de src/assets (traz largura e altura) */
  src: StaticImageData;
  alt: string;
  /** 'full' ocupa a largura toda; 'half' entra em par lado a lado no desktop */
  span: 'full' | 'half';
  /** proporção reservada no CSS (evita layout shift antes da imagem chegar).
   *  São screenshots largos: '16 / 8' em full, '16 / 9' nos pares — retrato sobraria tarja. */
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
  /** imagem importada de src/assets (usada no next/image) */
  cover: StaticImageData;
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

export const WORKS: Work[] = [
  {
    slug: 'bldg4u',
    title: 'BLDG4U',
    eyebrow: 'BLDG4U · CRM',
    headline: 'A obra inteira numa tela só.',
    tag: 'CRM sob medida',
    year: '2026',
    summary:
      'Clientes, obras e financeiro num só lugar, com portal próprio para quem contratou.',
    cover: bldg4u01,
    alt: 'Portal de acesso do BLDG4U, com entrada separada para administrador e cliente.',
    client: 'BLDG4U Construtora',
    disciplines: ['Produto', 'Front-end', 'Design de interface'],
    concept: [
      'Obras de pintura predial duram meses, e o controle vivia espalhado: andamento numa planilha, financeiro em outra, contatos no WhatsApp.',
      'Agora é uma tela. A diretoria vê clientes, obras e o caixa do mês somado. O cliente acompanha a própria obra, consulta as parcelas e assina o aceite de cada etapa.',
    ],
    gallery: [
      {
        src: bldg4u02,
        alt: 'Dashboard com saldo do mês, recebido contra pago, obras por situação e notificações de atraso.',
        span: 'full',
        ratio: '16 / 8',
      },
      {
        src: bldg4u04,
        alt: 'Lista de obras com status, progresso, prazo e valor de cada contrato.',
        span: 'half',
        ratio: '16 / 9',
      },
      {
        src: bldg4u03,
        alt: 'Lista de clientes com obra atual, situação de pagamento e origem do contato.',
        span: 'half',
        ratio: '16 / 9',
      },
      {
        src: bldg4u08,
        alt: 'Portal do cliente mostrando o progresso da obra e as etapas do termo de aceite.',
        span: 'full',
        ratio: '16 / 8',
      },
      {
        src: bldg4u10,
        alt: 'Tela de pagamentos do portal, com as parcelas do contrato e os comprovantes.',
        span: 'half',
        ratio: '16 / 9',
      },
      {
        src: bldg4u06,
        alt: 'Configurações do sistema, com perfil, dados da empresa, marca e notificações.',
        span: 'half',
        ratio: '16 / 9',
      },
    ],
    metrics: [
      { value: '2 portais', label: 'um para a equipe, um para o cliente' },
      { value: '1 tela', label: 'para obras, clientes e financeiro' },
      { value: 'Aceite', label: 'de cada etapa registrado em contrato' },
    ],
    role: 'Produto, interface e desenvolvimento',
    stack: ['Next.js', 'TypeScript', 'PostgreSQL'],
  },
  {
    slug: 'art-decor',
    title: 'Art Decor',
    eyebrow: 'Art Decor · Landing page',
    headline: 'A tradição da loja, agora no Google.',
    tag: 'Landing page',
    year: '2026',
    summary:
      'Loja de cortinas sob medida com 45 anos de casa e nenhuma presença digital.',
    cover: artDecor01,
    alt: 'Topo da landing page da Art Decor, com uma sala ampla e cortinas sob medida ao fundo.',
    client: 'Art Decor, Teresópolis, RJ',
    disciplines: ['Landing page', 'SEO', 'Front-end'],
    concept: [
      'A Art Decor atende Teresópolis desde 1981 no boca a boca. Quem procurava o nome na internet não achava nada.',
      'A página foi montada em torno de um pedido só: o orçamento. Os 45 anos abrem a conversa, os produtos vêm com o nome que o cliente já usa na loja, e o WhatsApp fica ao alcance em qualquer ponto da rolagem.',
    ],
    gallery: [
      {
        src: artDecor01,
        alt: 'Topo da página com a chamada principal e os botões de orçamento.',
        span: 'full',
        ratio: '16 / 8',
      },
      {
        src: artDecor02,
        alt: 'Seção de produtos com cortinas, persianas e modelos motorizados.',
        span: 'half',
        ratio: '16 / 9',
      },
      {
        src: artDecor03,
        alt: 'Bloco de história da loja, com os anos de experiência e os diferenciais do atendimento.',
        span: 'half',
        ratio: '16 / 9',
      },
      {
        src: artDecor04,
        alt: 'Chamada final de orçamento pelo WhatsApp e rodapé com contato e endereço.',
        span: 'full',
        ratio: '16 / 8',
      },
    ],
    metrics: [
      { value: '45 anos', label: 'de loja, pela primeira vez online' },
      { value: '1 página', label: 'do primeiro contato ao orçamento' },
    ],
    role: 'Design e desenvolvimento',
    stack: ['Next.js', 'GSAP', 'SCSS'],
  },
  {
    slug: 'wodcheck',
    title: 'WodCheck',
    eyebrow: 'WodCheck · Produto digital',
    headline: 'Presença de verdade, sem planilha.',
    tag: 'Produto digital',
    year: '2026',
    summary:
      'Check-in por GPS: o aluno marca presença pelo celular e o sistema confere se ele está lá.',
    cover: wodcheck01,
    alt: 'Topo do WodCheck, com a lista de presença da aula e a confirmação no celular.',
    client: 'WodCheck',
    disciplines: ['Produto digital', 'Mobile', 'Front-end'],
    concept: [
      'Nasceu num box de CrossFit, onde a vaga é contada e a lista era no papel: o aluno reservava, não aparecia e o horário ficava vazio.',
      'Agora ele confirma num toque e o sistema faz sete conferências antes de aceitar: raio da academia, janela de horário, precisão do GPS. Turma cheia abre fila de espera, e quem cancela libera a vaga na hora.',
    ],
    gallery: [
      {
        src: wodcheck01,
        alt: 'Topo da página com a lista de presença ao vivo e o card de confirmação do aluno.',
        span: 'full',
        ratio: '16 / 8',
      },
      {
        src: wodcheck04,
        alt: 'As sete conferências feitas a cada check-in, ao lado do mapa com o raio da academia.',
        span: 'half',
        ratio: '16 / 9',
      },
      {
        src: wodcheck02,
        alt: 'Recursos do sistema: fila de espera, agenda de aulas, presença ao vivo e relatórios.',
        span: 'half',
        ratio: '16 / 9',
      },
      {
        src: wodcheck03,
        alt: 'As duas pontas do produto: painel no navegador para a academia e app para o aluno.',
        span: 'full',
        ratio: '16 / 8',
      },
    ],
    metrics: [
      { value: '20s', label: 'para marcar presença' },
      { value: '7', label: 'conferências a cada check-in' },
      { value: '0', label: 'planilha para conferir' },
    ],
    role: 'Produto, interface e desenvolvimento',
    stack: ['Next.js', 'TypeScript', 'Geolocalização'],
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
