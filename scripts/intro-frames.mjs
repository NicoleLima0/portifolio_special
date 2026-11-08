/**
 * Captura a intro de forma DETERMINÍSTICA, um instante por página.
 *
 *   node scripts/intro-frames.mjs                      (0 → 6,5 s, passo 0,25 s)
 *   node scripts/intro-frames.mjs --from=4 --to=6.5 --step=0.1
 *   node scripts/intro-frames.mjs --live               (modo antigo: uma página, N screenshots)
 *
 * O modo padrão usa `?intro=1&seek=<s>`: a página monta a cena, pausa o master naquele
 * instante e renderiza UM frame, sem encerrar a intro. Assim a resolução temporal não depende
 * da velocidade da captura — cada frame é um retrato exato daquele momento da timeline.
 */

import { chromium } from 'playwright';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const args = Object.fromEntries(
  process.argv
    .slice(2)
    .filter((a) => a.startsWith('--'))
    .map((a) => {
      const [k, v = 'true'] = a.replace(/^--/, '').split('=');
      return [k, v];
    }),
);

const base = process.argv.slice(2).find((a) => !a.startsWith('--')) ?? 'http://localhost:3000/';
const from = Number(args.from ?? 0);
const to = Number(args.to ?? 6.5);
const step = Number(args.step ?? 0.25);
const width = Number(args.w ?? 1280);
const height = Number(args.h ?? 720);
const outDir = join(process.cwd(), 'tmp', 'intro-frames');

const CHROME_ARGS = [
  '--use-gl=angle',
  '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader',
  '--ignore-gpu-blocklist',
  '--enable-webgl',
];

/** Lê o canvas do overlay; devolve null se ele não existir. */
const CANVAS_SNIPPET = () => {
  const ov = [...document.querySelectorAll('div')].find((d) => {
    const st = getComputedStyle(d);
    return st.position === 'fixed' && st.zIndex === '100';
  });
  const cv = ov?.querySelector('canvas');
  if (!cv) return null;
  try {
    return cv.toDataURL('image/png');
  } catch {
    return null;
  }
};

async function seekMode(browser) {
  const logs = new Set();
  let durationSeen = null;

  const shots = [];
  for (let t = from; t <= to + 1e-9; t += step) shots.push(Number(t.toFixed(3)));

  console.log(`→ modo seek: ${shots.length} instantes de ${from}s a ${to}s (passo ${step}s)`);

  for (const t of shots) {
    const context = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();

    page.on('console', (m) => {
      const txt = m.text();
      if (txt.includes('[intro')) {
        logs.add(txt);
        const dm = txt.match(/master montado: ([\d.]+)s/) ?? txt.match(/de ([\d.]+)s/);
        if (dm) durationSeen = dm[1];
      }
    });
    page.on('pageerror', (e) => logs.add(`[pageerror] ${e.message}`));

    const url = `${base}${base.includes('?') ? '&' : '?'}intro=1&seek=${t}`;
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    // Espera o marcador que o overlay põe quando o frame do seek está pronto.
    await page
      .waitForFunction(() => document.documentElement.dataset.introSeekReady === '1', {
        timeout: 15000,
      })
      .catch(() => {});

    const data = await page.evaluate(CANVAS_SNIPPET);
    const file = join(outDir, `t-${String(Math.round(t * 1000)).padStart(5, '0')}ms.png`);
    if (data) {
      await writeFile(file, Buffer.from(data.split(',')[1], 'base64'));
    } else {
      await page.screenshot({ path: file });
    }
    process.stdout.write(`  ${t.toFixed(2)}s${data ? '' : ' (sem canvas)'}\n`);

    await context.close();
  }

  return { logs, durationSeen };
}

async function liveMode(browser) {
  const logs = new Set();
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  page.on('console', (m) => {
    if (m.text().includes('[intro')) logs.add(m.text());
  });
  page.on('pageerror', (e) => logs.add(`[pageerror] ${e.message}`));

  const url = `${base}${base.includes('?') ? '&' : '?'}intro=1`;
  await page.goto(url, { waitUntil: 'domcontentloaded' });

  const totalMs = Number(args.total ?? 9000);
  const stepMs = Number(args.ms ?? 500);
  for (let i = 0; i * stepMs < totalMs; i++) {
    const t = i * stepMs;
    const data = await page.evaluate(CANVAS_SNIPPET);
    const file = join(outDir, `live-${String(t).padStart(5, '0')}ms.png`);
    if (data) await writeFile(file, Buffer.from(data.split(',')[1], 'base64'));
    else await page.screenshot({ path: file });
    await page.waitForTimeout(stepMs);
  }
  return { logs, durationSeen: null };
}

async function main() {
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });

  const browser = await chromium.launch({ args: CHROME_ARGS });
  const { logs, durationSeen } = args.live ? await liveMode(browser) : await seekMode(browser);
  await browser.close();

  console.log(`\n→ frames em ${outDir}`);
  if (durationSeen) console.log(`→ duração do master: ${durationSeen}s`);

  const finishes = [...logs].filter((l) => l.includes('[intro:finish]'));
  if (finishes.length) {
    console.log('\n--- quem encerrou a intro ---');
    for (const f of finishes) console.log(f);
  } else {
    console.log('\n(nenhuma chamada de finish registrada)');
  }

  const others = [...logs].filter((l) => !l.includes('[intro:finish]'));
  if (others.length) {
    console.log('\n--- console ---');
    for (const l of others) console.log(l);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
