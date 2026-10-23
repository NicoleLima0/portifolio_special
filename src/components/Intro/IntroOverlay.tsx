'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import type * as THREE from 'three';
import { site } from '@/lib/site';
import type { ScreenState } from './three/screenTexture';
import { gsap, ScrollTrigger } from '@/lib/gsap';
import { scrollState } from '@/lib/scroll';
import { openIntroGate } from './introGate';
import { SCENE } from './introTiming';
import {
  BACKDROP,
  HANDOFF,
  LOADING,
  MOBILE_BP,
  REDUCED_FADE,
  SHORT_TIMESCALE,
  LAYERS,
  SKIP_FADE,
} from './introTiming';
import styles from './IntroOverlay.module.scss';

export type IntroMode = 'full' | 'short' | 'reduced';

/** Instante em que o mergulho termina — é onde o whiteout fecha. */
const SCENE_DIVE_END = SCENE.dive.start + SCENE.dive.duration;

/**
 * Em dev, diz POR QUE a intro foi pulada. Sem isso ela some para o hero em silêncio e não há
 * como saber se faltou WebGL, se a textura falhou ou se o timeout venceu.
 */
function devLog(reason: string, detail?: unknown): void {
  if (process.env.NODE_ENV === 'production') return;
  console.warn(`[intro] ${reason}`, detail ?? '');
}

/**
 * Modo de captura (SÓ EM DEV): `?seek=<segundos>` monta a cena, pausa o master naquele
 * instante, renderiza um frame e NÃO encerra a intro. É o que permite ao
 * scripts/intro-frames.mjs tirar um retrato determinístico de qualquer momento da timeline,
 * sem depender da velocidade da captura.
 */
function seekTime(): number | null {
  if (process.env.NODE_ENV === 'production') return null;
  if (typeof window === 'undefined') return null;
  const raw = new URLSearchParams(window.location.search).get('seek');
  if (raw === null) return null;
  const t = Number(raw);
  return Number.isFinite(t) && t >= 0 ? t : null;
}

/** Diz no console QUEM encerrou a intro, quando e com qual stack. */
function traceFinish(who: string): void {
  if (process.env.NODE_ENV === 'production') return;
  const stack = (new Error().stack ?? '')
    .split('\n')
    .slice(2, 5)
    .map((l) => l.trim())
    .join(' <- ');
  console.warn(`[intro:finish] ${who} @ ${performance.now().toFixed(0)}ms :: ${stack}`);
}

/**
 * A cena 3D entra por `next/dynamic` com `ssr: false`: o three/R3F só é baixado por quem vai
 * mesmo ver o intro (primeira visita, sem reduced motion), e nunca no servidor.
 */
const LaptopScene = dynamic(() => import('./three/LaptopScene'), { ssr: false });

/** WebGL disponível? Sem isso o intro é pulado direto para o hero. */
function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

