'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { gsap } from '@/lib/gsap';
import { scrollState } from '@/lib/scroll';
import { closeIntroGate, openIntroGate } from './introGate';
import { FRAMES, frameAt, labelAt, type Stage } from './introFrames';
import styles from './Intro.module.scss';

const SESSION_KEY = 'nicole:intro-played';

// --- Ritmo (o que aprovamos antes de plugar as imagens finais) ---
const LOAD_CEILING = 3.5; // s — teto de segurança: nunca prender o usuário
const MIN_PHASE1 = 1.6; // s — piso do contador: a narrativa precisa de tempo para ser lida
const CATCH_UP = 0.45; // s — subida suave até 100 quando o load termina antes
const COLLAPSE = 0.72; // s — Fase 2
const REVEAL = 0.85; // s — Fase 3
const SHOTS = FRAMES.length;

/** Duotone da identidade por etapa: [sombra, luz]. A imagem vira luminância e reentra nessa rampa,
 *  então foto real e placeholder ficam na MESMA paleta — nada parece banco de imagem. */
const DUOTONE: Record<Stage, [string, string]> = {
  ideia: ['#0b0612', '#a668ff'],
  processo: ['#12063a', '#38e8ff'],
  montagem: ['#1d0b4e', '#ffc2ec'],
  'no-ar': ['#2a1070', '#38e8ff'],
  resultado: ['#3f0b3a', '#ff2e97'],
  fluido: ['#0b0612', '#ffc2ec'],
};

type Shot = HTMLCanvasElement;

const seed = (i: number) => Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1;

/** Traços de rascunho/wireframe: caixas e linhas, como um caderno. */
function paintIdeia(ctx: CanvasRenderingContext2D, w: number, h: number, i: number) {
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = Math.max(1.5, w * 0.005);
  ctx.strokeRect(w * 0.16, h * 0.14, w * 0.68, h * 0.72);
  ctx.strokeRect(w * 0.22, h * 0.2, w * 0.56, h * 0.16); // "header"
  for (let k = 0; k < 5; k++) {
    const y = h * (0.44 + k * 0.08);
    const len = 0.3 + seed(i + k) * 0.32;
    ctx.beginPath();
    ctx.moveTo(w * 0.22, y);
    ctx.lineTo(w * (0.22 + len), y);
    ctx.stroke();
  }
  // Um bloco "escolhido" muda de lugar entre os frames: a ideia se procurando.
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = '#fff';
  ctx.fillRect(w * (0.22 + seed(i) * 0.3), h * 0.62, w * 0.2, h * 0.16);
  ctx.globalAlpha = 1;
}

/** Código: linhas indentadas de comprimentos variados, como um editor. */
function paintProcesso(ctx: CanvasRenderingContext2D, w: number, h: number, i: number) {
  ctx.fillStyle = '#fff';
  const rows = 13;
  for (let k = 0; k < rows; k++) {
    const y = h * (0.16 + k * 0.055);
    const indent = 0.14 + (k % 3) * 0.07;
    const len = 0.18 + seed(i * 3 + k) * 0.5;
    ctx.globalAlpha = 0.28 + seed(k + i) * 0.5;
    ctx.fillRect(w * indent, y, w * len, h * 0.022);
  }
  ctx.globalAlpha = 1;
  // Cursor piscando na linha ativa.
  ctx.fillRect(w * 0.14, h * (0.16 + (i % rows) * 0.055), w * 0.008, h * 0.03);
}

/** Produto sendo montado: blocos de um layout entrando um a um. */
function paintMontagem(ctx: CanvasRenderingContext2D, w: number, h: number, i: number) {
  ctx.fillStyle = '#fff';
  const blocks: [number, number, number, number][] = [
    [0.1, 0.1, 0.8, 0.1],
    [0.1, 0.24, 0.38, 0.3],
    [0.52, 0.24, 0.38, 0.3],
    [0.1, 0.58, 0.8, 0.12],
    [0.1, 0.74, 0.5, 0.12],
  ];
  blocks.forEach((b, k) => {
    ctx.globalAlpha = k <= (i % (blocks.length + 1)) ? 0.85 : 0.14;
    ctx.fillRect(w * b[0], h * b[1], w * b[2], h * b[3]);
  });
  ctx.globalAlpha = 1;
}

