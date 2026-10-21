// Dados centrais do site (SEO, JSON-LD, contato).

// Fora do objeto porque `title` e `description` os interpolam, e uma propriedade não pode
// referenciar `site.x` dentro da própria declaração.
const city = 'Teresópolis';
const region = 'RJ';
const regionName = 'Rio de Janeiro';
const brand = 'Nicole Lima Dev';

export const site = {
  name: 'Nicole Lima',
  brand,
  role: 'Desenvolvedora de sites e sistemas',
  city,
  region,
  regionName,
  country: 'BR',

  // NEXT_PUBLIC_SITE_URL dá a cada deploy de preview a própria URL: sem ela o canonical
  // de um preview aponta para o site oficial.
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nicolelima.tech').replace(/\/$/, ''),

  // Title e description são o resultado de busca em si. O Google corta perto de 60 e 160
  // caracteres, então a palavra-chave vem na frente e a marca fecha.
  title: `Desenvolvedora de Sites em ${city} | ${brand}`,
  description:
    `Criação de sites, landing pages e sistemas sob medida em ${city} e região serrana do ${regionName}. ` +
    'Desenvolvedora freelancer com atendimento direto, site rápido e pronto pra aparecer no Google. Orçamento pelo WhatsApp.',

  // Também servem de checklist: o que está aqui precisa aparecer em texto visível em alguma página.
  keywords: [
    `desenvolvedora de sites ${city}`,
    `desenvolvedor ${city}`,
    `dev ${city}`,
    `criação de sites ${city}`,
    `criação de sites ${city} RJ`,
    `programador ${city}`,
    `site profissional ${city}`,
    `landing page ${city}`,
    `loja virtual ${city}`,
    `sistema sob medida ${city}`,
    `agência de sites ${city}`,
    `web designer ${city}`,
    'Nicole Lima Dev',
    'Nicole Lima desenvolvedora',
    'Nicole Dev',
    'desenvolvedora freelancer Rio de Janeiro',
    'criação de sites região serrana',
    'desenvolvimento web Teresópolis',
  ],

  /** Vira o `areaServed` do schema: é o que põe o site nas buscas das cidades vizinhas. */
  areaServed: [city, 'Nova Friburgo', 'Petrópolis', 'Guapimirim', 'Magé', 'Rio de Janeiro'],

  /** Centro de Teresópolis. O LocalBusiness aceita geo sem endereço de rua. */
  geo: { lat: -22.4149, lng: -42.9658 },

  email: 'nicolelima.tech@gmail.com',

  /** Só dígitos com DDI 55: é o formato que o wa.me exige. */
  whatsapp: '5521975845915',
  /** O mesmo número em E.164, que é o que o schema.org espera. */
  phone: '+55 21 97584-5915',

  socials: {
    linkedin: 'https://www.linkedin.com/in/nicole-lima-0a89a8263/',
    github: 'https://github.com/NicoleLima0',
    instagram: 'https://www.instagram.com/nicolelima0',
  },

  /** Código do Search Console. Vazio não emite a meta tag. */
  googleSiteVerification: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION ?? '',
} as const;

/** Conversa no WhatsApp já com a primeira mensagem escrita: menos atrito do que um chat vazio. */
export const whatsappUrl = `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(
  'Oi, Nicole! Vim pelo seu site e queria conversar sobre um projeto.',
)}`;
