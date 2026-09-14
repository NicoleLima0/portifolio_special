'use client';

import { useEffect, useRef, type RefObject } from 'react';
import type { Pointer } from '@/hooks/usePointer';
import {
  BRUSH,
  brushRadius,
  fluidPixelRatio,
  heroMaxDpr,
  LIFE,
  MAX_POINTS,
  type Coverage,
  type HeroLoop,
} from './heroFrame';
import styles from './Hero.module.scss';

export const HERO_WORD = 'NICOLE';
const WORD = HERO_WORD;
const MOVE_WINDOW = 120; // ms — só desenha rastro com movimento recente
const STEP = 8; // px entre pontos interpolados
const GAP_RESET = 140; // ms sem amostra → começa um traço novo
const RESIZE_DEBOUNCE = 100;
const COVER_PAD = 4; // px CSS de folga na cobertura das letras (antialias + upscale do fluido)
const HOLE_DILATE = 4; // px CSS de dilatação da máscara de letras usada no stencil do fluido

/** Progresso de entrada de uma letra do nome: 0 = escondida abaixo da linha, 1 = no lugar. */
export type IntroLetter = { p: number };

type Props = {
  pointer: RefObject<Pointer>;
  letters: RefObject<IntroLetter[]>;
  coverage: Coverage;
  loop: HeroLoop;
  running: boolean;
  /** Chamado quando a fonte carregou e o nome já pode animar. */
  onReady?: () => void;
};

type NameLayout = {
  font: string;
  size: number;
  /** Caixa de cada glifo no espaço do texto: [x0, x1, ascent, descent] × letras. */
  boxes: Float32Array;
  scaleX: number;
  measured: number;
  xs: number[]; // x de cada letra (espaço do texto, antes do scaleX), com kerning
  clipTop: number; // topo da máscara da linha, relativo ao centro
  clipHeight: number; // altura da máscara = distância que cada letra percorre
};

type InkEngine = {
  frame(now: number): void;
  pause(): void;
  destroy(): void;
};

