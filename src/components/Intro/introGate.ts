'use client';

import { useEffect, useState } from 'react';

/**
 * Portão entre o intro e o hero.
 *
 * O hero monta normalmente (fonte, canvases, medidas — tudo pronto), mas a entrada do nome fica
 * PAUSADA e o loop de desenho fica PARADO enquanto o intro cobre a tela: nada de gastar GPU nem
 * de gastar o clímax atrás do overlay preto.
 *
 * Quem abre: o <Intro/> no começo da Fase 3 (reveal) — o nome sobe letra por letra enquanto o
 * preto abre. Sem intro (pulado, reduced motion, 2ª visita na sessão) o portão já nasce aberto,
 * então o hero nunca fica preso esperando um intro que não vai rodar.
 *
 * Módulo (não Context) porque o `layout.tsx` monta o <Intro/> como irmão do `{children}`: não há
 * um provider comum sem transformar o layout — e um Context aqui só criaria essa dependência.
 */

let open = true; // default: sem intro na página, o hero anima sozinho
const listeners = new Set<() => void>();

/** O <Intro/> chama isto na montagem, antes do primeiro paint do hero. */
export function closeIntroGate(): void {
  if (!open) return;
  open = false;
  listeners.forEach((l) => l());
}

/** Libera o hero: entrada do nome + loop de desenho. Idempotente. */
export function openIntroGate(): void {
  if (open) return;
  open = true;
  listeners.forEach((l) => l());
}

export function isIntroGateOpen(): boolean {
  return open;
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

/**
 * `true` quando o hero pode animar/desenhar.
 *
 * Não usa useSyncExternalStore: o portão é fechado pelo efeito do <Intro/>, que roda DEPOIS do
 * primeiro render do hero. Com um snapshot síncrono o hero leria `true`, começaria a desenhar e
 * só pararia no frame seguinte. Aqui o estado inicial é lido no efeito (já com o portão fechado),
 * então o hero nunca chega a rodar um frame atrás do overlay.
 */
export function useIntroGate(): boolean {
  const [value, setValue] = useState(false);

  useEffect(() => {
    setValue(open);
    return subscribe(() => setValue(open));
  }, []);

  return value;
}
