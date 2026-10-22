'use client';

import { useCallback, useEffect, useState } from 'react';
import { closeIntroGate } from './introGate';
import IntroOverlay, { type IntroMode } from './IntroOverlay';
import { site } from '@/lib/site';

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

    // reduced motion vence tudo; 2ª visita (quando forçada) roda a versão curta.
    const mode: IntroMode = reduced ? 'reduced' : played ? 'short' : 'full';

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

  return (
    <IntroOverlay
      mode={state.mode}
      // O card mostra o resultado de busca REAL do site: mesmo texto do <title> e da meta
      // description (src/lib/site.ts), então o que aparece aqui nunca diverge do SEO.
      title={site.title}
      url={site.url.replace(/^https?:\/\//, '')}
      description={site.description}
      onDone={onDone}
    />
  );
}
