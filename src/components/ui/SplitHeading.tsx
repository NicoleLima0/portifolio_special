'use client';

import { Fragment, useRef, type ElementType } from 'react';
import { gsap, MOTION_OK, useGSAP } from '@/lib/gsap';
import styles from './SplitHeading.module.scss';

type Props = {
  text: string;
  as?: ElementType;
  className?: string;
  id?: string;
};

/** Título que entra palavra por palavra no scroll, com leve skew/rotação. */
export default function SplitHeading({ text, as: Tag = 'h2', className, id }: Props) {
  const ref = useRef<HTMLElement>(null);
  const words = text.split(' ');

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        gsap.from('[data-word]', {
          yPercent: 115,
          rotate: 4,
          skewY: 6,
          duration: 1,
          ease: 'expo.out',
          stagger: 0.06,
          scrollTrigger: { trigger: ref.current, start: 'top 85%', once: true },
        });
      });
    },
    { scope: ref },
  );

  return (
    <Tag ref={ref} id={id} className={`${styles.heading} ${className ?? ''}`}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {words.map((word, i) => (
          // O espaço fica fora da máscara: dentro de um inline-block ele seria descartado.
          <Fragment key={i}>
            <span className={styles.heading__mask}>
              <span className={styles.heading__word} data-word>
                {word}
              </span>
            </span>
            {i < words.length - 1 ? ' ' : null}
          </Fragment>
        ))}
      </span>
    </Tag>
  );
}
