// Página de serviço local, que disputa "criação de sites Teresópolis" e variações.
// O Google ranqueia uma URL por intenção, e a home de um portfólio é sobre a pessoa; aqui o
// termo se concentra no title, no H1, no texto e no schema. A home segue com os nomes.

import type { Metadata } from 'next';
import Link from 'next/link';
import { jsonLdHtml, servicePageGraph } from '@/lib/jsonLd';
import { SERVICES } from '@/lib/services';
import { site, whatsappUrl } from '@/lib/site';
import { WORKS } from '@/lib/works';
import styles from './local.module.scss';

const PATH = '/criacao-de-sites-teresopolis';

export const metadata: Metadata = {
  // `absolute` ignora o template do layout, que repetiria o nome e passaria dos ~60
  // caracteres que o Google exibe.
  title: { absolute: `Criação de Sites em ${site.city} RJ | ${site.brand}` },
  description:
    `Criação de sites, landing pages e sistemas sob medida em ${site.city} (RJ). Atendimento direto ` +
    'com a desenvolvedora, site rápido, otimizado para o Google e feito pra trazer cliente. Peça um orçamento.',
  keywords: [...site.keywords],
  alternates: { canonical: PATH },
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: PATH,
    siteName: site.brand,
    title: `Criação de Sites em ${site.city} | ${site.brand}`,
    description: `Sites, landing pages e sistemas sob medida para empresas de ${site.city} e região.`,
  },
};

/** Fonte única: as mesmas perguntas vão para o FAQPage do JSON-LD, que exige o texto
 *  equivalente visível na página. */
const FAQ = [
  {
    q: `Quanto custa um site em ${site.city}?`,
    a:
      'Depende do tamanho: uma landing page de uma seção só é bem diferente de um sistema com ' +
      'área de cliente. Eu olho o que você precisa e passo um valor fechado antes de começar, ' +
      'sem cobrança por hora e sem surpresa no meio do caminho.',
  },
  {
    q: 'Em quanto tempo o site fica no ar?',
    a:
      'Uma landing page costuma ficar pronta em 1 a 2 semanas. Sites institucionais com mais ' +
      'páginas levam de 3 a 4 semanas. Sistemas sob medida variam conforme o escopo, e nesse ' +
      'caso eu entrego por etapas, para você já ir usando a primeira parte.',
  },
  {
    q: `Você atende presencialmente em ${site.city}?`,
    a:
      `Sim. Sou de ${site.city} e atendo presencialmente aqui e na região serrana — ` +
      `${site.areaServed.slice(1, 4).join(', ')}. Para clientes de fora, trabalho remoto ` +
      'com reuniões por vídeo e WhatsApp.',
  },
  {
    q: 'Meu site vai aparecer no Google?',
    a:
      'É parte do trabalho, não um extra. Todo site sai com SEO técnico feito: título e ' +
      'descrição pensados para busca, dados estruturados de negócio local, sitemap, imagens ' +
      'otimizadas e carregamento rápido — que é um dos critérios de ranqueamento do Google. ' +
      'Também configuro o Google Search Console para você acompanhar as buscas que te trazem visita.',
  },
  {
    q: 'Eu consigo editar o site depois, sozinha?',
    a:
      'Sim, quando o projeto pede. Se você precisa trocar textos, fotos ou publicar novidades, ' +
      'eu entrego com um painel simples para isso. E continuo por perto para o que for técnico.',
  },
  {
    q: 'Já tenho um site, mas ele é lento e ninguém acha. Dá pra arrumar?',
    a:
      'Dá, e muitas vezes é o caminho mais rápido. Eu analiso o que existe, mostro o que está ' +
      'travando a performance e as buscas, e digo com honestidade se vale corrigir ou refazer.',
  },
];

