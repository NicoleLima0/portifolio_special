'use client';

import { useEffect, useRef } from 'react';
import { gsap } from '@/lib/gsap';
import { retainPointer, viewportPointer } from '@/lib/pointer';
import { fx } from './fxStore';
import { FX_VERTEX, IRIS_FRAGMENT, THUMB_FRAGMENT } from './fxShaders';
import styles from './FxCanvas.module.scss';

const FRAME_MS = 1000 / 60;
const FX_SCALE = 0.75; // resolução interna relativa ao DPR capado
const RESIZE_DEBOUNCE = 100;
const FOLLOW = 0.16; // lerp/frame do que segue o cursor (60fps)
const GLOW_RADIUS = 320;
const GLOW_ALPHA = 0.14;
const SHIFT_GAIN = 0.0011; // mesma relação do hero: mover o cursor gira a paleta
const MODE_BLOB = 0;
const MODE_GLOW = 1;
const MODE_CARD = 2;

type Tex = { tex: WebGLTexture; w: number; h: number };
type Uniforms = Record<string, WebGLUniformLocation | null>;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

function compile(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('[FxCanvas] shader:', gl.getShaderInfoLog(shader));
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
  gl.bindAttribLocation(prog, 0, 'aPos');
  gl.linkProgram(prog);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error('[FxCanvas] link:', gl.getProgramInfoLog(prog));
    gl.deleteProgram(prog);
    return null;
  }
  return prog;
}

