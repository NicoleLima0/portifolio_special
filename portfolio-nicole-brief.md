# Portfólio Nicole Lima — Documento-base (Brief técnico & criativo)

> **Objetivo deste arquivo:** ser a fonte única de verdade para reconstruir o portfólio em produção (React + Next.js + GSAP + SCSS/BEM + react-bits), chegando exatamente ao resultado que validamos no protótipo — em especial a **tela inicial (hero) "NICOLE"**, que é o coração do projeto.

---

## 1. Visão geral do projeto

Portfólio pessoal da **Nicole Lima**, desenvolvedora, para **atrair clientes freelance**.

- **Tom do conteúdo:** venda / competência. Fala de resultado para o cliente, não de detalhes técnicos.
- **Público:** potenciais clientes (donos de negócio, startups, agências) que querem site/sistema/produto digital.
- **Personalidade visual:** **Y2K glam** reinterpretado com maturidade — nada de "sopa" de gradiente genérica de IA. A assinatura é o **fluido iridescente holográfico** reagindo ao mouse, no espírito de referência do site **noth.in** (que usamos como norte).
- **Metas de produto:** SEO forte + compartilhamento em redes (alto alcance) + **performance impecável** (nada de travar/lagar — isso é inegociável).

---

## 2. Stack e decisões de tecnologia

| Camada | Tecnologia | Por quê |
|---|---|---|
| Framework | **Next.js (App Router)** | SSR/SSG para SEO e Open Graph (link bonito nas redes), roteamento, otimização automática. |
| UI | **React** | Componentização das seções. |
| Animação (principal) | **GSAP + ScrollTrigger** | Motor de animação de toda a UI, como no noth.in. Usar o hook **`@gsap/react` (`useGSAP`)** + `gsap.context()` para cleanup automático no React. |
| Componentes prontos | **react-bits** | Acelerar micro-interações/blocos animados de apoio (não o hero — o hero é custom). |
| Estilos | **SCSS (CSS Modules) + metodologia BEM** | Escopo por componente, tokens centralizados, nomes previsíveis. |
| Fluido do hero | **WebGL puro (shader GLSL)** | Efeito custom; GSAP pode dirigir os uniforms se quisermos suavização extra. |
| Fontes | **`next/font`** (self-host) | Zero layout shift, sem requisição externa bloqueante. |

**Fontes usadas:**
- **Archivo Black** → o nome gigante "NICOLE" (peso máximo, grotesca).
- **Syne** (700/800) → títulos das seções.
- **Space Grotesk** (400/500/600) → corpo e UI.

---

## 3. Princípios de performance (regra de ouro: não pode travar)

1. **Cap de devicePixelRatio** nos canvases: `Math.min(devicePixelRatio, 1.5)` no desktop e `1.25` em touch. O fluido ainda renderiza a **0.6×** dessa resolução e o CSS faz o upscale (medido: PSNR 54.8 dB vs 1×, nenhum pixel com diferença visível). Sem isso, telas 4K/retina renderizam pixels demais e travam.
2. **Um único `requestAnimationFrame` por camada** (fluido e tinta). Nunca criar rAF aninhado.
3. **Pausar o rAF quando o hero sai da viewport** (IntersectionObserver). Ninguém precisa gastar GPU animando o que está fora da tela.
4. **Respeitar `prefers-reduced-motion`**: desenhar 1 quadro estático e não iniciar loops.
5. **Evitar layout thrash**: agrupar leituras de `getBoundingClientRect`; não ler/escrever DOM alternadamente dentro do loop.
6. **Shader com custo controlado**: FBM em 6 oitavas já é o teto confortável para 60fps em desktop médio. Em mobile, considerar reduzir para 4–5 oitavas ou baixar o DPR para 1.5.
7. **`will-change` com parcimônia** (só em elementos realmente animados) e remover depois.
8. **Lazy-load** de tudo abaixo da dobra; imagens via `next/image`.
9. **Canvas/WebGL só no client**: componentes com `'use client'` e inicialização em `useEffect` (nunca no SSR). Se necessário, `dynamic(() => import(...), { ssr:false })`.
10. **Cleanup obrigatório** no unmount: cancelar rAF, remover listeners, `gsap.context().revert()`. Evita vazamento de memória e "fantasmas" de animação.

