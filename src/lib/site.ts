// Dados centrais do site (SEO, JSON-LD, contato).
// TODO: trocar domínio, e-mail e redes pelos reais antes de publicar.
export const site = {
  name: 'Nicole Lima',
  role: 'Desenvolvedora freelancer',
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nicolelima.dev',
  title: 'Nicole Lima — Desenvolvedora freelancer',
  description:
    'Sites, landing pages e sistemas sob medida feitos pra vender. Do rascunho ao lançamento, Nicole Lima cuida da parte técnica pra você focar no seu negócio.',
  email: 'contato@nicolelima.dev',
  socials: {
    linkedin: 'https://www.linkedin.com/in/nicolelima',
    github: 'https://github.com/nicolelima',
    instagram: 'https://www.instagram.com/nicolelima',
  },
} as const;
