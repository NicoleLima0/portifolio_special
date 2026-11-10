'use client';

// Só os plugins realmente usados entram no bundle (Flip, MotionPath e CustomEase foram removidos; o About usa SplitText e drawSVG).
// Registro central dos plugins do GSAP. Sempre importar gsap/ScrollTrigger/useGSAP daqui.
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(
  ScrollTrigger,
  SplitText,
  DrawSVGPlugin,
  useGSAP,
);

export const MOTION_OK = '(prefers-reduced-motion: no-preference)';
export const MOTION_REDUCED = '(prefers-reduced-motion: reduce)';

export {
  gsap,
  ScrollTrigger,
  SplitText,
  DrawSVGPlugin,
  useGSAP,
};
