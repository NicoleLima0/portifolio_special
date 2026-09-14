'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { gsap, MOTION_OK, ScrollTrigger, useGSAP } from '@/lib/gsap';
import { scrollVelocity } from '@/lib/scroll';
import { fx, preloadFx } from '@/components/fx/fxStore';
import { WORKS } from '@/lib/works';
import styles from './Works.module.scss';

const HOVER = '(hover: hover) and (pointer: fine)';

export default function Works() {
  const rootRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLOListElement>(null);

  // Texturas do thumbnail flutuante só quando a seção se aproxima (e só em dispositivos com hover).
  useEffect(() => {
    const root = rootRef.current;
    if (!root || !window.matchMedia(HOVER).matches) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        preloadFx(WORKS.map((w) => w.cover));
        io.disconnect();
      },
      { rootMargin: '900px 0px' },
    );
    io.observe(root);
    return () => io.disconnect();
  }, []);

  useGSAP(
    () => {
      const root = rootRef.current;
      const list = listRef.current;
      if (!root || !list) return;
      const mm = gsap.matchMedia();

      mm.add(MOTION_OK, () => {
        // Entradas com máscara (nunca só opacity).
        gsap.from('[data-reveal]', {
          yPercent: 115,
          duration: 1.1,
          ease: 'expo.out',
          stagger: 0.08,
          scrollTrigger: { trigger: root, start: 'top 75%', once: true },
        });
        gsap.utils.toArray<HTMLElement>('[data-work-reveal]').forEach((el) => {
          gsap.from(el, {
            yPercent: 115,
            duration: 1.1,
            ease: 'expo.out',
            scrollTrigger: { trigger: el, start: 'top 94%', once: true },
          });
        });
      });

      mm.add(`${MOTION_OK} and ${HOVER}`, () => {
        // Skew pela velocidade do scroll; o ticker só roda com a seção na tela.
        const setSkew = gsap.quickSetter(list, 'skewY', 'deg') as (value: number) => void;
        let skew = 0;
        let applied = 0;
        const tick = () => {
          const target = gsap.utils.clamp(-4, 4, -scrollVelocity() * 0.1);
          skew += (target - skew) * 0.14;
          if (Math.abs(skew) < 0.004 && Math.abs(target) < 0.004) skew = 0;
          if (skew !== applied) {
            setSkew(skew);
            applied = skew;
          }
        };
        ScrollTrigger.create({
          trigger: root,
          start: 'top bottom',
          end: 'bottom top',
          onToggle: (self) => {
            if (self.isActive) {
              gsap.ticker.add(tick);
            } else {
              gsap.ticker.remove(tick);
              skew = applied = 0;
              setSkew(0);
              fx.thumb.active = false;
            }
          },
        });
        return () => {
          gsap.ticker.remove(tick);
          fx.thumb.active = false;
        };
      });
    },
    { scope: rootRef },
  );

  const show = (index: number) => {
    if (!window.matchMedia(HOVER).matches) return;
    fx.thumb.src = WORKS[index].cover;
    fx.thumb.active = true;
  };
  const hide = () => {
    fx.thumb.active = false;
  };

  return (
    <section ref={rootRef} id="trabalhos" className={styles.works} aria-labelledby="trabalhos-title">
      <header className={styles.works__head}>
        <p className={styles.works__eyebrow}>Trabalhos selecionados</p>
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

      <ol ref={listRef} className={styles.works__list} onPointerLeave={hide}>
        {WORKS.map((work, i) => (
          <li key={work.slug} className={styles.work}>
            <Link
              href={`/trabalhos/${work.slug}`}
              className={styles.work__link}
              onPointerEnter={() => show(i)}
            >
              <span className={styles.work__media}>
                <Image
                  src={work.cover}
                  alt=""
                  fill
                  sizes="(min-width: 768px) 40vw, 100vw"
                  className={styles.work__img}
                />
              </span>
              <span className={styles.work__index}>{String(i + 1).padStart(2, '0')}</span>
              <span className={styles.work__mask}>
                <span className={styles.work__title} data-work-reveal>
                  {work.title}
                </span>
              </span>
              <span className={styles.work__tag}>{work.tag}</span>
              <span className={styles.work__year}>{work.year}</span>
              <span className={styles.work__arrow} aria-hidden="true">
                ↗
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
