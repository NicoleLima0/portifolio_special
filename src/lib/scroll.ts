'use client';

import type Lenis from 'lenis';

/**
 * Estado de scroll compartilhado. O SmoothScroll registra o Lenis aqui; efeitos que dependem da
 * velocidade (skew, marquee) leem `scrollState.lenis?.velocity` dentro do gsap.ticker.
 * Sem Lenis (reduced motion) a velocidade é 0 e esses efeitos ficam parados.
 */
export const scrollState: { lenis: Lenis | null } = {
  lenis: null,
};

export function scrollVelocity(): number {
  return scrollState.lenis?.velocity ?? 0;
}
