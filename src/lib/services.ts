import { site } from './site';

export type Service = {
  title: string;
  text: string;
  items: string[];
  /** posição do preview no shader do FxCanvas (0–1) */
  phase: number;
};

// Fonte única: a seção Serviços renderiza daqui e o JSON-LD da home gera um nó `Service`
// por item da mesma lista — dado estruturado que não bate com o texto visível é penalizado.
export const SERVICES: Service[] = [
  {
    title: 'Criação de sites e landing pages',
    text: `Sites rápidos que transformam visita em cliente e colocam sua empresa nas buscas de ${site.city}.`,
    items: [
      'Sites institucionais e landing pages',
      `SEO local: aparecer no Google de ${site.city}`,
      'Performance, Core Web Vitals e mobile',
    ],
    phase: 0,
  },
  {
    title: 'Sistemas sob medida',
    text: 'Painéis, áreas de cliente e automações que tiram o trabalho manual do seu dia.',
    items: ['Painéis e áreas de cliente', 'Integrações e automações', 'Agendamentos e pagamentos'],
    phase: 0.33,
  },
  {
    title: 'Cuidado contínuo',
    text: 'Depois do lançamento eu fico por perto: ajustes, melhorias e tudo no ar sem susto.',
    items: ['Manutenção e evolução', 'Monitoramento e backups', 'Melhorias guiadas por dados'],
    phase: 0.66,
  },
];
