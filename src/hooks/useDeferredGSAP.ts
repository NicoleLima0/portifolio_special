'use client';

import { useEffect, type RefObject } from 'react';
import { gsap } from '@/lib/gsap';
import { runWhenNeeded } from '@/lib/deferred';

/**
 * useGSAP para o que fica abaixo da dobra: o setup (SplitText, ScrollTriggers) mede o layout e
 * não precisa disputar a carga inicial com a hidratação. Como o useGSAP sem dependências, roda
 * uma vez, com seletores limitados a `scope`, e reverte tudo ao desmontar.
 */
export function useDeferredGSAP(setup: () => void | (() => void), scope: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = scope.current;
    if (!el) return;
    let context: gsap.Context | undefined;
    const cancel = runWhenNeeded(el, () => {
      context = gsap.context(setup, el);
    });
    return () => {
      cancel();
      context?.revert();
    };
    // `setup` só lê refs; a versão da primeira montagem é a que vale.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope]);
}
