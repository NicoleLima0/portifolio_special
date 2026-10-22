/**
 * Ritmo do intro "busca dentro do notebook → clique → abre o portfólio".
 * Este é o ÚNICO lugar para mexer em duração e easing: a timeline em IntroOverlay.tsx lê tudo
 * daqui, então ajustar um número muda a animação inteira sem caçar valores pelos componentes.
 *
 * Orçamento (~8,6 s) — ritmo calmo, dá tempo de ler cada etapa:
 *   Fase 0  0,0 → 1,1 s   a cena entra: cenário + notebook se acomodam
 *   Fase 1  1,1 → 2,1 s   a barra de busca surge dentro da tela
 *   Fase 2  2,1 → 4,5 s   digitação letra a letra + sugestões
 *   Fase 3  4,5 → 5,2 s   "Enter": pulso, sugestões saem, barra sobe
 *   Fase 4  5,2 → 6,4 s   resultados entram com stagger
 *   Fase 5  6,4 → 7,6 s   cursor percorre a curva, hover e clique
 *   Fase 6  7,6 → 8,6 s   a câmera entra na tela + Flip até a viewport + cross-fade
 */

// ---------------------------------------------------------------------------
// Fase 0 — a cena entra
// ---------------------------------------------------------------------------

export const SCENE_IN = {
  /** O conjunto do notebook chega: leve escala + subida. */
  rig: { duration: 1.1, ease: 'power3.out', scaleFrom: 0.9, yFrom: 40 },
  /** Inclinação de repouso da tampa (negativo = topo recuando). */
  tiltDeg: -9,
  /** Blobs e partículas do cenário entram com stagger. */
  props: { duration: 1.2, stagger: 0.12, ease: 'power2.out' },
  /** Respiração contínua do conjunto (loop suave durante todo o intro). */
  float: { duration: 4.5, ease: 'sine.inOut', amount: 10 },
} as const;

// ---------------------------------------------------------------------------
// Fase 1 — a barra de busca aparece (dentro da tela)
// ---------------------------------------------------------------------------

export const BAR_IN = {
  start: 1.1, // s absolutos
  duration: 0.9,
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
  duration: 2.1,
  /** Variação humana: cada letra varia em torno do intervalo médio. */
  jitter: 0.45,
  /** Pausa curta no meio da frase (depois do nome), como quem pensa. */
  pause: { afterChars: 11, duration: 0.35 },
  /** Piscar do cursor de texto. */
  caret: { duration: 0.5 },
} as const;

export const SUGGESTIONS = {
  start: 2.9, // s absolutos: entram enquanto ainda digita
  duration: 0.5,
  stagger: 0.1,
  ease: 'power2.out',
  yFrom: 8,
} as const;

// ---------------------------------------------------------------------------
// Fase 3 — "Enter"
// ---------------------------------------------------------------------------

export const SUBMIT = {
  /** Espera depois da última letra, antes de "apertar Enter". */
  hold: 0.35,
  /** Pulso da barra: 1 → 1,02 → 1. */
  pulse: { scale: 1.02, duration: 0.2, ease: 'power2.inOut' },
  /** Sugestões saem. */
  suggestionsOut: { duration: 0.28, ease: 'power2.in', stagger: 0.04 },
  /** A barra sobe para o topo da tela. */
  rise: { duration: 0.75, ease: 'power3.inOut' },
} as const;

// ---------------------------------------------------------------------------
// Fase 4 — resultados
// ---------------------------------------------------------------------------

export const RESULTS = {
  duration: 0.8,
  stagger: 0.14,
  ease: 'power2.out',
  yFrom: 24,
  blurFrom: 8, // px
  /** Respiro depois que todos entraram, antes do cursor aparecer. */
  hold: 0.3,
} as const;

// ---------------------------------------------------------------------------
// Fase 5 — cursor, hover e clique
// ---------------------------------------------------------------------------

export const CURSOR = {
  /** Percurso até o card (curva montada em IntroOverlay.tsx). */
  travel: { duration: 1.1, ease: 'power3.inOut' },
  /** Hover do card: leve elevação. */
  hover: { duration: 0.35, ease: 'power2.out', lift: -6 },
  /** Espera no hover antes do clique: deixa ler o resultado. */
  dwell: 0.45,
  /** Clique: 1 → 0,85 → 1. */
  click: { scale: 0.85, duration: 0.14, ease: 'power2.inOut' },
  /** Onda circular saindo do ponto do clique. */
  ripple: { duration: 0.75, ease: 'power2.out', scale: 14 },
  /** Saída do cursor depois do clique. */
  out: { duration: 0.3, ease: 'power2.in' },
} as const;

// ---------------------------------------------------------------------------
// Fase 6 — a câmera entra na tela e o card vira página
// ---------------------------------------------------------------------------

export const EXPAND = {
  /** A câmera mergulha: o notebook cresce até a tela encher a viewport. */
  dive: { duration: 1.0, ease: 'expo.inOut' },
  /** Flip do card até cobrir a tela, já com o branco do hero. */
  duration: 0.9,
  ease: 'expo.inOut',
  /** O conteúdo do card some antes de ele terminar de crescer. */
  contentOut: { duration: 0.35, ease: 'power2.in' },
  /** O resto (barra, outros resultados, cenário) sai com blur + fade. */
  restOut: { duration: 0.5, ease: 'power2.in', blur: 12 },
  /** Fração da expansão em que o portão do hero abre (o hero pinta por baixo). */
  gateAt: 0.6,
  /** Cross-fade final: dissolve o overlay por cima do hero já pintado. */
  crossfade: { duration: 0.3, ease: 'power2.out' },
} as const;

// ---------------------------------------------------------------------------
// Variações de contexto
// ---------------------------------------------------------------------------

/** Mobile: notebook sem rotação 3D pesada, sem cursor (só ripple + Flip). */
export const MOBILE_BP = 768;

/** 2ª visita na sessão: a mesma encenação acelerada para caber em ~1 s. */
export const SHORT_TIMESCALE = 8;

/** `prefers-reduced-motion`: sem digitação nem cursor, só um fade curto. */
export const REDUCED_FADE = 0.35;

/** "Pular": fade rápido do overlay. */
export const SKIP_FADE = 0.3;
