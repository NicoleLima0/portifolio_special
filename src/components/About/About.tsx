'use client';

import { useRef, type CSSProperties } from 'react';
import { gsap, MOTION_OK, ScrollTrigger, useGSAP } from '@/lib/gsap';
import styles from './About.module.scss';

const MANIFESTO =
  'Eu tiro sua ideia do papel e coloco no ar. Sites rápidos, bonitos e feitos pra converter — do rascunho ao lançamento, cuido da parte técnica pra você focar no seu negócio.';

export default function About() {
  const rootRef = useRef<HTMLElement>(null);
  const words = MANIFESTO.split(' ');
  let letterIndex = 0;

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        // Entra por baixo, recortada pela própria seção (máscara), amarrada ao scroll.
        // Começa ANTES da seção chegar na tela (start: 'top 130%'): enquanto o hero ainda está
        // pinado terminando a gota, o texto já está subindo por cima do preto — sem beat vazio
        // esperando a transição fechar 100%.
        gsap.fromTo(
          '[data-about-inner]',
          { yPercent: 35 },
          {
            yPercent: 0,
            ease: 'none',
            scrollTrigger: { trigger: rootRef.current, start: 'top 130%', end: 'top 20%', scrub: true },
          },
        );

        // A onda das letras só existe enquanto a seção está na tela: fora dela seriam
        // ~180 animações CSS gerando recálculo de estilo em todo frame (inclusive no hero).
        ScrollTrigger.create({
          trigger: rootRef.current,
          start: 'top bottom',
          end: 'bottom top',
          toggleClass: { targets: rootRef.current, className: styles['about--waving'] },
        });

        // Palavras acendem amarradas ao scroll (apagado → branco).
        gsap.fromTo(
          '[data-about-word]',
          { color: 'rgba(255, 255, 255, 0.16)' },
          {
            color: '#ffffff',
            ease: 'none',
            stagger: 0.1,
            // Acende junto com a entrada (era 'top 80%'): o texto já chega aceso em vez de
            // aparecer apagado e só acender bem depois.
            scrollTrigger: {
              trigger: '[data-about-text]',
              start: 'top 95%',
              end: 'bottom 60%',
              scrub: true,
            },
          },
        );
      });
    },
    { scope: rootRef },
  );

  return (
    <section ref={rootRef} id="sobre" className={styles.about} aria-labelledby="sobre-title">
      <div className={styles.about__inner} data-about-inner>
        <h2 id="sobre-title" className={styles.about__eyebrow}>
          Sobre
        </h2>
        <p className={styles.about__text} data-about-text>
          <span className="sr-only">{MANIFESTO}</span>
          <span aria-hidden="true">
            {words.map((word, w) => (
              <span key={w} className={styles.about__word} data-about-word>
                {Array.from(word).map((char, c) => (
                  <span
                    key={c}
                    className={styles.about__letter}
                    style={{ '--i': letterIndex++ } as CSSProperties}
                  >
                    {char}
                  </span>
                ))}
                {w < words.length - 1 ? ' ' : null}
              </span>
            ))}
          </span>
        </p>
      </div>
    </section>
  );
}
