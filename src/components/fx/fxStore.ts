'use client';

/**
 * Alvos do canvas de efeitos (UM contexto WebGL para a página toda).
 * Componentes só escrevem aqui em eventos (hover) ou timelines (scroll); o FxCanvas suaviza e
 * desenha no gsap.ticker. Nada disso passa por estado do React.
 */
export const fx = {
  /** Glow iridescente discreto seguindo o cursor sobre as seções pretas. */
  glow: { enabled: false },
  /** Thumbnail flutuante de Trabalhos. */
  thumb: { active: false, src: '' },
  /** Preview iridescente de Serviços. phase gira a paleta por serviço. */
  preview: { active: false, phase: 0 },
  /** Texturas a pré-carregar (consumido pelo FxCanvas). */
  preloadQueue: [] as string[],
};

export function preloadFx(srcs: string[]) {
  fx.preloadQueue.push(...srcs);
}
