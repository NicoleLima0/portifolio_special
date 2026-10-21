import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { archivoBlack, heading, spaceGrotesk } from '@/lib/fonts';
import { site } from '@/lib/site';
import SmoothScroll from '@/components/providers/SmoothScroll';
import FxCanvas from '@/components/fx/FxCanvas';
import Intro from '@/components/Intro/Intro';
import BackToTop from '@/components/ui/BackToTop';
import './globals.scss';

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: site.title,
    template: `%s | ${site.brand}`,
  },
  description: site.description,
  keywords: [...site.keywords],
  applicationName: site.brand,
  authors: [{ name: site.name, url: site.url }],
  creator: site.name,
  publisher: site.brand,
  category: 'technology',
  alternates: {
    canonical: '/',
    languages: { 'pt-BR': '/' },
  },
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: '/',
    siteName: site.brand,
    title: site.title,
    description: site.description,
  },
  twitter: {
    card: 'summary_large_image',
    title: site.title,
    description: site.description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      // Sem limite de snippet/preview: deixa o Google montar o resultado mais rico que
      // conseguir, em vez de cortar no padrão conservador.
      'max-snippet': -1,
      'max-image-preview': 'large',
      'max-video-preview': -1,
    },
  },
  // String vazia emitiria uma meta vazia no <head>.
  ...(site.googleSiteVerification
    ? { verification: { google: site.googleSiteVerification } }
    : {}),
};
export const viewport: Viewport = {
  themeColor: '#ffffff',
  colorScheme: 'only light',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className={`${archivoBlack.variable} ${heading.variable} ${spaceGrotesk.variable}`}>
      <head>
        {/* Dark Reader respeita esta meta e pula a página: sem ela a extensão injeta
            atributos/estilos inline antes da hidratação e o React acusa mismatch. */}
        <meta name="darkreader-lock" />
      </head>
      <body>
        <SmoothScroll />
        {children}
        <BackToTop />
        <FxCanvas />
        {/* Camada por cima de tudo (z-index 100 > FxCanvas 40); depois de {children} para o hero
            já estar montado e pronto por baixo. Autodestrói ao terminar. */}
        <Intro />
      </body>
    </html>
  );
}
