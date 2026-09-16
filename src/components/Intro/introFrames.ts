/**
 * A mini-história do intro: "ideia → produto no ar → resultado", em cortes secos.
 *
 * Cada frame é disparado pela FAIXA DO CONTADOR (não por tempo): o contador persegue o load real,
 * então a narrativa acompanha o carregamento em vez de correr solta. `at` é o valor do contador
 * (0..100) a partir do qual o frame entra; o frame vale até o `at` do próximo.
 *
 * PARA TROCAR PELAS IMAGENS REAIS: ponha o caminho em `src` (webp/avif em /public). O caminho de
 * carregamento já está pronto (fetch + createImageBitmap + duotone da etapa) — é só preencher.
 *
 * Hoje TODOS os frames são placeholders procedurais, desenhados no canvas: é o que vamos aprovar
 * (narrativa + ritmo) antes de produzir as imagens. As imagens de /public/works NÃO servem aqui:
 * são arte abstrata (fluido azul/laranja), não telas de sites — usá-las traria de volta exatamente
 * o "quadrado abstrato mudando de cor" que esta montagem veio substituir.
 */

/** As 6 etapas da narrativa. A ordem aqui é a ordem da história. */
export type Stage = 'ideia' | 'processo' | 'montagem' | 'no-ar' | 'resultado' | 'fluido';

export type Frame = {
  /** Etapa a que este frame pertence (dirige o micro-rótulo e o desenho do placeholder). */
  stage: Stage;
  /** Valor do contador (0..100) em que este frame entra. */
  at: number;
  /** Imagem real (webp/avif em /public). Sem isto, desenha o placeholder da etapa. */
  src?: string;
  /** Rótulo exibido; só o PRIMEIRO frame de cada etapa o traz (o rótulo dura a etapa toda). */
  label?: string;
};

/**
 * 11 frames. As faixas seguem o brief:
 *   000–020 ideia · 020–040 processo · 040–060 montagem
 *   060–080 no ar · 080–095 resultado · 095–100 fluido (a ponte com o hero)
 */
export const FRAMES: Frame[] = [
  { stage: 'ideia', at: 0, label: 'ideia' },
  { stage: 'ideia', at: 10 },

  { stage: 'processo', at: 20, label: 'processo' },
  { stage: 'processo', at: 30 },

  { stage: 'montagem', at: 40, label: 'montagem' },
  { stage: 'montagem', at: 50 },

  { stage: 'no-ar', at: 60, label: 'no ar' },
  { stage: 'no-ar', at: 70 },

  { stage: 'resultado', at: 80, label: 'resultado' },
  { stage: 'resultado', at: 88 },

  // Última imagem antes do colapso: a assinatura iridescente, que emenda no hero.
  { stage: 'fluido', at: 95, label: 'nicole' },
];

/** Índice do frame correspondente a um valor de contador (0..100). */
export function frameAt(count: number): number {
  let i = 0;
  for (let k = 1; k < FRAMES.length; k++) {
    if (count >= FRAMES[k].at) i = k;
    else break;
  }
  return i;
}

/** Rótulo vigente num índice: o último rótulo declarado até ali (dura a etapa inteira). */
export function labelAt(index: number): string {
  for (let i = index; i >= 0; i--) {
    const l = FRAMES[i].label;
    if (l) return l;
  }
  return '';
}
