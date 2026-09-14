'use client';

import { useEffect, useRef } from 'react';
import { gsap } from '@/lib/gsap';

export const FRAME_MS = 1000 / 60;
const MAX_DT = 100; // aba volta do background: não deixa o dt explodir

/** Cap de devicePixelRatio das camadas do hero (desktop 1.5, touch 1.25). */
export function heroMaxDpr(): number {
  return window.matchMedia('(pointer: coarse)').matches ? 1.25 : 1.5;
}

/**
 * Resolução interna do fluido relativa ao DPR — o CSS faz o upscale (o fluido é suave).
 * Medido na GPU com uniforms fixos: 0.6x + upscale vs 1x = PSNR 54.8 dB, nenhum pixel com diferença > 24/255.
 */
export const FLUID_SCALE = 0.6;

/** px de device do fluido por px CSS. */
export function fluidPixelRatio(): number {
  return Math.min(window.devicePixelRatio || 1, heroMaxDpr()) * FLUID_SCALE;
}

// ---------------------------------------------------------------------------
// Loop único
// ---------------------------------------------------------------------------

export type FrameCallback = (now: number, dt: number) => void;

export type HeroLoop = {
  /** Registra um callback (menor `order` roda antes). Retorna a função de remoção. */
  add(cb: FrameCallback, order: number): () => void;
};

type Entry = { cb: FrameCallback; order: number };

/**
 * Um só loop para as duas camadas, pendurado no gsap.ticker — o mesmo rAF que já move o GSAP.
 * Todas recebem o mesmo timestamp e o mesmo dt. Só roda enquanto `running`.
 */
export function useHeroLoop(running: boolean): HeroLoop {
  const entries = useRef<Entry[]>([]);
  const api = useRef<HeroLoop | null>(null);
  if (!api.current) {
    const list = entries.current;
    api.current = {
      add(cb, order) {
        const entry = { cb, order };
        list.push(entry);
        list.sort((a, b) => a.order - b.order);
        return () => {
          const i = list.indexOf(entry);
          if (i >= 0) list.splice(i, 1);
        };
      },
    };
  }

  useEffect(() => {
    if (!running) return;
    const list = entries.current;
    let last = 0;
    const tick = () => {
      const now = performance.now();
      const dt = last ? Math.min(now - last, MAX_DT) : FRAME_MS;
      last = now;
      for (let i = 0; i < list.length; i++) list[i].cb(now, dt);
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, [running]);

  return api.current;
}

// ---------------------------------------------------------------------------
// Rastro + cobertura: onde o fluido está visível
// ---------------------------------------------------------------------------

export const BRUSH = 22; // raio base do pincel (px CSS) — ~14 fica ainda mais delicado
export const LIFE = 650; // ms até o buraco fechar
export const MAX_POINTS = 600;
export const MAX_COVER_RECTS = 8;

/** Raio do pincel (px CSS) de um ponto criado em `t`, no instante `now`. */
export function brushRadius(now: number, t: number): number {
  return BRUSH * (1 - ((now - t) / LIFE) * 0.7);
}

/**
 * A tinta cobre a tela de branco opaco; o fluido só aparece nas letras e no rastro.
 * A tinta publica aqui essas regiões e o fluido só calcula o shader nelas — fora delas o
 * pixel nunca é visto, então o resultado na tela é idêntico.
 */
export type Coverage = {
  /** Incrementa quando letras/máscara mudam (o rastro é lido direto a cada frame). */
  version: number;
  /** Retângulos das letras, px CSS: [x0, y0, x1, y1] × rectCount. */
  rects: Float32Array;
  rectCount: number;
  /** Letras (alpha = furo) dilatadas, na resolução do fluido. null durante a entrada. */
  holeMask: HTMLCanvasElement | null;
  holeMaskVersion: number;
  /** Rastro em ring buffer (px CSS / ms): escrito pela tinta, lido pelo fluido no mesmo frame. */
  px: Float32Array;
  py: Float32Array;
  pt: Float64Array;
  head: number;
  count: number;
};

export function createCoverage(): Coverage {
  return {
    version: 0,
    rects: new Float32Array(MAX_COVER_RECTS * 4),
    rectCount: 0,
    holeMask: null,
    holeMaskVersion: 0,
    px: new Float32Array(MAX_POINTS),
    py: new Float32Array(MAX_POINTS),
    pt: new Float64Array(MAX_POINTS),
    head: 0,
    count: 0,
  };
}
