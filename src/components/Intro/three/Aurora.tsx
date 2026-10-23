'use client';

import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { AURORA } from './sceneConfig';

/**
 * Aurora da marca: o MESMO fluido iridescente do hero, num plano grande atrás do notebook.
 *
 * O shader é uma versão reduzida de Hero/shaders/fluid.frag.ts — mesma função de paleta e
 * mesmo FBM, com menos oitavas (é fundo desfocado, não precisa de detalhe) e sem a interação
 * de mouse. Os coeficientes da paleta são os canônicos: é o que faz o fundo e o NICOLE do
 * hero parecerem a mesma coisa.
 *
 * `uTime` e `uBoost` vêm do master (ver LaptopScene), então o modo seek mostra o mesmo frame
 * que a reprodução normal.
 */

const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FRAG = /* glsl */ `
precision mediump float;
varying vec2 vUv;
uniform float uTime;
uniform float uOpacity;
uniform float uBoost;

float hash(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
float noise(vec2 p){
  vec2 i=floor(p), f=fract(p);
  float a=hash(i), b=hash(i+vec2(1.,0.)), c=hash(i+vec2(0.,1.)), d=hash(i+vec2(1.,1.));
  vec2 u=f*f*(3.-2.*f);
  return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
}
float fbm(vec2 p){ float v=0.,a=0.5; for(int i=0;i<4;i++){ v+=a*noise(p); p*=2.02; a*=0.5; } return v; }

// Paleta canônica do hero (fluid.frag.ts) — não alterar os coeficientes.
vec3 pal(float t){
  vec3 a=vec3(0.12,0.06,0.20), b=vec3(0.45,0.30,0.55), c=vec3(1.0,1.0,1.0), d=vec3(0.00,0.18,0.40);
  return a + b*cos(6.28318*(c*t+d));
}

void main(){
  vec2 p = vUv * 1.6;
  float t = uTime * 0.035;

  vec2 q = vec2(fbm(p*1.6 + t), fbm(p*1.6 + vec2(3.1,1.7) - t));
  vec2 r = vec2(fbm(p*1.6 + 1.4*q + 0.12*t), fbm(p*1.6 + 1.4*q + vec2(8.3,2.8) - 0.12*t));
  float n = fbm(p*1.9 + 1.8*r);

  vec3 col = pal(0.28 + 0.1 * n);
  // Vinheta radial: a aurora some nas bordas e não cria quina com o fundo.
  float d = distance(vUv, vec2(0.5));
  float mask = smoothstep(0.62, 0.12, d);

  gl_FragColor = vec4(col, uOpacity * mask * (1.0 + uBoost * 1.6));
}
`;

export type AuroraHandle = { material: THREE.ShaderMaterial | null };

export default function Aurora({
  isMobile,
  onMaterial,
}: {
  isMobile: boolean;
  onMaterial?: (m: THREE.ShaderMaterial | null) => void;
}) {
  const ref = useRef<THREE.Mesh>(null);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        transparent: true,
        depthWrite: false,
        uniforms: {
          uTime: { value: 0 },
          uOpacity: { value: AURORA.opacity },
          uBoost: { value: 0 },
        },
      }),
    [],
  );

  useEffect(() => {
    onMaterial?.(material);
    return () => {
      onMaterial?.(null);
      material.dispose();
    };
  }, [material, onMaterial]);

  // Movimento lento e contínuo. O `uBoost` (intensidade no mergulho) vem do master.
  useFrame((_, dt) => {
    material.uniforms.uTime.value += Math.min(dt, 0.05);
  });

  const size = isMobile ? AURORA.sizeMobile : AURORA.size;

  return (
    <mesh ref={ref} position={AURORA.position as unknown as THREE.Vector3Tuple} material={material}>
      <planeGeometry args={[size[0], size[1], 1, 1]} />
    </mesh>
  );
}