---

## 4. SEO, redes e alcance

- Metadados por página via `metadata` do Next (title, description).
- **Open Graph + Twitter Card** com uma imagem de preview (idealmente um "print" do hero NICOLE) — é o que garante o card bonito ao compartilhar.
- `lang="pt-BR"`, `canonical`, `sitemap.xml`, `robots.txt`.
- **JSON-LD Schema.org `Person`** (nome, cargo, URL, redes) para o Google entender quem é a Nicole.
- `<h1>` real e acessível com "Nicole — desenvolvedora" (mesmo que visualmente o nome venha do canvas; ver acessibilidade abaixo).

---

## 5. Arquitetura de pastas sugerida

```
src/
  app/
    layout.tsx
    page.tsx
    globals.scss
  components/
    Hero/
      Hero.tsx              // orquestra as camadas + UI
      Hero.module.scss
      FluidCanvas.tsx       // camada WebGL (fluido iridescente)
      InkCanvas.tsx         // camada 2D (máscara branca c/ buracos)
      shaders/
        fluid.vert.glsl
        fluid.frag.glsl
    About/                  // seção "sobre" (frase que acende)
    Services/               // cards de serviços
    Works/                  // lista de trabalhos
    Contact/                // CTA + redes
    ui/                     // botões, nav, etc. (apoio, react-bits)
  hooks/
    usePointer.ts           // ponteiro compartilhado relativo ao hero
    useReducedMotion.ts
    useInView.ts            // pausar rAF fora da viewport
  lib/
    gsap.ts                 // registro central de plugins do GSAP
  styles/
    _tokens.scss            // cores, tipografia, espaçamentos
    _mixins.scss
    _breakpoints.scss
```

**BEM:** bloco = componente (`.hero`), elemento = `__` (`.hero__tagline`), modificador = `--` (`.button--dark`). Nos CSS Modules, os nomes já têm escopo, mas mantenha a semântica BEM para leitura.

---

# 6. ⭐ A TELA INICIAL (HERO "NICOLE") — especificação detalhada

Esta é a parte mais importante do documento. É o efeito que amamos e que precisa sair **idêntico**.

## 6.1 Conceito

- Fundo **branco**.
- O nome **NICOLE** ocupa quase toda a largura, em fonte pesadíssima (Archivo Black).
- As letras são **"janelas"** que revelam um **fluido iridescente holográfico** (roxo → azul → magenta → ciano) que flui suavemente.
- Ao mover o mouse, uma **linha fina de tinta** se abre pela tela toda (além das letras) revelando o mesmo fluido, e **as cores giram conforme o movimento**.
- **Sem nenhum movimento automático de tinta**: em repouso, a tela é só branco + NICOLE colorido. O fluido só "escorre" pela tela quando o mouse se move.
- **As letras nunca somem** — são buracos permanentes; passar o mouse por cima só intensifica/gira a cor ali.

## 6.2 Como o efeito é construído — DUAS camadas sobrepostas

```
z-index 2  →  UI do hero (tagline, CTA, nav, rodapé) — texto preto
z-index 1  →  CANVAS "TINTA" (2D)  → branco cobrindo tudo, com BURACOS
z-index 0  →  CANVAS "FLUIDO" (WebGL) → o fluido iridescente, tela cheia
fundo      →  branco (#ffffff)
```

- **Camada FLUIDO (WebGL):** um shader desenha o fluido iridescente em toda a tela, o tempo todo (opaco).
- **Camada TINTA (Canvas 2D):** a cada frame pinta um retângulo **branco** por cima e depois **"apaga"** (composite `destination-out`) exatamente onde o fluido deve aparecer:
  - **as letras** de "NICOLE" (buracos permanentes);
  - **o rastro fino do mouse** (buracos temporários que se fecham).
  Onde foi apagado → transparente → vê-se o fluido de baixo. No resto → branco.

