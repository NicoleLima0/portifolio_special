/**
 * Ritmo do intro — o ÚNICO lugar para mexer em TEMPO e EASING.
 * (CÂMERA, LUZES, MATERIAIS e GEOMETRIA ficam em ./three/sceneConfig.ts.)
 *
 * Orçamento (~6,5 s), tudo relativo ao início da timeline da cena:
 *   0,0 → 0,8 s   a cena aparece; câmera 3/4 afastada, empurrando devagar; tela já acesa
 *   0,8 → 2,4 s   digitação na tela do notebook
 *   2,4 → 3,0 s   resultados com stagger
 *   3,0 → 3,8 s   o cursor vai até o resultado e clica
 *   3,8 → 4,6 s   carregamento + o hero-shot aparece na tela; câmera chega frontal
 *   4,6 → 6,2 s   mergulho até a tela cobrir a viewport
 *   6,2 → 6,5 s   cross-fade para o hero real
 */

/** Coordenadas do canvas da tela (1600x1000) — ver three/screenTexture.ts. */
export const SEARCH = {
  query: 'desenvolvedora de sites teresópolis',
  typing: { start: 0.8, duration: 1.6 },
  results: { start: 2.4, duration: 0.6, ease: 'power2.out' },
  /** O cursor entra pela direita e curva até o título do resultado. */
  cursor: {
    start: 3.0,
    duration: 0.7,
    ease: 'power3.inOut',
    from: [1480, 880] as const,
    via: [1100, 640] as const,
    to: [430, 404] as const,
  },
  ripple: { start: 3.68, duration: 0.5 },
  loading: { start: 3.8, duration: 0.55 },
  hero: { start: 4.0, duration: 0.6, ease: 'power2.out' },
} as const;

/** Tempos da cena 3D. */
export const SCENE = {
  /** Câmera: 3/4 → frontal. */
  toFront: { start: 0.2, duration: 4.2, ease: 'power2.inOut' },
  /** Câmera: mergulho dentro da tela. */
  dive: { start: 4.6, duration: 1.6, ease: 'power3.inOut' },
} as const;

/** Contador de loading (progresso real dos assets da cena). */
export const LOADING = {
  /**
   * Piso do contador. Baixo de propósito: a cena deve aparecer junto com o fundo, não depois
   * de segundos de tela vazia. Se o glb ainda não chegou, o contador segura no máximo isto.
   */
  min: 0.4,
  /** Teto: passou disto sem carregar, pula a intro direto para o hero. */
  timeout: 6,
  /** Subida suave até 100 quando o load fecha antes. */
  catchUp: 0.4,
  /** Saída do contador quando chega a 100. */
  out: { duration: 0.4, ease: 'power2.in' },
} as const;

/** Emenda final com o hero. */
export const HANDOFF = {
  /** Fração do mergulho em que o portão do hero abre (a tela já é quase a viewport). */
  gateAt: 0.88,
  /**
   * Duração do whiteout: a tela dissolve para branco no FIM do mergulho. Não há cross-fade
   * entre a tela e o hero real — ele deixava os dois NICOLE sobrepostos, porque o print é
   * fixo e o hero é responsivo. Quando o quadro está branco, o overlay sai e o hero entra
   * com a própria animação.
   */
  whiteout: 0.35,
} as const;

/** Camadas do fundo (tudo dirigido pelo master; ver screenState.ts para a regra). */
export const LAYERS = {
  /** Objetos 3D: pop-in elástico em stagger, enquanto a câmera vira. */
  emojis: { start: 0.5, duration: 1.4 },
  /** Pulinho de todos no "Enter" da busca. */
  jump: { start: 2.42, duration: 0.45 },
  /** Quique no clique do resultado. */
  bounce: { start: 3.66, duration: 0.6 },
  /** Fly-through: passam voando pela câmera no mergulho. */
  fly: { start: 4.6, duration: 1.1 },
  /** Varredura de luz na tela, quando o hero-shot aparece. */
  sweep: { start: 4.0, duration: 0.8 },
  /** Partículas sugadas para dentro da tela no clique. */
  suck: { start: 3.68, duration: 0.6 },
  /** Fundo lavanda → branco, e saída dos cards/tipografia. */
  dissolve: { start: 4.6, duration: 1.4 },
} as const;

/** Entrada do overlay (só o conteúdo; o fundo já nasce opaco pelo CSS). */
export const BACKDROP = { duration: 0.4, ease: 'power2.out' } as const;

// ---------------------------------------------------------------------------
// Variações de contexto
// ---------------------------------------------------------------------------

/** Mobile: sem bokeh, DPR ≤ 1,5, câmera mais afastada (ver sceneConfig). */
export const MOBILE_BP = 768;

/** 2ª visita na sessão: a mesma encenação, acelerada para caber em ~1 s. */
export const SHORT_TIMESCALE = 6.5;

/** `prefers-reduced-motion`: sem cena 3D, só um fade curto. */
export const REDUCED_FADE = 0.35;

/** "Pular": fade rápido do overlay. */
export const SKIP_FADE = 0.3;
