'use client';

import { useEffect, useState } from 'react';
import { scrollState } from '@/lib/scroll';
import styles from './BackToTop.module.scss';

const REVEAL_AFTER_SCREENS = 1.5;

/**
 * Volta ao topo: a página é longa e o menu vive no hero, então lá embaixo não há caminho de volta.
 * Usa o Lenis quando existe; sem ele (reduced motion) o scroll nativo também não anima.
 */
export default function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > window.innerHeight * REVEAL_AFTER_SCREENS);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToTop = () => {
    const { lenis } = scrollState;
    if (lenis) lenis.scrollTo(0, { duration: 1.2 });
    else window.scrollTo({ top: 0, behavior: 'auto' });
  };

  return (
    <button
      type="button"
      className={`${styles.top} ${visible ? styles['top--visible'] : ''}`}
      onClick={scrollToTop}
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
    >
      <span className={styles.top__arrow} aria-hidden="true">
        ↑
      </span>
      <span className="sr-only">Voltar ao topo</span>
    </button>
  );
}