/** No ar: moldura de desktop + moldura de celular lado a lado. */
function paintNoAr(ctx: CanvasRenderingContext2D, w: number, h: number, i: number) {
  ctx.strokeStyle = '#fff';
  ctx.fillStyle = '#fff';
  ctx.lineWidth = Math.max(2, w * 0.006);
  ctx.strokeRect(w * 0.08, h * 0.2, w * 0.6, h * 0.42); // desktop
  ctx.fillRect(w * 0.3, h * 0.66, w * 0.16, h * 0.02); // pé do monitor
  ctx.globalAlpha = 0.5;
  ctx.fillRect(w * 0.11, h * 0.24, w * 0.54, h * 0.06);
  ctx.globalAlpha = 1;
  ctx.strokeRect(w * 0.74, h * 0.34, w * 0.17, h * 0.4); // mobile
  // "Carregando": uma barra que avança entre os frames.
  ctx.fillRect(w * 0.11, h * 0.54, w * 0.54 * (0.3 + seed(i) * 0.7), h * 0.03);
}

/** Resultado: barras subindo + a seta de crescimento. */
function paintResultado(ctx: CanvasRenderingContext2D, w: number, h: number, i: number) {
  ctx.fillStyle = '#fff';
  const bars = 6;
  for (let k = 0; k < bars; k++) {
    const grow = Math.min(1, (i % 3) / 2 + 0.4);
    const hh = (0.12 + (k / bars) * 0.55) * grow;
    ctx.globalAlpha = 0.45 + (k / bars) * 0.5;
    ctx.fillRect(w * (0.14 + k * 0.12), h * (0.8 - hh), w * 0.08, h * hh);
  }
  ctx.globalAlpha = 1;
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = Math.max(2, w * 0.007);
  ctx.beginPath();
  ctx.moveTo(w * 0.16, h * 0.62);
  ctx.lineTo(w * 0.84, h * 0.2);
  ctx.stroke();
  ctx.beginPath(); // ponta da seta
  ctx.moveTo(w * 0.84, h * 0.2);
  ctx.lineTo(w * 0.72, h * 0.22);
  ctx.moveTo(w * 0.84, h * 0.2);
  ctx.lineTo(w * 0.82, h * 0.32);
  ctx.stroke();
}

/**
 * A ponte com o hero: o mesmo fluido iridescente, em 2D.
 * `pal()` reproduz a paleta canônica do shader (fluid.frag.ts) — os coeficientes são os aprovados,
 * então a última imagem do intro e o hero são reconhecidamente a mesma assinatura.
 */
function paintFluido(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const img = ctx.createImageData(w, h);
  const d = img.data;
  const A = [0.12, 0.06, 0.2];
  const B = [0.45, 0.3, 0.55];
  const D = [0.0, 0.18, 0.4];
  const CREASE = [0.7, 0.6, 1.0];

  // A paleta canônica só é iridescente numa faixa estreita: fora de ~0.25–0.35 ela vai para
  // azul/oliva (verificado varrendo a rampa). No hero é o uShift + o crease que a mantêm ali;
  // aqui o `t` fica confinado nessa janela e o crease faz o brilho violeta/magenta por cima.
  const T0 = 0.25;
  const T1 = 0.36;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const u = x / w;
      const v = y / h;
      // Ruído suave e barato (a montagem não pode engasgar): senóides cruzadas no lugar do FBM.
      const n =
        0.5 +
        0.25 * Math.sin(u * 6.0 + v * 2.6) +
        0.15 * Math.sin(u * 11.0 - v * 8.0 + 1.7) +
        0.1 * Math.sin((u + v) * 17.0 + 3.1);
      const t = T0 + (T1 - T0) * Math.max(0, Math.min(1, n));
      // Crease: as "dobras" claras do shader, que é o que dá o aspecto holográfico.
      const crease = Math.pow(Math.abs(Math.sin((u - v) * 6.2831 + n * 4.0)), 10.0) * 0.7;
      const o = (y * w + x) * 4;
      for (let k = 0; k < 3; k++) {
        const col = A[k] + B[k] * Math.cos(6.28318 * (t + D[k])) + crease * CREASE[k];
        d[o + k] = Math.max(0, Math.min(1, col)) * 255;
      }
      d[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

/** Luminância → rampa duotone da etapa. É o que amarra tudo na identidade. */
function applyDuotone(ctx: CanvasRenderingContext2D, w: number, h: number, stage: Stage) {
  const [lowHex, highHex] = DUOTONE[stage];
  const hex = (s: string) => [
    parseInt(s.slice(1, 3), 16),
    parseInt(s.slice(3, 5), 16),
    parseInt(s.slice(5, 7), 16),
  ];
  const lo = hex(lowHex);
  const hi = hex(highHex);
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const l = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) / 255;
    d[i] = lo[0] + (hi[0] - lo[0]) * l;
    d[i + 1] = lo[1] + (hi[1] - lo[1]) * l;
    d[i + 2] = lo[2] + (hi[2] - lo[2]) * l;
  }
  ctx.putImageData(img, 0, 0);
}

