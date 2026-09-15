import { Archivo_Black, Bricolage_Grotesque, Space_Grotesk } from 'next/font/google';

// Self-host via next/font: sem requisição externa bloqueante e sem layout shift.
// Cada fonte expõe uma CSS var — o canvas do hero lê --font-display para desenhar "NICOLE".
export const archivoBlack = Archivo_Black({
  weight: '400',
  subsets: ['latin'],
  display: 'block',
  variable: '--font-display',
});

// Títulos das seções. Substituiu a Syne, cujas formas (g, ã, R) competiam com o Archivo Black do
// hero. A Bricolage mantém o ar "design studio" com desenho mais convencional — a ousadia fica
// toda no fluido, como manda o brief. 600/700/800: os pesos que os SCSS já usam.
export const heading = Bricolage_Grotesque({
  weight: ['600', '700', '800'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-heading',
});

export const spaceGrotesk = Space_Grotesk({
  weight: ['400', '500', '600'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-body',
});
