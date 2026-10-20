'use client';

import { useEffect, useRef, type ComponentPropsWithoutRef, type ReactNode } from 'react';
import { gsap } from '@/lib/gsap';
import styles from './SparkButton.module.scss';

const LIGHT_RGB = '238,226,255';
const NEON_RGB = '138,43,226';
/** px a mais que o botão no canvas, metade para cada lado: o excesso é só brilho */
const CANVAS_MARGIN = 180;
const LAP_MS = 5200;
const TRAIL_MS = 400;
/** altura de pílula para a qual os números do efeito foram calibrados */
const REFERENCE_HEIGHT = 76;
const MAX_DPR = 1.6;
const GLOW_SIZE = 64;
const SCROLL_IDLE_MS = 160;

type Props = {
  href: string;
  children: ReactNode;
  /** mesma pílula e mesmo efeito em escala de barra (header) */
  compact?: boolean;
  className?: string;
} & Omit<ComponentPropsWithoutRef<'a'>, 'href' | 'children' | 'className'>;

type TrailPoint = { x: number; y: number; t: number };
type Particle = { x: number; y: number; vx: number; vy: number; t: number; life: number; size: number };

/**
 * CTA em pílula com uma faísca que percorre a borda em loop. O CSS desenha o anel estático e o
 * hover; a faísca, o rastro e as partículas são um canvas 2D atrás do botão.
 *
 * O loop entra no gsap.ticker só com o botão visível e a aba ativa. Em prefers-reduced-motion o
 * canvas não é animado (e o CSS o esconde), sobrando só o anel.
 */
