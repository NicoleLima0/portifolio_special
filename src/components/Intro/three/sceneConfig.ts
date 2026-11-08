/**
 * Configuração da cena 3D do intro — CÂMERA, LUZES, MATERIAIS e GEOMETRIA num lugar só.
 * (Os TEMPOS e EASES ficam em ../introTiming.ts.)
 *
 * Direção de arte: estúdio CLARO. Fundo quase branco com um toque de lavanda, sem horizonte
 * visível, luz suave e nenhum hotspot saturado.
 */

// Tokens espelhados (ver src/styles/_tokens.scss). Three.js não lê CSS custom properties.
export const TOKENS = {
  violet: '#a668ff',
  cyan: '#38e8ff',
  magenta: '#ff2e97',
  bgDeep: '#0b0612',
  white: '#ffffff',
} as const;

/** Fundo do estúdio: branco com ~12% de violeta. É também a cor do fog (não há horizonte). */
export const STUDIO_BG = '#f0ebfa';

// ---------------------------------------------------------------------------
// Geometria do modelo (Laptop by J-Toastie, CC-BY via Poly Pizza)
// ---------------------------------------------------------------------------

export const LAPTOP = {
  // Normalização medida com `node scripts/inspect-glb.mjs`: leva a largura para ~0.32,
  // centra em XZ e apoia a base no chão (y = 0).
  modelScale: 0.2305,
  modelOffset: [0.0469, -0.0009, 0.006] as const,
  /** A tela do modelo encara −X; este yaw a vira para a câmera (+Z). */
  modelYaw: -Math.PI / 2,

  /**
   * A TELA, medida pelo bounding box do material group "Screen" no .glb e já convertida para
   * o espaço da cena (depois de scale/offset/yaw).
   *
   * Um PLANO SEPARADO é desenhado aqui, meio milímetro à frente da superfície: depender do UV
   * do modelo deixava a textura esticada e cortada, porque a ilha da tela não ocupa 0–1.
   */
  screen: {
    /**
     * A TELA, descrita por uma BASE ORTONORMAL e os limites da área útil — não por rotações.
     *
     * Rotação (Euler ou quaternion) não serve aqui: `setFromUnitVectors` alinha a normal mas
     * deixa o ROLL em torno dela indefinido, e o plano aparecia girado ~9° sobre a moldura.
     * Com os 4 cantos construídos a partir de u/v/n não existe ângulo para errar.
     *
     * Tudo medido no .glb (ver scripts/inspect-glb.mjs) no espaço LOCAL do modelo:
     *   n = normal média das faces frontais da tela
     *   u = horizontal da tela (é o Z local; o X é quase paralelo a n e não serve de base)
     *   v = n × u, invertido para apontar para cima
     */
    basis: {
      n: [0.99557, 0.094, 0] as const,
      u: [0, 0, 1] as const,
      v: [-0.094, 0.99557, 0] as const,
    },
    /** Limites da área útil projetados em u e v, já com 1% de recuo de cada lado. */
    rect: {
      u0: -0.67496,
      u1: 0.62306,
      v0: 0.14371,
      v1: 0.95809,
      /** Distância do plano da tela ao longo de n (constante: a face é plana). */
      n: -0.5926,
    },
    /** Deslocamento ao longo de n, para o plano ficar à frente da face. */
    offset: 0.0005,
    /**
     * Centro da tela em coordenadas da CENA (scale → yaw → offset), alvo do mergulho.
     * Derivado do centro de `rect`; se um mudar, recalcule o outro.
     */
    centerWorld: [0.0529, 0.1145, -0.1418] as const,
    /** Tamanho da área útil em unidades de CENA (span × modelScale), para o "cover". */
    sizeWorld: [0.29919, 0.18771] as const,
  },
} as const;

// ---------------------------------------------------------------------------
// Câmera
// ---------------------------------------------------------------------------

export const CAMERA = {
  fov: 34,
  near: 0.01,
  far: 20,

  /**
   * Início: 3/4, levemente alta. A distância é calculada em LaptopScene para o notebook
   * INTEIRO caber no frame com margem, em qualquer aspect (ver `fitDistance`).
   */
  // O `look` é o CENTRO REAL do modelo em cena (bbox + scale/yaw/offset), não a origem:
  // mirar em x=0 deslocava o notebook para a direita nas poses de 3/4.
  start: { dir: [0.42, 0.38, 0.95] as const, look: [0.0529, 0.108, -0.041] as const },
  /** Frontal, alinhada com a tela. */
  front: { dir: [0, 0.16, 1] as const, look: [0.0529, 0.112, -0.041] as const },
  /** Margem em volta do notebook no enquadramento inicial (1 = encosta nas bordas). */
  fitMargin: 1.6,

  /** Mobile: um pouco mais afastada. */
  mobilePullback: 1.25,
  /** Parallax com o ponteiro (desligado no mobile). */
  parallax: { amount: 0.015, ease: 0.06 },
  /**
   * Folga do enquadramento final: 1.0 = a tela encosta exatamente nas bordas da viewport.
   * Um pouco abaixo de 1 garante que não sobre moldura em nenhum aspect.
   */
  diveCover: 0.98,
} as const;

