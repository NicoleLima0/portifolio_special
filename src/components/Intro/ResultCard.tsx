'use client';

import type { RefObject } from 'react';
import styles from './IntroOverlay.module.scss';

export type ResultRefs = {
  /** Lista inteira dos resultados (sai com blur + fade na Fase 6). */
  list: RefObject<HTMLDivElement | null>;
  /** O card em destaque: é ele que o Flip expande até a viewport. */
  card: RefObject<HTMLElement | null>;
  /** Conteúdo do card: some em fade durante a expansão. */
  content: RefObject<HTMLDivElement | null>;
  /** Resultados genéricos (skeletons), que saem junto com o resto. */
  others: RefObject<HTMLDivElement | null>;
};

/**
 * Os resultados da busca. O destacado é o único com texto real — e o texto vem do `site.ts`
 * (mesma fonte do <title> e da meta description), então o que aparece aqui é literalmente o
 * resultado de busca do site, nunca um texto inventado.
 *
 * Sem estrelas, notas, selos ou números: nada que sugira avaliação que não existe.
 */
export default function ResultCard({
  refs,
  title,
  url,
  description,
}: {
  refs: ResultRefs;
  title: string;
  url: string;
  description: string;
}) {
  return (
    <div ref={refs.list} className={styles.results} aria-hidden="true">
      {/* Resultado em destaque: o meu. */}
      <article ref={refs.card} className={styles.result} data-intro-card>
        {/* O fundo é irmão do conteúdo (não pai): no Flip ele vira o branco do hero enquanto
            o conteúdo some por cima, sem herdar opacidade. */}
        <span className={styles.result__bg} />
        <div ref={refs.content} className={styles.result__content}>
          <span className={styles.result__url}>{url}</span>
          <h2 className={styles.result__title} data-intro-result-title>
            {title}
          </h2>
          <p className={styles.result__desc}>{description}</p>
        </div>
        {/* Onda do clique: cresce do ponto onde o cursor "toca". */}
        <span className={styles.result__ripple} data-intro-ripple />
      </article>

      {/* Resultados genéricos: só linhas em tom apagado, sem texto legível nenhum. */}
      <div ref={refs.others} className={styles.skeletons}>
        {[0, 1, 2].map((i) => (
          <div key={i} className={styles.skeleton} data-intro-skeleton>
            <span className={`${styles.skeleton__line} ${styles['skeleton__line--url']}`} />
            <span className={`${styles.skeleton__line} ${styles['skeleton__line--title']}`} />
            <span className={styles.skeleton__line} />
            <span className={`${styles.skeleton__line} ${styles['skeleton__line--short']}`} />
          </div>
        ))}
      </div>
    </div>
  );
}
