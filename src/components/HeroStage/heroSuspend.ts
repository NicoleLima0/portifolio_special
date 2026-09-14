'use client';

import { createContext, useContext } from 'react';

/** true quando a transição já cobriu o hero de preto: o loop do hero pode parar de desenhar. */
export const HeroSuspendContext = createContext(false);

export function useHeroSuspended(): boolean {
  return useContext(HeroSuspendContext);
}
