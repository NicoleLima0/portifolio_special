'use client';

import type { RefObject } from 'react';
import styles from './IntroOverlay.module.scss';

export type SearchBarRefs = {
  /** Wrapper que sobe para o topo na Fase 3. */
  shell: RefObject<HTMLDivElement | null>;
  /** A barra em si: recebe o fade/scale da entrada e o pulso do "Enter". */
  bar: RefObject<HTMLDivElement | null>;
  /** Onde as letras são escritas, uma a uma. */
  text: RefObject<HTMLSpanElement | null>;
  /** Cursor de texto piscando. */
  caret: RefObject<HTMLSpanElement | null>;
  /** Lista de sugestões (entra com stagger, sai no "Enter"). */
  suggestions: RefObject<HTMLUListElement | null>;
};

/**
 * Barra de busca genérica: vidro fosco, borda sutil, sombra em camadas. De propósito NÃO imita
 * nenhum buscador real — nem logo, nem paleta, nem layout. A identidade é a do próprio site.
 */
export default function SearchBar({
  refs,
  suggestions,
  placeholder,
}: {
  refs: SearchBarRefs;
  suggestions: readonly string[];
  placeholder: string;
}) {
  return (
    <div ref={refs.shell} className={styles.search} aria-hidden="true">
      <div ref={refs.bar} className={styles.search__bar}>
        <svg className={styles.search__icon} viewBox="0 0 24 24" fill="none">
          <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
          <path d="M16 16L21 21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>

        <span className={styles.search__field}>
          {/* Placeholder sai assim que a primeira letra entra (controlado pela timeline). */}
          <span className={styles.search__placeholder} data-intro-placeholder>
            {placeholder}
          </span>
          <span ref={refs.text} className={styles.search__text} />
          <span ref={refs.caret} className={styles.search__caret} />
        </span>
      </div>

      <ul ref={refs.suggestions} className={styles.search__suggestions}>
        {suggestions.map((s, i) => (
          <li
            key={s}
            className={`${styles.search__suggestion} ${i === 0 ? styles['search__suggestion--active'] : ''}`}
          >
            <svg className={styles['search__suggestion-icon']} viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.6" />
              <path d="M16 16L21 21" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            {s}
          </li>
        ))}
      </ul>
    </div>
  );
}
