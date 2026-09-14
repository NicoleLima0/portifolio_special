'use client';

import { useRef, useState, type ReactNode } from 'react';
import { gsap, MOTION_OK, MOTION_REDUCED, useGSAP } from '@/lib/gsap';
import { fx } from '@/components/fx/fxStore';
import { HeroSuspendContext } from './heroSuspend';
import styles from './HeroStage.module.scss';

/** A partir deste progresso a gota já cobriu tudo e o fluido está oculto: o hero para de desenhar. */
const SUSPEND_AT = 0.72;

/**
 * Transição hero (branco) → seções (preto). Camada por cima/depois do hero: não muda nada no
 * hero em repouso. Pin de ~1 viewport com scrub:
 *  0.00–0.30  UI do hero sai
 *  0.04–0.42  tinta branca → preta (as letras seguem iridescentes sobre o preto)
 *  0.34–0.64  gota iridescente cresce da emenda e engole a tela (miolo preto)
 *  0.52–0.66  fluido some por baixo da gota
 *  0.66–0.98  gota encolhe e vira o glow que segue o cursor
 */
export default function HeroStage({ children }: { children: ReactNode }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const veilRef = useRef<HTMLDivElement>(null);
  const [suspended, setSuspended] = useState(false);
  const suspendedRef = useRef(false);

  useGSAP(
    () => {
      const stage = stageRef.current;
      if (!stage) return;
      const setSuspend = (value: boolean) => {
        if (suspendedRef.current === value) return; // só muda de estado 2x por passagem, nunca por frame
        suspendedRef.current = value;
        setSuspended(value);
      };
      const mm = gsap.matchMedia();

      mm.add(MOTION_OK, () => {
        const ui = stage.querySelectorAll('[data-hero-ui]');
        const ink = stage.querySelector<HTMLElement>('[data-hero-layer="ink"]');
        const fluid = stage.querySelector<HTMLElement>('[data-hero-layer="fluid"]');
        const t = fx.transition;
        // brightness via proxy: em repouso o filtro sai do elemento (sem custo de filtro no hero).
        const inkTone = { b: 1 };
        const applyInk = () => {
          if (ink) ink.style.filter = inkTone.b >= 0.999 ? '' : `brightness(${inkTone.b.toFixed(3)})`;
        };

        const tl = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger: stage,
            start: 'top top',
            end: '+=100%',
            pin: true,
            pinSpacing: true,
            scrub: true,
            onUpdate: (self) => {
              setSuspend(self.progress >= SUSPEND_AT);
              fx.glow.enabled = self.progress >= 0.999;
            },
            onLeave: () => {
              fx.glow.enabled = true;
            },
          },
        });

        tl.to(ui, { y: -48, autoAlpha: 0, duration: 0.3 }, 0)
          .to(inkTone, { b: 0, duration: 0.38, onUpdate: applyInk }, 0.04)
          .to(t, { grow: 1, duration: 0.3, ease: 'power2.in' }, 0.34)
          .to(fluid, { autoAlpha: 0, duration: 0.14 }, 0.52)
          .to(t, { shrink: 1, duration: 0.32, ease: 'power3.out' }, 0.66)
          .to({}, { duration: 0.02 });

        return () => {
          t.grow = 0;
          t.shrink = 0;
          fx.glow.enabled = false;
          if (ink) ink.style.filter = '';
          setSuspend(false);
        };
      });

      mm.add(MOTION_REDUCED, () => {
        gsap.to(veilRef.current, {
          opacity: 1,
          ease: 'none',
          scrollTrigger: { trigger: stage, start: 'top top', end: 'bottom top', scrub: true },
        });
      });
    },
    { scope: stageRef },
  );

  return (
    <HeroSuspendContext.Provider value={suspended}>
      <div ref={stageRef} className={styles.stage}>
        {children}
        <div ref={veilRef} className={styles.stage__veil} aria-hidden="true" />
      </div>
    </HeroSuspendContext.Provider>
  );
}
