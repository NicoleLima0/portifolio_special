'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';
import type { Pointer } from '@/hooks/usePointer';
import {
  brushRadius,
  FRAME_MS,
  fluidPixelRatio,
  MAX_COVER_RECTS,
  MAX_POINTS,
  type Coverage,
  type HeroLoop,
} from './heroFrame';
import { FLUID_VERTEX } from './shaders/fluid.vert';
import { fluidFragment } from './shaders/fluid.frag';
import { COVERAGE_FRAGMENT, COVERAGE_VERTEX } from './shaders/coverage.frag';
import styles from './Hero.module.scss';

const MOVE_WINDOW = 120; // ms — só gira a cor se houve movimento recente
const SHIFT_GAIN = 0.0011; // giro da paleta por px percorrido
const EASE = 0.08; // lerp do brilho por frame (calibrado a 60fps)
const RESIZE_DEBOUNCE = 100;
const TRAIL_PAD = 4; // px CSS além do raio do pincel (antialias + upscale bilinear do fluido)
const FLOATS_PER_QUAD = 24; // 6 vértices × (x, y, u, v)

type Props = {
  pointer: RefObject<Pointer>;
  coverage: Coverage;
  loop: HeroLoop;
  /** Quadro único e estático: o canvas é recriado quando a preferência muda. */
  reducedMotion: boolean;
};

type FluidEngine = {
  frame(now: number, dt: number): void;
  destroy(): void;
};

function compile(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('[FluidCanvas] shader:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function link(gl: WebGLRenderingContext, vertex: string, fragment: string): WebGLProgram | null {
  const vs = compile(gl, gl.VERTEX_SHADER, vertex);
  const fs = compile(gl, gl.FRAGMENT_SHADER, fragment);
  const prog = gl.createProgram();
  if (!vs || !fs || !prog) return null;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.bindAttribLocation(prog, 0, 'aPos'); // os dois programas usam o mesmo buffer
  gl.bindAttribLocation(prog, 1, 'aUv');
  gl.linkProgram(prog);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error('[FluidCanvas] link:', gl.getProgramInfoLog(prog));
    gl.deleteProgram(prog);
    return null;
  }
  return prog;
}