export default function SparkButton({ href, children, compact = false, className = '', ...rest }: Props) {
  const buttonRef = useRef<HTMLAnchorElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = buttonRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!el || !canvas || !ctx) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const state = { heat: 0 };

    let canvasWidth = 0;
    let canvasHeight = 0;
    let cx = 0;
    let cy = 0;
    let radius = 0;
    let straight = 0;
    let perimeter = 0;
    /** 1 na pílula de referência; menor no compacto, para o brilho acompanhar o tamanho */
    let scale = 1;
    /** contorno pronto: refazer ~60 lineTo por quadro era desperdício */
    let outline: Path2D | null = null;

    // A cabeça da faísca só muda de tamanho, nunca de cor: desenhada uma vez num canvas próprio,
    // depois é só drawImage, sem recriar gradiente por quadro.
    const glowSprite = document.createElement('canvas');
    glowSprite.width = glowSprite.height = GLOW_SIZE * 2;
    const glowCtx = glowSprite.getContext('2d');
    if (glowCtx) {
      const gradient = glowCtx.createRadialGradient(GLOW_SIZE, GLOW_SIZE, 0, GLOW_SIZE, GLOW_SIZE, GLOW_SIZE);
      gradient.addColorStop(0, 'rgba(255,255,255,.95)');
      gradient.addColorStop(0.2, `rgba(${LIGHT_RGB},.8)`);
      gradient.addColorStop(0.55, `rgba(${NEON_RGB},.3)`);
      gradient.addColorStop(1, `rgba(${NEON_RGB},0)`);
      glowCtx.fillStyle = gradient;
      glowCtx.fillRect(0, 0, GLOW_SIZE * 2, GLOW_SIZE * 2);
    }

    const measure = () => {
      // offsetWidth/Height: tamanho de layout, imune a transforms de ancestrais
      const width = el.offsetWidth;
      const height = el.offsetHeight;
      if (!width || !height) return;

      radius = height / 2;
      straight = Math.max(1, width - 2 * radius);
      perimeter = 2 * straight + 2 * Math.PI * radius;
      scale = Math.min(1, Math.max(0.55, height / REFERENCE_HEIGHT));

      const margin = CANVAS_MARGIN * scale;
      canvasWidth = Math.round(width + margin);
      canvasHeight = Math.round(height + margin);
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      canvas.width = Math.round(canvasWidth * dpr);
      canvas.height = Math.round(canvasHeight * dpr);
      canvas.style.width = `${canvasWidth}px`;
      canvas.style.height = `${canvasHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cx = canvasWidth / 2;
      cy = canvasHeight / 2;
      outline = null;
    };

    /** distância ao longo da pílula → (x, y): topo, semicírculo direito, base, semicírculo esquerdo */
    const pointAt = (distance: number) => {
      let d = ((distance % perimeter) + perimeter) % perimeter;
      if (d < straight) return { x: cx - straight / 2 + d, y: cy - radius };
      d -= straight;
      if (d < Math.PI * radius) {
        const a = -Math.PI / 2 + d / radius;
        return { x: cx + straight / 2 + radius * Math.cos(a), y: cy + radius * Math.sin(a) };
      }
      d -= Math.PI * radius;
      if (d < straight) return { x: cx + straight / 2 - d, y: cy + radius };
      d -= straight;
      const a = Math.PI / 2 + d / radius;
      return { x: cx - straight / 2 + radius * Math.cos(a), y: cy + radius * Math.sin(a) };
    };

    const trail: TrailPoint[] = [];
    const particles: Particle[] = [];
    let position = 0;
    let lastTime = 0;
    let visible = false;
    let running = false;
    let scrolling = false;
    let scrollTimer = 0;
    let skipFrame = false;

    const onScroll = () => {
      scrolling = true;
      clearTimeout(scrollTimer);
      scrollTimer = window.setTimeout(() => (scrolling = false), SCROLL_IDLE_MS);
    };

    const clear = () => {
      trail.length = 0;
      particles.length = 0;
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    };

    const frame = () => {
      const t = performance.now();
      if (!perimeter) {
        lastTime = t;
        return;
      }
      // Durante a rolagem desenha um quadro sim, um não. O movimento é por tempo (dt), então a
      // faísca mantém a velocidade e a rolagem ganha folga.
      skipFrame = scrolling && !skipFrame;
      if (skipFrame) return;
      const dt = Math.min(48, t - (lastTime || t));
      lastTime = t;
      const { heat } = state;

      position += (perimeter / LAP_MS) * dt * (1 + heat * 1.6);
      const { x: px, y: py } = pointAt(position);

      const before = pointAt(position - 1.5);
      const after = pointAt(position + 1.5);
      let tx = after.x - before.x;
      let ty = after.y - before.y;
      const length = Math.hypot(tx, ty) || 1;
      tx /= length;
      ty /= length;
      const nx = ty;
      const ny = -tx;

      trail.push({ x: px, y: py, t });
      while (trail.length && t - trail[0].t > TRAIL_MS) trail.shift();

      const spawnCount = (dt / 16) * (0.9 + heat * 2.4);
      for (let i = 0; i < spawnCount; i++) {
        if (i > 0 && Math.random() > spawnCount - i) break;
        const forward = (0.06 + Math.random() * 0.16) * scale;
        const sideways = (0.015 + Math.random() * 0.075) * scale;
        particles.push({
          x: px,
          y: py,
          vx: tx * forward + nx * sideways,
          vy: ty * forward + ny * sideways,
          t,
          life: 420 + Math.random() * 620,
          size: (0.9 + Math.random() * 1.5) * Math.max(0.75, scale),
        });
      }

      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      ctx.globalCompositeOperation = 'lighter'; // aditivo: é o que dá aspecto de luz
      ctx.lineCap = 'round';

      if (!outline) {
        outline = new Path2D();
        for (let d = 0; d <= perimeter; d += 6) {
          const q = pointAt(d);
          if (d === 0) outline.moveTo(q.x, q.y);
          else outline.lineTo(q.x, q.y);
        }
        outline.closePath();
      }
      ctx.lineWidth = 1;
      ctx.strokeStyle = `rgba(${NEON_RGB},${(0.1 + heat * 0.14).toFixed(3)})`;
      ctx.stroke(outline);

      for (let i = 1; i < trail.length; i++) {
        const a = trail[i - 1];
        const b = trail[i];
        const k = 1 - (t - b.t) / TRAIL_MS;
        if (k <= 0) continue;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.lineWidth = (2 + 10 * k * k) * scale;
        ctx.strokeStyle = `rgba(${NEON_RGB},${(0.16 * k * k * (1 + heat)).toFixed(3)})`;
        ctx.stroke();
        ctx.lineWidth = (1 + 2.2 * k * k) * scale;
        ctx.strokeStyle = `rgba(${LIGHT_RGB},${(0.5 * k * k * (1 + heat * 0.5)).toFixed(3)})`;
        ctx.stroke();
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const q = particles[i];
        const age = t - q.t;
        const progress = age / q.life;
        if (progress >= 1) {
          particles.splice(i, 1);
          continue;
        }
        const brake = 1 - (1 - Math.min(1, age / 900)) ** 2;
        const x = q.x + q.vx * age * (1 - brake * 0.55);
        const y = q.y + q.vy * age * (1 - brake * 0.55);
        const alpha = (1 - progress) * (1 - progress);
        ctx.fillStyle = `rgba(${LIGHT_RGB},${(alpha * 0.85).toFixed(3)})`;
        ctx.fillRect(x - q.size / 2, y - q.size / 2, q.size, q.size);
        ctx.fillStyle = `rgba(${NEON_RGB},${(alpha * 0.3).toFixed(3)})`;
        ctx.fillRect(x - q.size, y - q.size, q.size * 2, q.size * 2);
      }

      const headRadius = (11 + heat * 9) * scale * (1 + 0.12 * Math.sin(t / 110));
      ctx.drawImage(glowSprite, px - headRadius, py - headRadius, headRadius * 2, headRadius * 2);

      ctx.globalCompositeOperation = 'source-over';
    };

    const sync = () => {
      const shouldRun = visible && !document.hidden;
      if (shouldRun && !running) {
        lastTime = 0;
        gsap.ticker.add(frame);
        running = true;
      } else if (!shouldRun && running) {
        gsap.ticker.remove(frame);
        running = false;
        clear();
      }
    };

    const heatUp = () => gsap.to(state, { heat: 1, duration: 0.5, ease: 'power2.out', overwrite: true });
    const coolDown = () => gsap.to(state, { heat: 0, duration: 0.9, ease: 'power2.inOut', overwrite: true });

    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        sync();
      },
      { rootMargin: '20% 0px' },
    );
    // pega também a troca de rótulo no mobile e a chegada da fonte, não só o resize
    const resizeObserver = new ResizeObserver(measure);

    measure();
    // a largura da pílula vem do texto: antes da fonte de display trocar, o botão mede menos
    document.fonts?.ready.then(measure);
    observer.observe(el);
    resizeObserver.observe(el);
    document.addEventListener('visibilitychange', sync);
    window.addEventListener('scroll', onScroll, { passive: true });
    el.addEventListener('pointerenter', heatUp);
    el.addEventListener('pointerleave', coolDown);
    el.addEventListener('focus', heatUp);
    el.addEventListener('blur', coolDown);

    return () => {
      gsap.ticker.remove(frame);
      gsap.killTweensOf(state);
      observer.disconnect();
      resizeObserver.disconnect();
      document.removeEventListener('visibilitychange', sync);
      window.removeEventListener('scroll', onScroll);
      clearTimeout(scrollTimer);
      el.removeEventListener('pointerenter', heatUp);
      el.removeEventListener('pointerleave', coolDown);
      el.removeEventListener('focus', heatUp);
      el.removeEventListener('blur', coolDown);
    };
  }, []);

  const classes = [styles.spark, compact ? styles['spark--compact'] : '', className].filter(Boolean).join(' ');

  return (
    <a ref={buttonRef} href={href} className={classes} {...rest}>
      <canvas ref={canvasRef} className={styles.spark__canvas} aria-hidden="true" />
      <span className={styles.spark__ring} aria-hidden="true" />
      <span className={styles.spark__body}>
        <span className={styles.spark__label}>{children}</span>
        <svg className={styles.spark__arrow} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M5 12h13M12 5l7 7-7 7" />
        </svg>
      </span>
    </a>
  );
}
