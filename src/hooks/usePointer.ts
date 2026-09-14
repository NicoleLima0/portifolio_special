'use client';

import { useEffect, useRef, type RefObject } from 'react';

export type Pointer = {
  /** px CSS relativos ao elemento alvo */
  x: number;
  y: number;
  /** performance.now() do último movimento */
  last: number;
};

/**
 * Ponteiro compartilhado relativo ao elemento alvo.
 * Um único listener global (passive) — as camadas do hero leem o mesmo objeto mutável,
 * sem re-render. Começa fora da tela para nada aparecer antes do 1º movimento.
 */
export function usePointer(target: RefObject<HTMLElement | null>): RefObject<Pointer> {
  const pointer = useRef<Pointer>({ x: -1000, y: -1000, last: 0 });

  useEffect(() => {
    const el = target.current;
    if (!el) return;

    // Posição do alvo na viewport, cacheada e só remedida depois de scroll/resize (1 leitura por
    // movimento no máximo). Funciona com o hero pinado: não assume que ele rola com a página.
    let left = 0;
    let top = 0;
    let dirty = true;
    const markDirty = () => {
      dirty = true;
    };

    const onMove = (e: PointerEvent) => {
      if (dirty) {
        const rect = el.getBoundingClientRect();
        left = rect.left;
        top = rect.top;
        dirty = false;
      }
      const p = pointer.current;
      p.x = e.clientX - left;
      p.y = e.clientY - top;
      p.last = performance.now();
    };

    const ro = new ResizeObserver(markDirty);
    ro.observe(el);
    window.addEventListener('scroll', markDirty, { passive: true });
    window.addEventListener('resize', markDirty);
    window.addEventListener('pointermove', onMove, { passive: true });

    return () => {
      ro.disconnect();
      window.removeEventListener('scroll', markDirty);
      window.removeEventListener('resize', markDirty);
      window.removeEventListener('pointermove', onMove);
    };
  }, [target]);

  return pointer;
}