function createFxEngine(host: HTMLDivElement): { destroy(): void } | null {
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const coarse = window.matchMedia('(pointer: coarse)').matches;

  const canvas = document.createElement('canvas');
  canvas.className = styles.fx__canvas;
  host.appendChild(canvas);
  const gl = canvas.getContext('webgl', {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    preserveDrawingBuffer: false,
    powerPreference: 'high-performance',
  });
  if (!gl) {
    canvas.remove();
    return null;
  }

  let irisProg: WebGLProgram | null = null;
  let thumbProg: WebGLProgram | null = null;
  let quad: WebGLBuffer | null = null;
  let iu: Uniforms = {};
  let tu: Uniforms = {};
  let current: WebGLProgram | null = null;
  const textures = new Map<string, Tex>();
  const loading = new Set<string>();
  const decoded: { src: string; bmp: ImageBitmap }[] = [];
  let lost = false;
  let disposed = false;

  const uniforms = (prog: WebGLProgram, names: string[]): Uniforms => {
    const out: Uniforms = {};
    for (const n of names) out[n] = gl.getUniformLocation(prog, n);
    return out;
  };
  const use = (prog: WebGLProgram | null) => {
    if (current !== prog) {
      gl.useProgram(prog);
      current = prog;
    }
  };

  const setup = (): boolean => {
    irisProg = link(gl, FX_VERTEX, IRIS_FRAGMENT);
    thumbProg = link(gl, FX_VERTEX, THUMB_FRAGMENT);
    if (!irisProg || !thumbProg) return false;
    quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    iu = uniforms(irisProg, ['uRect', 'uView', 'uTime', 'uShift', 'uMode', 'uRadius', 'uFill', 'uAlpha', 'uEdge', 'uVel']);
    tu = uniforms(thumbProg, [
      'uRect', 'uView', 'uTexA', 'uTexB', 'uScaleA', 'uScaleB', 'uMix', 'uVel', 'uParallax', 'uReveal', 'uAlpha', 'uRadius',
    ]);
    current = null;
    use(thumbProg);
    gl.uniform1i(tu.uTexA, 0);
    gl.uniform1i(tu.uTexB, 1);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); // premultiplied
    gl.clearColor(0, 0, 0, 0);
    textures.clear();
    loading.clear();
    return true;
  };

  if (!setup()) {
    canvas.remove();
    return null;
  }

  // --- Texturas: decodificadas fora da thread (createImageBitmap), no máximo 1 upload por frame ---
  const request = (src: string) => {
    if (!src || textures.has(src) || loading.has(src) || typeof createImageBitmap !== 'function') return;
    loading.add(src);
    fetch(src)
      .then((r) => r.blob())
      .then((blob) => createImageBitmap(blob, { imageOrientation: 'flipY', resizeWidth: 900, resizeQuality: 'high' }))
      .then((bmp) => {
        if (disposed) bmp.close();
        else decoded.push({ src, bmp });
      })
      .catch(() => loading.delete(src));
  };
  const uploadOne = () => {
    const item = decoded.shift();
    if (!item) return;
    const tex = gl.createTexture();
    if (tex) {
      gl.activeTexture(gl.TEXTURE2); // unidade livre: não mexe nos binds de A/B
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, item.bmp);
      textures.set(item.src, { tex, w: item.bmp.width, h: item.bmp.height });
    }
    item.bmp.close();
    loading.delete(item.src);
  };

  // --- Tamanho ---
  let vw = 1;
  let vh = 1;
  let resizeTimer = 0;
  const resize = () => {
    vw = Math.max(1, host.clientWidth);
    vh = Math.max(1, host.clientHeight);
    const ratio = Math.min(window.devicePixelRatio || 1, coarse ? 1.25 : 1.5) * FX_SCALE;
    canvas.width = Math.max(1, Math.round(vw * ratio));
    canvas.height = Math.max(1, Math.round(vh * ratio));
    gl.viewport(0, 0, canvas.width, canvas.height);
    use(irisProg);
    gl.uniform2f(iu.uView, vw, vh);
    use(thumbProg);
    gl.uniform2f(tu.uView, vw, vh);
  };
  const onResize = () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(resize, RESIZE_DEBOUNCE);
  };
  resize();
  window.addEventListener('resize', onResize);

  const onLost = (e: Event) => {
    e.preventDefault();
    lost = true;
  };
  const onRestored = () => {
    lost = !setup();
    if (!lost) resize();
  };
  canvas.addEventListener('webglcontextlost', onLost);
  canvas.addEventListener('webglcontextrestored', onRestored);

  const releasePointer = retainPointer();

  // --- Estado suavizado ---
  const t0 = performance.now();
  const follow = { x: 0, y: 0, vx: 0, vy: 0, init: false };
  const thumb = { alpha: 0, reveal: 0, mix: 1, a: '', b: '' };
  const preview = { alpha: 0, shift: 0 };
  let glowAlpha = 0;
  let glowShift = 0;
  let visible = false;
  let last = 0;

  const drawIris = (
    mode: number,
    cx: number,
    cy: number,
    w: number,
    h: number,
    radius: number,
    alpha: number,
    shift: number,
    fill: number,
    edge: number,
    time: number,
  ) => {
    use(irisProg);
    gl.uniform4f(iu.uRect, cx - w / 2, cy - h / 2, w, h);
    gl.uniform1f(iu.uMode, mode);
    gl.uniform1f(iu.uRadius, radius);
    gl.uniform1f(iu.uAlpha, alpha);
    gl.uniform1f(iu.uShift, shift);
    gl.uniform1f(iu.uFill, fill);
    gl.uniform1f(iu.uEdge, edge);
    gl.uniform2f(iu.uVel, follow.vx, -follow.vy);
    gl.uniform1f(iu.uTime, time);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };

  const tick = () => {
    if (lost) return;
    const now = performance.now();
    const dt = last ? Math.min(now - last, 100) : FRAME_MS;
    last = now;
    const ease = (base: number) => 1 - Math.pow(1 - base, dt / FRAME_MS);

    while (fx.preloadQueue.length) request(fx.preloadQueue.pop() as string);
    uploadOne();

    // Cursor seguido com atraso (a velocidade deforma thumbnail/card).
    const p = viewportPointer;
    const hasPointer = fine && p.last > 0;
    if (hasPointer) {
      if (!follow.init) {
        follow.x = p.x;
        follow.y = p.y;
        follow.init = true;
      }
      const k = ease(FOLLOW);
      const nx = follow.x + (p.x - follow.x) * k;
      const ny = follow.y + (p.y - follow.y) * k;
      follow.vx = nx - follow.x;
      follow.vy = ny - follow.y;
      follow.x = nx;
      follow.y = ny;
    }

    // Thumbnail: troca de imagem só quando a nova textura está pronta (crossfade A → B).
    const src = fx.thumb.src;
    if (src && src !== thumb.b) {
      request(src);
      if (textures.has(src)) {
        thumb.a = thumb.alpha > 0.02 && thumb.b ? thumb.b : src;
        thumb.b = src;
        thumb.mix = thumb.a === src ? 1 : 0;
      }
    }
    const wantThumb = hasPointer && fx.thumb.active && textures.has(thumb.b);
    thumb.alpha += ((wantThumb ? 1 : 0) - thumb.alpha) * ease(0.16);
    thumb.reveal += ((wantThumb ? 1 : 0) - thumb.reveal) * ease(0.12);
    thumb.mix += (1 - thumb.mix) * ease(0.12);

    const wantPreview = hasPointer && fx.preview.active;
    preview.alpha += ((wantPreview ? 1 : 0) - preview.alpha) * ease(0.16);
    preview.shift += (fx.preview.phase - preview.shift) * ease(0.1);

    const tr = fx.transition;
    const s = tr.shrink;
    const transitionOn = tr.grow > 0.0005 && s < 0.999;
    const glowTarget = hasPointer && (fx.glow.enabled || (transitionOn && s > 0.35)) ? GLOW_ALPHA : 0;
    glowAlpha += (glowTarget - glowAlpha) * ease(0.08);
    glowShift = (glowShift + Math.hypot(follow.vx, follow.vy) * SHIFT_GAIN) % 1;

    const anything = transitionOn || thumb.alpha > 0.004 || preview.alpha > 0.004 || glowAlpha > 0.002;
    if (!anything) {
      if (visible) {
        gl.clear(gl.COLOR_BUFFER_BIT);
        host.style.visibility = 'hidden';
        visible = false;
      }
      return;
    }
    if (!visible) {
      host.style.visibility = 'visible';
      visible = true;
    }

    gl.clear(gl.COLOR_BUFFER_BIT);
    const time = (now - t0) / 1000;

    // 1) glow (soma luz, por baixo de tudo)
    if (glowAlpha > 0.002) {
      const size = GLOW_RADIUS * 2.4;
      drawIris(MODE_GLOW, follow.x, follow.y, size, size, GLOW_RADIUS, glowAlpha, glowShift, 0, 0, time);
    }

    // 2) preview de Serviços
    if (preview.alpha > 0.004) {
      const w = clamp(vw * 0.2, 220, 360);
      const h = w * 0.64;
      drawIris(MODE_CARD, follow.x, follow.y, w / 0.84, h / 0.84, 18, preview.alpha, preview.shift, 0, 0, time);
    }

    // 3) thumbnail de Trabalhos
    if (thumb.alpha > 0.004) {
      const b = textures.get(thumb.b);
      const a = textures.get(thumb.a) ?? b;
      if (a && b) {
        const w = clamp(vw * 0.22, 260, 420);
        const h = w * 0.72;
        const aq = w / h;
        const ta = a.w / a.h;
        const tb = b.w / b.h;
        use(thumbProg);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, a.tex);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, b.tex);
        gl.uniform4f(tu.uRect, follow.x - w / 2, follow.y - h / 2, w, h);
        gl.uniform2f(tu.uScaleA, ta > aq ? aq / ta : 1, ta > aq ? 1 : ta / aq);
        gl.uniform2f(tu.uScaleB, tb > aq ? aq / tb : 1, tb > aq ? 1 : tb / aq);
        gl.uniform1f(tu.uMix, thumb.mix);
        gl.uniform2f(tu.uVel, follow.vx, -follow.vy);
        gl.uniform2f(tu.uParallax, follow.x / vw - 0.5, -(follow.y / vh - 0.5));
        gl.uniform1f(tu.uReveal, thumb.reveal);
        gl.uniform1f(tu.uAlpha, thumb.alpha);
        gl.uniform1f(tu.uRadius, 14);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
    }

    // 4) gota da transição (por cima de tudo)
    if (transitionOn) {
      const seamX = vw / 2;
      const seamY = vh;
      const coverR = Math.hypot(Math.max(seamX, vw - seamX), seamY) * 1.12;
      const r = s > 0 ? mix(coverR, GLOW_RADIUS * 0.55, s) : coverR * tr.grow;
      const cx = mix(seamX, hasPointer ? follow.x : vw / 2, s);
      const cy = mix(seamY, hasPointer ? follow.y : vh / 2, s);
      const alpha = 1 - smoothstep(0.55, 1, s);
      if (alpha > 0.003 && r > 0.5) {
        const edge = Math.max(r * 0.14, 28);
        const size = (r + edge) * 2.2;
        drawIris(MODE_BLOB, cx, cy, size, size, r, alpha, glowShift, 1 - s, edge, time);
      }
    }
  };

  gsap.ticker.add(tick);

  return {
    destroy() {
      disposed = true;
      gsap.ticker.remove(tick);
      window.clearTimeout(resizeTimer);
      window.removeEventListener('resize', onResize);
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
      releasePointer();
      decoded.forEach((d) => d.bmp.close());
      if (!gl.isContextLost()) {
        textures.forEach((t) => gl.deleteTexture(t.tex));
        gl.deleteBuffer(quad);
        gl.deleteProgram(irisProg);
        gl.deleteProgram(thumbProg);
      }
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      canvas.remove();
      host.style.visibility = 'hidden';
    },
  };
}

/** Canvas de efeitos da página inteira (um único contexto WebGL). Desligado com reduced motion. */
export default function FxCanvas() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const engine = createFxEngine(host);
    return () => engine?.destroy();
  }, []);

  return <div ref={hostRef} className={styles.fx} aria-hidden="true" />;
}
