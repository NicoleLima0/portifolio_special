'use client';

import { useRef, useState, type CSSProperties, type MouseEvent } from 'react';
import { gsap, MOTION_OK, ScrollTrigger, useGSAP } from '@/lib/gsap';
import { fx } from '@/components/fx/fxStore';
import styles from './Services.module.scss';

const HOVER = '(hover: hover) and (pointer: fine)';

const SERVICES = [
  {
    title: 'Sites & landing pages',
    text: 'Páginas rápidas e bonitas, pensadas pra transformar visita em cliente — e fáceis de achar no Google.',
    items: ['Landing pages de lançamento', 'Sites institucionais', 'SEO técnico e performance'],
    phase: 0,
  },
  {
    title: 'Sistemas sob medida',
    text: 'Painéis, áreas de cliente e automações que tiram trabalho manual do seu dia e deixam a operação redonda.',
    items: ['Painéis e áreas de cliente', 'Integrações e automações', 'Agendamentos e pagamentos'],
    phase: 0.33,
  },
  {
    title: 'Cuidado contínuo',
    text: 'Depois do lançamento eu continuo por perto: melhorias, ajustes e tudo no ar funcionando sem susto.',
    items: ['Manutenção e evolução', 'Monitoramento e backups', 'Melhorias guiadas por dados'],
    phase: 0.66,
  },
];

export default function Services() {
  const rootRef = useRef<HTMLElement>(null);
  // Estado de UI (qual item está aberto): muda só em hover/tap, nunca por frame.
  const [open, setOpen] = useState(-1);

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root) return;
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        gsap.from('[data-reveal]', {
          yPercent: 115,
          duration: 1.1,
          ease: 'expo.out',
          stagger: 0.08,
          scrollTrigger: { trigger: root, start: 'top 75%', once: true },
        });
        gsap.utils.toArray<HTMLElement>('[data-service-reveal]').forEach((el) => {
          gsap.from(el, {
            yPercent: 115,
            duration: 1,
            ease: 'expo.out',
            scrollTrigger: { trigger: el, start: 'top 94%', once: true },
          });
        });
        // Saiu da seção rolando com o mouse parado em cima: some o preview.
        ScrollTrigger.create({
          trigger: root,
          start: 'top bottom',
          end: 'bottom top',
          onToggle: (self) => {
            if (!self.isActive) fx.preview.active = false;
          },
        });
      });
      return () => {
        fx.preview.active = false;
      };
    },
    { scope: rootRef },
  );

  const canHover = () => window.matchMedia(HOVER).matches;

  const enter = (index: number) => {
    if (!canHover()) return;
    setOpen(index);
    fx.preview.phase = SERVICES[index].phase;
    fx.preview.active = true;
  };
  const leave = () => {
    if (!canHover()) return;
    setOpen(-1);
    fx.preview.active = false;
  };
  // Touch e teclado alternam; clique de mouse num item já aberto pelo hover não fecha.
  const toggle = (index: number, event: MouseEvent) => {
    if (canHover() && event.detail > 0) return;
    setOpen((current) => (current === index ? -1 : index));
  };

  return (
    <section ref={rootRef} id="servicos" className={styles.services} aria-labelledby="servicos-title">
      <header className={styles.services__head}>
        <p className={styles.services__eyebrow}>Serviços</p>
        <h2 id="servicos-title" className={styles.services__title}>
          <span className={styles.services__mask}>
            <span className={styles.services__reveal} data-reveal>
              O que eu faço
            </span>
          </span>{' '}
          <span className={styles.services__mask}>
            <span className={styles.services__reveal} data-reveal>
              pelo seu negócio
            </span>
          </span>
        </h2>
      </header>

      <ul className={styles.services__list} onPointerLeave={leave}>
        {SERVICES.map((service, i) => {
          const isOpen = open === i;
          return (
            <li
              key={service.title}
              className={`${styles.service} ${isOpen ? styles['service--open'] : ''}`}
              onPointerEnter={() => enter(i)}
              style={{ '--phase': service.phase } as CSSProperties}
            >
              <h3 className={styles.service__heading}>
                <button
                  type="button"
                  className={styles.service__trigger}
                  aria-expanded={isOpen}
                  aria-controls={`servico-${i}`}
                  id={`servico-${i}-titulo`}
                  onClick={(event) => toggle(i, event)}
                >
                  <span className={styles.service__index}>{String(i + 1).padStart(2, '0')}</span>
                  <span className={styles.service__mask}>
                    <span className={styles.service__title} data-service-reveal>
                      {service.title}
                    </span>
                  </span>
                  <span className={styles.service__icon} aria-hidden="true" />
                </button>
              </h3>
              <div
                id={`servico-${i}`}
                role="region"
                aria-labelledby={`servico-${i}-titulo`}
                className={styles.service__panel}
              >
                <div className={styles['service__panel-inner']}>
                  <div className={styles.service__body}>
                    <p className={styles.service__text}>{service.text}</p>
                    <ul className={styles.service__items}>
                      {service.items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                    <span className={styles.service__swatch} aria-hidden="true" />
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