function createFluidEngine(
  host: HTMLElement,
  pointer: RefObject<Pointer>,
  cov: Coverage,
  staticOnly: boolean,
): FluidEngine | null {
  const octaves = window.matchMedia('(pointer: coarse)').matches ? 5 : 6;

  // Canvas novo a cada montagem: no Strict Mode a 2ª montagem não pega o contexto já liberado.
  const canvas = document.createElement('canvas');
  canvas.className = styles.hero__canvas;
  host.appendChild(canvas);
  const gl = canvas.getContext('webgl', {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: true,
    // Animado: buffer descartável (mais rápido). Estático (reduced motion): o único quadro precisa
    // sobreviver a recomposições da página, senão as letras voltam a ficar pretas.
    preserveDrawingBuffer: staticOnly,
    powerPreference: 'high-performance',
  });
  if (!gl) {
    canvas.remove();
    return null;
  }
  const hasStencil = gl.getContextAttributes()?.stencil === true;

  let fluidProg: WebGLProgram | null = null;
  let maskProg: WebGLProgram | null = null;
  let buffer: WebGLBuffer | null = null;
  let maskTex: WebGLTexture | null = null;
  let uTime: WebGLUniformLocation | null = null;
  let uRes: WebGLUniformLocation | null = null;
  let uMouse: WebGLUniformLocation | null = null;
  let uShift: WebGLUniformLocation | null = null;
  let uMaskRes: WebGLUniformLocation | null = null;
  let uMode: WebGLUniformLocation | null = null;
  // Capacidade fixa: caixas das letras + 1 quad por ponto do rastro. Alocado uma vez.
  const verts = new Float32Array((MAX_COVER_RECTS + MAX_POINTS) * FLOATS_PER_QUAD);
  let vertexCount = 0;
  let rectVertexCount = 0;
  let uploadedVersion = -1;
  let trailInBuffer = false;
  let maskVersion = -1;
  let maskReady = false;

  const setup = (): boolean => {
    fluidProg = link(gl, FLUID_VERTEX, fluidFragment(octaves));
    maskProg = link(gl, COVERAGE_VERTEX, COVERAGE_FRAGMENT);
    if (!fluidProg || !maskProg) return false;

    buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, verts.byteLength, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 16, 0);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 16, 8);

    uTime = gl.getUniformLocation(fluidProg, 'uTime');
    uRes = gl.getUniformLocation(fluidProg, 'uRes');
    uMouse = gl.getUniformLocation(fluidProg, 'uMouse');
    uShift = gl.getUniformLocation(fluidProg, 'uShift');
    uMaskRes = gl.getUniformLocation(maskProg, 'uRes');
    uMode = gl.getUniformLocation(maskProg, 'uMode');

    maskTex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, maskTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.ALPHA, 1, 1, 0, gl.ALPHA, gl.UNSIGNED_BYTE, null);
    gl.useProgram(maskProg);
    gl.uniform1i(gl.getUniformLocation(maskProg, 'uMask'), 0);

    gl.clearColor(1, 1, 1, 1); // fora das regiões visíveis: branco (igual à tinta por cima)
    gl.clearStencil(0);

    uploadedVersion = -1;
    trailInBuffer = false;
    maskVersion = -1;
    maskReady = false;
    return true;
  };

  if (!setup()) {
    canvas.remove();
    return null;
  }

  const t0 = performance.now();
  const cur = { x: -1000, y: -1000 }; // posição suavizada do brilho
  const prev = { x: -1000, y: -1000 }; // ponteiro no frame anterior
  let seen = false;
  let shift = 0;
  let cssW = 1;
  let cssH = 1;
  // -Infinity (não 0): performance.now() conta desde o início da navegação; com cache a hidratação
  // acontece antes de 100ms e "now - 0 > 100" pulava o quadro inicial (letras pretas no reduced motion).
  let lastFrameAt = -Infinity;
  let resizeTimer = 0;
  let staticRaf = 0;

  // Quad (2 triângulos) em px CSS → clip space, com uv de -uv..uv (0 = sem uv).
  const writeQuad = (k: number, x0: number, y0: number, x1: number, y1: number, uv: number) => {
    const l = (x0 / cssW) * 2 - 1;
    const r = (x1 / cssW) * 2 - 1;
    const t = 1 - (y0 / cssH) * 2;
    const b = 1 - (y1 / cssH) * 2;
    const o = k * FLOATS_PER_QUAD;
    verts[o] = l;
    verts[o + 1] = b;
    verts[o + 2] = -uv;
    verts[o + 3] = -uv;
    verts[o + 4] = r;
    verts[o + 5] = b;
    verts[o + 6] = uv;
    verts[o + 7] = -uv;
    verts[o + 8] = l;
    verts[o + 9] = t;
    verts[o + 10] = -uv;
    verts[o + 11] = uv;
    verts[o + 12] = l;
    verts[o + 13] = t;
    verts[o + 14] = -uv;
    verts[o + 15] = uv;
    verts[o + 16] = r;
    verts[o + 17] = b;
    verts[o + 18] = uv;
    verts[o + 19] = -uv;
    verts[o + 20] = r;
    verts[o + 21] = t;
    verts[o + 22] = uv;
    verts[o + 23] = uv;
  };

  // Geometria = só onde o fluido pode aparecer: caixas das letras + 1 quad por ponto do rastro.
  const buildGeometry = (full: boolean, now: number) => {
    let n = 0;
    if (full) {
      writeQuad(n++, 0, 0, cssW, cssH, 0);
      rectVertexCount = 0;
      trailInBuffer = false;
    } else {
      const { rects, rectCount, px, py, pt, head, count } = cov;
      for (let j = 0; j < rectCount; j++) {
        const o = j * 4;
        writeQuad(n++, rects[o], rects[o + 1], rects[o + 2], rects[o + 3], 0);
      }
      rectVertexCount = n * 6;
      for (let k = 0; k < count; k++) {
        const i = (head + k) % MAX_POINTS;
        const r = brushRadius(now, pt[i]) + TRAIL_PAD; // mesmo raio que a tinta usa neste frame
        writeQuad(n++, px[i] - r, py[i] - r, px[i] + r, py[i] + r, 1);
      }
      trailInBuffer = count > 0;
    }
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, verts);
    vertexCount = n * 6;
  };

  // Máscara das letras (publicada pela tinta) → textura; só quando muda (resize / fim da entrada).
  const syncMask = () => {
    if (maskVersion === cov.holeMaskVersion) return;
    maskVersion = cov.holeMaskVersion;
    const src = cov.holeMask;
    maskReady = !!src && src.width === canvas.width && src.height === canvas.height;
    if (!src || !maskReady) return;
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.ALPHA, gl.ALPHA, gl.UNSIGNED_BYTE, src);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  };

  const drawFluid = (now: number) => {
    gl.useProgram(fluidProg);
    gl.uniform1f(uTime, (now - t0) / 1000);
    gl.uniform2f(uMouse, cur.x * (canvas.width / cssW), canvas.height - cur.y * (canvas.height / cssH));
    gl.uniform1f(uShift, shift);
    gl.drawArrays(gl.TRIANGLES, 0, vertexCount);
  };

  const draw = (now: number, full: boolean) => {
    if (!fluidProg || !maskProg || gl.isContextLost()) return;

    if (full) {
      buildGeometry(true, now);
      uploadedVersion = -1;
      gl.disable(gl.STENCIL_TEST);
      gl.clear(gl.COLOR_BUFFER_BIT);
      drawFluid(now);
      return;
    }

    // O rastro muda todo frame (raios encolhem); as letras só quando a versão muda.
    if (uploadedVersion !== cov.version || cov.count > 0 || trailInBuffer) {
      buildGeometry(false, now);
      uploadedVersion = cov.version;
    }
    gl.clear(gl.COLOR_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
    if (!vertexCount) return;

    if (!hasStencil) {
      drawFluid(now);
      return;
    }

    syncMask();
    gl.enable(gl.STENCIL_TEST);

    // 1) Passada barata: marca no stencil só os pixels onde o fluido pode aparecer.
    gl.colorMask(false, false, false, false);
    gl.stencilFunc(gl.ALWAYS, 1, 0xff);
    gl.stencilOp(gl.KEEP, gl.KEEP, gl.REPLACE);
    gl.useProgram(maskProg);
    if (rectVertexCount) {
      gl.uniform1f(uMode, maskReady ? 0 : 1); // letras: só os glifos (dilatados)
      gl.drawArrays(gl.TRIANGLES, 0, rectVertexCount);
    }
    if (vertexCount > rectVertexCount) {
      gl.uniform1f(uMode, 2); // rastro: o disco de cada ponto
      gl.drawArrays(gl.TRIANGLES, rectVertexCount, vertexCount - rectVertexCount);
    }

    // 2) O shader do fluido só roda nos pixels marcados, e uma única vez (zera o stencil ao pintar).
    gl.colorMask(true, true, true, true);
    gl.stencilFunc(gl.EQUAL, 1, 0xff);
    gl.stencilOp(gl.KEEP, gl.KEEP, gl.ZERO);
    drawFluid(now);
  };

  const step = (dt: number, now: number) => {
    const p = pointer.current;
    if (p.last === 0) return; // nenhum movimento ainda: nada aparece

    if (!seen) {
      // 1º movimento: parte direto do ponteiro (sem "voar" de fora da tela nem pular de cor)
      cur.x = prev.x = p.x;
      cur.y = prev.y = p.y;
      seen = true;
    }

    if (now - p.last < MOVE_WINDOW) {
      // Não decai: parou, a cor trava no tom em que chegou. A paleta tem período 1.
      shift = (shift + Math.hypot(p.x - prev.x, p.y - prev.y) * SHIFT_GAIN) % 1;
    }
    prev.x = p.x;
    prev.y = p.y;

    // lerp de 0.08/frame, corrigido pelo dt para ficar igual em telas de 120Hz
    const k = 1 - Math.pow(1 - EASE, dt / FRAME_MS);
    cur.x += (p.x - cur.x) * k;
    cur.y += (p.y - cur.y) * k;
  };

  // Quadro estático (reduced motion / hero parado).
  // - Estático: buffer preservado, então desenha já (não depende de um rAF que pode não vir).
  // - Animado e parado: agenda num rAF; fora de um frame o buffer descartável se perderia.
  const renderStatic = () => {
    if (staticOnly) {
      draw(performance.now(), true);
      return;
    }
    cancelAnimationFrame(staticRaf);
    staticRaf = requestAnimationFrame(() => {
      staticRaf = 0;
      draw(performance.now(), true);
    });
  };

  const resize = () => {
    const ratio = fluidPixelRatio();
    cssW = Math.max(1, canvas.clientWidth);
    cssH = Math.max(1, canvas.clientHeight);
    const w = Math.max(1, Math.round(cssW * ratio));
    const h = Math.max(1, Math.round(cssH * ratio));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    gl.viewport(0, 0, w, h);
    gl.useProgram(maskProg);
    gl.uniform2f(uMaskRes, w, h);
    gl.useProgram(fluidProg);
    gl.uniform2f(uRes, w, h);
    uploadedVersion = -1;
    maskVersion = -1; // revalida a máscara contra o novo tamanho
    // Parado (reduced motion / fora da tela): redimensionar limpa o buffer, repinta 1 quadro.
    if (performance.now() - lastFrameAt > 100) renderStatic();
  };

  const onLost = (e: Event) => {
    e.preventDefault(); // permite o "restored"
    fluidProg = null;
    maskProg = null;
  };
  const onRestored = () => {
    if (setup()) resize();
  };

  resize(); // 1 quadro inicial em tela cheia (serve de quadro estático no reduced motion)
  const ro = new ResizeObserver(([entry]) => {
    const { width, height } = entry.contentRect;
    if (width === cssW && height === cssH) return;
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(resize, RESIZE_DEBOUNCE);
  });
  ro.observe(canvas);
  canvas.addEventListener('webglcontextlost', onLost);
  canvas.addEventListener('webglcontextrestored', onRestored);

  return {
    frame(now, dt) {
      step(dt, now);
      draw(now, false);
      lastFrameAt = now;
    },
    destroy() {
      window.clearTimeout(resizeTimer);
      cancelAnimationFrame(staticRaf);
      ro.disconnect();
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
      if (!gl.isContextLost()) {
        gl.deleteTexture(maskTex);
        gl.deleteBuffer(buffer);
        gl.deleteProgram(fluidProg);
        gl.deleteProgram(maskProg);
      }
      fluidProg = null;
      maskProg = null;
      gl.getExtension('WEBGL_lose_context')?.loseContext(); // libera o contexto de fato
      canvas.remove();
    },
  };
}

export default function FluidCanvas({ pointer, coverage, loop, reducedMotion }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const staticOnly = reducedMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const engine = createFluidEngine(host, pointer, coverage, staticOnly);
    if (!engine) {
      setFallback(true); // sem WebGL: gradiente iridescente estático (a tinta continua por cima)
      return;
    }
    const remove = loop.add(engine.frame, 1); // depois da tinta: usa o rastro deste frame
    return () => {
      remove();
      engine.destroy();
    };
  }, [pointer, coverage, loop, reducedMotion]);

  const className = fallback ? `${styles.hero__fluid} ${styles['hero__fluid--fallback']}` : styles.hero__fluid;
  return <div ref={hostRef} className={className} aria-hidden="true" data-hero-layer="fluid" />;
}
