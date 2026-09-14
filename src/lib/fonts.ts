import { Archivo_Black, Space_Grotesk, Syne } from 'next/font/google';

// Self-host via next/font: sem requisição externa bloqueante e sem layout shift.
// Cada fonte expõe uma CSS var — o canvas do hero lê --font-display para desenhar "NICOLE".
export const archivoBlack = Archivo_Black({
  weight: '400',
  subsets: ['latin'],
  display: 'block',
  variable: '--font-display',
});

export const syne = Syne({
  weight: ['700', '800'],
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