Esse "recorte por subtração" é o truque central. É o que permite o fluido aparecer **dentro das letras e além delas**, mantendo o nome sempre legível.

## 6.3 Paleta de cores (a combinação que amamos) — VALORES EXATOS

O fluido usa uma **paleta de cosseno** (técnica de Inigo Quilez):

```glsl
// cor = a + b * cos( 2π * (c * t + d) )
vec3 pal(float t){
  vec3 a = vec3(0.12, 0.06, 0.20); // base escura arroxeada
  vec3 b = vec3(0.45, 0.30, 0.55); // amplitude (contraste das cores)
  vec3 c = vec3(1.00, 1.00, 1.00); // frequência
  vec3 d = vec3(0.00, 0.18, 0.40); // fase → puxa p/ roxo/azul/magenta/ciano
  return a + b * cos(6.28318 * (c * t + d));
}
```

**Por que essa combinação funciona tão bem:** a base escura (`a`) garante contraste alto contra o branco (nome sempre legível); a fase `d` mantém tudo dentro da faixa **violeta → índigo → magenta → ciano** (nunca cai em cores "sujas"); e como é periódica, girar a fase (o "shift" do mouse) sempre resulta em tons harmônicos. **Não trocar esses coeficientes sem necessidade** — é exatamente a paleta aprovada.

Cores de apoio (UI e demais seções):

| Token | Hex | Uso |
|---|---|---|
| `--white` | `#ffffff` | fundo do hero |
| `--ink-black` | `#0a0a0a` | textos/UI do hero sobre o branco |
| `--magenta` | `#ff2e97` | acento |
| `--violet` | `#a668ff` | acento |
| `--cyan` | `#38e8ff` | acento |
| `--chrome-2` | `#ffc2ec` | acento rosa claro |
| `--bg-deep` | `#0b0612` | fundo das seções internas (tema escuro) |
| `--ink` | `#f3ecff` | texto claro nas seções |
| `--ink-soft` | `#b9a6d6` | texto secundário |

## 6.4 Shader completo (fragment) — referência canônica

```glsl
precision highp float;
uniform float uTime;   // segundos desde o início
uniform vec2  uRes;    // resolução do canvas (px de device)
uniform vec2  uMouse;  // posição do mouse em px de device (y invertido p/ WebGL)
uniform float uShift;  // acumulador de cor dirigido pelo movimento do mouse

float hash(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
float noise(vec2 p){
  vec2 i=floor(p), f=fract(p);
  float a=hash(i), b=hash(i+vec2(1.,0.)), c=hash(i+vec2(0.,1.)), d=hash(i+vec2(1.,1.));
  vec2 u=f*f*(3.-2.*f);
  return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
}
float fbm(vec2 p){ float v=0.,a=0.5; for(int i=0;i<6;i++){ v+=a*noise(p); p*=2.02; a*=0.5; } return v; }

vec3 pal(float t){
  vec3 a=vec3(0.12,0.06,0.20), b=vec3(0.45,0.30,0.55), c=vec3(1.0,1.0,1.0), d=vec3(0.00,0.18,0.40);
  return a + b*cos(6.28318*(c*t+d));
}

void main(){
  vec2 uv = gl_FragCoord.xy / uRes.xy;
  float aspect = uRes.x / uRes.y;
  vec2 p = uv;  p.x *= aspect;             // corrige proporção
  vec2 m = uMouse / uRes.xy;  m.x *= aspect;
  float t = uTime * 0.06;                   // fluxo lento do material

  // domain warping (dá o aspecto de líquido)
  vec2 q = vec2(fbm(p*2.2 + t), fbm(p*2.2 + vec2(3.1,1.7) - t));
  float md = distance(p, m);
  q += 0.40 * (p - m) * exp(-2.5*md);       // o mouse "empurra" o fluido
  vec2 r = vec2(fbm(p*2.2 + 1.8*q + 0.15*t),
                fbm(p*2.2 + 1.8*q + vec2(8.3,2.8) - 0.15*t));
  float n = fbm(p*2.6 + 2.2*r);

  n += 0.18 * sin(14.0*md - uTime*2.5) * exp(-3.0*md);  // ondinha a partir do cursor

  vec3 col = pal(n + 0.25*r.x + 0.1 + uShift);          // ← uShift = cor gira c/ o movimento

  // brilhos "amassados" de papel-alumínio holográfico
  float crease = pow(abs(sin((r.x - r.y)*6.2831 + n*4.0 + uTime*0.4)), 10.0);
  col += crease * vec3(0.7, 0.6, 1.0);

  // brilho sob o cursor, também girando de cor
  col += pal(uShift + 0.35) * 0.55 * exp(-4.0*md);

  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
```

