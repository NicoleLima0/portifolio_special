import { ImageResponse } from 'next/og';
import { site } from '@/lib/site';

export const alt = site.title;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const TAGLINE = ['Não é só código, é resultado.', 'Sites e produtos que vendem.'];
const FOOTER_LEFT = 'desenvolvedora · freelancer';
const FOOTER_RIGHT = site.url.replace(/^https?:\/\//, '');

// Baixa só os glifos usados (subset via `text=`) — o card é gerado no build.
async function loadGoogleFont(family: string, text: string): Promise<ArrayBuffer | null> {
  try {
    const api = `https://fonts.googleapis.com/css2?family=${family}&text=${encodeURIComponent(text)}`;
    const css = await (await fetch(api)).text();
    const url = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)?.[1];
    if (!url) return null;
    return await (await fetch(url)).arrayBuffer();
  } catch {
    return null;
  }
}

// Card de compartilhamento: versão estática do hero (branco + NICOLE iridescente).
export default async function OpengraphImage() {
  const bodyText = [...TAGLINE, FOOTER_LEFT.toUpperCase(), FOOTER_RIGHT.toUpperCase()].join('');
  const [display, body] = await Promise.all([
    loadGoogleFont('Archivo+Black', 'NICOLE'),
    loadGoogleFont('Space+Grotesk:wght@500', bodyText),
  ]);
  const fonts = [
    // A primeira fonte vira o padrão do satori: o corpo vem antes do display.
    ...(body ? [{ name: 'Space Grotesk', data: body, style: 'normal' as const, weight: 500 as const }] : []),
    ...(display ? [{ name: 'Archivo Black', data: display, style: 'normal' as const, weight: 400 as const }] : []),
  ];

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '56px 64px',
          background: '#ffffff',
          color: '#0a0a0a',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', fontSize: 34, fontWeight: 500, lineHeight: 1.25 }}>
          {TAGLINE.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            fontFamily: display ? 'Archivo Black' : 'sans-serif',
            fontSize: 262,
            lineHeight: 1,
            letterSpacing: '-0.02em',
            backgroundImage: 'linear-gradient(115deg, #1d0b4e 0%, #3f2bd0 26%, #a668ff 44%, #ff2e97 62%, #38e8ff 84%, #2a1070 100%)',
            backgroundClip: 'text',
            color: 'transparent',
          }}
        >
          NICOLE
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 22,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
          }}
        >
          <span>{FOOTER_LEFT}</span>
          <span>{FOOTER_RIGHT}</span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: fonts.length ? fonts : undefined,
    },
  );
}