// ---------------------------------------------------------------------------
// Luzes: estúdio claro, sem hotspot.
// ---------------------------------------------------------------------------

export const LIGHTS = {
  /** Ambiente alto: a cena é clara, as sombras são suaves. */
  ambient: { intensity: 1.15 },
  /** Key branca levemente quente, de cima e à frente. */
  key: {
    pos: [0.3, 0.55, 0.42] as const,
    intensity: 1.5,
    color: '#fff6ec',
    shadowBias: -0.0004,
    shadowMapSize: 1024,
    shadowRadius: 8,
  },
  /** Fill frio e suave, do lado oposto. */
  fill: {
    pos: [-0.45, 0.3, 0.3] as const,
    intensity: 0.55,
    color: '#eef4ff',
  },
  /** Rim ciano bem discreta, atrás, só para desenhar o contorno da tampa. */
  // Rim ciano MUITO fraca e vinda de trás/alto: só desenha o contorno da tampa. Com
  // intensidade alta ela tingia o teclado e a base inteiros de azul.
  rim: {
    pos: [-0.25, 0.6, -0.55] as const,
    intensity: 0.1,
    color: TOKENS.cyan,
  },
} as const;

// ---------------------------------------------------------------------------
// Materiais
// ---------------------------------------------------------------------------

export const MATERIALS = {
  /** Alumínio space gray. */
  shell: { color: '#908d96', roughness: 0.35, metalness: 0.6 },
  /** Moldura da tela: mais escura e fosca. */
  bezel: { color: '#3a3542', roughness: 0.5, metalness: 0.45 },
  /** Teclado: space gray neutro, um pouco mais escuro que a base. */
  key: { color: '#55535a', roughness: 0.68, metalness: 0.18 },
  trackpad: { color: '#6e6c73', roughness: 0.4, metalness: 0.15 },
  /** Chão: recebe a sombra e some no fundo (sem horizonte). */
  floor: { color: STUDIO_BG, roughness: 0.85, metalness: 0.05 },
} as const;

// ---------------------------------------------------------------------------
// Camadas do fundo
// ---------------------------------------------------------------------------

/** Aurora: o fluido da marca, num plano grande atrás do notebook. */
export const AURORA = {
  position: [0.0529, 0.16, -0.62] as const,
  size: [2.0, 1.2] as const,
  sizeMobile: [1.4, 0.9] as const,
  /** Opacidade base sobre o lavanda; o mergulho a aumenta (uBoost). */
  opacity: 0.3,
} as const;



/**
 * Emojis 3D do intro — arte dos Fluent Emoji da Microsoft (MIT).
 * Ver public/intro/emoji/LICENSE.md para a atribuição e a origem de cada arquivo.
 */
export const EMOJIS = [
  { src: '/intro/emoji/lupa.webp' },
  { src: '/intro/emoji/foguete.webp' },
  { src: '/intro/emoji/raio.webp' },
  { src: '/intro/emoji/balao.webp' },
  { src: '/intro/emoji/sparkles.webp' },
  { src: '/intro/emoji/coracao.webp' },
] as const;

/**
 * Onde cada emoji fica, em COORDENADAS DE TELA (0–1 da largura/altura) e numa profundidade.
 *
 * Declarar em fração de tela e converter com `unproject` (ver FloatingEmojis) garante que
 * todos caiam dentro do frustum sem mexer no fov nem no enquadramento. As faixas evitam o
 * centro, onde fica a tela do notebook: x ≤ 0.2 ou x ≥ 0.8.
 */