function createInkEngine(
  host: HTMLElement,
  pointer: RefObject<Pointer>,
  letters: RefObject<IntroLetter[]>,
  cov: Coverage,
  onReady: () => void,
): InkEngine | null {
  // Canvas novo a cada montagem: no Strict Mode a 2ª montagem nunca herda estado da 1ª.
  // (Sem `desynchronized`: medido, fez a camada perder sincronia com o compositor e derrubou frames.)
  const canvas = document.createElement('canvas');
  canvas.className = styles.hero__canvas;
  host.appendChild(canvas);
  const ctx = canvas.getContext('2d', { alpha: true });
  const mask = document.createElement('canvas'); // branco com as letras vazadas (refeito só no resize/entrada)
  const mctx = mask.getContext('2d');
  const brush = document.createElement('canvas'); // pincel pré-renderizado (1 gradiente, só no resize)
  const bctx = brush.getContext('2d');
  const hole = document.createElement('canvas'); // letras dilatadas na resolução do fluido
  const hctx = hole.getContext('2d');
  if (!ctx || !mctx || !bctx || !hctx) {
    canvas.remove();
    return null;
  }

  // Rastro em ring buffer de tamanho fixo (compartilhado com o fluido): zero alocação por frame.
  const { px, py, pt } = cov;
  const push = (x: number, y: number, t: number) => {
    const i = (cov.head + cov.count) % MAX_POINTS;
    px[i] = x;
    py[i] = y;
    pt[i] = t;
    if (cov.count < MAX_POINTS) cov.count++;
    else cov.head = (cov.head + 1) % MAX_POINTS; // cheio: sobrescreveu o mais antigo
  };

  let W = 0;
  let H = 0;
  let dpr = 1;
  let fontReady = false;
  let layout: NameLayout | null = null;
  let introSettled = false;
  let disposed = false;
  let dirty = true;
  let hasPrev = false;
  let prevX = 0;
  let prevY = 0;
  let lastSample = 0;
  let resizeTimer = 0;
  let maskBitmap: ImageBitmap | null = null; // máscara final já na GPU (enviada 1x)
  let maskGen = 0;

  // next/font gera o nome real da família; lemos pela CSS var herdada do <html>.
  const family = getComputedStyle(host).getPropertyValue('--font-display').trim() || "'Archivo Black', sans-serif";

  const allLettersIn = () => {
    const ls = letters.current;
    for (let i = 0; i < ls.length; i++) if (ls[i].p < 1) return false;
    return true;
  };

  const buildBrush = () => {
    const size = Math.ceil(BRUSH * 2 * dpr);
    brush.width = brush.height = size;
    const r = size / 2;
    const g = bctx.createRadialGradient(r, r, 0, r, r, r);
    g.addColorStop(0, 'rgba(0,0,0,1)');
    g.addColorStop(0.5, 'rgba(0,0,0,1)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    bctx.fillStyle = g;
    bctx.fillRect(0, 0, size, size);
  };

  // Regiões das letras para o fluido: a faixa inteira durante a entrada, 1 caixa por letra depois.
  const updateLetterRects = () => {
    cov.rectCount = 0;
    cov.version++;
    if (!layout) return;
    const { size, scaleX, boxes, clipTop, clipHeight } = layout;
    const cx = W / 2;
    const cy = H * 0.6;
    const slack = size * 0.05; // negrito sintético (~size/32 por lado) + antialias
    const sx = slack * scaleX + COVER_PAD;
    const sy = slack + COVER_PAD;
    const r = cov.rects;

    if (!allLettersIn()) {
      let minX = Infinity;
      let maxX = -Infinity;
      for (let i = 0; i < WORD.length; i++) {
        minX = Math.min(minX, boxes[i * 4]);
        maxX = Math.max(maxX, boxes[i * 4 + 1]);
      }
      r[0] = cx + minX * scaleX - sx;
      r[1] = cy + clipTop - sy;
      r[2] = cx + maxX * scaleX + sx;
      r[3] = cy + clipTop + clipHeight + sy;
      cov.rectCount = 1;
      return;
    }

    for (let i = 0; i < WORD.length; i++) {
      const o = i * 4;
      r[o] = cx + boxes[o] * scaleX - sx;
      r[o + 1] = cy - boxes[o + 2] - sy;
      r[o + 2] = cx + boxes[o + 1] * scaleX + sx;
      r[o + 3] = cy + boxes[o + 3] + sy;
    }
    cov.rectCount = WORD.length;
  };

  // Mesmas letras, dilatadas, na resolução do fluido: dentro das caixas, só esses pixels são sombreados.
  const buildHoleMask = () => {
    if (!layout || !fontReady || !allLettersIn()) {
      if (cov.holeMask) {
        cov.holeMask = null;
        cov.holeMaskVersion++;
      }
      return;
    }
    const ratio = fluidPixelRatio();
    hole.width = Math.max(1, Math.round(W * ratio));
    hole.height = Math.max(1, Math.round(H * ratio));
    hctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    hctx.translate(W / 2, H * 0.6);
    hctx.scale(layout.scaleX, 1);
    hctx.font = layout.font;
    hctx.textAlign = 'center';
    hctx.textBaseline = 'middle';
    hctx.fillStyle = hctx.strokeStyle = '#000';
    hctx.lineJoin = 'round';
    hctx.lineWidth = (HOLE_DILATE * 2) / Math.min(layout.scaleX, 1);
    hctx.fillText(WORD, 0, 0);
    hctx.strokeText(WORD, 0, 0);
    cov.holeMask = hole;
    cov.holeMaskVersion++;
  };

  const measureName = () => {
    const size = Math.min(H * 0.34, W * 0.3);
    mctx.font = `900 ${size}px ${family}`;
    mctx.textBaseline = 'middle';
    mctx.textAlign = 'center';
    const m = mctx.measureText(WORD);
    const measured = m.width;
    const width = (s: string) => mctx.measureText(s).width;
    const pad = size * 0.08;
    const scaleX = measured > 0 ? (W * 0.94) / measured : 1;
    // fim do prefixo até a letra i menos o avanço dela = posição da letra já com kerning
    const xs = Array.from(WORD, (ch, i) => -measured / 2 + width(WORD.slice(0, i + 1)) - width(ch));

    mctx.textAlign = 'left';
    const boxes = new Float32Array(WORD.length * 4);
    for (let i = 0; i < WORD.length; i++) {
      const g = mctx.measureText(WORD[i]);
      boxes[i * 4] = xs[i] - g.actualBoundingBoxLeft;
      boxes[i * 4 + 1] = xs[i] + g.actualBoundingBoxRight;
      boxes[i * 4 + 2] = g.actualBoundingBoxAscent;
      boxes[i * 4 + 3] = g.actualBoundingBoxDescent;
    }

    layout = {
      font: mctx.font,
      size,
      boxes,
      scaleX,
      measured,
      xs,
      clipTop: -m.actualBoundingBoxAscent - pad,
      clipHeight: m.actualBoundingBoxAscent + m.actualBoundingBoxDescent + pad * 2,
    };
    updateLetterRects();
    buildHoleMask();
  };

  const buildMask = () => {
    mask.width = canvas.width;
    mask.height = canvas.height;
    // Branco em px de device: com W*dpr fracionário, preencher em px CSS deixaria a última
    // coluna/linha semi-transparente (um fio de fluido na borda).
    mctx.fillStyle = '#fff';
    mctx.fillRect(0, 0, mask.width, mask.height);
    // Até a fonte carregar fica só o branco: sem flash de fluido nem NICOLE na fonte errada.
    if (!fontReady || !layout) return;

    mctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    mctx.font = layout.font;
    mctx.textBaseline = 'middle';
    mctx.fillStyle = '#000';
    mctx.globalCompositeOperation = 'destination-out';
    mctx.translate(W / 2, H * 0.6);
    mctx.scale(layout.scaleX, 1);

    if (allLettersIn()) {
      // Estado final: a palavra inteira, exatamente como a especificação.
      mctx.textAlign = 'center';
      mctx.fillText(WORD, 0, 0);
    } else {
      // Entrada: cada letra sobe de baixo, recortada pela máscara da linha.
      const ls = letters.current;
      const { xs, measured, clipTop, clipHeight } = layout;
      mctx.textAlign = 'left';
      mctx.beginPath();
      mctx.rect(-measured / 2 - clipHeight, clipTop, measured + clipHeight * 2, clipHeight);
      mctx.clip();
      for (let i = 0; i < ls.length; i++) {
        if (ls[i].p > 0) mctx.fillText(WORD[i], xs[i], (1 - ls[i].p) * clipHeight);
      }
    }
    mctx.globalCompositeOperation = 'source-over';
    mctx.setTransform(1, 0, 0, 1, 0, 0);
  };

  // Máscara final vira ImageBitmap: sobe para a GPU uma vez e é só amostrada depois.
  const refreshMaskBitmap = () => {
    const gen = ++maskGen;
    maskBitmap?.close();
    maskBitmap = null;
    if (!fontReady || !allLettersIn() || typeof createImageBitmap !== 'function') return;
    createImageBitmap(mask)
      .then((bmp) => {
        if (disposed || gen !== maskGen) bmp.close();
        else maskBitmap = bmp;
      })
      .catch(() => undefined);
  };

  const draw = (now: number) => {
    if (!dirty && cov.count === 0) return; // em repouso não há o que repintar
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(maskBitmap ?? mask, 0, 0); // 1:1 em px de device

    const { head, count } = cov;
    if (count) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = 'destination-out';
      for (let k = 0; k < count; k++) {
        const i = (head + k) % MAX_POINTS;
        const r = brushRadius(now, pt[i]);
        ctx.drawImage(brush, px[i] - r, py[i] - r, r * 2, r * 2);
      }
      ctx.globalCompositeOperation = 'source-over';
    }
    // Com pontos, o próximo frame precisa repintar (mesmo que todos expirem nele).
    dirty = count > 0;
  };

  const step = (now: number) => {
    const p = pointer.current;

    if (p.last > 0 && now - p.last < MOVE_WINDOW) {
      if (!hasPrev || now - lastSample > GAP_RESET) {
        push(p.x, p.y, now);
      } else {
        const dx = p.x - prevX;
        const dy = p.y - prevY;
        const dist = Math.hypot(dx, dy);
        if (dist > 0) {
          const n = Math.max(1, Math.floor(dist / STEP));
          for (let i = 1; i <= n; i++) {
            const k = i / n;
            push(prevX + dx * k, prevY + dy * k, now);
          }
        }
      }
      prevX = p.x;
      prevY = p.y;
      hasPrev = true;
      lastSample = now;
    }

    // Pontos entram em ordem de tempo: os expirados estão sempre no começo.
    while (cov.count > 0 && now - pt[cov.head] >= LIFE) {
      cov.head = (cov.head + 1) % MAX_POINTS;
      cov.count--;
    }
  };

  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, heroMaxDpr());
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    canvas.width = Math.max(1, Math.round(W * dpr));
    canvas.height = Math.max(1, Math.round(H * dpr));
    if (fontReady) measureName();
    buildMask();
    buildBrush();
    refreshMaskBitmap();
    dirty = true;
    draw(performance.now());
  };

  resize(); // pinta o branco já no mount, antes do 1º frame do fluido
  const ro = new ResizeObserver(([entry]) => {
    const { width, height } = entry.contentRect;
    if (width === W && height === H) return;
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(resize, RESIZE_DEBOUNCE);
  });
  ro.observe(canvas);

  // Medir o texto só depois da fonte carregar.
  document.fonts
    .load(`900 100px ${family}`, WORD)
    .then(() => document.fonts.ready)
    .catch(() => undefined)
    .then(() => {
      if (disposed) return;
      fontReady = true;
      measureName();
      buildMask();
      refreshMaskBitmap();
      dirty = true;
      draw(performance.now());
      onReady();
    });

  return {
    frame(now) {
      if (fontReady && !introSettled) {
        // Durante a entrada (GSAP move letters[].p) a máscara é refeita a cada frame.
        buildMask();
        dirty = true;
        introSettled = allLettersIn();
        if (introSettled) {
          updateLetterRects(); // troca a faixa por caixas justas por letra
          buildHoleMask();
          refreshMaskBitmap();
        }
      }
      step(now);
      draw(now);
    },
    pause() {
      cov.head = 0;
      cov.count = 0;
      hasPrev = false;
      dirty = true;
      draw(performance.now());
    },
    destroy() {
      disposed = true;
      maskGen++;
      maskBitmap?.close();
      maskBitmap = null;
      window.clearTimeout(resizeTimer);
      ro.disconnect();
      cov.head = 0;
      cov.count = 0;
      cov.rectCount = 0;
      cov.holeMask = null;
      cov.holeMaskVersion++;
      cov.version++;
      // libera os backing stores
      canvas.width = canvas.height = 0;
      mask.width = mask.height = 0;
      brush.width = brush.height = 0;
      hole.width = hole.height = 0;
      canvas.remove();
    },
  };
}

export default function InkCanvas({ pointer, letters, coverage, loop, running, onReady }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<InkEngine | null>(null);
  const onReadyRef = useRef(onReady);

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const engine = createInkEngine(host, pointer, letters, coverage, () => onReadyRef.current?.());
    if (!engine) return;
    engineRef.current = engine;
    const remove = loop.add(engine.frame, 0); // antes do fluido: atualiza o rastro do frame
    return () => {
      remove();
      engine.destroy();
      engineRef.current = null;
    };
  }, [pointer, letters, coverage, loop]);

  useEffect(() => {
    if (!running) engineRef.current?.pause();
  }, [running]);

  return <div ref={hostRef} className={styles.hero__ink} aria-hidden="true" data-hero-layer="ink" />;
}
