/**
 * Gera o print do Hero que aparece DENTRO da tela do notebook, no intro.
 *
 *   node scripts/capture-hero.mjs            (precisa do `npm run dev` rodando)
 *   node scripts/capture-hero.mjs --port=3001
 *
 * Abre a home com `?intro=0` (sem intro), espera o Hero assentar — fontes carregadas e os
 * canvases WebGL já desenhando — e salva `public/intro/hero-shot.webp`.
 *
 * REGERE ESTE ARQUIVO SEMPRE QUE O HERO MUDAR (texto, cor, layout, fonte): ele é uma foto, não
 * atualiza sozinho, e no intro ele é o que a pessoa vê "carregando" na tela do notebook.
 */

import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
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

const port = args.port ?? '3000';
const url = `http://localhost:${port}/?intro=0`;
const outDir = join(process.cwd(), 'public', 'intro');
const outFile = join(outDir, 'hero-shot.webp');

// 1600x1000 = 16:10, a proporção da tela do notebook.
const WIDTH = 1600;
const HEIGHT = 1000;
const SETTLE_MS = 2000;

async function main() {
  await mkdir(outDir, { recursive: true });

  const browser = await chromium.launch({
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  const context = await browser.newContext({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  console.log(`→ abrindo ${url}`);
  await page.goto(url, { waitUntil: 'networkidle' });

  // Espera as fontes: o nome do hero é desenhado em canvas e depende delas.
  await page.evaluate(() => document.fonts.ready);
  // E dá tempo do fluido/tinta assentarem num quadro bonito.
  await page.waitForTimeout(SETTLE_MS);

  await page.screenshot({ path: outFile, type: 'webp', quality: 85 });
  console.log(`→ salvo em ${outFile} (${WIDTH}x${HEIGHT})`);

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
