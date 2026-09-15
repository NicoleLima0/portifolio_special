import { ViewTransition } from 'react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import CaseGallery from '@/components/CaseGallery/CaseGallery';
import Contact from '@/components/Contact/Contact';
import { site } from '@/lib/site';
import { findWork, nextWork, workNumber, WORKS } from '@/lib/works';
import styles from './case.module.scss';

export const dynamicParams = false;

export function generateStaticParams() {
  return WORKS.map((work) => ({ slug: work.slug }));
}

export async function generateMetadata({ params }: PageProps<'/trabalhos/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  const work = findWork(slug);
  if (!work) return {};

  const title = `${work.title} — ${work.client}`;
  return {
    title,
    description: work.summary,
    alternates: { canonical: `/trabalhos/${slug}` },
    openGraph: {
      type: 'article',
      locale: 'pt_BR',
      url: `/trabalhos/${slug}`,
      siteName: site.name,
      title,
      description: work.summary,
      // A capa do case é o card de compartilhamento (metadataBase resolve o caminho absoluto).
      images: [{ url: work.cover, width: 1600, height: 1000, alt: work.alt }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: work.summary,
      images: [work.cover],
    },
  };
}

export default async function WorkCase({ params }: PageProps<'/trabalhos/[slug]'>) {
  const { slug } = await params;
  const work = findWork(slug);
  if (!work) notFound();

  const next = nextWork(slug);
  const number = workNumber(slug);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: work.title,
    headline: work.headline,
    description: work.summary,
    url: `${site.url}/trabalhos/${slug}`,
    image: `${site.url}${work.cover}`,
    dateCreated: work.year,
    creator: { '@type': 'Person', name: site.name, url: site.url },
    about: work.disciplines.join(', '),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />

      {/* Direcional: entra deslizando ao vir da home, volta pelo outro lado no "voltar".
          O wrapper fica na page (não no layout) — layouts persistem e enter/exit nunca disparam. */}
      <ViewTransition
        enter={{ 'nav-forward': 'nav-forward', 'nav-back': 'nav-back', default: 'none' }}
        exit={{ 'nav-forward': 'nav-forward', 'nav-back': 'nav-back', default: 'none' }}
        default="none"
      >
        <main className={styles.case}>
          <header className={styles.case__head}>
            <Link href="/#trabalhos" className={styles.case__back} transitionTypes={['nav-back']}>
              <span className={styles['case__back-arrow']} aria-hidden="true">
                ←
              </span>
              voltar
            </Link>

            <h1 className={styles.case__title}>
              <span className={styles.case__mask}>
                <span className={styles.case__rise}>{work.title}</span>
              </span>
            </h1>

            <dl className={styles.case__meta}>
              <div className={styles['case__meta-item']}>
                <dt className={styles['case__meta-label']}>Projeto</dt>
                <dd className={styles['case__meta-value']}>({number})</dd>
              </div>
              <div className={styles['case__meta-item']}>
                <dt className={styles['case__meta-label']}>Ano</dt>
                <dd className={styles['case__meta-value']}>{work.year}</dd>
              </div>
              <div className={styles['case__meta-item']}>
                <dt className={styles['case__meta-label']}>Cliente</dt>
                <dd className={styles['case__meta-value']}>{work.client}</dd>
              </div>
              <div className={styles['case__meta-item']}>
                <dt className={styles['case__meta-label']}>Disciplinas</dt>
                <dd className={styles['case__meta-value']}>{work.disciplines.join(' / ')}</dd>
              </div>
            </dl>

            <p className={styles.case__summary}>{work.summary}</p>
          </header>

          {/* Mesmo `name` do card na home: o navegador move uma imagem só, sem corte seco. */}
          <ViewTransition name={`work-${work.slug}`} share="morph" default="none">
            <div className={styles.case__cover}>
              <Image
                src={work.cover}
                alt={work.alt}
                fill
                sizes="100vw"
                // Acima da dobra: a doc do Next 16 recomenda eager + fetchPriority no lugar de `preload`.
                loading="eager"
                fetchPriority="high"
              />
            </div>
          </ViewTransition>

          <section className={styles.case__concept} aria-labelledby="conceito-title">
            <h2 id="conceito-title" className={styles.case__label}>
              ( Conceito )
            </h2>
            <div className={styles['case__concept-body']}>
              {work.concept.map((paragraph, i) => (
                <p key={i} className={styles.case__paragraph}>
                  {paragraph}
                </p>
              ))}
            </div>
          </section>

          <CaseGallery shots={work.gallery} title={work.title} />

          {work.metrics.length > 0 ? (
            <section className={styles.case__metrics} aria-label="Resultados">
              {work.metrics.map((metric) => (
                <div key={metric.label} className={styles.case__metric}>
                  <span className={styles['case__metric-value']}>{metric.value}</span>
                  <span className={styles['case__metric-label']}>{metric.label}</span>
                </div>
              ))}
            </section>
          ) : null}

          <section className={styles.case__credits} aria-labelledby="creditos-title">
            <div>
              <h2 id="creditos-title" className={styles.case__label}>
                ( Créditos )
              </h2>
              <p className={styles['case__credit-value']}>{work.role}</p>
            </div>
            <div>
              <p className={styles.case__label}>( Stack )</p>
              <p className={styles['case__credit-value']}>{work.stack.join(' · ')}</p>
            </div>
            {work.liveUrl ? (
              <a
                className={styles.case__live}
                href={work.liveUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                ver ao vivo
                <span className={styles['case__live-arrow']} aria-hidden="true">
                  ↗
                </span>
              </a>
            ) : null}
          </section>

          {/* Próximo case: bloco grande e clicável, no espírito da referência. */}
          <Link href={`/trabalhos/${next.slug}`} className={styles.case__next} transitionTypes={['nav-forward']}>
            <div className={styles['case__next-inner']}>
              <div>
                <p className={styles['case__next-label']}>
                  <span>Próximo projeto</span>
                  <span aria-hidden="true">({workNumber(next.slug)})</span>
                </p>
                <p className={styles['case__next-title']}>{next.title}</p>
              </div>
              <div className={styles['case__next-media']}>
                <Image
                  src={next.cover}
                  alt=""
                  fill
                  sizes="(min-width: 768px) 30vw, 92vw"
                  loading="lazy"
                />
              </div>
            </div>
          </Link>

          <div className={styles.case__all}>
            <Link href="/#trabalhos" className={styles['case__all-link']} transitionTypes={['nav-back']}>
              ver todos os projetos
              <span aria-hidden="true">↗</span>
            </Link>
          </div>

          <Contact />
        </main>
      </ViewTransition>
    </>
  );
}
