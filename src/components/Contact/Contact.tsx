'use client';

import { useRef } from 'react';
import { gsap, MOTION_OK, useGSAP } from '@/lib/gsap';
import SplitHeading from '@/components/ui/SplitHeading';
import { site } from '@/lib/site';
import styles from './Contact.module.scss';

const SOCIALS = [
  { label: 'LinkedIn', href: site.socials.linkedin },
  { label: 'GitHub', href: site.socials.github },
  { label: 'Instagram', href: site.socials.instagram },
];

export default function Contact() {
  const rootRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        gsap.from('[data-fade]', {
          y: 32,
          opacity: 0,
          duration: 1,
          ease: 'expo.out',
          stagger: 0.1,
          scrollTrigger: { trigger: rootRef.current, start: 'top 70%', once: true },
        });
      });
    },
    { scope: rootRef },
  );

  return (
    <section ref={rootRef} id="contato" className={styles.contact} aria-labelledby="contato-title">
      <div className={styles.contact__inner}>
        <p className={styles.contact__eyebrow}>Contato</p>
        <SplitHeading id="contato-title" className={styles.contact__title} text="Bora tirar sua ideia do papel?" />

        <p className={styles.contact__lead} data-fade>
          Me conta o que você precisa. Eu respondo rápido, com um caminho claro e sem enrolação.
        </p>

        <a className={styles.contact__cta} href={`mailto:${site.email}`} data-fade>
          Vamos conversar
          <span className={styles['contact__cta-arrow']} aria-hidden="true">
            →
          </span>
        </a>

        <ul className={styles.contact__socials} data-fade>
          {SOCIALS.map((social) => (
            <li key={social.label}>
              <a className={styles.contact__social} href={social.href} target="_blank" rel="noopener noreferrer">
                {social.label}
              </a>
            </li>
          ))}
        </ul>
      </div>

      <footer className={styles.contact__footer}>
        <span>
          © {new Date().getFullYear()} {site.name}
        </span>
        <span>{site.role}</span>
      </footer>
    </section>
  );
}
