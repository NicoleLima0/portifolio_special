import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { WORKS } from '@/lib/works';
import styles from './case.module.scss';

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return WORKS.map((work) => ({ slug: work.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const work = WORKS.find((w) => w.slug === slug);
  if (!work) return {};
  return {
    title: work.title,
    description: work.summary,
    alternates: { canonical: `/trabalhos/${slug}` },
  };
}

// TODO: página de case completa. Por enquanto um stub para os links do showcase não darem 404.
export default async function WorkCase({ params }: Props) {
  const { slug } = await params;
  const work = WORKS.find((w) => w.slug === slug);
  if (!work) notFound();

  return (
    <main className={styles.case}>
      <Link href="/#trabalhos" className={styles.case__back}>
        ← voltar
      </Link>
      <p className={styles.case__meta}>
        {work.tag} · {work.year}
      </p>
      <h1 className={styles.case__title}>{work.title}</h1>
      <p className={styles.case__summary}>{work.summary}</p>
      <div className={styles.case__cover}>
        <Image src={work.cover} alt={`Capa do projeto ${work.title}`} fill priority sizes="(min-width: 1440px) 1360px, 94vw" />
      </div>
      <p className={styles.case__note}>Case completo em breve.</p>
    </main>
  );
}