export default function IntroOverlay({ mode, onDone }: { mode: IntroMode; onDone: () => void }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);
  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const finishRef = useRef<() => void>(() => {});
  const sceneTlRef = useRef<gsap.core.Timeline | null>(null);
  /** Timeout de carregamento — cancelado assim que a cena registra a timeline. */
  const timeoutRef = useRef(0);
  const masterRef = useRef<gsap.core.Timeline | null>(null);

  const [screen, setScreen] = useState<{
    texture: THREE.Texture;
    draw: (s: ScreenState) => void;
  } | null>(null);
  const [show3D, setShow3D] = useState(false);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < MOBILE_BP;

  // --- Trava de scroll + encerramento único -------------------------------------------
  useEffect(() => {
    const lenis = scrollState.lenis;
    const prevOverflow = document.body.style.overflow;
    lenis?.stop();
    document.body.style.overflow = 'hidden';
    window.scrollTo(0, 0);

    const finish = () => {
      // Em modo seek a intro nunca encerra: o frame fica congelado para a captura.
      if (seekTime() !== null) return;
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

    return () => {
      // Desmontou no meio (StrictMode/HMR): nunca deixa o hero preso nem o scroll travado.
      openIntroGate();
      document.body.style.overflow = prevOverflow;
      lenis?.start();
    };
  }, [onDone]);

  // --- Preparação dos assets + decisão de rodar ou pular --------------------------------
  useEffect(() => {
    if (mode === 'reduced') {
      // Sem cena 3D: só um fade curto.
      const root = rootRef.current;
      if (!root) return;
      const tween = gsap.to(root, {
        autoAlpha: 0,
        duration: REDUCED_FADE,
        ease: 'power2.out',
        delay: 0.1,
        onComplete: () => {
          traceFinish('reduced-motion fade');
          finishRef.current();
        },
      });
      return () => {
        tween.kill();
      };
    }

    // Sem WebGL: pula direto para o hero, sem erro.
    if (!hasWebGL()) {
      devLog('pulada: WebGL indisponível neste browser');
      traceFinish('sem WebGL');
      finishRef.current();
      return;
    }

    let cancelled = false;
    let disposeTex: (() => void) | null = null;

    // Timeout duro: passou de LOADING.timeout sem a cena pronta, o hero assume.
    timeoutRef.current = window.setTimeout(() => {
      if (!cancelled) {
        devLog(`pulada: timeout de ${LOADING.timeout}s carregando a cena`);
        traceFinish('timeout de carregamento');
        finishRef.current();
      }
    }, LOADING.timeout * 1000);

    // Carrega o print do hero (gerado por `node scripts/capture-hero.mjs`) e monta a textura.
    const loadHero = () =>
      new Promise<HTMLImageElement | null>((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => {
          devLog('hero-shot.webp não carregou; a tela mostra só a busca');
          resolve(null);
        };
        img.src = '/intro/hero-shot.webp';
      });

    Promise.all([document.fonts.ready.catch(() => undefined), loadHero()])
      .then(async ([, heroImg]) => {
        if (cancelled) return;
        const { createScreenTexture } = await import('./three/screenTexture');
        if (cancelled) return;
        const body =
          getComputedStyle(document.documentElement).getPropertyValue('--font-body').trim() ||
          'system-ui, sans-serif';
        const made = createScreenTexture(
          heroImg,
          {
            title: site.title,
            url: site.url.replace(/^https?:\/\//, ''),
            description: site.description,
          },
          body,
        );
        if (!made) throw new Error('canvas 2d indisponível');
        disposeTex = made.dispose;
        devLog('tela pronta; montando a cena 3D');
        setScreen({ texture: made.texture, draw: made.draw });
        setShow3D(true);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        devLog('pulada: falha preparando a cena', err);
        traceFinish('falha no carregamento');
        finishRef.current();
      });

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutRef.current);
      disposeTex?.();
    };
  }, [mode]);

  // --- Contador de loading: progresso real, com piso de tempo ---------------------------
  const progressRef = useRef({ shown: 0, elapsed: 0, ready: false });

  useEffect(() => {
    if (mode === 'reduced') return;
    const count = countRef.current;
    if (!count) return;
    let last = -1;

    const onFrame = () => {
      const p = progressRef.current;
      const dt = gsap.ticker.deltaRatio(60) / 60;
      p.elapsed += dt;
      // Piso de tempo: o contador nunca "pisca" de 0 a 100. Antes da cena pronta ele segura
      // em 92% — o que falta é justamente o que ainda não carregou.
      const floor = Math.min(1, p.elapsed / LOADING.min);
      const target = p.ready ? floor : Math.min(floor, 0.92);
      p.shown = Math.min(target, p.shown + dt / LOADING.catchUp);

      const n = Math.round(p.shown * 100);
      if (n !== last) {
        last = n;
        count.textContent = String(n).padStart(3, '0');
      }
    };

    gsap.ticker.add(onFrame);
    return () => gsap.ticker.remove(onFrame);
  }, [mode]);

  /** A cena montou e registrou a timeline: aqui a encenação começa de fato. */
  const registerTimeline = useCallback(
    (sceneTl: gsap.core.Timeline) => {
      // A cena ficou pronta: o timeout de carregamento não vale mais. Sem isto ele disparava
      // no meio da encenação e mandava a intro embora.
      window.clearTimeout(timeoutRef.current);
      sceneTlRef.current = sceneTl;
      progressRef.current.ready = true;
      devLog('cena pronta; iniciando a encenação');

      const master = gsap.timeline({
        onComplete: () => {
          devLog('master completou; encerrando');
          traceFinish('master onComplete');
          finishRef.current();
        },
      });
      masterRef.current = master;
      if (mode === 'short') master.timeScale(SHORT_TIMESCALE);

      // O contador sai quando a cena começa a se mexer.
      master
        .to(countRef.current, {
          autoAlpha: 0,
          y: -16,
          duration: LOADING.out.duration,
          ease: LOADING.out.ease,
        })
        // A cena 3D é aninhada no master (sem `.play()`: isso a soltaria para tocar sozinha e o
        // master terminaria junto com o contador, cortando o intro em ~2 s).
        .add(sceneTl, 0);
      // SEM cross-fade entre a tela e o hero: o print é fixo e o hero é responsivo, então os
      // dois sobrepostos davam o "NICOLE fantasma". Quem entrega agora é o WHITEOUT (a tela
      // dissolve para branco dentro da cena); quando o quadro está branco, o overlay é
      // removido no onComplete e o hero entra com a própria animação.
      sceneTl.paused(false);

      // --- Camadas HTML dirigidas pelo master (funcionam no modo seek) ---
      const root = rootRef.current;
      if (root) {
        const grain = root.querySelector<HTMLElement>(`.${styles.intro__grain}`);

        // Grão: deriva contínua, barata (só transform).
        if (grain) {
          master.to(
            grain,
            { xPercent: 6, yPercent: -5, duration: master.duration(), ease: 'none' },
            0,
          );
        }

        // O véu branco entra junto com o whiteout da tela (mesma janela de tempo).
        const veil = root.querySelector<HTMLElement>('[data-intro-whiteout]');
        if (veil) {
          master.to(
            veil,
            { autoAlpha: 1, duration: HANDOFF.whiteout, ease: 'power2.out' },
            SCENE_DIVE_END - HANDOFF.whiteout,
          );
        }

        // O fundo do overlay também vai a branco: quando a tela dissolve, tudo no quadro já
        // é a cor do hero e a remoção do overlay não pisca.
        master.to(
          root,
          { backgroundColor: '#ffffff', duration: LAYERS.dissolve.duration, ease: 'power2.inOut' },
          LAYERS.dissolve.start,
        );
      }

      // --- Modo seek: congela num instante e não encerra. ---
      const t = seekTime();
      if (t !== null) {
        master.pause();
        // `suppressEvents: false` faz os onUpdate dispararem durante o seek — sem isso a
        // câmera obedece (os tweens são reposicionados) mas o desenho da tela, que vive num
        // onUpdate, não roda, e o frame sai com a tela congelada no estado inicial.
        master.seek(Math.min(t, master.duration()), false);
        devLog(`seek: t=${t}s de ${master.duration().toFixed(2)}s`);
        // Marcador para o script de captura saber que o frame está pronto.
        window.setTimeout(() => {
          document.documentElement.setAttribute('data-intro-seek-ready', '1');
        }, 400);
        return;
      }
      devLog(`master montado: ${master.duration().toFixed(2)}s`);

    },
    [mode],
  );

  const onReady = useCallback(() => {
    progressRef.current.ready = true;
  }, []);

  /**
   * O mergulho passou do ponto de entrega: abre o PORTÃO do hero (ele começa a pintar por
   * baixo) e prepara o cross-fade.
   *
   * ESTA FUNÇÃO NÃO ENCERRA A INTRO. Era exatamente esse o bug do "corte cedo": ela disparava
   * um `gsap.to(root, {autoAlpha: 0})` próprio, que esvaziava o overlay no meio da encenação,
   * independentemente do master. Agora o fade final é um tween DENTRO do master (ver
   * registerTimeline), então só existe uma linha do tempo mandando no fim.
   */
  const onDive = useCallback((progress: number) => {
    if (progress < HANDOFF.gateAt) return;
    openIntroGate();
  }, []);

  /** "Pular": abre o portão já e dissolve o overlay. */
  const onSkip = useCallback(() => {
    masterRef.current?.pause();
    sceneTlRef.current?.pause();
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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onSkip();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onSkip]);

  // Entrada do fundo.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    // O OVERLAY nasce opaco pelo CSS (nenhum frame pode deixar ver o hero por trás): quem
    // faz fade é só o conteúdo (canvas + UI).
    const inner = root.querySelectorAll<HTMLElement>('[data-intro-fade]');
    const tween = gsap.fromTo(
      inner,
      { autoAlpha: 0 },
      { autoAlpha: 1, duration: BACKDROP.duration, ease: BACKDROP.ease },
    );
    return () => {
      tween.kill();
    };
  }, []);

  return (
    // role="presentation": o conteúdo é decorativo e já está com aria-hidden item a item, mas o
    // botão "pular" precisa continuar alcançável por teclado.
    <div ref={rootRef} className={styles.intro} role="presentation">
      <span className={styles.intro__glow} aria-hidden="true" />

      {/*
        Tipografia gigante ATRÁS do canvas (que tem alpha): em HTML ela fica nítida em
        qualquer resolução, sem custo de textura. O movimento é dirigido pelo master.
      */}
      <div ref={canvasWrapRef} className={styles.intro__canvas} aria-hidden="true" data-intro-fade>
        {show3D && screen ? (
          <LaptopScene
            isMobile={isMobile}
            texture={screen.texture}
            drawScreen={screen.draw}
            onReady={onReady}
            onDive={onDive}
            registerTimeline={registerTimeline}
          />
        ) : null}
      </div>

      <div className={styles.intro__count} aria-hidden="true">
        <span ref={countRef}>000</span>
        <span className={styles.intro__unit}>%</span>
      </div>

      {/*
        Véu branco: acompanha o whiteout da tela e cobre também a moldura do notebook que
        ainda aparece nas bordas no fim do mergulho. Sem ele sobravam cantos escuros.
      */}
      <span className={styles.intro__whiteout} aria-hidden="true" data-intro-whiteout />

      {/* Grão de filme por cima de tudo: tira o aspecto "liso" do 3D. */}
      <span className={styles.intro__grain} aria-hidden="true" />

      <button type="button" className={styles.intro__skip} onClick={onSkip}>
        pular
      </button>
    </div>
  );
}
