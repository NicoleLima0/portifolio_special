import Hero from '@/components/Hero/Hero';
import HeroStage from '@/components/HeroStage/HeroStage';
import About from '@/components/About/About';
import Services from '@/components/Services/Services';
import Works from '@/components/Works/Works';
import Contact from '@/components/Contact/Contact';
import { site } from '@/lib/site';

const personJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: site.name,
  jobTitle: site.role,
  url: site.url,
  email: `mailto:${site.email}`,
  sameAs: Object.values(site.socials),
  knowsAbout: ['Desenvolvimento web', 'Landing pages', 'Sistemas sob medida'],
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd).replace(/</g, '\\u003c') }}
      />
      <main>
        <HeroStage>
          <Hero />
        </HeroStage>
        <About />
        <Services />
        <Works />
        <Contact />
      </main>
    </>
  );
}