Vertex shader (quad de tela cheia):
```glsl
attribute vec2 aPos;
void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }
// buffer: TRIANGLE_STRIP com [-1,-1, 1,-1, -1,1, 1,1]
```

## 6.5 Modelo de interação — parâmetros EXATOS

**Ponteiro compartilhado** (as duas camadas leem o mesmo): posição relativa ao hero, e `last` = timestamp do último movimento. **Inicia fora da tela** (`x:-1000, y:-1000`) para que nada apareça antes do primeiro movimento.

**Camada FLUIDO (uShift = cor girando com o movimento):**
- A cada frame, se houve movimento nos últimos **120ms**: `shift += distânciaPercorrida * 0.0011`.
- O `shift` **não decai** → quando você para, a cor "trava" no tom em que chegou. Mover = girar a paleta.
- Suavização da posição do brilho: `lerp(cur, pointer, 0.08)`.
- Sem drift/ambiente: em repouso o brilho fica onde parou (nada se move sozinho).

**Camada TINTA (rastro fino):**
- `BRUSH = 22` (raio base do pincel — o "fino"). Reduzir p/ ~14 deixa ainda mais delicado.
- `LIFE = 650` ms → tempo até o buraco "fechar" (a tinta some).
- Só desenha rastro quando há movimento (últimos **120ms**).
- **Interpolação entre frames**: preenche pontos a cada **8px** entre a posição anterior e a atual → linha contínua, sem falhas.
- Reinicia o traço se houve intervalo > **140ms** (evita "risco" ligando dois pontos distantes ao reentrar).
- Cap de **600 pontos** no rastro.
- Pincel = gradiente radial suave: `rgba(0,0,0,1)` até 0.5 e depois → `rgba(0,0,0,0)` (borda macia = fusão orgânica entre gotas).
- Raio efetivo diminui com a idade: `BRUSH * (1 - age*0.7)`.
- **Sem blobs ambientes** (removidos de propósito).

**Letras (buraco permanente, nunca somem):**
- Fonte: `Archivo Black`, peso 900.
- Tamanho: `min(H*0.34, W*0.30)`.
- Esticada para caber na largura: aplicar `scaleX = (W*0.94) / larguraMedida` (equivalente ao `textLength` do SVG). Medir com `measureText` **após a fonte carregar** (`document.fonts.ready`).
- Posição: centro em `(W/2, H*0.6)`, `textAlign:center`, `textBaseline:middle`.

**Geral das duas camadas:**
- DPR: `min(devicePixelRatio, 1.5)` (touch: `1.25`); fluido a 0.6× disso.
- Recalcular tamanho/fonte no `resize`.

## 6.6 Layout e conteúdo do hero (UI sobre o branco, texto preto)

