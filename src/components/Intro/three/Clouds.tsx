'use client';

import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { createCloudTexture } from './cloudTexture';
import { CLOUDS } from './sceneConfig';

/**
 * Nuvens volumétricas feitas de sprites.
 *
 * Cada nuvem é um grupo de 12–25 "puffs" (billboards) espalhados numa elipse irregular: a
 * sobreposição de muitos sprites macios é o que dá volume, em vez de uma mancha chapada. A
 * textura é gerada em código (ver cloudTexture.ts) — nada vem de CDN externa.
 *
 * Três camadas de profundidade: fundo (mar de nuvens no horizonte), meio (ao lado do
 * notebook) e frente (perto da câmera, atravessando o quadro no giro).
 */

export type CloudState = {
  /** Relógio do master, para a deriva. */
  time: number;
  /** 0→1: avanço do mergulho, que traz a camada da frente para cima da câmera. */
  dive: number;
  /** Sem movimento (prefers-reduced-motion). */
  still: boolean;
};

/** Pseudo-aleatório determinístico. */
const rnd = (i: number, seed: number) => {
  const v = Math.sin(i * 127.1 + seed * 311.7) * 43758.5453;
  return v - Math.floor(v);
};

type Puff = {
  offset: [number, number, number];
  scale: number;
  opacity: number;
  tint: string;
  rot: number;
  /** Índice da textura (há algumas variações de recorte). */
  tex: number;
};

/** Monta os puffs de uma nuvem: elipse irregular, com os de baixo mais lavanda. */
function buildPuffs(count: number, spread: readonly [number, number, number], seed: number): Puff[] {
  const out: Puff[] = [];
  for (let i = 0; i < count; i++) {
    const a = rnd(i, seed) * Math.PI * 2;
    const r = Math.pow(rnd(i, seed + 1), 0.6); // mais denso no centro
    const x = Math.cos(a) * r * spread[0];
    const y = (rnd(i, seed + 2) - 0.45) * spread[1];
    const z = Math.sin(a) * r * spread[2];

    // Puffs mais baixos recebem um tom lavanda; os de cima ficam quase brancos.
    const low = y < 0;
    const tintRoll = rnd(i, seed + 5);
    const tint = low
      ? '#e6dff5'
      : tintRoll > 0.82
        ? '#efe6ff' // toque de violeta
        : tintRoll < 0.12
          ? '#e4f4fb' // toque de ciano
          : '#ffffff';

    out.push({
      offset: [x, y, z],
      scale: 0.5 + rnd(i, seed + 3) * 0.75,
      opacity: 0.25 + rnd(i, seed + 4) * 0.3,
      tint,
      rot: rnd(i, seed + 6) * Math.PI * 2,
      tex: Math.floor(rnd(i, seed + 7) * 3),
    });
  }
  return out;
}

export default function Clouds({
  isMobile,
  stateRef,
}: {
  isMobile: boolean;
  stateRef: React.MutableRefObject<CloudState>;
}) {
  const group = useRef<THREE.Group>(null);

  // Três variações de recorte: evita que todos os puffs sejam o mesmo carimbo.
  const textures = useMemo(() => [0, 1, 2].map((s) => createCloudTexture(s)), []);

  useEffect(() => () => textures.forEach((t) => t?.dispose()), [textures]);

  // No mobile a camada da frente sai e os puffs caem pela metade.
  const clouds = useMemo(
    () =>
      CLOUDS.filter((c) => !isMobile || c.layer !== 'front').map((c, i) => ({
        ...c,
        puffs: buildPuffs(isMobile ? Math.ceil(c.puffs / 2) : c.puffs, c.spread, i * 3.7),
      })),
    [isMobile],
  );

  useFrame(() => {
    if (!group.current) return;
    const { time, dive, still } = stateRef.current;
    const t = still ? 0 : time;

    group.current.children.forEach((child, i) => {
      const c = clouds[i];
      if (!c) return;

      // Deriva lenta própria (x e y senoidal), com fase por nuvem.
      const driftX = Math.sin(t * c.driftSpeed + c.phase) * c.driftAmp;
      const driftY = Math.cos(t * c.driftSpeed * 0.7 + c.phase) * c.driftAmp * 0.4;

      // No mergulho a camada da frente vem para cima da câmera: ela é o que ajuda a esconder
      // a transição para o branco.
      const rush = c.layer === 'front' ? dive * dive * 1.9 : dive * 0.25;

      child.position.set(c.pos[0] + driftX, c.pos[1] + driftY, c.pos[2] + rush);

      // A camada da frente também cresce ao se aproximar.
      const grow = c.layer === 'front' ? 1 + dive * 1.2 : 1;
      child.scale.setScalar(c.scale * grow);
    });
  });

  return (
    <group ref={group}>
      {clouds.map((c, ci) => (
        <group key={ci} position={c.pos as unknown as THREE.Vector3Tuple} scale={c.scale}>
          {c.puffs.map((p, pi) => (
            <sprite
              key={pi}
              position={p.offset as unknown as THREE.Vector3Tuple}
              scale={p.scale}
            >
              <spriteMaterial
                map={textures[p.tex] ?? undefined}
                color={p.tint}
                transparent
                opacity={p.opacity * c.opacity}
                depthWrite={false}
                rotation={p.rot}
                toneMapped={false}
              />
            </sprite>
          ))}
        </group>
      ))}
    </group>
  );
}
