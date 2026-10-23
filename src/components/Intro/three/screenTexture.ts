import * as THREE from 'three';

/**
 * O que roda na tela do notebook: uma janela de navegador genérica onde acontece uma busca,
 * o resultado do site é clicado e a landing page (um print real do hero) carrega.
 *
 * Tudo é desenhado num canvas 2D de 1600x1000 (16:10, a proporção da tela) e vira CanvasTexture.
 * O material do plano da tela é `MeshBasicMaterial` com `toneMapped: false`, então o branco sai
 * branco e as cores não são lavadas pela iluminação da cena.
 *
 * A janela NÃO imita nenhum buscador real: sem logo, sem as cores de ninguém, layout próprio.
 */

/**
 * O canvas tem o aspect EXATO da face útil da tela do modelo (1.3041 / 0.7658 = 1.7029).
 * Se não bater, sobra faixa preta no plano — foi o que aconteceu com 1600x1000 (1.60).
 */
/**
 * Aspect EXATO da área útil da tela (span u / span v = 1.29801 / 0.81438 = 1.5939), medido no
 * modelo. Se não bater, sobra faixa ou o conteúdo estica.
 */
export const SCREEN_W = 1594;
export const SCREEN_H = 1000;

/** Cores da UI da tela (tokens do projeto). */
const UI = {
  chrome: '#eceaf2',
  chromeLine: '#dcd8e6',
  page: '#ffffff',
  ink: '#1a1620',
  inkSoft: '#6b6478',
  accent: '#3f2bd0',
  link: '#1d0b4e',
  url: '#1f7a5c',
  skeleton: '#e6e2ee',
  bar: '#a668ff',
} as const;

export type ScreenState = {
  /** Texto já digitado no campo de busca. */
  typed: string;
  /** 0→1: resultados entrando. */
  results: number;
  /** Posição do cursor desenhado, em coordenadas do canvas; null esconde. */
  cursor: { x: number; y: number } | null;
  /** 0→1: onda do clique no resultado. */
  ripple: number;
  /** 0→1: barra de carregamento no topo. */
  loading: number;
  /** 0→1: o hero-shot entrando com fade. */
  hero: number;
  /** Aspect da viewport, para o crop "cover" do hero no fim do mergulho. */
  heroAspect?: number;
  /** 0→1: dissolve da tela para o branco do hero, no fim do mergulho. */
  whiteout: number;
};

export type ScreenTexture = {
  texture: THREE.CanvasTexture;
  draw: (state: ScreenState) => void;
  dispose: () => void;
};

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Altura da barra do navegador. */
const CHROME_H = 64;

