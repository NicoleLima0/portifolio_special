'use client';

import { useCallback, useEffect, useRef } from 'react';
// MotionPathPlugin não aparece aqui de propósito: o registro é central (src/lib/gsap.ts) e o
// plugin é usado pela sintaxe `motionPath:` no tween, não pelo símbolo.
import { Flip, gsap, ScrollTrigger } from '@/lib/gsap';
import { scrollState } from '@/lib/scroll';
import { openIntroGate } from './introGate';
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
 * Intro "busca → clique → abre o portfólio".
 *
 * Uma timeline única: a barra de busca surge, o nome é digitado, os resultados entram, um cursor
 * percorre a curva até o resultado em destaque, clica, e o card cresce (Flip) até virar a página
 * — emendando no hero real por cross-fade.
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

    // Trava o scroll enquanto o intro roda.
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
      // Foco no h1 do hero (o nome visual vem do canvas).
      const h1 = document.querySelector<HTMLElement>('#hero-title');
      if (h1) {
        h1.setAttribute('tabindex', '-1');
        h1.focus({ preventScroll: true });
      }
      onDone();
    };
    finishRef.current = finish;

    // gsap.context: tudo que for criado aqui dentro é revertido de uma vez no unmount.
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ onComplete: finish });
      tlRef.current = tl;

      // --- Reduced motion: sem digitação nem cursor, só um fade curto. -------------------
      if (mode === 'reduced') {
        gsap.set(stageRef.current, { autoAlpha: 0 });
        tl.to(root, { autoAlpha: 0, duration: REDUCED_FADE, ease: 'power2.out' }, 0.1);
        return;
      }

      // 2ª visita: a mesma encenação, acelerada para caber em ~1 s.
      if (mode === 'short') tl.timeScale(SHORT_TIMESCALE);

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
      if (!bar || !shell || !textEl || !caret || !suggestionsEl || !card || !list) return;

      const items = gsap.utils.toArray<HTMLElement>(suggestionsEl.children);
      const skeletons = gsap.utils.toArray<HTMLElement>('[data-intro-skeleton]', root);
      const placeholder = root.querySelector<HTMLElement>('[data-intro-placeholder]');
      const ripple = root.querySelector<HTMLElement>('[data-intro-ripple]');

      // Estados iniciais. Tudo que vai animar nasce explícito (blur 'none' não interpola).
      gsap.set(list, { autoAlpha: 0 });
      gsap.set(card, { autoAlpha: 0, y: RESULTS.yFrom, filter: `blur(${RESULTS.blurFrom}px)` });
      gsap.set(skeletons, { autoAlpha: 0, y: RESULTS.yFrom, filter: `blur(${RESULTS.blurFrom}px)` });
      gsap.set(items, { autoAlpha: 0, y: SUGGESTIONS.yFrom });
      gsap.set(suggestionsEl, { autoAlpha: 0 });
      gsap.set(bar, { autoAlpha: 0, scale: BAR_IN.scaleFrom, filter: `blur(${BAR_IN.blurFrom}px)` });

      // ---- Fase 1: a barra surge --------------------------------------------------------
      tl.to(bar, {
        autoAlpha: 1,
        scale: 1,
        filter: 'blur(0px)',
        duration: BAR_IN.duration,
        ease: BAR_IN.ease,
      });

      // Cursor de texto piscando durante a digitação (repeat próprio, fora da timeline).
      const caretBlink = gsap.to(caret, {
        autoAlpha: 0,
        duration: TYPING.caret.duration,
        repeat: -1,
        yoyo: true,
        ease: 'steps(1)',
      });

      // ---- Fase 2: digitação letra a letra ----------------------------------------------
      // Ritmo humano: cada letra tem um intervalo próprio (jitter determinístico, sem Math.random
      // para o replay ser sempre igual) e há uma pausa curta depois do nome.
      const chars = Array.from(TYPING.query);
      const base = TYPING.duration / chars.length;
      let typed = '';

      tl.call(() => {
        if (placeholder) gsap.set(placeholder, { autoAlpha: 0 });
      });

      chars.forEach((ch, i) => {
        // Senóide no índice: varia o ritmo de forma reproduzível.
        const wobble = Math.sin(i * 2.7) * TYPING.jitter;
        const step = Math.max(0.012, base * (1 + wobble));
        // Espaço depois de palavra respira um pouco mais, como digitação real.
        const extra = ch === ' ' ? base * 0.4 : 0;
        tl.call(() => {
          typed += ch;
          textEl.textContent = typed;
        }, undefined, `+=${step + extra}`);

        if (i === TYPING.pause.afterChars) tl.to({}, { duration: TYPING.pause.duration });
      });

      // Sugestões entram enquanto ainda digita.
      tl.to(suggestionsEl, { autoAlpha: 1, duration: 0.2, ease: 'power2.out' }, SUGGESTIONS.start)
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
      tl.addLabel('submit')
        .call(() => caretBlink.pause(), undefined, 'submit')
        .to(caret, { autoAlpha: 0, duration: 0.1 }, 'submit')
        // Pulso da barra: 1 → 1,02 → 1.
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
        // Sugestões saem.
        .to(items, {
          autoAlpha: 0,
          y: -6,
          duration: SUBMIT.suggestionsOut.duration,
          stagger: SUBMIT.suggestionsOut.stagger,
          ease: SUBMIT.suggestionsOut.ease,
        }, 'submit')
        .to(suggestionsEl, { autoAlpha: 0, duration: 0.2 }, 'submit+=0.1')
        // A barra sobe para o topo.
        .to(shell, {
          top: isMobile ? '12%' : '14%',
          duration: SUBMIT.rise.duration,
          ease: SUBMIT.rise.ease,
        }, `submit+=${SUBMIT.pulse.duration * 2}`);

      // ---- Fase 4: resultados ------------------------------------------------------------
      tl.addLabel('results')
        .set(list, { autoAlpha: 1 })
        // O card e os skeletons entram juntos, em stagger.
        .to([card, ...skeletons], {
          autoAlpha: 1,
          y: 0,
          filter: 'blur(0px)',
          duration: RESULTS.duration,
          stagger: RESULTS.stagger,
          ease: RESULTS.ease,
        }, 'results');

      // ---- Fase 5: cursor, hover e clique ------------------------------------------------
      tl.addLabel('click', '>-0.1');

      // Ponto do clique: canto superior-esquerdo do card + um offset, para o ripple sair de onde
      // o cursor "toca". Medido na hora (funções), então acompanha qualquer viewport.
      const clickPoint = () => {
        const r = card.getBoundingClientRect();
        return { x: r.left + r.width * 0.3, y: r.top + r.height * 0.42 };
      };

      if (!isMobile && cursor && arrow) {
        // Curva: entra pela direita, faz um arco e desacelera no card.
        // Os pontos são medidos ao montar a timeline: durante o intro o scroll está travado e a
        // viewport não muda, então não há ganho em recalcular a cada play.
        const p = clickPoint();
        const path = [
          { x: window.innerWidth + 60, y: window.innerHeight * 0.72 },
          { x: window.innerWidth * 0.72, y: window.innerHeight * 0.52 },
          { x: p.x + 120, y: p.y + 70 },
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
      tl.addLabel('hover', `click+=${isMobile ? 0 : CURSOR.travel.duration - 0.12}`)
        .call(() => card.setAttribute('data-hovered', 'true'), undefined, 'hover')
        .to(card, {
          y: CURSOR.hover.lift,
          duration: CURSOR.hover.duration,
          ease: CURSOR.hover.ease,
        }, 'hover');

      // O "clique": a seta encolhe e o ripple cresce do ponto tocado.
      tl.addLabel('press', `hover+=${CURSOR.hover.duration}`);

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
          // Posiciona o ripple no ponto do clique, relativo ao card.
          x: () => {
            const r = card.getBoundingClientRect();
            return clickPoint().x - r.left;
          },
          y: () => {
            const r = card.getBoundingClientRect();
            return clickPoint().y - r.top;
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

      // ---- Fase 6: Flip do card até a viewport -------------------------------------------
      tl.addLabel('expand', `press+=${CURSOR.click.duration * 2}`);

      tl.call(
        () => {
          // Estado ANTES: o card onde está. Depois mudamos as classes e o Flip interpola.
          const state = Flip.getState(card, { props: 'borderRadius,backgroundColor' });

          // Estado DEPOIS: o card ocupa a viewport inteira, já com o fundo do hero.
          card.setAttribute('data-expanding', 'true');
          gsap.set(card, {
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100svh',
            y: 0,
            padding: 0,
            borderRadius: 0,
            zIndex: 8,
          });
          // O fundo do card vira o branco do hero durante a expansão.
          const bg = card.querySelector<HTMLElement>(`.${styles.result__bg}`);
          if (bg) {
            gsap.to(bg, {
              backgroundColor: 'var(--white)',
              borderColor: 'transparent',
              backdropFilter: 'blur(0px)',
              duration: EXPAND.duration * 0.7,
              ease: EXPAND.ease,
            });
          }

          Flip.from(state, {
            duration: EXPAND.duration,
            ease: EXPAND.ease,
            absolute: true,
            // O portão abre quando a expansão passa de ~60%: o hero já pinta por baixo.
            onUpdate(this: gsap.core.Tween) {
              if (this.progress() >= EXPAND.gateAt) openIntroGate();
            },
          });
        },
        undefined,
        'expand',
      )
        // O conteúdo do card some em fade durante a expansão.
        .to(content, {
          autoAlpha: 0,
          duration: EXPAND.contentOut.duration,
          ease: EXPAND.contentOut.ease,
        }, 'expand')
        // Barra e demais resultados saem com blur + fade.
        .to([shell, others], {
          autoAlpha: 0,
          filter: `blur(${EXPAND.restOut.blur}px)`,
          duration: EXPAND.restOut.duration,
          ease: EXPAND.restOut.ease,
        }, 'expand')
        // O glow escuro sai junto: no fim só resta o branco do card.
        .to(`.${styles.intro__glow}`, {
          autoAlpha: 0,
          duration: EXPAND.restOut.duration,
          ease: EXPAND.restOut.ease,
        }, 'expand')
        // Garante o portão aberto mesmo se o onUpdate não tiver rodado (timeScale alto).
        .call(openIntroGate, undefined, `expand+=${EXPAND.duration * EXPAND.gateAt}`)
        // Cross-fade: dissolve o overlay por cima do hero já pintado.
        .to(root, {
          autoAlpha: 0,
          duration: EXPAND.crossfade.duration,
          ease: EXPAND.crossfade.ease,
        }, `expand+=${EXPAND.duration - EXPAND.crossfade.duration * 0.35}`);
    }, rootRef);

    return () => {
      // Se desmontar no meio (StrictMode/HMR), não deixa o hero preso nem o scroll travado.
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
        <ResultCard refs={resultRefs} title={title} url={url} description={description} />
        <SearchBar
          refs={searchRefs}
          suggestions={SUGGESTION_LIST}
          placeholder="pesquisar"
        />
        {/* Mobile e reduced motion não têm cursor: o clique é só ripple + Flip. */}
        {mode === 'full' && !isMobile ? <FakeCursor refs={cursorRefs} /> : null}
      </div>

      <button type="button" className={styles.intro__skip} onClick={onSkip}>
        pular
      </button>
    </div>
  );
}
