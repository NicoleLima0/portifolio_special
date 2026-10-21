import type { MetadataRoute } from 'next';
import { site } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Nomes com hash, nunca o resultado útil de uma busca: rastrear só gasta crawl budget.
        disallow: ['/_next/static/'],
      },
      {
        userAgent: ['Googlebot', 'Googlebot-Image', 'Bingbot'],
        allow: '/',
      },
    ],
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}
