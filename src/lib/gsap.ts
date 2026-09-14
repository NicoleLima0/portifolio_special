'use client';

// Registro central dos plugins do GSAP. Sempre importar gsap/ScrollTrigger/useGSAP daqui.
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger, useGSAP);

export const MOTION_OK = '(prefers-reduced-motion: no-preference)';
export const MOTION_REDUCED = '(prefers-reduced-motion: reduce)';

export { gsap, ScrollTrigger, useGSAP };
