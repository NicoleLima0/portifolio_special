'use client';

import { useEffect } from 'react';
import Lenis from 'lenis';
import { gsap, ScrollTrigger } from '@/lib/gsap';
import { scrollState } from '@/lib/scroll';

/**
 * Scroll com inércia (Lenis) sincronizado ao ScrollTrigger, rodando no mesmo gsap.ticker que
 * todo o resto (um único rAF na página). Desligado com prefers-reduced-motion.
 * Em touch o Lenis mantém o scroll nativo (syncTouch: false) — sem inércia artificial no celular.
 */
export default function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const lenis = new Lenis({ autoRaf: false, anchors: true, lerp: 0.1 });
    scrollState.lenis = lenis;
    const offScroll = lenis.on('scroll', ScrollTrigger.update);

    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(raf);
      gsap.ticker.lagSmoothing(500, 33);
      offScroll();
      lenis.destroy();
      scrollState.lenis = null;
    };
  }, []);

  return null;
}
