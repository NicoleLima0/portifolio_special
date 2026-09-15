'use client';

import { useRef, ViewTransition } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { gsap, MOTION_OK, ScrollTrigger, useGSAP } from '@/lib/gsap';
import { scrollVelocity } from '@/lib/scroll';
import { WORKS } from '@/lib/works';
import styles from './Works.module.scss';

const HOVER = '(hover: hover) and (pointer: fine)';
const DESKTOP = '(min-width: 768px)';

// Deslocamento do parallax por coluna (px no fim do curso). Colunas vizinhas andam em
// velocidades diferentes — é o que dá o ritmo "vivo" da referência.
// Mantido menor que a folga acima da figura (margin-top no SCSS): assim o curso inteiro
// acontece dentro do espaço já reservado e a imagem nunca cobre a headline.
const DRIFT = [-28, 28];

export default function Works() {
  const rootRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root) return;
      const mm = gsap.matchMedia();

      // --- Entradas com máscara: a imagem "abre", nunca só opacity ---
      mm.add(MOTION_OK, () => {
        gsap.from('[data-reveal]', {
          yPercent: 115,
          duration: 1.1,
          ease: 'expo.out',
          stagger: 0.08,
          scrollTrigger: { trigger: root, start: 'top 75%', once: true },
        });

        gsap.utils.toArray<HTMLElement>('[data-work-reveal]').forEach((el) => {
          gsap.from(el, {
            yPercent: 112,
            duration: 1.1,
            ease: 'expo.out',
            scrollTrigger: { trigger: el, start: 'top 92%', once: true },
          });
        });

        // A máscara da imagem abre de baixo para cima (clip-path, só composição).
        gsap.utils.toArray<HTMLElement>('[data-work-media]').forEach((el) => {
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

      // --- Parallax + skew: só no desktop, só com movimento permitido ---
      mm.add(`${MOTION_OK} and ${DESKTOP}`, () => {
        // Parallax por coluna: transform puro, amarrado ao ScrollTrigger (sem rAF próprio,
        // sem getBoundingClientRect no loop).
        gsap.utils.toArray<HTMLElement>('[data-work-figure]').forEach((el, i) => {
          gsap.fromTo(
            el,
            { y: -DRIFT[i % DRIFT.length] },
            {
              y: DRIFT[i % DRIFT.length],
              ease: 'none',
              scrollTrigger: {
                trigger: el.closest('[data-work]') as HTMLElement,
                start: 'top bottom',
                end: 'bottom top',
                scrub: true,
              },
            },
          );
        });

        // Skew pela velocidade do scroll, sutil, voltando ao parar. Um único ticker para a
        // seção inteira, ligado só enquanto ela está na viewport.
        const figures = gsap.utils.toArray<HTMLElement>('[data-work-figure]');
        const setters = figures.map((el) => gsap.quickSetter(el, 'skewY', 'deg') as (v: number) => void);
        let skew = 0;
        let applied = 0;
        const tick = () => {
          const target = gsap.utils.clamp(-3, 3, -scrollVelocity() * 0.06);
          skew += (target - skew) * 0.14;
          if (Math.abs(skew) < 0.004 && Math.abs(target) < 0.004) skew = 0;
          if (skew !== applied) {
            setters.forEach((set) => set(skew));
            applied = skew;
          }
        };
        const st = ScrollTrigger.create({
          trigger: root,
          start: 'top bottom',
          end: 'bottom top',
          onToggle: (self) => {
            if (self.isActive) {
              gsap.ticker.add(tick);
            } else {
              gsap.ticker.remove(tick);
              skew = applied = 0;
              setters.forEach((set) => set(0));
            }
          },
        });
        return () => {
          gsap.ticker.remove(tick);
          st.kill();
          setters.forEach((set) => set(0));
        };
      });
    },
    { scope: rootRef },
  );

  // Tilt 3D + parallax interno da imagem seguindo o cursor. Só escreve custom properties
  // (transform puro no CSS); nenhum layout é lido no handler.
  const tilt = (event: React.PointerEvent<HTMLElement>) => {
    if (!window.matchMedia(HOVER).matches) return;
    const el = event.currentTarget;
    const rect = el.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;
    el.style.setProperty('--mx', px.toFixed(3));
    el.style.setProperty('--my', py.toFixed(3));
  };
  const resetTilt = (event: React.PointerEvent<HTMLElement>) => {
    event.currentTarget.style.setProperty('--mx', '0');
    event.currentTarget.style.setProperty('--my', '0');
  };

  return (
    <section ref={rootRef} id="trabalhos" className={styles.works} aria-labelledby="trabalhos-title">
      <header className={styles.works__head}>
        <p className={styles.works__eyebrow}>N’ Projetos</p>
        <h2 id="trabalhos-title" className={styles.works__title}>
          <span className={styles.works__mask}>
            <span className={styles.works__reveal} data-reveal>
              Projetos
            </span>
          </span>{' '}
          <span className={styles.works__mask}>
            <span className={styles.works__reveal} data-reveal>
              no ar
            </span>
          </span>
        </h2>
        <p className={styles.works__count} aria-hidden="true">
          ({String(WORKS.length).padStart(2, '0')})
        </p>
      </header>

      <div className={styles.works__body}>
        <aside className={styles.works__aside}>
          <p className={styles.works__quote}>
            <span className={styles.works__mask}>
              <span className={styles.works__reveal} data-reveal>
                Sites que informam
              </span>
            </span>{' '}
            <span className={styles.works__mask}>
              <span className={styles.works__reveal} data-reveal>
                são bons.
              </span>
            </span>{' '}
            <em className={styles['works__quote-em']}>
              <span className={styles.works__mask}>
                <span className={styles.works__reveal} data-reveal>
                  Os que surpreendem,
                </span>
              </span>{' '}
              <span className={styles.works__mask}>
                <span className={styles.works__reveal} data-reveal>
                  convertem.
                </span>
              </span>
            </em>
          </p>
        </aside>

        <ol className={styles.works__grid}>
          {WORKS.map((work, i) => (
            <li key={work.slug} className={styles.work} data-work>
              <Link
                href={`/trabalhos/${work.slug}`}
                className={styles.work__link}
                transitionTypes={['nav-forward']}
                onPointerMove={tilt}
                onPointerLeave={resetTilt}
              >
                <span className={styles.work__meta}>
                  <span className={styles.work__label}>{work.eyebrow}</span>
                  <span className={styles.work__year}>{work.year}</span>
                </span>

                <span className={styles.work__mask}>
                  <span className={styles.work__headline} data-work-reveal>
                    {work.headline}
                  </span>
                </span>

                <span className={styles.work__figure} data-work-figure>
                  {/* Mesmo `name` da capa do case: ao clicar, esta imagem cresce e vira a capa. */}
                  <ViewTransition name={`work-${work.slug}`} share="morph" default="none">
                    <span className={styles.work__media} data-work-media>
                      <Image
                        src={work.cover}
                        alt={work.alt}
                        fill
                        sizes="(min-width: 1024px) 44vw, (min-width: 768px) 46vw, 92vw"
                        className={styles.work__img}
                        loading={i < 2 ? 'eager' : 'lazy'}
                      />
                    </span>
                  </ViewTransition>
                  <span className={styles.work__cta} aria-hidden="true">
                    ver projeto ↗
                  </span>
                </span>

                <span className={styles.work__foot}>
                  <span className={styles.work__title}>{work.title}</span>
                  <span className={styles.work__tag}>{work.tag}</span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
