'use client';

type Task = () => void;

const queue: Task[] = [];
let scheduled = false;

function schedule() {
  if (scheduled || !queue.length) return;
  scheduled = true;
  if ('requestIdleCallback' in window) window.requestIdleCallback(drain, { timeout: 1500 });
  else setTimeout(drain, 200); // Safari
}

// Uma tarefa por período ocioso: juntas, elas formavam uma única tarefa longa na carga.
function drain() {
  scheduled = false;
  queue.shift()?.();
  schedule();
}

/**
 * Roda `run` no primeiro momento ocioso ou assim que `el` entrar na tela, o que vier antes.
 * Retorna a função que cancela.
 */
export function runWhenNeeded(el: Element, run: () => void): () => void {
  let settled = false;

  const settle = () => {
    settled = true;
    observer.disconnect();
    const index = queue.indexOf(fire);
    if (index >= 0) queue.splice(index, 1);
  };
  const fire = () => {
    if (settled) return;
    settle();
    run();
  };

  // -1px: uma seção colada na borda de baixo conta como "intersectando" mesmo sem aparecer.
  const observer = new IntersectionObserver(([entry]) => entry.isIntersecting && fire(), {
    rootMargin: '-1px 0px',
  });
  observer.observe(el);
  queue.push(fire);
  schedule();

  return settle;
}