- **Topo-esquerda (tagline):** _"Não é só código, é resultado. / Sites e produtos que vendem."_
- **Abaixo da tagline (CTA):** pílula preta _"agende uma conversa →"_ (seta desliza no hover).
- **Topo-direita (nav):** `Trabalhos` · `Contato` (uppercase, tracking largo).
- **Rodapé (baixo):** esquerda _"desenvolvedora · freelancer"_ · direita _"role para ver mais ↓"_ (seta com leve bob).
- Toda a UI do hero sai suavemente (fade + subir) conforme a página rola, via GSAP ScrollTrigger `scrub`.
- **Entrada (ao carregar):** uma timeline GSAP, disparada quando a fonte do nome termina de carregar:
  - **NICOLE** sobe de baixo para cima **letra por letra**, recortado por uma máscara da altura da linha (`expo.out`, 1.5s, stagger 0.075). No canvas de tinta cada letra é desenhada separada (com kerning) até todas chegarem; aí volta a ser a palavra inteira, idêntica à especificação.
  - Em seguida (+0.35s) **todos os textos** (tagline linha a linha, CTA, nav, rodapé) sobem de dentro de máscaras (`yPercent 130 → 0`, `expo.out`, 1.2s, stagger 0.06).
  - Os textos já nascem escondidos via CSS (`data-intro="pending"`) para não piscarem antes do JS. `prefers-reduced-motion`: tudo aparece no lugar, sem animação.

## 6.7 Acessibilidade do hero

- `<h1 class="sr-only">Nicole — desenvolvedora</h1>` real (o nome visual vem do canvas, então precisa do texto acessível).
- Canvases com `aria-hidden="true"`.
- `prefers-reduced-motion`: renderiza 1 quadro (branco + NICOLE com fluido estático), sem loops nem rastro.
- Fallback sem WebGL: preencher a camada de fluido com um gradiente iridescente estático (a máscara de tinta continua funcionando por cima).

## 6.8 Notas de implementação em React/Next (evitar lag)

- `FluidCanvas.tsx` e `InkCanvas.tsx` são **client components**; inicializam WebGL/2D em `useEffect` com cleanup (cancelar rAF, remover listeners, `gl` context loss).
- Ponteiro via hook `usePointer()` (um listener global, `passive:true`), consumido pelas duas camadas — não duplicar listeners.
- Pausar ambos os loops quando o hero sai da viewport (`useInView`).
- Se quiser, GSAP pode suavizar `uShift`/posição com `gsap.quickTo` em vez do `lerp` manual (opcional; o `lerp` já resolve).

**Arquitetura de performance (implementada e medida):**
- **Um único loop** (`useHeroLoop`, pendurado no `gsap.ticker`): tinta roda antes do fluido, mesmo timestamp, `dt` clampado em 100ms. Parado fora da viewport e com reduced motion.
- **O fluido só calcula o shader onde é visível.** A tinta cobre o resto de branco opaco, então: (1) caixas das letras + um disco por ponto do rastro viram geometria; (2) uma passada barata marca no **stencil** só os glifos (máscara dilatada 4px) e os discos; (3) o shader do fluido — intacto — roda só nesses pixels, uma vez cada. Validado trocando o `clearColor` por verde: zero pixel verde em entrada, rastro e repouso (desktop e mobile).
- **Tinta:** pincel e máscara pré-renderizados (máscara final vira `ImageBitmap`), rastro em ring buffer fixo compartilhado com o fluido, zero alocação por frame. Sem `desynchronized` (medido: derrubava frames).
- **Canvas criado pelo engine a cada montagem** e contexto liberado (`loseContext`) no cleanup → Strict Mode sem dupla inicialização.
- Resize com debounce de 100ms; `pointermove` passivo com offset do hero cacheado (sem `getBoundingClientRect` no loop).
- Onda do "Sobre" só existe com a seção na tela (fora dela eram ~180 animações CSS recalculando estilo em todo frame).
- **Não reduzir oitavas do FBM**: 5 oitavas já muda 21% dos pixels visivelmente (medido).

---

# 7. Demais seções (organização — layout SERÁ refatorado)

> Estas seções serão **repaginadas** com um layout tão impressionante quanto o hero. Aqui fica só a **estrutura/intenção** e os efeitos que vale a pena preservar. Não tratar o visual atual como final.

**Tema atual:** fundo escuro (`--bg-deep`) — a transição branco→escuro depois do hero será revista no novo layout.

Ordem e função das seções:

1. **Sobre (`#sobre`)** — uma **frase-manifesto grande** que _acende palavra por palavra conforme o scroll_ (estilo gsap.com): letras começam apagadas (`rgba(185,166,214,0.20)`) e vão para claro (`#f6f0ff`), amarradas ao scroll (`scrub`), com um **movimento contínuo de onda** nas letras. Copy atual: _"Eu tiro sua ideia do papel e coloco no ar. Sites rápidos, bonitos e feitos pra converter — do rascunho ao lançamento, cuido da parte técnica pra você focar no seu negócio."_ **(efeito a preservar)**

2. **Serviços (`#servicos`)** — 3 cards, foco em benefício:
   - Sites & landing pages · Sistemas sob medida · Cuidado contínuo.
   - Efeito a preservar: **borda em gradiente cônico que gira no hover** (via `@property --angle`), **brilho que varre o card** (sheen), leve elevação e o **ícone que gira 180° + cresce**.

3. **Trabalhos (`#trabalhos`)** — lista de projetos (hoje placeholders: Plataforma de gestão, Landing de lançamento, App de agendamento) que **entram deslizando de lados alternados** no scroll. Trocar por cases reais.

4. **Contato (`#contato`)** — título + CTA (`Vamos conversar`, `mailto:`) + redes (LinkedIn / GitHub / Instagram). Substituir e-mail/links reais.

Efeitos globais de scroll a manter: **títulos das seções entram palavra por palavra** com leve skew/rotação; elementos de apoio com fade-up.

Conteúdo geral: sempre em tom de **venda/competência**, direto, sem jargão técnico.

---

# 8. Jornada de decisões (como chegamos até aqui)

Registro do raciocínio — útil para não repetir becos sem saída:

1. **Direção Y2K glam** escolhida (cromado/metálico, roxo/rosa), fugindo do "portfólio feminino" clichê (pastel + fonte script). Objetivo: feminino **e** foda.
2. **1ª versão do hero:** nome cromado holográfico + blob girando + fundo com vários gradientes coloridos. → **Rejeitado:** o fundo multi-gradiente tem "cara de IA" e a tela estava **estática demais**.
3. **2ª versão:** nome em **metal prateado real** com luz seguindo o mouse, metaball de chrome líquido e brilhos ✦. Melhorou a interação, mas ainda não era "o" efeito.
4. **Virada de chave — referência noth.in:** fundo branco, nome gigante como máscara, **fluido iridescente WebGL** revelado pelas letras. Foi o clique.
5. **Refino 1:** fazer o fluido **escorrer pela tela toda** seguindo o mouse (não só dentro das letras).
6. **Refino 2 (estado atual, aprovado):** rastro **mais fino**, **sem movimento automático** (só reage ao mouse), **letras nunca somem**, e **a cor gira conforme o movimento do mouse** — mantendo a paleta roxo/azul/magenta que amamos como base.

**Princípios que emergiram e devem guiar a refatoração:**
- Gastar a ousadia em **um** elemento memorável (o fluido) e manter o resto disciplinado.
- Nada de "sopa" de gradiente decorativa — cor com intenção.
- Movimento **responde ao usuário**; quase nada se anima sozinho.
- Legibilidade do nome acima de tudo.
- Performance é parte do design (não pode travar).

---

## 9. Checklist de "pronto" para o hero

- [ ] Fluido WebGL com o shader e a paleta exatos acima.
- [ ] Camada de tinta 2D com rastro fino (`BRUSH 22`, `LIFE 650`, passo 8px), sem ambiente.
- [ ] Letras Archivo Black esticadas p/ 94% da largura, buraco permanente.
- [ ] `uShift` acumulando com o movimento (`*0.0011`), sem decair.
- [ ] Ponteiro inicia fora da tela; nada aparece até o 1º movimento.
- [ ] DPR capado em 1.5 (touch 1.25), fluido a 0.6×; um único loop para as duas camadas; pausa fora da viewport.
- [ ] `prefers-reduced-motion` e fallback sem WebGL.
- [ ] `<h1>` acessível + canvases `aria-hidden`.
- [ ] UI: tagline, CTA pílula, nav, rodapé; saída no scroll via GSAP.
- [ ] Entrada: NICOLE sobe letra por letra e depois todos os textos sobem de máscaras; sem flash antes do JS.