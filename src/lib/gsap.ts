'use client';

// Registro central dos plugins do GSAP. Sempre importar gsap/ScrollTrigger/useGSAP daqui.
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { Flip } from 'gsap/Flip';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import { CustomEase } from 'gsap/CustomEase';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(
  ScrollTrigger,
  SplitText,
  DrawSVGPlugin,
  Flip,
  MotionPathPlugin,
  CustomEase,
  useGSAP,
);

export const MOTION_OK = '(prefers-reduced-motion: no-preference)';
export const MOTION_REDUCED = '(prefers-reduced-motion: reduce)';

export {
  gsap,
  ScrollTrigger,
  SplitText,
  DrawSVGPlugin,
  Flip,
  MotionPathPlugin,
  CustomEase,
  useGSAP,
};
