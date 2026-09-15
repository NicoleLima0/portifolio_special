import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { archivoBlack, heading, spaceGrotesk } from '@/lib/fonts';
import { site } from '@/lib/site';
import SmoothScroll from '@/components/providers/SmoothScroll';
import FxCanvas from '@/components/fx/FxCanvas';
import Intro from '@/components/Intro/Intro';
import './globals.scss';

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: site.title,
    template: `%s — ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
  authors: [{ name: site.name, url: site.url }],
  creator: site.name,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: '/',
    siteName: site.name,
    title: site.title,
    description: site.description,
  },
  twitter: {
    card: 'summary_large_image',
    title: site.title,
    description: site.description,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#ffffff',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={`${archivoBlack.variable} ${heading.variable} ${spaceGrotesk.variable}`}>
      <body>
        <SmoothScroll />
        {children}
        <FxCanvas />
        {/* Camada por cima de tudo (z-index 100 > FxCanvas 40); depois de {children} para o hero
            já estar montado e pronto por baixo. Autodestrói ao terminar. */}
        <Intro />
      </body>
    </html>
  );
}
