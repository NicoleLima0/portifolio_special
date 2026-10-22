'use client';

import type { ReactNode, RefObject } from 'react';
import styles from './IntroOverlay.module.scss';

export type SceneRefs = {
  /** Cena inteira (notebook + cenário): é o que o mergulho escala no fim. */
  stage: RefObject<HTMLDivElement | null>;
  /** O conjunto do notebook. */
  rig: RefObject<HTMLDivElement | null>;
  /** Tampa: a tela da busca vive aqui dentro. */
  lid: RefObject<HTMLDivElement | null>;
  /** Base (teclado + trackpad). */
  base: RefObject<HTMLDivElement | null>;
  /** A tela em si — alvo do Flip na expansão final. */
  screen: RefObject<HTMLDivElement | null>;
  /** Objetos decorativos do fundo (entram com stagger e flutuam). */
  props: RefObject<HTMLDivElement | null>;
};

/**
 * Cena do intro: um notebook em perspectiva sobre um fundo decorado, e a busca inteira
 * acontecendo DENTRO da tela.
 *
 * Tudo é CSS: o notebook são divs com `preserve-3d` e gradientes das variáveis do projeto, e o
 * cenário são formas suaves (blobs desfocados) da mesma paleta — nenhuma imagem externa.
 *
 * A hierarquia existe por causa da dobradiça: `lid` gira em torno da borda INFERIOR, que é
 * exatamente onde a base começa, então a tampa encaixa sem compensar posição.
 */
export default function LaptopScene({
  refs,
  children,
}: {
  refs: SceneRefs;
  children: ReactNode;
}) {
  return (
    <div ref={refs.stage} className={styles.scene} aria-hidden="true">
      {/* --- Cenário: blobs desfocados + partículas, só pintura --- */}
      <div ref={refs.props} className={styles.scene__props}>
        <span className={`${styles.blob} ${styles['blob--violet']}`} data-intro-prop />
        <span className={`${styles.blob} ${styles['blob--cyan']}`} data-intro-prop />
        <span className={`${styles.blob} ${styles['blob--magenta']}`} data-intro-prop />
        {/* Pontinhos de luz: dão escala e profundidade ao ar em volta do notebook. */}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <span key={i} className={`${styles.mote} ${styles[`mote--${i}`]}`} data-intro-mote />
        ))}
      </div>

      {/* Superfície onde o notebook se apoia: elipse borrada, faz as vezes de sombra/mesa. */}
      <span className={styles.scene__surface} />

      {/* --- Notebook --- */}
      <div ref={refs.rig} className={styles.rig}>
        <div ref={refs.lid} className={styles.lid}>
          <div className={styles.lid__shell}>
            <span className={styles.lid__camera} />
            <div ref={refs.screen} className={styles.screen} data-intro-screen>
              {/* A busca inteira roda aqui dentro. */}
              <div className={styles.screen__inner}>{children}</div>
              <span className={styles.screen__glare} data-intro-glare />
            </div>
          </div>
        </div>

        <div ref={refs.base} className={styles.base}>
          <div className={styles.base__deck}>
            <span className={styles.base__keyboard} />
            <span className={styles.base__trackpad} />
          </div>
          <span className={styles.base__lip} />
        </div>
      </div>
    </div>
  );
}
