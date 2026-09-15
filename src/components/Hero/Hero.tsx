'use client';

import { useCallback, useEffect, useRef } from 'react';
import { gsap, MOTION_OK, MOTION_REDUCED, useGSAP } from '@/lib/gsap';
import { usePointer } from '@/hooks/usePointer';
import { useInView } from '@/hooks/useInView';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import FluidCanvas from './FluidCanvas';
import InkCanvas, { HERO_WORD, type IntroLetter } from './InkCanvas';
import { createCoverage, useHeroLoop, type Coverage } from './heroFrame';
import { useHeroSuspended } from '@/components/HeroStage/heroSuspend';
import { useIntroGate } from '@/components/Intro/introGate';
import styles from './Hero.module.scss';

export default function Hero() {
  const rootRef = useRef<HTMLElement>(null);
  const pointer = usePointer(rootRef);
  const inView = useInView(rootRef);
  const reducedMotion = useReducedMotion();
  const suspended = useHeroSuspended(); // transição já cobriu o hero de preto
  const introDone = useIntroGate(); // intro ainda cobrindo a tela: não desenhar por baixo
  const running = inView && !reducedMotion && !suspended && introDone;

  // Um só loop para as duas camadas; parado fora da viewport, com reduced motion e sob a transição.
  const loop = useHeroLoop(running);
  const coverageRef = useRef<Coverage | null>(null);
  if (!coverageRef.current) coverageRef.current = createCoverage();
  const coverage = coverageRef.current;

  // Entrada do nome: o GSAP anima estes valores e o canvas de tinta desenha cada letra.
  const letters = useRef<IntroLetter[]>(Array.from(HERO_WORD, () => ({ p: 0 })));
  const introRef = useRef<ReturnType<typeof gsap.timeline> | null>(null);
  const nameReadyRef = useRef(false);

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root) return;
      const mm = gsap.matchMedia();

      mm.add({ motion: MOTION_OK, reduced: MOTION_REDUCED }, (context) => {
        const { motion } = context.conditions as { motion: boolean };

        if (!motion) {
          letters.current.forEach((l) => (l.p = 1));
          root.removeAttribute('data-intro');
          return;
        }

        // Nome sobe letra por letra; logo depois, todos os textos sobem de dentro das máscaras.
        // A timeline só toca quando a fonte do nome carregou (onNameReady).
        const intro = gsap.timeline({ paused: true });
        intro
          .to(letters.current, { p: 1, duration: 1.5, ease: 'expo.out', stagger: 0.075 }, 0)
          .fromTo(
            '[data-hero-intro]',
            { y: 0, yPercent: 130 }, // > 100% para sair também da folga da máscara
            { yPercent: 0, duration: 1.2, ease: 'expo.out', stagger: 0.06 },
            0.35,
          );
        // O fromTo já aplicou o estado inicial inline: o CSS de "pendente" pode sair.
        root.removeAttribute('data-intro');
        introRef.current = intro;
        if (nameReadyRef.current && introDoneRef.current) intro.play();
        // (A saída da UI no scroll agora faz parte da transição, em HeroStage.)

        return () => {
          introRef.current = null;
        };
      });
    },
    { scope: rootRef },
  );

  // A entrada do nome só toca com a fonte carregada E o intro fora do caminho (em qualquer ordem).
  // Sem intro na página o portão já nasce aberto, então isto é o comportamento de sempre.
  const introDoneRef = useRef(introDone);
  introDoneRef.current = introDone;

  const playName = useCallback(() => {
    if (nameReadyRef.current && introDoneRef.current) introRef.current?.play();
  }, []);

  const onNameReady = useCallback(() => {
    nameReadyRef.current = true;
    playName();
  }, [playName]);

  // Reavalia quando o portão abre (a fonte normalmente já carregou atrás do overlay).
  useEffect(playName, [introDone, playName]);

  return (
    <section
      ref={rootRef}
      className={styles.hero}
      id="inicio"
      aria-labelledby="hero-title"
      data-intro="pending"
      data-hero-root
    >
      <noscript>
        <style>{'[data-hero-intro]{transform:none!important}'}</style>
      </noscript>

      <h1 id="hero-title" className="sr-only">
        Nicole — desenvolvedora
      </h1>

      <FluidCanvas pointer={pointer} coverage={coverage} loop={loop} reducedMotion={reducedMotion} />
      <InkCanvas
        pointer={pointer}
        letters={letters}
        coverage={coverage}
        loop={loop}
        running={running}
        onReady={onNameReady}
      />

      <div className={styles.hero__ui}>
        <div className={styles.hero__top}>
          <div className={styles.hero__intro} data-hero-ui>
            <p className={styles.hero__tagline}>
              <span className={`${styles.hero__mask} ${styles['hero__mask--line']}`}>
                <span className={styles.hero__rise} data-hero-intro>
                  Não é só código, é resultado.
                </span>
              </span>
              <span className={`${styles.hero__mask} ${styles['hero__mask--line']}`}>
                <span className={styles.hero__rise} data-hero-intro>
                  Sites e produtos que vendem.
                </span>
              </span>
            </p>
            <span className={`${styles.hero__mask} ${styles['hero__mask--pill']}`}>
              <a className={styles.hero__cta} href="#contato" data-hero-intro>
                agende uma conversa
                <span className={styles['hero__cta-arrow']} aria-hidden="true">
                  →
                </span>
              </a>
            </span>
          </div>

          <nav className={styles.hero__nav} aria-label="Principal" data-hero-ui>
            <span className={styles.hero__mask}>
              <a className={`${styles['hero__nav-link']} ${styles.hero__rise}`} href="#trabalhos" data-hero-intro>
                Trabalhos
              </a>
            </span>
            <span className={styles.hero__mask}>
              <a className={`${styles['hero__nav-link']} ${styles.hero__rise}`} href="#contato" data-hero-intro>
                Contato
              </a>
            </span>
          </nav>
        </div>

        <div className={styles.hero__bottom} data-hero-ui>
          <span className={styles.hero__mask}>
            <span className={styles.hero__rise} data-hero-intro>
              desenvolvedora · freelancer
            </span>
          </span>
          <span className={styles.hero__mask}>
            <a className={styles.hero__scroll} href="#sobre" aria-label="Role para ver mais" data-hero-intro>
              <span>
                role<span className={styles['hero__scroll-extra']}> para ver mais</span>
              </span>
              <span className={styles['hero__scroll-arrow']} aria-hidden="true">
                ↓
              </span>
            </a>
          </span>
        </div>
      </div>
    </section>
  );
}
