'use client';

import { useEffect, useState, type RefObject } from 'react';

/** true enquanto o elemento intersecta a viewport — usado para pausar loops de rAF. */
export function useInView(target: RefObject<Element | null>, rootMargin = '0px'): boolean {
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = target.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { rootMargin });
    io.observe(el);
    return () => io.disconnect();
  }, [target, rootMargin]);

  return inView;
}
