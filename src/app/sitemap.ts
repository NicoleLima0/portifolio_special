import type { MetadataRoute } from 'next';
import { site } from '@/lib/site';
import { WORKS } from '@/lib/works';

export default function sitemap(): MetadataRoute.Sitemap {
  // Uma data por build: um lastModified que muda a cada request sem o conteúdo mudar faz
  // o Google passar a ignorar o campo.
  const lastModified = new Date();

  return [
    {
      url: site.url,
      lastModified,
      changeFrequency: 'monthly',
      priority: 1,
    },
    {
      url: `${site.url}/criacao-de-sites-teresopolis`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    ...WORKS.map((work) => ({
      url: `${site.url}/trabalhos/${work.slug}`,
      lastModified,
      changeFrequency: 'yearly' as const,
      priority: 0.6,
    })),
  ];
}
