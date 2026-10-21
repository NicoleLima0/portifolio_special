import { ViewTransition } from 'react';
import Hero from '@/components/Hero/Hero';
import About from '@/components/About/About';
import Services from '@/components/Services/Services';
import Works from '@/components/Works/Works';
import Contact from '@/components/Contact/Contact';
import { homeGraph, jsonLdHtml } from '@/lib/jsonLd';
import { SERVICES } from '@/lib/services';

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdHtml(homeGraph(SERVICES)) }}
      />
      {/* Mesmo wrapper direcional do case: a home desliza para fora ao abrir um projeto e
          volta ao lugar no retorno. Precisa estar na page — no layout, enter/exit não disparam. */}
      <ViewTransition
        enter={{ 'nav-forward': 'nav-forward', 'nav-back': 'nav-back', default: 'none' }}
        exit={{ 'nav-forward': 'nav-forward', 'nav-back': 'nav-back', default: 'none' }}
        default="none"
      >
        <main>
          {/* O hero pinta o próprio branco; o preto aqui cobre a borda enquanto ele monta. */}
          <div className="hero-stage">
            <Hero />
          </div>
          <About />
          <Services />
          <Works />
          <Contact />
        </main>
      </ViewTransition>
    </>
  );
}