/** Desenha um frame (placeholder procedural ou imagem real já decodificada) em seu canvas. */
function paintShot(w: number, h: number, i: number, bmp?: ImageBitmap): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (!ctx) return c;
  const { stage } = FRAMES[i];

  if (stage === 'fluido') {
    paintFluido(ctx, w, h);
    return c; // já está na paleta canônica: duotone aqui só empobreceria
  }

  ctx.fillStyle = '#07040e';
  ctx.fillRect(0, 0, w, h);

  if (bmp) {
    // cover: preenche o quadro sem distorcer (as telas são 1.6, o quadro varia).
    const scale = Math.max(w / bmp.width, h / bmp.height);
    const dw = bmp.width * scale;
    const dh = bmp.height * scale;
    ctx.drawImage(bmp, (w - dw) / 2, (h - dh) / 2, dw, dh);
  } else if (stage === 'ideia') paintIdeia(ctx, w, h, i);
  else if (stage === 'processo') paintProcesso(ctx, w, h, i);
  else if (stage === 'montagem') paintMontagem(ctx, w, h, i);
  else if (stage === 'no-ar') paintNoAr(ctx, w, h, i);
  else paintResultado(ctx, w, h, i);

  applyDuotone(ctx, w, h, stage);
  return c;
}

/**
 * Pré-carrega a montagem inteira ANTES de exibir: placeholders são desenhados na hora e as
 * imagens reais passam por fetch + createImageBitmap (decode fora da thread principal — o mesmo
 * caminho do FxCanvas). Cada frame pronto avança o contador, então o número reflete o load real.
 */
function loadShots(
  w: number,
  h: number,
  onStep: (done: number) => void,
  onShot: (i: number, shot: Shot) => void,
): () => void {
  let cancelled = false;
  let done = 0;
  const step = () => onStep(++done);

  FRAMES.forEach((frame, i) => {
    if (!frame.src || typeof createImageBitmap !== 'function') {
      onShot(i, paintShot(w, h, i));
      step();
      return;
    }
    fetch(frame.src)
      .then((r) => r.blob())
      .then((b) => createImageBitmap(b, { resizeWidth: w, resizeQuality: 'high' }))
      .then((bmp) => {
        if (cancelled) return bmp.close();
        onShot(i, paintShot(w, h, i, bmp));
        bmp.close();
        step();
      })
      .catch(() => {
        if (cancelled) return;
        onShot(i, paintShot(w, h, i)); // rede falhou: o placeholder da etapa segura a narrativa
        step();
      });
  });

  return () => {
    cancelled = true;
  };
}

