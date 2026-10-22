'use client';

import { useCallback, useEffect, useRef } from 'react';
// MotionPathPlugin não aparece aqui de propósito: o registro é central (src/lib/gsap.ts) e o
// plugin é usado pela sintaxe `motionPath:` no tween, não pelo símbolo.
import { gsap, ScrollTrigger } from '@/lib/gsap';
import { scrollState } from '@/lib/scroll';
import { openIntroGate } from './introGate';
import LaptopScene, { type SceneRefs } from './LaptopScene';
import SearchBar, { type SearchBarRefs } from './SearchBar';
import ResultCard, { type ResultRefs } from './ResultCard';
import FakeCursor, { type CursorRefs } from './FakeCursor';
import {
  BAR_IN,
  CURSOR,
  EXPAND,
  MOBILE_BP,
  REDUCED_FADE,
  RESULTS,
  SCENE_IN,
  SHORT_TIMESCALE,
  SKIP_FADE,
  SUBMIT,
  SUGGESTIONS,
  TYPING,
} from './introTiming';
import styles from './IntroOverlay.module.scss';

export type IntroMode = 'full' | 'short' | 'reduced';

/** Sugestões do dropdown. Genéricas e verdadeiras — descrevem o que o site realmente é. */
const SUGGESTION_LIST = [
  'nicole lima desenvolvedora de sites',
  'nicole lima dev teresópolis',
  'criação de sites teresópolis',
] as const;

/**
 * Intro: a busca acontece DENTRO da tela de um notebook em cena, e no fim a câmera entra na
 * tela — o resultado clicado vira a página inteira, emendando no hero real.
 */
