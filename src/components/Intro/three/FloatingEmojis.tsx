'use client';

import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useLoader, useThree } from '@react-three/fiber';
import { EMOJIS, EMOJI_LAYOUT } from './sceneConfig';

/**
 * Emojis 3D flutuando ao redor do notebook.
 *
 * São sprites (billboards): sempre de frente para a câmera, com a arte dos Fluent Emoji da
 * Microsoft (MIT — ver public/intro/emoji/LICENSE.md). Sprite em vez de geometria porque a
 * arte já é 3D renderizada; extrudar paths resultava em formas irreconhecíveis.
 *
 * A POSIÇÃO é calculada por `unproject`: cada emoji é declarado em coordenadas de TELA
 * (fração da largura/altura) e convertido para o mundo numa profundidade escolhida. Assim eles
 * caem sempre dentro do frustum, sem precisar mexer no fov nem no enquadramento aprovado.
 *
 * Todo o movimento vem de `stateRef`, que o master escreve a partir do tempo — funciona
 * igual no modo seek.
 */

export type EmojiState = {
  /** 0→1: pop-in elástico, em stagger. */
  pop: number;
  /** Pulinho no "Enter" da busca (0→1→0). */
  jump: number;
  /** Quique no clique do resultado (0→1→0). */
  bounce: number;
  /** 0→1: fly-through, passando pela câmera no mergulho. */
  fly: number;
  /** Relógio do master, para a flutuação idle. */
  time: number;
  /** Sem movimento (prefers-reduced-motion). */
  still: boolean;
};

/** back.out(2), para o pop-in assentar com um leve excesso. */
const backOut = (x: number) => {
  const c1 = 2;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};

const STAGGER = 0.1;

export default function FloatingEmojis({
  isMobile,
  stateRef,
}: {
  isMobile: boolean;
  stateRef: React.MutableRefObject<EmojiState>;
}) {
  const group = useRef<THREE.Group>(null);
  const { camera, size } = useThree();

  // Mobile: só 3 (regra de performance do brief).
  const defs = useMemo(() => (isMobile ? EMOJIS.slice(0, 3) : EMOJIS), [isMobile]);
  const layout = useMemo(() => EMOJI_LAYOUT.slice(0, defs.length), [defs.length]);

  const textures = useLoader(
    THREE.TextureLoader,
    defs.map((d) => d.src),
  );

  useEffect(() => {
    textures.forEach((t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 4;
    });
    return () => textures.forEach((t) => t.dispose());
  }, [textures]);

  /**
   * Converte as coordenadas de tela de cada emoji em posições de mundo.
   *
   * `unproject` leva um ponto do espaço de recorte (−1..1) para o mundo a uma profundidade
   * dada. Recalculado quando a câmera ou a viewport mudam, então o enquadramento se mantém em
   * 16:9, 4:3 e no mobile.
   */
  const anchors = useMemo(() => {
    const out: THREE.Vector3[] = [];
    for (const L of layout) {
      // Fração de tela → clip space.
      const ndcX = L.screen[0] * 2 - 1;
      const ndcY = -(L.screen[1] * 2 - 1);
      const v = new THREE.Vector3(ndcX, ndcY, 0.5).unproject(camera);
      // Reposiciona o ponto na profundidade desejada, ao longo do raio da câmera.
      const dir = v.sub(camera.position).normalize();
      out.push(camera.position.clone().addScaledVector(dir, L.depth));
    }
    return out;
    // `size` entra nas deps porque a projeção depende do aspect da viewport.
  }, [camera, layout, size.width, size.height]);

  useFrame(() => {
    if (!group.current) return;
    const { pop, jump, bounce, fly, time, still } = stateRef.current;

    group.current.children.forEach((child, i) => {
      const L = layout[i];
      const base = anchors[i];
      if (!L || !base) return;

      // --- Pop-in: cada um entra no seu tempo ---
      const span = 1 - STAGGER * (layout.length - 1);
      const local = Math.max(0, Math.min(1, (pop - i * STAGGER) / Math.max(0.01, span)));
      const popScale = still ? 1 : backOut(local);

      const t = still ? 0 : time;

      // --- Idle: flutuação senoidal + balanço em Z ---
      const bob = Math.sin(t * L.bobSpeed + L.phase) * L.bobAmp;
      const sway = Math.sin(t * L.bobSpeed * 0.8 + L.phase) * 0.12;

      // --- Reações: pulinho e quique, com squash & stretch ---
      const lift = jump * L.jumpScale * 0.035 + bounce * L.bounceScale * 0.055;
      const squash = 1 + (jump * 0.16 + bounce * 0.24) * L.jumpScale;

      // --- Fly-through: aceleram para a câmera e saem do quadro ---
      // A direção é a do próprio emoji para a câmera, então todos passam "por fora".
      const toCam = new THREE.Vector3().subVectors(camera.position, base).normalize();
      const flyDist = fly * fly * L.depth * 1.5;

      child.position
        .copy(base)
        .addScaledVector(toCam, flyDist)
        .add(new THREE.Vector3(0, bob + lift, 0));

      const s = L.scale * popScale;
      child.scale.set(s * (2 - squash), s * squash, 1);
      // Sprites não têm rotação própria útil além do roll; o balanço entra aqui.
      const sprite = child as THREE.Sprite;
      if (sprite.material) {
        sprite.material.rotation = still ? 0 : sway + (1 - local) * 0.8;
        sprite.material.opacity = Math.min(1, local * 1.4) * (1 - Math.min(1, fly * 1.6));
      }
    });
  });

  return (
    <group ref={group}>
      {defs.map((def, i) => (
        <sprite key={def.src} scale={0}>
          <spriteMaterial
            map={textures[i]}
            transparent
            opacity={0}
            toneMapped={false}
            depthWrite={false}
          />
        </sprite>
      ))}
    </group>
  );
}
