import type { MetadataRoute } from 'next';
import { site } from '@/lib/site';
import { WORKS } from '@/lib/works';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: site.url,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 1,
    },
    ...WORKS.map((work) => ({
      url: `${site.url}/trabalhos/${work.slug}`,
      lastModified: new Date(),
      changeFrequency: 'yearly' as const,
      priority: 0.6,
    })),
  ];
}
