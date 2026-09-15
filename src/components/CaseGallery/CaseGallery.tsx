'use client';

import { useRef, type CSSProperties } from 'react';
import Image from 'next/image';
import { gsap, MOTION_OK, useGSAP } from '@/lib/gsap';
import type { GalleryShot } from '@/lib/works';
import styles from './CaseGallery.module.scss';

const DESKTOP = '(min-width: 768px)';

// Deslocamento do parallax no fim do curso (px). Menor que o do showcase da home: aqui as
// imagens são maiores e um curso longo faria a figura brigar com a legenda.
const DRIFT = 22;

type Props = {
  shots: GalleryShot[];
  /** título do case, usado para a legenda acessível das imagens */
  title: string;
};

/** Galeria do case: reveal por máscara + parallax leve, ambos só com transform. */
export default function CaseGallery({ shots, title }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root) return;
      const mm = gsap.matchMedia();

      // Reveal: a máscara da imagem abre de baixo para cima (clip-path = só composição).
      mm.add(MOTION_OK, () => {
        gsap.utils.toArray<HTMLElement>('[data-shot-media]').forEach((el) => {
          gsap.fromTo(
            el,
            { clipPath: 'inset(100% 0% 0% 0% round 0.9rem)' },
            {
              clipPath: 'inset(0% 0% 0% 0% round 0.9rem)',
              duration: 1.25,
              ease: 'expo.out',
              scrollTrigger: { trigger: el, start: 'top 90%', once: true },
            },
          );
        });
      });

      // Parallax: só desktop e só com movimento permitido. No celular a imagem fica parada —
      // o curso não cabe sem empurrar a legenda.
      mm.add(`${MOTION_OK} and ${DESKTOP}`, () => {
        gsap.utils.toArray<HTMLElement>('[data-shot-figure]').forEach((el, i) => {
          // Colunas vizinhas andam em sentidos opostos: mesmo ritmo do showcase da home.
          const drift = i % 2 === 0 ? -DRIFT : DRIFT;
          gsap.fromTo(
            el,
            { y: -drift },
            {
              y: drift,
              ease: 'none',
              scrollTrigger: {
                trigger: el,
                start: 'top bottom',
                end: 'bottom top',
                scrub: true,
              },
            },
          );
        });
      });
    },
    { scope: rootRef },
  );

  return (
    <div ref={rootRef} className={styles.gallery}>
      {shots.map((shot, i) => (
        <div
          key={`${shot.src}-${i}`}
          className={`${styles.gallery__item} ${shot.span === 'half' ? styles['gallery__item--half'] : ''}`}
        >
          <figure className={styles.gallery__figure} data-shot-figure>
            <div
              className={styles.gallery__media}
              style={{ '--ratio': shot.ratio } as CSSProperties}
              data-shot-media
            >
              <Image
                src={shot.src}
                alt={shot.alt}
                fill
                // `half` ocupa ~metade da grade no desktop; `full`, a largura do container.
                sizes={
                  shot.span === 'half'
                    ? '(min-width: 1440px) 660px, (min-width: 768px) 46vw, 92vw'
                    : '(min-width: 1440px) 1360px, 92vw'
                }
                className={styles.gallery__img}
                loading="lazy"
              />
            </div>
            <figcaption className={styles.gallery__caption}>
              <span className="sr-only">{title} — </span>
              {shot.alt}
            </figcaption>
          </figure>
        </div>
      ))}
    </div>
  );
}
