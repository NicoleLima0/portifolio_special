// Dados estruturados (schema.org) em JSON-LD.
//
// O LocalBusiness é a peça central do SEO local: o Google não deduz cidade de atuação a
// partir do texto da página, e `areaServed` + `geo` são o sinal explícito.
//
// Um @graph por página (um só <script>), com os nós ligados por @id em vez de repetidos.

import { site, whatsappUrl } from './site';
import type { Work } from './works';

const id = {
  site: `${site.url}/#website`,
  person: `${site.url}/#nicole`,
  business: `${site.url}/#business`,
} as const;

const sameAs = Object.values(site.socials);

const areaServed = site.areaServed.map((name) => ({ '@type': 'City', name }));

const address = {
  '@type': 'PostalAddress',
  addressLocality: site.city,
  addressRegion: site.region,
  addressCountry: site.country,
};

const person = {
  '@type': 'Person',
  '@id': id.person,
  name: site.name,
  // Como as pessoas pesquisam o nome dela.
  alternateName: [site.brand, 'Nicole Dev'],
  jobTitle: site.role,
  description: `Desenvolvedora de sites, landing pages e sistemas sob medida em ${site.city}, ${site.regionName}.`,
  url: site.url,
  email: `mailto:${site.email}`,
  telephone: site.phone,
  sameAs,
  address,
  knowsAbout: [
    'Desenvolvimento web',
    'Criação de sites',
    'Landing pages',
    'Sistemas sob medida',
    'SEO técnico',
    'Next.js',
    'React',
    'TypeScript',
  ],
  knowsLanguage: ['pt-BR'],
};

// ProfessionalService é o subtipo de LocalBusiness para serviço sem loja de rua: aceita
// `areaServed` no lugar de um endereço completo.
const business = {
  '@type': ['ProfessionalService', 'LocalBusiness'],
  '@id': id.business,
  name: site.brand,
  legalName: site.name,
  description:
    `Criação de sites, landing pages, lojas virtuais e sistemas sob medida para empresas de ` +
    `${site.city} e região serrana do ${site.regionName}.`,
  url: site.url,
  telephone: site.phone,
  email: `mailto:${site.email}`,
  image: `${site.url}/opengraph-image`,
  priceRange: 'R$$',
  founder: { '@id': id.person },
  address,
  geo: {
    '@type': 'GeoCoordinates',
    latitude: site.geo.lat,
    longitude: site.geo.lng,
  },
  areaServed,
  serviceType: [
    'Criação de sites',
    'Desenvolvimento de landing pages',
    'Desenvolvimento de sistemas web',
    'Manutenção de sites',
    'SEO técnico',
  ],
  sameAs,
  potentialAction: {
    '@type': 'ContactAction',
    target: whatsappUrl,
    name: 'Pedir orçamento pelo WhatsApp',
  },
};

const website = {
  '@type': 'WebSite',
  '@id': id.site,
  url: site.url,
  name: site.brand,
  description: site.description,
  inLanguage: 'pt-BR',
  publisher: { '@id': id.business },
};

export function homeGraph(services: { title: string; text: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      website,
      person,
      business,
      {
        '@type': 'WebPage',
        '@id': `${site.url}/#webpage`,
        url: site.url,
        name: site.title,
        description: site.description,
        isPartOf: { '@id': id.site },
        about: { '@id': id.business },
        inLanguage: 'pt-BR',
      },
      // Um Service por item da seção: cada um pode casar com uma busca diferente
      // ("landing page Teresópolis", "sistema sob medida").
      ...services.map((service) => ({
        '@type': 'Service',
        name: `${service.title} em ${site.city}`,
        description: service.text,
        serviceType: service.title,
        provider: { '@id': id.business },
        areaServed,
      })),
    ],
  };
}

export function caseGraph(work: Work) {
  const url = `${site.url}/trabalhos/${work.slug}`;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CreativeWork',
        '@id': `${url}#work`,
        name: work.title,
        headline: work.headline,
        description: work.summary,
        url,
        image: `${site.url}${work.cover}`,
        dateCreated: work.year,
        inLanguage: 'pt-BR',
        creator: { '@id': id.person },
        provider: { '@id': id.business },
        about: work.disciplines.join(', '),
        keywords: [...work.disciplines, ...work.stack].join(', '),
      },
      breadcrumb([
        { name: 'Início', url: site.url },
        { name: 'Trabalhos', url: `${site.url}/#trabalhos` },
        { name: work.title, url },
      ]),
      person,
      business,
    ],
  };
}

export function servicePageGraph(faq: { q: string; a: string }[]) {
  const url = `${site.url}/criacao-de-sites-teresopolis`;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Service',
        '@id': `${url}#service`,
        name: `Criação de sites em ${site.city}`,
        description:
          `Sites, landing pages, lojas virtuais e sistemas sob medida para empresas de ${site.city} ` +
          `e região, com atendimento direto da desenvolvedora.`,
        serviceType: 'Criação de sites',
        url,
        provider: { '@id': id.business },
        areaServed,
        availableChannel: {
          '@type': 'ServiceChannel',
          serviceUrl: url,
          servicePhone: site.phone,
          availableLanguage: 'pt-BR',
        },
      },
      // As perguntas podem virar o bloco expansível do resultado de busca. Exige que as
      // mesmas perguntas e respostas estejam visíveis na página — estão, no <details>.
      {
        '@type': 'FAQPage',
        '@id': `${url}#faq`,
        mainEntity: faq.map((item) => ({
          '@type': 'Question',
          name: item.q,
          acceptedAnswer: { '@type': 'Answer', text: item.a },
        })),
      },
      breadcrumb([
        { name: 'Início', url: site.url },
        { name: `Criação de sites em ${site.city}`, url },
      ]),
      person,
      business,
    ],
  };
}

function breadcrumb(items: { name: string; url: string }[]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/** Escapar `<` impede que um texto com HTML feche a tag <script> mais cedo. */
export function jsonLdHtml(graph: unknown): string {
  return JSON.stringify(graph).replace(/</g, '\u003c');
}
