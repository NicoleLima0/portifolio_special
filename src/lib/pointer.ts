'use client';

/**
 * Ponteiro global em coordenadas de viewport. Um único listener passivo, ligado só enquanto
 * houver quem use (contagem de referência). Lido nos loops, nunca gera re-render.
 */
export const viewportPointer = {
  x: -9999,
  y: -9999,
  /** performance.now() do último movimento (0 = nunca moveu) */
  last: 0,
};

let users = 0;

const onMove = (e: PointerEvent) => {
  if (e.pointerType === 'touch') return; // efeitos de cursor são só para mouse/caneta
  viewportPointer.x = e.clientX;
  viewportPointer.y = e.clientY;
  viewportPointer.last = performance.now();
};

export function retainPointer(): () => void {
  if (users++ === 0) window.addEventListener('pointermove', onMove, { passive: true });
  return () => {
    if (--users === 0) window.removeEventListener('pointermove', onMove);
  };
}