export default function IntroOverlay({
  mode,
  title,
  url,
  description,
  onDone,
}: {
  mode: IntroMode;
  title: string;
  url: string;
  description: string;
  onDone: () => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const finishRef = useRef<() => void>(() => {});
  const tlRef = useRef<gsap.core.Timeline | null>(null);

  const sceneRefs: SceneRefs = {
    stage: useRef<HTMLDivElement>(null),
    rig: useRef<HTMLDivElement>(null),
    lid: useRef<HTMLDivElement>(null),
    base: useRef<HTMLDivElement>(null),
    screen: useRef<HTMLDivElement>(null),
    props: useRef<HTMLDivElement>(null),
  };
  const searchRefs: SearchBarRefs = {
    shell: useRef<HTMLDivElement>(null),
    bar: useRef<HTMLDivElement>(null),
    text: useRef<HTMLSpanElement>(null),
    caret: useRef<HTMLSpanElement>(null),
    suggestions: useRef<HTMLUListElement>(null),
  };
  const resultRefs: ResultRefs = {
    list: useRef<HTMLDivElement>(null),
    card: useRef<HTMLElement>(null),
    content: useRef<HTMLDivElement>(null),
    others: useRef<HTMLDivElement>(null),
  };
  const cursorRefs: CursorRefs = {
    root: useRef<HTMLDivElement>(null),
    arrow: useRef<HTMLDivElement>(null),
  };

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const isMobile = window.innerWidth < MOBILE_BP;
    const lenis = scrollState.lenis;
    const prevOverflow = document.body.style.overflow;

    lenis?.stop();
    document.body.style.overflow = 'hidden';
    window.scrollTo(0, 0);

    /** Encerramento único: abre o portão, destrava o scroll e tira o overlay do DOM. */
    const finish = () => {
      finishRef.current = () => {};
      openIntroGate();
      document.body.style.overflow = prevOverflow;
      lenis?.start();
      ScrollTrigger.refresh();
      const h1 = document.querySelector<HTMLElement>('#hero-title');
      if (h1) {
        h1.setAttribute('tabindex', '-1');
        h1.focus({ preventScroll: true });
      }
      onDone();
    };
    finishRef.current = finish;

    // gsap.context: tudo criado aqui dentro é revertido de uma vez no unmount.
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ onComplete: finish });
      tlRef.current = tl;

      // --- Reduced motion: sem cena, digitação nem cursor. Só um fade curto. ---
      if (mode === 'reduced') {
        gsap.set(stageRef.current, { autoAlpha: 0 });
        tl.to(root, { autoAlpha: 0, duration: REDUCED_FADE, ease: 'power2.out' }, 0.1);
        return;
      }

      // 2ª visita: a mesma encenação, acelerada para caber em ~1 s.
      if (mode === 'short') tl.timeScale(SHORT_TIMESCALE);

      const scene = sceneRefs.stage.current;
      const rig = sceneRefs.rig.current;
      const lid = sceneRefs.lid.current;
      const base = sceneRefs.base.current;
      const screen = sceneRefs.screen.current;
      const bar = searchRefs.bar.current;
      const shell = searchRefs.shell.current;
      const textEl = searchRefs.text.current;
      const caret = searchRefs.caret.current;
      const suggestionsEl = searchRefs.suggestions.current;
      const card = resultRefs.card.current;
      const list = resultRefs.list.current;
      const others = resultRefs.others.current;
      const content = resultRefs.content.current;
      const cursor = cursorRefs.root.current;
      const arrow = cursorRefs.arrow.current;
      if (!rig || !lid || !screen || !bar || !shell || !textEl || !caret) return;
      if (!suggestionsEl || !card || !list) return;

      const items = gsap.utils.toArray<HTMLElement>(suggestionsEl.children);
      const skeletons = gsap.utils.toArray<HTMLElement>('[data-intro-skeleton]', root);
      const blobs = gsap.utils.toArray<HTMLElement>('[data-intro-prop]', root);
      const motes = gsap.utils.toArray<HTMLElement>('[data-intro-mote]', root);
      const placeholder = root.querySelector<HTMLElement>('[data-intro-placeholder]');
      const ripple = root.querySelector<HTMLElement>('[data-intro-ripple]');
      const glare = root.querySelector<HTMLElement>('[data-intro-glare]');

      // --- Estados iniciais (tudo explícito: 'none' não interpola para blur) --------------
      gsap.set(list, { autoAlpha: 0 });
      gsap.set(card, { autoAlpha: 0, y: RESULTS.yFrom, filter: `blur(${RESULTS.blurFrom}px)` });
      gsap.set(skeletons, { autoAlpha: 0, y: RESULTS.yFrom, filter: `blur(${RESULTS.blurFrom}px)` });
      gsap.set(items, { autoAlpha: 0, y: SUGGESTIONS.yFrom });
      gsap.set(suggestionsEl, { autoAlpha: 0 });
      gsap.set(bar, { autoAlpha: 0, scale: BAR_IN.scaleFrom, filter: `blur(${BAR_IN.blurFrom}px)` });
      gsap.set(rig, { scale: SCENE_IN.rig.scaleFrom, y: SCENE_IN.rig.yFrom, autoAlpha: 0 });
      // A tampa nasce quase fechada e abre até a inclinação de repouso.
      gsap.set(lid, { rotateX: isMobile ? 0 : -42 });

      // ---- Fase 0: a cena entra ---------------------------------------------------------
      tl.to(rig, {
        autoAlpha: 1,
        scale: 1,
        y: 0,
        duration: SCENE_IN.rig.duration,
        ease: SCENE_IN.rig.ease,
      }, 0);

      if (!isMobile) {
        // A tampa "abre" até a inclinação de repouso.
        tl.to(lid, {
          rotateX: SCENE_IN.tiltDeg,
          duration: SCENE_IN.rig.duration,
          ease: SCENE_IN.rig.ease,
        }, 0);
      }

      // Cenário: blobs e partículas aparecem com stagger.
      tl.to(blobs, {
        autoAlpha: 1,
        duration: SCENE_IN.props.duration,
        stagger: SCENE_IN.props.stagger,
        ease: SCENE_IN.props.ease,
      }, 0)
        .to(motes, {
          autoAlpha: 0.9,
          duration: SCENE_IN.props.duration * 0.6,
          stagger: SCENE_IN.props.stagger * 0.5,
          ease: SCENE_IN.props.ease,
        }, 0.2);

      // Respiração do conjunto e das partículas: loops próprios, fora da timeline, para não
      // alongarem a duração total. Vivem dentro do gsap.context, então o revert os mata.
      gsap.to(rig, {
        y: `+=${SCENE_IN.float.amount}`,
        duration: SCENE_IN.float.duration,
        ease: SCENE_IN.float.ease,
        repeat: -1,
        yoyo: true,
        delay: SCENE_IN.rig.duration,
      });
      motes.forEach((m, i) => {
        gsap.to(m, {
          y: i % 2 === 0 ? -18 : 14,
          x: i % 3 === 0 ? 10 : -8,
          duration: 3 + (i % 4) * 0.7,
          ease: 'sine.inOut',
          repeat: -1,
          yoyo: true,
          delay: i * 0.3,
        });
      });

      // ---- Fase 1: a barra surge dentro da tela -----------------------------------------
      tl.to(bar, {
        autoAlpha: 1,
        scale: 1,
        filter: 'blur(0px)',
        duration: BAR_IN.duration,
        ease: BAR_IN.ease,
      }, BAR_IN.start);

      // Cursor de texto piscando durante a digitação.
      const caretBlink = gsap.to(caret, {
        autoAlpha: 0,
        duration: TYPING.caret.duration,
        repeat: -1,
        yoyo: true,
        ease: 'steps(1)',
      });

      // ---- Fase 2: digitação letra a letra ----------------------------------------------
      // Ritmo humano: cada letra tem um intervalo próprio (variação determinística, sem
      // Math.random, para o replay ser sempre igual) e há uma pausa curta depois do nome.
      const chars = Array.from(TYPING.query);
      const charStep = TYPING.duration / chars.length;
      let typed = '';

      tl.addLabel('typing', BAR_IN.start + BAR_IN.duration * 0.7).call(
        () => {
          if (placeholder) gsap.set(placeholder, { autoAlpha: 0 });
        },
        undefined,
        'typing',
      );

      chars.forEach((ch, i) => {
        const wobble = Math.sin(i * 2.7) * TYPING.jitter;
        const step = Math.max(0.02, charStep * (1 + wobble));
        // Espaço depois de palavra respira um pouco mais, como digitação real.
        const extra = ch === ' ' ? charStep * 0.5 : 0;
        tl.call(
          () => {
            typed += ch;
            textEl.textContent = typed;
          },
          undefined,
          `+=${step + extra}`,
        );

        if (i === TYPING.pause.afterChars) tl.to({}, { duration: TYPING.pause.duration });
      });

      // Sugestões entram enquanto ainda digita.
      tl.to(suggestionsEl, { autoAlpha: 1, duration: 0.25, ease: 'power2.out' }, SUGGESTIONS.start)
        .to(
          items,
          {
            autoAlpha: 1,
            y: 0,
            duration: SUGGESTIONS.duration,
            stagger: SUGGESTIONS.stagger,
            ease: SUGGESTIONS.ease,
          },
          SUGGESTIONS.start,
        );

      // ---- Fase 3: "Enter" ---------------------------------------------------------------
      tl.addLabel('submit', `+=${SUBMIT.hold}`)
        .call(() => caretBlink.pause(), undefined, 'submit')
        .to(caret, { autoAlpha: 0, duration: 0.1 }, 'submit')
        .to(bar, {
          scale: SUBMIT.pulse.scale,
          duration: SUBMIT.pulse.duration,
          ease: SUBMIT.pulse.ease,
        }, 'submit')
        .to(bar, {
          scale: 1,
          duration: SUBMIT.pulse.duration,
          ease: SUBMIT.pulse.ease,
        }, `submit+=${SUBMIT.pulse.duration}`)
        .to(items, {
          autoAlpha: 0,
          y: -6,
          duration: SUBMIT.suggestionsOut.duration,
          stagger: SUBMIT.suggestionsOut.stagger,
          ease: SUBMIT.suggestionsOut.ease,
        }, 'submit')
        .to(suggestionsEl, { autoAlpha: 0, duration: 0.25 }, 'submit+=0.12')
        // A barra sobe para o topo DA TELA (unidades do container).
        .to(shell, {
          top: '12cqh',
          duration: SUBMIT.rise.duration,
          ease: SUBMIT.rise.ease,
        }, `submit+=${SUBMIT.pulse.duration * 2}`);

      // ---- Fase 4: resultados ------------------------------------------------------------
      tl.addLabel('results')
        .set(list, { autoAlpha: 1 })
        .to([card, ...skeletons], {
          autoAlpha: 1,
          y: 0,
          filter: 'blur(0px)',
          duration: RESULTS.duration,
          stagger: RESULTS.stagger,
          ease: RESULTS.ease,
        }, 'results');

      // ---- Fase 5: cursor, hover e clique ------------------------------------------------
      tl.addLabel('click', `+=${RESULTS.hold}`);

      // Ponto do clique, em coordenadas DA TELA (o cursor é filho dela).
      const clickPoint = () => {
        const s = screen.getBoundingClientRect();
        const r = card.getBoundingClientRect();
        return {
          x: r.left - s.left + r.width * 0.3,
          y: r.top - s.top + r.height * 0.42,
        };
      };

      if (!isMobile && cursor && arrow) {
        // Curva: entra pela direita da tela, arqueia e desacelera no card.
        const p = clickPoint();
        const sr = screen.getBoundingClientRect();
        const path = [
          { x: sr.width + 40, y: sr.height * 0.82 },
          { x: sr.width * 0.74, y: sr.height * 0.62 },
          { x: p.x + sr.width * 0.16, y: p.y + sr.height * 0.12 },
          { x: p.x, y: p.y },
        ];

        tl.set(cursor, { autoAlpha: 1, xPercent: -10, yPercent: -10 }, 'click')
          .to(cursor, {
            motionPath: { path, curviness: 1.3 },
            duration: CURSOR.travel.duration,
            ease: CURSOR.travel.ease,
          }, 'click');
      }

      // Hover do card: leve elevação + underline (via data-attr, não :hover).
      tl.addLabel('hover', `click+=${isMobile ? 0 : CURSOR.travel.duration - 0.15}`)
        .call(() => card.setAttribute('data-hovered', 'true'), undefined, 'hover')
        .to(card, {
          y: CURSOR.hover.lift,
          duration: CURSOR.hover.duration,
          ease: CURSOR.hover.ease,
        }, 'hover');

      // O "clique": a seta encolhe e o ripple cresce do ponto tocado.
      tl.addLabel('press', `hover+=${CURSOR.hover.duration + CURSOR.dwell}`);

      if (!isMobile && arrow) {
        tl.to(arrow, {
          scale: CURSOR.click.scale,
          duration: CURSOR.click.duration,
          ease: CURSOR.click.ease,
        }, 'press')
          .to(arrow, {
            scale: 1,
            duration: CURSOR.click.duration,
            ease: CURSOR.click.ease,
          }, `press+=${CURSOR.click.duration}`);
      }

      if (ripple) {
        tl.set(ripple, {
          x: () => {
            const r = card.getBoundingClientRect();
            const s = screen.getBoundingClientRect();
            return clickPoint().x - (r.left - s.left);
          },
          y: () => {
            const r = card.getBoundingClientRect();
            const s = screen.getBoundingClientRect();
            return clickPoint().y - (r.top - s.top);
          },
          scale: 0,
          autoAlpha: 1,
        }, 'press')
          .to(ripple, {
            scale: CURSOR.ripple.scale,
            autoAlpha: 0,
            duration: CURSOR.ripple.duration,
            ease: CURSOR.ripple.ease,
          }, 'press');
      }

      if (!isMobile && cursor) {
        tl.to(cursor, {
          autoAlpha: 0,
          duration: CURSOR.out.duration,
          ease: CURSOR.out.ease,
        }, `press+=${CURSOR.click.duration * 2}`);
      }

      // ---- Fase 6: a câmera entra na tela, e o card vira página --------------------------
      tl.addLabel('dive', `press+=${CURSOR.click.duration * 2}`);

      // A tampa volta a ficar de frente e a base sai: no fim a tela é um retângulo plano.
      if (!isMobile) {
        tl.to(lid, {
          rotateX: 0,
          duration: EXPAND.dive.duration * 0.6,
          ease: EXPAND.dive.ease,
        }, 'dive')
          .to(base, {
            autoAlpha: 0,
            duration: EXPAND.dive.duration * 0.45,
            ease: 'power2.in',
          }, 'dive');
      }

      // O mergulho: o conjunto cresce até a TELA cobrir a viewport.
      tl.to(rig, {
        scale: () => {
          const sr = screen.getBoundingClientRect();
          if (!sr.width || !sr.height) return 6;
          const current = (gsap.getProperty(rig, 'scale') as number) || 1;
          const cover = Math.max(window.innerWidth / sr.width, window.innerHeight / sr.height);
          return current * cover * 1.06;
        },
        duration: EXPAND.dive.duration,
        ease: EXPAND.dive.ease,
      }, 'dive')
        // O cenário e o reflexo saem: no fim só resta a tela.
        .to([sceneRefs.props.current, glare], {
          autoAlpha: 0,
          duration: EXPAND.restOut.duration,
          ease: EXPAND.restOut.ease,
        }, 'dive')
        .to(`.${styles.scene__surface}`, {
          autoAlpha: 0,
          duration: EXPAND.restOut.duration,
          ease: EXPAND.restOut.ease,
        }, 'dive');

      // --- Flip: o card cresce até cobrir tudo, já com o branco do hero ---
      tl.addLabel('expand', `dive+=${EXPAND.dive.duration * 0.55}`);

      // O card cresce DENTRO da tela ate cobri-la por inteiro, ja com o branco do hero.
      //
      // Por que nao Flip aqui: `.screen` tem `overflow: hidden` e `container-type: size`, e os
      // dois recortam/contem um filho `position: fixed` — o card ficaria preso dentro da tela.
      // Quem leva a tela ate a viewport e o mergulho (fase anterior); este tween so precisa
      // fazer o card encher a tela, e o resultado visual e o mesmo.
      const bg = card.querySelector<HTMLElement>(`.${styles.result__bg}`);

      tl.to(card, {
        // Em unidades do container: cobre a tela inteira a partir de onde o card esta.
        top: 0,
        left: 0,
        x: () => {
          const sr = screen.getBoundingClientRect();
          const cr = card.getBoundingClientRect();
          return sr.left - cr.left;
        },
        y: () => {
          const sr = screen.getBoundingClientRect();
          const cr = card.getBoundingClientRect();
          return sr.top - cr.top;
        },
        width: () => screen.getBoundingClientRect().width,
        height: () => screen.getBoundingClientRect().height,
        padding: 0,
        borderRadius: 0,
        duration: EXPAND.duration,
        ease: EXPAND.ease,
        // O portao abre quando a expansao passa de ~60%: o hero ja pinta por baixo.
        onUpdate(this: gsap.core.Tween) {
          if (this.progress() >= EXPAND.gateAt) openIntroGate();
        },
      }, 'expand');

      // O fundo do card vira o branco do hero durante a expansao.
      if (bg) {
        tl.to(bg, {
          backgroundColor: 'var(--white)',
          borderColor: 'transparent',
          backdropFilter: 'blur(0px)',
          borderRadius: 0,
          duration: EXPAND.duration * 0.7,
          ease: EXPAND.ease,
        }, 'expand');
      }

      tl.to(content, {
        autoAlpha: 0,
        duration: EXPAND.contentOut.duration,
        ease: EXPAND.contentOut.ease,
      }, 'expand')
        .to([shell, others], {
          autoAlpha: 0,
          filter: `blur(${EXPAND.restOut.blur}px)`,
          duration: EXPAND.restOut.duration,
          ease: EXPAND.restOut.ease,
        }, 'expand')
        .to(`.${styles.intro__glow}`, {
          autoAlpha: 0,
          duration: EXPAND.restOut.duration,
          ease: EXPAND.restOut.ease,
        }, 'expand')
        // Garante o portao aberto mesmo se o onUpdate nao rodar (timeScale alto).
        .call(openIntroGate, undefined, `expand+=${EXPAND.duration * EXPAND.gateAt}`)
        // Cross-fade: dissolve o overlay por cima do hero ja pintado.
        .to(root, {
          autoAlpha: 0,
          duration: EXPAND.crossfade.duration,
          ease: EXPAND.crossfade.ease,
        }, `expand+=${EXPAND.duration - EXPAND.crossfade.duration * 0.35}`);

      // `scene` só existe para o revert do context alcançar a cena inteira.
      void scene;
    }, rootRef);

    return () => {
      ctx.revert();
      tlRef.current = null;
      openIntroGate();
      document.body.style.overflow = prevOverflow;
      lenis?.start();
    };
    // `mode` é fixado antes de montar: o overlay nunca troca de encenação em voo.
  }, [mode, onDone]);

  /**
   * "Pular": abre o portão JÁ (o hero pinta por baixo) e dissolve o overlay em 0,3 s, então o
   * finish. Sem corte seco e sem quebrar o estado do hero.
   */
  const onSkip = useCallback(() => {
    tlRef.current?.pause();
    openIntroGate();
    const root = rootRef.current;
    if (!root) return finishRef.current();
    gsap.to(root, {
      autoAlpha: 0,
      duration: SKIP_FADE,
      ease: 'power2.out',
      onComplete: () => finishRef.current(),
    });
  }, []);

  // Esc também pula.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onSkip();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onSkip]);

  const isMobile = typeof window !== 'undefined' && window.innerWidth < MOBILE_BP;

  return (
    // role="presentation" (não aria-hidden no overlay): o conteúdo é decorativo e já está com
    // aria-hidden item a item, mas o botão "pular" precisa continuar alcançável por teclado.
    <div ref={rootRef} className={styles.intro} role="presentation">
      <span className={styles.intro__glow} aria-hidden="true" />

      <div ref={stageRef} className={styles.intro__stage}>
        {/* A busca inteira acontece DENTRO da tela do notebook. */}
        <LaptopScene refs={sceneRefs}>
          <ResultCard refs={resultRefs} title={title} url={url} description={description} />
          <SearchBar refs={searchRefs} suggestions={SUGGESTION_LIST} placeholder="pesquisar" />
          {/* Mobile e reduced motion não têm cursor: o clique é só ripple + Flip. */}
          {mode === 'full' && !isMobile ? <FakeCursor refs={cursorRefs} /> : null}
        </LaptopScene>
      </div>

      <button type="button" className={styles.intro__skip} onClick={onSkip}>
        pular
      </button>
    </div>
  );
}
