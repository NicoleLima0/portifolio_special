'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { gsap } from '@/lib/gsap';
import { scrollState } from '@/lib/scroll';
import { closeIntroGate, openIntroGate } from './introGate';
import styles from './Intro.module.scss';

const SESSION_KEY = 'nicole:intro-played';

// --- Ritmo (o que aprovamos antes de plugar as imagens finais) ---
const LOAD_CEILING = 3.5; // s — teto de segurança: nunca prender o usuário
const MIN_PHASE1 = 1.15; // s — piso do contador (load instantâneo com cache não vira "flash")
const CATCH_UP = 0.45; // s — subida suave até 100 quando o load termina antes
const COLLAPSE = 0.72; // s — Fase 2
const REVEAL = 0.85; // s — Fase 3
const FRAME_MIN = 90; // ms visível por imagem (começo, mais calmo)
const FRAME_MAX = 140; // ms visível por imagem (acelera conforme o contador sobe)
const SHOTS = 10; // 8–12 imagens na montagem

/** Placeholders procedurais: objetos iridescentes/chrome na nossa paleta, sem baixar nada.
 *  Trocar por webp/avif reais depois — o caminho de decode já está pronto em loadShots(). */
const PALETTE = [
  ['#1d0b4e', '#a668ff', '#38e8ff'],
  ['#2a1070', '#ff2e97', '#ffc2ec'],
  ['#0b0612', '#3f2bd0', '#38e8ff'],
  ['#3f0b3a', '#ff2e97', '#a668ff'],
  ['#12063a', '#ffc2ec', '#38e8ff'],
];

type Shot = HTMLCanvasElement | ImageBitmap;

/** Um frame de "papel laminado": gradiente da paleta + dobras/creases claras por cima. */
function paintShot(w: number, h: number, i: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (!ctx) return c;
  const [a, b, d] = PALETTE[i % PALETTE.length];
  const ang = (i / SHOTS) * Math.PI * 2;
  const g = ctx.createLinearGradient(
    w / 2 - (Math.cos(ang) * w) / 2,
    h / 2 - (Math.sin(ang) * h) / 2,
    w / 2 + (Math.cos(ang) * w) / 2,
    h / 2 + (Math.sin(ang) * h) / 2,
  );
  g.addColorStop(0, a);
  g.addColorStop(0.45 + 0.1 * Math.sin(i), b);
  g.addColorStop(1, d);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // Dobras: linhas claras finas, ângulo variando por frame (o "amassado" holográfico).
  ctx.globalCompositeOperation = 'screen';
  ctx.lineWidth = Math.max(1, w * 0.004);
  for (let k = 0; k < 14; k++) {
    const t = (k + i * 0.37) % 14;
    const off = (t / 14) * h * 1.6 - h * 0.3;
    const sk = Math.sin(i + k) * w * 0.25;
    ctx.strokeStyle = `rgba(255,255,255,${0.04 + 0.06 * Math.abs(Math.sin(i * 1.7 + k))})`;
    ctx.beginPath();
    ctx.moveTo(-sk, off);
    ctx.lineTo(w + sk, off + h * 0.22);
    ctx.stroke();
  }

  // Brilho central deslocado por frame: dá "volume" de metal.
  const r = ctx.createRadialGradient(
    w * (0.3 + 0.4 * ((i % 3) / 2)),
    h * (0.3 + 0.4 * ((i % 4) / 3)),
    0,
    w / 2,
    h / 2,
    Math.max(w, h) * 0.7,
  );
  r.addColorStop(0, 'rgba(255,255,255,0.30)');
  r.addColorStop(0.4, 'rgba(255,255,255,0.05)');
  r.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = r;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'source-over';
  return c;
}

/**
 * Pré-carrega a montagem. Placeholders são desenhados (custo ~nada, já "decodificados").
 * Com imagens reais: troque por fetch + createImageBitmap (decode fora da thread principal),
 * que é o mesmo caminho do FxCanvas — assim a montagem nunca engasga no primeiro corte.
 */
function loadShots(w: number, h: number, onStep: (done: number, total: number) => void): Shot[] {
  const shots: Shot[] = [];
  for (let i = 0; i < SHOTS; i++) {
    shots.push(paintShot(w, h, i));
    onStep(i + 1, SHOTS);
  }
  return shots;
}

export default function Intro() {
  // Decidido uma vez, antes do paint: evita montar o overlay para quem não vai ver o intro.
  const [active, setActive] = useState<boolean | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLCanvasElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);
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
    if (!root || !canvas || !count) return;

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
    let shots: Shot[] = [];
    let fontsDone = false;
    let shotsDone = 0;

    const recompute = () => {
      // Fontes valem metade (o hero depende delas), imagens a outra metade.
      progress.load = (fontsDone ? 0.5 : 0) + 0.5 * (shotsDone / SHOTS);
    };

    shots = loadShots(Math.round(cw * dpr), Math.round(ch * dpr), (done) => {
      shotsDone = done;
      recompute();
    });

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

    // --- Montagem: corte seco, sem criar/destruir nós. Índice derivado do tempo. ---
    let shotIndex = -1;
    const drawShot = (i: number) => {
      const s = shots[i % shots.length];
      if (!ctx2d || !s) return;
      ctx2d.drawImage(s, 0, 0, canvas.width, canvas.height);
    };
    drawShot(0);
    shotIndex = 0;

    let elapsedShot = 0;
    let nextSwap = FRAME_MAX;
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

      // Montagem: corte seco, acelerando de FRAME_MAX → FRAME_MIN conforme o contador sobe.
      elapsedShot += dt * 1000;
      if (elapsedShot >= nextSwap) {
        elapsedShot = 0;
        nextSwap = FRAME_MAX - (FRAME_MAX - FRAME_MIN) * progress.shown;
        shotIndex = (shotIndex + 1) % shots.length;
        drawShot(shotIndex);
      }

      const n = Math.round(progress.shown * 100);
      if (n !== shownText) {
        shownText = n;
        count.textContent = String(n).padStart(3, '0');
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
      // Libera as imagens da memória.
      shots.forEach((s) => {
        if (typeof ImageBitmap !== 'undefined' && s instanceof ImageBitmap) s.close();
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
      gsap.ticker.remove(onFrame);
      tl.kill();
      tlRef.current = null;
      // Se desmontar no meio (StrictMode/HMR), não deixa o hero preso nem o scroll travado.
      openIntroGate();
      document.body.style.overflow = prevOverflow;
      lenis?.start();
      shots.forEach((s) => {
        if (typeof ImageBitmap !== 'undefined' && s instanceof ImageBitmap) s.close();
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
