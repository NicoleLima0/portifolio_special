'use client';

import { useCallback, useEffect, useState } from 'react';
import { closeIntroGate } from './introGate';
import IntroOverlay, { type IntroMode } from './IntroOverlay';

const SESSION_KEY = 'nicole:intro-played';

/**
 * Casca do intro: decide SE e COMO o overlay roda, e sai da frente.
 *
 * A decisão é tomada uma vez, num efeito (antes do hero começar a desenhar) — assim o overlay
 * nunca é montado para quem não vai vê-lo, e o portão do hero é fechado antes do primeiro paint.
 * Toda a encenação vive em IntroOverlay.tsx.
 */
export default function Intro() {
  const [state, setState] = useState<{ active: boolean; mode: IntroMode } | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const forced = params.get('intro');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let played = false;
    try {
      played = sessionStorage.getItem(SESSION_KEY) === '1';
    } catch {
      /* sessionStorage bloqueado: trata como primeira visita */
    }

    // ?intro=0 pula, ?intro=1 força (dev). Fora isso: só na primeira visita da sessão.
    const show = forced === '1' || (forced !== '0' && !played);

    // reduced motion vence tudo. `?intro=1` é o atalho de dev para ver a encenação INTEIRA,
    // então ele também vence o 'short' da 2ª visita — senão, depois de ver o intro uma vez,
    // forçar passava a mostrar só a versão acelerada.
    const forcedFull = forced === '1';
    const mode: IntroMode = reduced ? 'reduced' : played && !forcedFull ? 'short' : 'full';

    if (show) closeIntroGate(); // fecha ANTES do hero começar a desenhar
    setState({ active: show, mode });
  }, []);

  const onDone = useCallback(() => {
    try {
      sessionStorage.setItem(SESSION_KEY, '1');
    } catch {
      /* ignora */
    }
    setState({ active: false, mode: 'full' });
  }, []);

  if (!state?.active) return null;

  return <IntroOverlay mode={state.mode} onDone={onDone} />;
}
