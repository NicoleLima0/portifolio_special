/**
 * Ritmo do intro "busca → clique → abre o portfólio".
 * Este é o ÚNICO lugar para mexer em duração e easing: a timeline em IntroOverlay.tsx lê tudo
 * daqui, então ajustar um número muda a animação inteira sem caçar valores pelos componentes.
 *
 * Orçamento (~5 s):
 *   Fase 1  0,0 → 0,6 s   a barra de busca surge (fade + scale + blur saindo)
 *   Fase 2  0,6 → 2,0 s   digitação letra a letra + sugestões com stagger
 *   Fase 3  2,0 → 2,3 s   "Enter": pulso na barra, sugestões saem, barra sobe
 *   Fase 4  2,3 → 3,1 s   resultados entram com stagger (y + opacity + blur)
 *   Fase 5  3,1 → 3,9 s   cursor percorre a curva, hover e clique com ripple
 *   Fase 6  3,9 → 5,0 s   Flip do card até a viewport + cross-fade para o hero
 */

// ---------------------------------------------------------------------------
// Fase 1 — a barra de busca aparece
// ---------------------------------------------------------------------------

export const BAR_IN = {
  duration: 0.6,
  ease: 'power2.out',
  scaleFrom: 0.96,
  blurFrom: 10, // px — sai para 0
} as const;

// ---------------------------------------------------------------------------
// Fase 2 — digitação + sugestões
// ---------------------------------------------------------------------------

export const TYPING = {
  /** O que é digitado na barra. */
  query: 'nicole lima desenvolvedora de sites',
  /** Janela total da digitação. O ritmo por letra é derivado disto. */
  duration: 1.2,
  /** Variação humana: cada letra sorteia entre -VAR e +VAR do intervalo médio. */
  jitter: 0.45,
  /** Pausa curta no meio da frase (depois do nome), como quem pensa. */
  pause: { afterChars: 11, duration: 0.18 },
  /** Piscar do cursor de texto. */
  caret: { duration: 0.5 },
} as const;

export const SUGGESTIONS = {
  start: 0.75, // s absolutos: entram enquanto ainda digita
  duration: 0.4,
  stagger: 0.07,
  ease: 'power2.out',
  yFrom: 8,
} as const;

// ---------------------------------------------------------------------------
// Fase 3 — "Enter"
// ---------------------------------------------------------------------------

export const SUBMIT = {
  /** Pulso da barra: 1 → 1,02 → 1. */
  pulse: { scale: 1.02, duration: 0.16, ease: 'power2.inOut' },
  /** Sugestões saem. */
  suggestionsOut: { duration: 0.2, ease: 'power2.in', stagger: 0.03 },
  /** A barra sobe para o topo. */
  rise: { duration: 0.55, ease: 'power3.inOut' },
} as const;

// ---------------------------------------------------------------------------
// Fase 4 — resultados
// ---------------------------------------------------------------------------

export const RESULTS = {
  duration: 0.55,
  stagger: 0.09,
  ease: 'power2.out',
  yFrom: 24,
  blurFrom: 8, // px
} as const;

// ---------------------------------------------------------------------------
// Fase 5 — cursor, hover e clique
// ---------------------------------------------------------------------------

export const CURSOR = {
  /** Percurso até o card (curva definida em FakeCursor.tsx). */
  travel: { duration: 0.75, ease: 'power3.inOut' },
  /** Hover do card: leve elevação. */
  hover: { duration: 0.25, ease: 'power2.out', lift: -6 },
  /** Clique: 1 → 0,85 → 1. */
  click: { scale: 0.85, duration: 0.12, ease: 'power2.inOut' },
  /** Onda circular saindo do ponto do clique. */
  ripple: { duration: 0.6, ease: 'power2.out', scale: 14 },
  /** Saída do cursor depois do clique. */
  out: { duration: 0.25, ease: 'power2.in' },
} as const;

// ---------------------------------------------------------------------------
// Fase 6 — Flip do card até a viewport + emenda com o hero
// ---------------------------------------------------------------------------

export const EXPAND = {
  /** Flip do card: cresce até cobrir a tela. */
  duration: 0.85,
  ease: 'expo.inOut',
  /** O conteúdo do card some antes de ele terminar de crescer. */
  contentOut: { duration: 0.3, ease: 'power2.in' },
  /** O resto (barra + outros resultados) sai com blur + fade. */
  restOut: { duration: 0.4, ease: 'power2.in', blur: 12 },
  /** Fração da expansão em que o portão do hero abre (o hero pinta por baixo). */
  gateAt: 0.6,
  /** Cross-fade final: dissolve o overlay por cima do hero já pintado. */
  crossfade: { duration: 0.3, ease: 'power2.out' },
} as const;

// ---------------------------------------------------------------------------
// Variações de contexto
// ---------------------------------------------------------------------------

/** Mobile: barra na largura útil, texto menor, sem cursor (só ripple + Flip). */
export const MOBILE_BP = 768;

/** 2ª visita na sessão: a mesma encenação acelerada para caber em ~1 s. */
export const SHORT_TIMESCALE = 5;

/** `prefers-reduced-motion`: sem digitação nem cursor, só um fade curto. */
export const REDUCED_FADE = 0.35;

/** "Pular": fade rápido do overlay. */
export const SKIP_FADE = 0.3;