export function createScreenTexture(
  heroImage: HTMLImageElement | null,
  site: { title: string; url: string; description: string },
  bodyFont: string,
): ScreenTexture | null {
  const canvas = document.createElement('canvas');
  canvas.width = SCREEN_W;
  canvas.height = SCREEN_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;

  /** Barra do navegador: três pontos + endereço. Identidade própria, sem imitar ninguém. */
  const drawChrome = (address: string, loading: number) => {
    ctx.fillStyle = UI.chrome;
    ctx.fillRect(0, 0, SCREEN_W, CHROME_H);
    ctx.fillStyle = UI.chromeLine;
    ctx.fillRect(0, CHROME_H - 1, SCREEN_W, 1);

    // Três pontos
    ctx.fillStyle = '#cfc9db';
    [40, 72, 104].forEach((x) => {
      ctx.beginPath();
      ctx.arc(x, CHROME_H / 2, 8, 0, Math.PI * 2);
      ctx.fill();
    });

    // Campo de endereço
    rr(ctx, 148, 14, SCREEN_W - 196, CHROME_H - 28, 18);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.font = `500 20px ${bodyFont}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = UI.inkSoft;
    ctx.fillText(address, 172, CHROME_H / 2);

    // Barra fina de carregamento correndo no topo
    if (loading > 0 && loading < 1) {
      ctx.fillStyle = UI.bar;
      ctx.fillRect(0, 0, SCREEN_W * loading, 4);
    }
  };

  /** Página de busca: campo central + resultados. */
  const drawSearchPage = (s: ScreenState) => {
    ctx.fillStyle = UI.page;
    ctx.fillRect(0, CHROME_H, SCREEN_W, SCREEN_H - CHROME_H);

    const cx = SCREEN_W / 2;

    // Marca do "buscador": um ponto e um traço, abstrato de propósito.
    ctx.fillStyle = UI.accent;
    ctx.beginPath();
    ctx.arc(cx - 26, 168, 13, 0, Math.PI * 2);
    ctx.fill();
    rr(ctx, cx - 4, 158, 54, 20, 10);
    ctx.fillStyle = '#d9d3ea';
    ctx.fill();

    // Campo de busca
    const fw = 900;
    const fh = 72;
    const fx = cx - fw / 2;
    const fy = 224;
    rr(ctx, fx, fy, fw, fh, fh / 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#dcd6e8';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Lupa
    ctx.strokeStyle = UI.inkSoft;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(fx + 44, fy + fh / 2, 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(fx + 54, fy + fh / 2 + 10);
    ctx.lineTo(fx + 64, fy + fh / 2 + 20);
    ctx.stroke();

    // Texto digitado + cursor
    ctx.font = `400 27px ${bodyFont}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = UI.ink;
    ctx.fillText(s.typed, fx + 84, fy + fh / 2);
    if (s.results === 0 && Math.floor(performance.now() / 500) % 2 === 0) {
      const tw = ctx.measureText(s.typed).width;
      ctx.fillStyle = UI.accent;
      ctx.fillRect(fx + 88 + tw, fy + fh / 2 - 17, 2.5, 34);
    }

    if (s.results <= 0) return;

    // --- Resultados ---
    const lx = fx;
    let y = fy + fh + 76;

    // Meu resultado, em destaque.
    const a = Math.min(1, s.results * 1.6);
    ctx.globalAlpha = a;

    ctx.font = `400 20px ${bodyFont}`;
    ctx.fillStyle = UI.url;
    ctx.fillText(site.url, lx, y);

    ctx.font = `600 32px ${bodyFont}`;
    ctx.fillStyle = UI.link;
    ctx.fillText(site.title, lx, y + 42);

    ctx.font = `400 21px ${bodyFont}`;
    ctx.fillStyle = UI.inkSoft;
    // Descrição em duas linhas, quebrando na largura do campo.
    const words = site.description.split(' ');
    let line = '';
    let ly = y + 84;
    let lines = 0;
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (ctx.measureText(test).width > fw - 40 && line) {
        ctx.fillText(line, lx, ly);
        line = w;
        ly += 30;
        if (++lines >= 2) break;
      } else {
        line = test;
      }
    }
    if (lines < 2) ctx.fillText(line, lx, ly);

    ctx.globalAlpha = 1;

    // Resultados genéricos: só linhas apagadas, sem texto legível.
    y += 190;
    for (let i = 0; i < 4; i++) {
      const ra = Math.max(0, Math.min(1, s.results * 1.6 - 0.35 - i * 0.18));
      if (ra <= 0) break;
      ctx.globalAlpha = ra;
      ctx.fillStyle = '#cfe6dc';
      ctx.fillRect(lx, y, 190, 10);
      ctx.fillStyle = UI.skeleton;
      ctx.fillRect(lx, y + 26, 560, 18);
      ctx.fillRect(lx, y + 58, fw - 60, 10);
      ctx.fillRect(lx, y + 78, fw - 220, 10);
      y += 132;
    }
    ctx.globalAlpha = 1;
  };

  /** Ripple do clique. */
  const drawRipple = (s: ScreenState) => {
    if (s.ripple <= 0 || s.ripple >= 1 || !s.cursor) return;
    const r = s.ripple;
    ctx.globalAlpha = (1 - r) * 0.35;
    ctx.fillStyle = UI.accent;
    ctx.beginPath();
    ctx.arc(s.cursor.x, s.cursor.y, r * 220, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  };

  /** Cursor de mouse desenhado no canvas. */
  const drawCursor = (s: ScreenState) => {
    if (!s.cursor) return;
    const { x, y } = s.cursor;
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, 30);
    ctx.lineTo(8, 23);
    ctx.lineTo(13, 34);
    ctx.lineTo(19, 31);
    ctx.lineTo(14, 20);
    ctx.lineTo(23, 19);
    ctx.closePath();
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.75)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  };

  /**
   * Desenha o hero-shot numa área com crop "cover": recorta a ORIGEM para o aspect do destino
   * e nunca estica. O print é 1600x1000 (1.60) e a tela do notebook é 1.70 — desenhar sem
   * recorte achatava as letras do NICOLE.
   */
  const drawHeroCover = (dx: number, dy: number, dw: number, dh: number, alpha: number) => {
    if (!heroImage || alpha <= 0) return;
    const iw = heroImage.naturalWidth || SCREEN_W;
    const ih = heroImage.naturalHeight || SCREEN_H;
    const target = dw / dh;
    const src = iw / ih;

    // "cover": a origem é recortada no eixo que sobra.
    let cw = iw;
    let ch = ih;
    if (src > target) cw = ih * target; // imagem mais larga → corta nas laterais
    else ch = iw / target; // imagem mais alta → corta em cima/embaixo

    const sx = (iw - cw) / 2;
    const sy = (ih - ch) / 2;

    ctx.globalAlpha = alpha;
    ctx.drawImage(heroImage, sx, sy, cw, ch, dx, dy, dw, dh);
    ctx.globalAlpha = 1;
  };

  const draw = (s: ScreenState) => {
    ctx.clearRect(0, 0, SCREEN_W, SCREEN_H);

    if (s.hero >= 1) {
      // Fase final: o hero cobrindo a tela inteira (sem barra do navegador).
      drawHeroCover(0, 0, SCREEN_W, SCREEN_H, 1);
      // Nos últimos instantes do mergulho a tela dissolve para o BRANCO do hero. É assim que
      // a entrega acontece: quando o quadro está branco, o overlay sai e o hero real assume
      // com a própria animação — sem cross-fade e sem nenhum frame com dois NICOLE.
      if (s.whiteout > 0) {
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = s.whiteout;
        ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
        ctx.globalAlpha = 1;
      }
      texture.needsUpdate = true;
      return;
    }

    const address = s.loading > 0 || s.hero > 0 ? site.url : 'buscar na web';
    drawChrome(address, s.loading);

    if (s.hero > 0) {
      // Página do site carregando por cima da busca.
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, CHROME_H, SCREEN_W, SCREEN_H - CHROME_H);
      ctx.clip();
      ctx.fillStyle = UI.page;
      ctx.fillRect(0, CHROME_H, SCREEN_W, SCREEN_H - CHROME_H);
      drawHeroCover(0, CHROME_H, SCREEN_W, SCREEN_H - CHROME_H, s.hero);
      ctx.restore();
    } else {
      drawSearchPage(s);
      drawRipple(s);
      drawCursor(s);
    }

    texture.needsUpdate = true;
  };

  // Primeiro desenho: a busca, vazia.
  draw({ typed: '', results: 0, cursor: null, ripple: 0, loading: 0, hero: 0, whiteout: 0 });

  return {
    texture,
    draw,
    dispose: () => {
      texture.dispose();
      canvas.width = canvas.height = 0;
    },
  };
}