export const EMOJI_LAYOUT = [
  // Perto
  { screen: [0.11, 0.3] as const, depth: 0.42, scale: 0.09, bobAmp: 0.012, bobSpeed: 0.5, phase: 0.0, jumpScale: 1.0, bounceScale: 1.5 },
  { screen: [0.88, 0.26] as const, depth: 0.45, scale: 0.085, bobAmp: 0.01, bobSpeed: 0.62, phase: 1.1, jumpScale: 0.9, bounceScale: 0.6 },
  // Meio
  { screen: [0.17, 0.72] as const, depth: 0.6, scale: 0.075, bobAmp: 0.014, bobSpeed: 0.44, phase: 2.3, jumpScale: 1.1, bounceScale: 0.6 },
  { screen: [0.84, 0.68] as const, depth: 0.62, scale: 0.07, bobAmp: 0.011, bobSpeed: 0.56, phase: 3.0, jumpScale: 0.95, bounceScale: 0.6 },
  // Longe
  { screen: [0.08, 0.52] as const, depth: 0.85, scale: 0.065, bobAmp: 0.013, bobSpeed: 0.48, phase: 4.2, jumpScale: 1.05, bounceScale: 0.6 },
  { screen: [0.93, 0.46] as const, depth: 0.88, scale: 0.06, bobAmp: 0.015, bobSpeed: 0.4, phase: 5.1, jumpScale: 1.0, bounceScale: 0.6 },
] as const;

/**
 * Composição das nuvens, em 3 camadas de profundidade.
 *
 * `layer` dirige o comportamento no mergulho: só a camada `front` atravessa a câmera.
 * As do meio ficam nas laterais (|x| ≥ 0.3), nunca sobre a tela do notebook.
 */
export const CLOUDS = [
  // --- Fundo: mar de nuvens baixas, quase horizonte ---
  { layer: 'back', pos: [-0.9, -0.08, -1.5] as const, scale: 0.9, puffs: 22, spread: [1.5, 0.35, 0.5] as const, opacity: 0.8, driftAmp: 0.05, driftSpeed: 0.08, phase: 0.0 },
  { layer: 'back', pos: [0.95, -0.05, -1.65] as const, scale: 1.0, puffs: 22, spread: [1.6, 0.3, 0.5] as const, opacity: 0.75, driftAmp: 0.06, driftSpeed: 0.07, phase: 2.1 },
  { layer: 'back', pos: [0.0, -0.12, -1.9] as const, scale: 1.1, puffs: 25, spread: [2.0, 0.3, 0.5] as const, opacity: 0.6, driftAmp: 0.04, driftSpeed: 0.05, phase: 4.0 },

  // --- Meio: ao lado do notebook, na altura dele ---
  { layer: 'mid', pos: [-0.62, 0.12, -0.55] as const, scale: 0.4, puffs: 16, spread: [1.1, 0.5, 0.4] as const, opacity: 0.7, driftAmp: 0.03, driftSpeed: 0.13, phase: 1.3 },
  { layer: 'mid', pos: [0.68, 0.18, -0.6] as const, scale: 0.45, puffs: 16, spread: [1.0, 0.55, 0.4] as const, opacity: 0.65, driftAmp: 0.035, driftSpeed: 0.11, phase: 3.4 },
  { layer: 'mid', pos: [0.1, -0.02, -0.8] as const, scale: 0.35, puffs: 14, spread: [1.2, 0.4, 0.4] as const, opacity: 0.5, driftAmp: 0.025, driftSpeed: 0.15, phase: 5.2 },

  // --- Base: a névoa densa em que o notebook "pousa" ---
  { layer: 'mid', pos: [0.0529, -0.04, -0.05] as const, scale: 0.3, puffs: 18, spread: [1.4, 0.22, 0.9] as const, opacity: 0.55, driftAmp: 0.012, driftSpeed: 0.09, phase: 0.8 },

  // --- Frente: perto da câmera, nos cantos inferiores ---
  { layer: 'front', pos: [-0.55, -0.22, 0.12] as const, scale: 0.42, puffs: 14, spread: [1.2, 0.6, 0.3] as const, opacity: 0.4, driftAmp: 0.08, driftSpeed: 0.17, phase: 2.6 },
  { layer: 'front', pos: [0.62, -0.26, 0.16] as const, scale: 0.46, puffs: 14, spread: [1.1, 0.6, 0.3] as const, opacity: 0.35, driftAmp: 0.09, driftSpeed: 0.14, phase: 4.8 },
] as const;

// ---------------------------------------------------------------------------
// Bokeh de fundo: 4 esferas desfocadas, bem sutis, atrás do notebook.
// ---------------------------------------------------------------------------

export const BOKEH = [
  { pos: [-0.48, 0.3, -0.55] as const, scale: 0.26, color: TOKENS.violet, opacity: 0.1 },
  { pos: [0.46, 0.38, -0.68] as const, scale: 0.32, color: TOKENS.cyan, opacity: 0.08 },
  { pos: [0.26, 0.1, -0.5] as const, scale: 0.18, color: TOKENS.violet, opacity: 0.07 },
] as const;

// ---------------------------------------------------------------------------
// Qualidade / performance
// ---------------------------------------------------------------------------

export const QUALITY = {
  /** DPR máximo: no mobile o teto é menor. */
  dpr: { desktop: 2, mobile: 1.5 },
} as const;
