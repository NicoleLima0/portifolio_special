import { HANDOFF, SCENE, SEARCH } from '../introTiming';
import type { ScreenState } from './screenTexture';

/**
 * O que a tela mostra num instante `t` da timeline — FUNÇÃO PURA DO TEMPO.
 *
 * Por que isto existe: antes cada fase (digitação, resultados, cursor…) vivia no `onUpdate` de
 * um tween próprio. Tweens não disparam `onUpdate` num `seek()`, então o conteúdo da tela
 * ficava congelado enquanto a câmera obedecia — e o modo de captura mostrava sempre o mesmo
 * frame. Calculando tudo a partir de `t`, reprodução normal e seek mostram exatamente o mesmo.
 *
 * Nada de setTimeout, setInterval, rAF ou timeline paralela aqui dentro.
 */

/** Interpolação 0→1 numa janela, com clamp nas pontas. */
function phase(t: number, start: number, duration: number): number {
  if (duration <= 0) return t >= start ? 1 : 0;
  return Math.max(0, Math.min(1, (t - start) / duration));
}

/** power2.out — o mesmo easing usado nos tweens, para o olhar não perceber diferença. */
const easeOut = (p: number) => 1 - Math.pow(1 - p, 2);
/** power3.inOut, para o percurso do cursor. */
const easeInOut = (p: number) =>
  p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;

export function screenStateAt(t: number): ScreenState {
  // --- Digitação: letra a letra, em ritmo linear sobre a janela ---
  const typeP = phase(t, SEARCH.typing.start, SEARCH.typing.duration);
  const chars = Math.round(typeP * SEARCH.query.length);
  const typed = SEARCH.query.slice(0, chars);

  // --- Resultados entrando ---
  const results = easeOut(phase(t, SEARCH.results.start, SEARCH.results.duration));

  // --- Cursor: Bézier quadrática até o título do resultado ---
  const curP = phase(t, SEARCH.cursor.start, SEARCH.cursor.duration);
  let cursor: ScreenState['cursor'] = null;
  if (curP > 0 && t < SEARCH.loading.start) {
    const e = easeInOut(curP);
    const [x0, y0] = SEARCH.cursor.from;
    const [x1, y1] = SEARCH.cursor.via;
    const [x2, y2] = SEARCH.cursor.to;
    const mt = 1 - e;
    cursor = {
      x: mt * mt * x0 + 2 * mt * e * x1 + e * e * x2,
      y: mt * mt * y0 + 2 * mt * e * y1 + e * e * y2,
    };
  }

  // --- Clique: a onda sai do ponto onde o cursor parou ---
  const ripple = easeOut(phase(t, SEARCH.ripple.start, SEARCH.ripple.duration));

  // --- Carregamento e hero entrando ---
  const loading = phase(t, SEARCH.loading.start, SEARCH.loading.duration);
  const hero = easeOut(phase(t, SEARCH.hero.start, SEARCH.hero.duration));

  // --- Whiteout: nos últimos instantes do mergulho a tela dissolve para o branco do hero ---
  const whiteStart = SCENE.dive.start + SCENE.dive.duration - HANDOFF.whiteout;
  const whiteout = easeOut(phase(t, whiteStart, HANDOFF.whiteout));

  return { typed, results, cursor, ripple, loading, hero, whiteout };
}
