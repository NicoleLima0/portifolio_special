'use client';

import type { ReactNode } from 'react';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { LAPTOP, MATERIALS } from './sceneConfig';

export const LAPTOP_URL = '/models/laptop/laptop.glb';

/**
 * Notebook do intro — modelo real (Laptop by J-Toastie, CC-BY, via Poly Pizza).
 *
 * O arquivo veio de `obj2gltf`: é UMA mesh só, com a tampa já aberta e soldada ao corpo (sem
 * node de tampa nem pivô de dobradiça), então a encenação não abre o notebook — quem conduz é
 * a câmera.
 *
 * Os materiais originais são plástico fosco quase preto; aqui viram alumínio space gray.
 * A TELA do modelo é apagada de propósito: quem mostra conteúdo é um plano separado
 * (ver ScreenPlane em LaptopScene.tsx), porque o UV da tela no .glb não ocupa 0–1 e deixava
 * a textura esticada.
 */
export default function LaptopModel({ screen }: { screen?: ReactNode }) {
  const { scene } = useGLTF(LAPTOP_URL);

  // Clona: o cache do useGLTF é compartilhado, e mexer nos materiais do original vazaria.
  const model = useMemo(() => scene.clone(true), [scene]);

  useEffect(() => {
    const shell = new THREE.MeshStandardMaterial({
      color: MATERIALS.shell.color,
      roughness: MATERIALS.shell.roughness,
      metalness: MATERIALS.shell.metalness,
    });
    const bezel = new THREE.MeshStandardMaterial({
      color: MATERIALS.bezel.color,
      roughness: MATERIALS.bezel.roughness,
      metalness: MATERIALS.bezel.metalness,
    });
    const keys = new THREE.MeshStandardMaterial({
      color: MATERIALS.key.color,
      roughness: MATERIALS.key.roughness,
      metalness: MATERIALS.key.metalness,
    });
    // A tela do modelo fica preta e fosca: é só o "vidro desligado" por trás do plano.
    const screenOff = new THREE.MeshStandardMaterial({
      color: '#0d0b11',
      roughness: 0.25,
      metalness: 0.1,
    });

    const made = [shell, bezel, keys, screenOff];

    // Troca por NOME do material original (ver scripts/inspect-glb.mjs):
    //   DarkGray · lighterGray · Gray2 · Screen
    model.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      const swap = (m: THREE.Material): THREE.Material => {
        switch (m.name) {
          case 'Screen':
            return screenOff;
          case 'lighterGray':
            return keys;
          case 'Gray2':
            return bezel;
          default:
            return shell;
        }
      };

      mesh.material = Array.isArray(mesh.material) ? mesh.material.map(swap) : swap(mesh.material);
    });

    return () => {
      made.forEach((m) => m.dispose());
    };
  }, [model]);

  return (
    <group
      scale={LAPTOP.modelScale}
      position={LAPTOP.modelOffset as unknown as THREE.Vector3Tuple}
      rotation={[0, LAPTOP.modelYaw, 0]}
    >
      <primitive object={model} />
      {/* A tela entra aqui para herdar scale/offset/yaw do modelo. */}
      {screen}
    </group>
  );
}

// Pré-carrega durante o contador, para a cena não esperar o download.
useGLTF.preload(LAPTOP_URL);