export default function LocalServicePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdHtml(servicePageGraph(FAQ)) }}
      />

      <main className={styles.local}>
        {/* Espelha o BreadcrumbList do schema. */}
        <nav className={styles.local__crumbs} aria-label="Você está em">
          <Link href="/">Início</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">Criação de sites em {site.city}</span>
        </nav>

        <header className={styles.local__head}>
          <p className={styles.local__eyebrow}>
            {site.city} · {site.regionName}
          </p>
          <h1 className={styles.local__title}>Criação de sites em {site.city}</h1>
          <p className={styles.local__lead}>
            Sou {site.name}, desenvolvedora em {site.city}. Faço sites, landing pages e sistemas
            sob medida para empresas da cidade e da região serrana — do tipo que carrega rápido,
            aparece no Google e transforma visita em cliente. Quem fala com você é quem escreve
            o código: sem intermediário, sem time terceirizado.
          </p>
          <a
            className={styles.local__cta}
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Pedir orçamento no WhatsApp
            <span aria-hidden="true">→</span>
          </a>
        </header>

        <section className={styles.local__section} aria-labelledby="servicos-locais">
          <h2 id="servicos-locais" className={styles.local__h2}>
            O que eu faço para empresas de {site.city}
          </h2>
          <ul className={styles.local__cards}>
            {SERVICES.map((service) => (
              <li key={service.title} className={styles.card}>
                <h3 className={styles.card__title}>{service.title}</h3>
                <p className={styles.card__text}>{service.text}</p>
                <ul className={styles.card__items}>
                  {service.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </section>

        <section className={styles.local__section} aria-labelledby="regiao">
          <h2 id="regiao" className={styles.local__h2}>
            Atendimento em {site.city} e região
          </h2>
          <p className={styles.local__text}>
            A base é {site.city}, onde eu atendo presencialmente. Também trabalho com clientes
            de {site.areaServed.slice(1).join(', ')} e, no remoto, de qualquer lugar do Brasil.
            Na prática a diferença é pequena: a conversa acontece por WhatsApp e vídeo de todo
            jeito — estar perto só facilita quando o projeto pede visita, fotos do espaço ou uma
            reunião olho no olho.
          </p>
          <ul className={styles.local__chips}>
            {site.areaServed.map((area) => (
              <li key={area}>{area}</li>
            ))}
          </ul>
        </section>

        <section className={styles.local__section} aria-labelledby="cases-locais">
          <h2 id="cases-locais" className={styles.local__h2}>
            Projetos recentes
          </h2>
          <ul className={styles.local__works}>
            {WORKS.map((work) => (
              <li key={work.slug}>
                <Link href={`/trabalhos/${work.slug}`} className={styles.work}>
                  <span className={styles.work__tag}>{work.tag}</span>
                  <span className={styles.work__title}>{work.title}</span>
                  <span className={styles.work__summary}>{work.summary}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className={styles.local__section} aria-labelledby="faq">
          <h2 id="faq" className={styles.local__h2}>
            Perguntas frequentes
          </h2>
          {/* <details> nativo: abre sem JS e o conteúdo fechado continua no HTML, logo
              indexável — o que um accordion em JS não garante. */}
          <div className={styles.local__faq}>
            {FAQ.map((item) => (
              <details key={item.q} className={styles.faq}>
                <summary className={styles.faq__q}>{item.q}</summary>
                <p className={styles.faq__a}>{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className={styles.local__end} aria-labelledby="fechamento">
          <h2 id="fechamento" className={styles.local__h2}>
            Vamos tirar seu site do papel?
          </h2>
          <p className={styles.local__text}>
            Me conta o que você precisa — mesmo que ainda esteja vago. Eu respondo rápido, com um
            caminho claro e um valor fechado.
          </p>
          <a
            className={styles.local__cta}
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Falar com {site.name}
            <span aria-hidden="true">→</span>
          </a>
          <p className={styles.local__back}>
            <Link href="/">Ver o portfólio completo</Link>
          </p>
        </section>
      </main>
    </>
  );
}