export default function Intro() {
  // Decidido uma vez, antes do paint: evita montar o overlay para quem não vai ver o intro.
  const [active, setActive] = useState<boolean | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLCanvasElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const markRef = useRef<HTMLDivElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const finishRef = useRef<() => void>(() => {});

  // StrictMode monta 2x em dev: a decisão e o "já tocou" ficam fora do ciclo de render.
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

    // ?intro=0 pula, ?intro=1 força (dev). reduced motion e 2ª visita na sessão pulam.
    const show = forced === '1' || (forced !== '0' && !reduced && !played);
    if (show) closeIntroGate(); // fecha ANTES do hero começar a desenhar
    setActive(show);
  }, []);

  useEffect(() => {
    if (active !== true) return;
    const root = rootRef.current;
    const canvas = frameRef.current;
    const count = countRef.current;
    const label = labelRef.current;
    if (!root || !canvas || !count) return;
    let shownLabel = ''; // último rótulo escrito no DOM (evita textContent por frame)

    const lenis = scrollState.lenis;
    const prevOverflow = document.body.style.overflow;
    lenis?.stop();
    document.body.style.overflow = 'hidden';
    window.scrollTo(0, 0);

    // Estado inicial explícito do que vai ser animado: 'none' → 'blur(6px)' não interpola
    // (o CSSPlugin não converte `filter: none`), e o clip-path do reveal precisa sair de um circle().
    gsap.set([canvas.parentElement, count], { filter: 'blur(0px)' });

    const ctx2d = canvas.getContext('2d', { alpha: false });
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const cw = canvas.clientWidth;
    const ch = canvas.clientHeight;
    canvas.width = Math.max(1, Math.round(cw * dpr));
    canvas.height = Math.max(1, Math.round(ch * dpr));

    // --- Progresso real: fontes + imagens da montagem ---
    const progress = { load: 0, shown: 0 }; // load = real (0..1), shown = o que o contador exibe
    let shots: Shot[] = new Array(SHOTS); // preenchido fora de ordem (cada decode termina quando termina)
    let fontsDone = false;
    let shotsDone = 0;

    // --- Montagem: corte seco, sem criar/destruir nós. O ÍNDICE VEM DO CONTADOR (introFrames.ts),
    // então a narrativa acompanha o load real em vez de correr no tempo. ---
    let shownShot = 0; // frame atualmente pintado no canvas
    const drawShot = (i: number) => {
      const s = shots[i];
      if (!ctx2d || !s) return; // ainda decodificando: segura o frame anterior (nunca pisca preto)
      ctx2d.drawImage(s, 0, 0, canvas.width, canvas.height);
    };

    const recompute = () => {
      // Fontes valem metade (o hero depende delas), imagens a outra metade.
      progress.load = (fontsDone ? 0.5 : 0) + 0.5 * (shotsDone / SHOTS);
    };

    const cancelLoad = loadShots(
      Math.round(cw * dpr),
      Math.round(ch * dpr),
      (done) => {
        shotsDone = done;
        recompute();
      },
      (i, shot) => {
        shots[i] = shot;
        if (i === shownShot) drawShot(i); // o frame atual acabou de ficar pronto: pinta agora
      },
    );

    // Prioriza os assets do hero: a fonte do nome é o que o reveal precisa.
    const family = getComputedStyle(document.documentElement).getPropertyValue('--font-display').trim();
    document.fonts
      .load(`900 100px ${family || "'Archivo Black', sans-serif"}`, 'NICOLE')
      .then(() => document.fonts.ready)
      .catch(() => undefined)
      .then(() => {
        fontsDone = true;
        recompute();
      });

    drawShot(0);

    let phase1 = 0; // s decorridos na Fase 1
    let shownText = -1; // último valor escrito no DOM (evita textContent por frame)
    let onPhase1Done = () => {};

    // --- Medição de frame por fase (só com ?intro=1; zero custo no caminho normal) ---
    const measuring = new URLSearchParams(window.location.search).get('intro') === '1';
    const perf = { montagem: [] as number[], reveal: [] as number[] };
    let bucket: 'montagem' | 'reveal' | null = measuring ? 'montagem' : null;
    let lastFrameTs = 0;
    const sample = () => {
      if (!bucket) return;
      const now = performance.now();
      if (lastFrameTs) perf[bucket].push(now - lastFrameTs);
      lastFrameTs = now;
    };
    const report = () => {
      if (!measuring) return;
      const stat = (a: number[]) => {
        if (!a.length) return null;
        const sorted = [...a].sort((x, y) => x - y);
        const avg = a.reduce((s, v) => s + v, 0) / a.length;
        return {
          frames: a.length,
          medio: +avg.toFixed(2),
          fps: +(1000 / avg).toFixed(1),
          p95: +sorted[Math.floor(sorted.length * 0.95)].toFixed(2),
          max: +sorted[sorted.length - 1].toFixed(2),
        };
      };
      const out = { montagem: stat(perf.montagem), reveal: stat(perf.reveal) };
      (window as unknown as { __introPerf?: unknown }).__introPerf = out;
      console.table(out);
    };

    /**
     * O contador é dirigido aqui (não por tween): ele persegue o progresso REAL, com
     *  - piso (MIN_PHASE1): com cache o load acaba em ~0ms e o intro não pode virar um flash;
     *  - teto (LOAD_CEILING): load lento nunca prende o usuário;
     *  - CATCH_UP: quando o load fecha, sobe suave até 100 em vez de saltar.
     * Um tween com `modifiers` aqui seria circular (o valor alimentaria ele mesmo).
     */
    const onFrame = () => {
      sample();
      const dt = (gsap.ticker.deltaRatio(60) * 1000) / 60 / 1000; // s deste frame
      phase1 += dt;

      // Alvo = progresso real, limitado pelo piso de tempo; no teto, vai direto a 100.
      const floor = Math.min(1, phase1 / MIN_PHASE1);
      const target = phase1 >= LOAD_CEILING ? 1 : Math.min(progress.load, floor);
      // Sobe no máximo 1/CATCH_UP por segundo → chegada suave, nunca um salto.
      progress.shown = Math.min(target, progress.shown + dt / CATCH_UP);

      const n = Math.round(progress.shown * 100);
      if (n !== shownText) {
        shownText = n;
        count.textContent = String(n).padStart(3, '0');

        // Montagem: corte seco dirigido pelo CONTADOR (não pelo tempo) — a faixa de cada frame
        // está em introFrames.ts, então a narrativa acompanha o load real.
        const next = frameAt(n);
        if (next !== shownShot) {
          shownShot = next;
          drawShot(next);
          const l = labelAt(next);
          if (label && l !== shownLabel) {
            shownLabel = l;
            label.textContent = l;
          }
        }
      }

      if (progress.shown >= 1) {
        const done = onPhase1Done;
        onPhase1Done = () => {};
        done(); // chegou a 100: emenda direto no colapso (sem esperar o teto)
      }
    };

    // ------------------------------------------------------------------
    // Timeline única: Fase 1 (contador+montagem) → Fase 2 (colapso) → Fase 3 (reveal)
    // ------------------------------------------------------------------
    const finish = () => {
      finishRef.current = () => {};
      report();
      bucket = null;
      cancelLoad(); // decodes em voo não devem pintar num canvas que já morreu
      gsap.ticker.remove(onFrame);
      tlRef.current?.kill();
      tlRef.current = null;
      try {
        sessionStorage.setItem(SESSION_KEY, '1');
      } catch {
        /* ignora */
      }
      openIntroGate();
      document.body.style.overflow = prevOverflow;
      lenis?.start();
      // Foco no h1 do hero (o nome visual vem do canvas).
      const h1 = document.querySelector<HTMLElement>('#hero-title');
      if (h1) {
        h1.setAttribute('tabindex', '-1');
        h1.focus({ preventScroll: true });
      }
      // Libera os canvases da montagem (cada um segura um backing store).
      shots.forEach((s) => {
        if (s) s.width = s.height = 0;
      });
      shots = [];
      if (ctx2d) ctx2d.clearRect(0, 0, canvas.width, canvas.height);
      canvas.width = canvas.height = 0;
      setActive(false); // remove o overlay do DOM
    };
    finishRef.current = finish;

    gsap.ticker.add(onFrame);

    const tl = gsap.timeline({ onComplete: finish });
    tlRef.current = tl;

    // Contador chegou a 100 → emenda no colapso. Só o tempo de espera é cortado; as Fases 2 e 3
    // tocam inteiras. (O ticker continua: o contador já está em 100 e só o DOM não muda mais.)
    // (currentLabel() devolve string, nunca null — a guarda certa é comparar o tempo.)
    onPhase1Done = () => {
      if (tl.time() < tl.labels.collapse) tl.seek('collapse');
    };

    // FASE 1 — espera de no máximo LOAD_CEILING. Quem manda no tempo é o progresso real:
    // ao bater 100 o onFrame salta a timeline para 'collapse' (não espera o teto).
    // Se o load arrastar, o teto vence e a timeline segue sozinha.
    tl.to({}, { duration: LOAD_CEILING })
      // FASE 2 — colapso: tudo é sugado para o N (canto superior-esquerdo).
      .addLabel('collapse')
      .to(
        canvas.parentElement,
        {
          // Para o N: o quadro está centralizado, então o destino é o canto.
          x: () => {
            const m = markRef.current?.getBoundingClientRect();
            const f = canvas.parentElement?.getBoundingClientRect();
            if (!m || !f) return 0;
            return m.left + m.width / 2 - (f.left + f.width / 2);
          },
          y: () => {
            const m = markRef.current?.getBoundingClientRect();
            const f = canvas.parentElement?.getBoundingClientRect();
            if (!m || !f) return 0;
            return m.top + m.height / 2 - (f.top + f.height / 2);
          },
          scale: 0.02,
          filter: 'blur(6px)',
          duration: COLLAPSE,
          ease: 'expo.in',
        },
        'collapse',
      )
      .to(
        count,
        {
          x: () => {
            const m = markRef.current?.getBoundingClientRect();
            const c = count.getBoundingClientRect();
            if (!m || !c) return 0;
            return m.left + m.width / 2 - (c.left + c.width / 2);
          },
          y: () => {
            const m = markRef.current?.getBoundingClientRect();
            const c = count.getBoundingClientRect();
            if (!m || !c) return 0;
            return m.top + m.height / 2 - (c.top + c.height / 2);
          },
          scale: 0.05,
          filter: 'blur(4px)',
          autoAlpha: 0,
          duration: COLLAPSE * 0.85,
          ease: 'expo.in',
        },
        'collapse',
      )
      // O rótulo sai junto com o contador: é legenda da montagem, não tem papel no colapso.
      .to(labelRef.current, { autoAlpha: 0, duration: COLLAPSE * 0.4, ease: 'power2.in' }, 'collapse')
      // O N "engole": micro-pulse no fim do colapso. Posição explícita nos dois tweens — sem ela o
      // elastic encadeia e empurra o label 'reveal' ~0.42s para frente, alongando o intro.
      .to(markRef.current, { scale: 1.28, duration: 0.12, ease: 'power3.out' }, `collapse+=${COLLAPSE - 0.06}`)
      .to(markRef.current, { scale: 1, duration: 0.42, ease: 'elastic.out(1, 0.45)' }, `collapse+=${COLLAPSE + 0.06}`)

      // FASE 3 — reveal por máscara, abrindo a partir do N. (O estalo do N continua por cima.)
      .addLabel('reveal', `collapse+=${COLLAPSE}`)
      // O portão abre no INÍCIO do reveal: o hero pinta 1–2 frames enquanto o preto ainda cobre
      // quase tudo (o buffer do fluido é descartável) e o NICOLE sobe conforme a cortina abre.
      .call(openIntroGate, undefined, 'reveal')
      .call(
        () => {
          bucket = measuring ? 'reveal' : null; // a partir daqui mede o reveal (hero desenhando)
          lastFrameTs = 0;
        },
        undefined,
        'reveal',
      )
      .to(
        root,
        {
          // Círculo crescendo do N até cobrir a tela: revela o hero por máscara, nunca por opacity.
          clipPath: () => {
            const m = markRef.current?.getBoundingClientRect();
            const x = m ? m.left + m.width / 2 : 0;
            const y = m ? m.top + m.height / 2 : 0;
            return `circle(150% at ${x}px ${y}px)`;
          },
          duration: REVEAL,
          ease: 'expo.inOut',
          onStart: () => {
            const m = markRef.current?.getBoundingClientRect();
            const x = m ? m.left + m.width / 2 : 0;
            const y = m ? m.top + m.height / 2 : 0;
            // O clip-path inicial precisa ser um circle() também (interpolação só entre iguais).
            gsap.set(root, { clipPath: `circle(0% at ${x}px ${y}px)` });
          },
        },
        'reveal',
      )
      // O N sai junto com o overlay (é só do intro; o hero não tem logo).
      .to(markRef.current, { autoAlpha: 0, duration: 0.3, ease: 'power2.in' }, 'reveal+=0.1');

    return () => {
      cancelLoad();
      gsap.ticker.remove(onFrame);
      tl.kill();
      tlRef.current = null;
      // Se desmontar no meio (StrictMode/HMR), não deixa o hero preso nem o scroll travado.
      openIntroGate();
      document.body.style.overflow = prevOverflow;
      lenis?.start();
      shots.forEach((s) => {
        if (s) s.width = s.height = 0;
      });
      shots = [];
    };
  }, [active]);

  const onSkip = useCallback(() => {
    finishRef.current();
  }, []);

  // Esc também pula.
  useEffect(() => {
    if (active !== true) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finishRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active]);

  if (active !== true) return null;

  return (
    // role="presentation" (não aria-hidden no overlay): o conteúdo do intro é decorativo e já está
    // com aria-hidden item a item, mas o botão "pular" precisa continuar alcançável por teclado.
    <div ref={rootRef} className={styles.intro} role="presentation">
      {/* A marca que engole tudo na Fase 2 — decorativa, só existe durante o intro. */}
      <div ref={markRef} className={styles.intro__mark} aria-hidden="true">
        N
      </div>

      <div className={styles.intro__frame} aria-hidden="true">
        <canvas ref={frameRef} className={styles.intro__canvas} />
      </div>

      {/* Micro-rótulo da etapa, logo abaixo do quadro: "ideia", "no ar", "resultado"... */}
      <div ref={labelRef} className={styles.intro__label} aria-hidden="true" />

      <div className={styles.intro__count} aria-hidden="true">
        <span ref={countRef}>000</span>
        <span className={styles.intro__unit}>%</span>
      </div>

      <button type="button" className={styles.intro__skip} onClick={onSkip}>
        pular
      </button>
    </div>
  );
}
