import * as THREE from 'three';

/**
 * Textura de "puff" de nuvem, GERADA EM CÓDIGO — nada é buscado em CDN externa (é por isso
 * que o `<Cloud>` do drei não é usado: a textura padrão dele vem de fora).
 *
 * É um fbm de ruído de valor, multiplicado por um falloff radial suave: o centro fica denso e
 * a borda dissolve, então vários sprites sobrepostos formam um volume fofo em vez de discos.
 */

const SIZE = 256;

/** Ruído de valor determinístico (sem Math.random: o replay é sempre igual). */
function hash(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

function valueNoise(x: number, y: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  // Suavização cúbica (smoothstep), para o ruído não ficar quadriculado.
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);

  const a = hash(xi, yi);
  const b = hash(xi + 1, yi);
  const c = hash(xi, yi + 1);
  const d = hash(xi + 1, yi + 1);

  return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
}

function fbm(x: number, y: number, octaves = 5): number {
  let value = 0;
  let amp = 0.5;
  let freq = 1;
  for (let i = 0; i < octaves; i++) {
    value += amp * valueNoise(x * freq, y * freq);
    freq *= 2.03;
    amp *= 0.5;
  }
  return value;
}

/**
 * Gera a textura. `seed` desloca o campo de ruído, então cada puff pode ter um recorte
 * diferente e a nuvem não parece o mesmo carimbo repetido.
 */
export function createCloudTexture(seed = 0): THREE.CanvasTexture | null {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const img = ctx.createImageData(SIZE, SIZE);
  const data = img.data;
  const half = SIZE / 2;

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const i = (y * SIZE + x) * 4;

      // Falloff radial: 1 no centro, 0 na borda, com queda suave.
      const dx = (x - half) / half;
      const dy = (y - half) / half;
      const d = Math.sqrt(dx * dx + dy * dy);
      const falloff = Math.max(0, 1 - d);
      const soft = falloff * falloff * (3 - 2 * falloff);

      // Ruído deformando a silhueta, para a borda não ser um círculo perfeito.
      const n = fbm(x / 42 + seed * 13.7, y / 42 + seed * 7.3);
      const alpha = Math.max(0, Math.min(1, soft * (0.55 + n * 0.9) - 0.08));

      // Gradiente de luz: topo mais claro, base levemente lavanda — é o que dá volume.
      const top = 1 - y / SIZE;
      const r = 248 + top * 7;
      const g = 245 + top * 9;
      const b = 252;

      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = alpha * 255;
    }
  }

  ctx.putImageData(img, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.premultiplyAlpha = false;
  return texture;
}
