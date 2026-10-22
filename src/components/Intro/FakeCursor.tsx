'use client';

import type { RefObject } from 'react';
import styles from './IntroOverlay.module.scss';

export type CursorRefs = {
  /** Wrapper que o MotionPathPlugin move ao longo da curva. */
  root: RefObject<HTMLDivElement | null>;
  /** Só a seta: recebe o scale do clique (separado do percurso). */
  arrow: RefObject<HTMLDivElement | null>;
};

/**
 * Cursor customizado em SVG. Omitido no mobile (lá o clique é só ripple + Flip) e com
 * reduced motion.
 *
 * O percurso vive aqui, junto do desenho: a curva é relativa (`MotionPathPlugin` com
 * coordenadas calculadas na hora), então acompanha qualquer viewport.
 */
export default function FakeCursor({ refs }: { refs: CursorRefs }) {
  return (
    <div ref={refs.root} className={styles.cursor} aria-hidden="true">
      <div ref={refs.arrow} className={styles.cursor__arrow}>
        <svg viewBox="0 0 24 24" fill="none">
          {/* Seta com contorno claro: legível tanto no fundo escuro quanto sobre o card. */}
          <path
            d="M5 3L19 12.5L12.2 13.6L8.6 20L5 3Z"
            fill="currentColor"
            stroke="var(--black)"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}
