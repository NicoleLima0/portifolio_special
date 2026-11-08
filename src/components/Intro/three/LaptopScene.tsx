'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows } from '@react-three/drei';
import { gsap } from '@/lib/gsap';
import LaptopModel from './LaptopModel';
import { BOKEH, CAMERA, LAPTOP, LIGHTS, MATERIALS, QUALITY, STUDIO_BG } from './sceneConfig';
import type { ScreenState } from './screenTexture';
import { screenStateAt } from './screenState';
import Aurora from './Aurora';
import Clouds, { type CloudState } from './Clouds';
import FloatingEmojis, { type EmojiState } from './FloatingEmojis';
import { LAYERS, SCENE, SEARCH } from '../introTiming';

/**
 * Manchas de luz ao fundo: sprites com gradiente radial gaussiano, não esferas chapadas.
 * A textura é gerada em canvas (um disco que esmaece até transparente), então a borda é
 * suave de verdade — um `meshBasicMaterial` numa esfera dava um disco de cor sólida.
 */
function Bokeh() {
  const texture = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const ctx = c.getContext('2d');
    if (!ctx) return null;
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.45, 'rgba(255,255,255,0.35)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);

  useEffect(() => () => texture?.dispose(), [texture]);
  if (!texture) return null;

  return (
    <group>
      {BOKEH.map((b, i) => (
        <sprite key={i} position={b.pos as unknown as THREE.Vector3Tuple} scale={b.scale}>
          <spriteMaterial
            map={texture}
            color={b.color}
            transparent
            opacity={b.opacity}
            depthWrite={false}
          />
        </sprite>
      ))}
    </group>
  );
}

/**
 * A TELA: um plano separado, posicionado sobre a área da tela do modelo.
 *
 * `MeshBasicMaterial` + `toneMapped: false`: a tela é uma fonte de imagem, não uma superfície
 * iluminada — assim o branco sai branco e as cores não são lavadas pelo tonemapping da cena.
 */
function ScreenPlane({ texture }: { texture: THREE.Texture }) {
  /**
   * A tela é construída pelos 4 CANTOS, a partir da base ortonormal medida no modelo.
   * Sem rotation, sem quaternion, sem Euler — assim não há roll indefinido para errar.
   *
   * É filha do grupo do modelo, então acompanha scale/offset/yaw automaticamente.
   */
  const geometry = useMemo(() => {
    const { basis, rect, offset } = LAPTOP.screen;
    const u = new THREE.Vector3(...basis.u);
    const v = new THREE.Vector3(...basis.v);
    const n = new THREE.Vector3(...basis.n);

    /** canto = n·(plano + recuo) + u·cu + v·cv */
    const corner = (cu: number, cv: number) =>
      new THREE.Vector3()
        .addScaledVector(n, rect.n + offset)
        .addScaledVector(u, cu)
        .addScaledVector(v, cv);

    const bl = corner(rect.u0, rect.v0); // inferior esquerdo → UV (0,0)
    const br = corner(rect.u1, rect.v0); // inferior direito  → UV (1,0)
    const tr = corner(rect.u1, rect.v1); // superior direito  → UV (1,1)
    const tl = corner(rect.u0, rect.v1); // superior esquerdo → UV (0,1)

    const g = new THREE.BufferGeometry();
    g.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(
        [bl.x, bl.y, bl.z, br.x, br.y, br.z, tr.x, tr.y, tr.z, tl.x, tl.y, tl.z],
        3,
      ),
    );
    // U invertido: o eixo `u` da base aponta para a esquerda da tela vista de frente, então
    // sem isto o conteúdo sai espelhado.
    g.setAttribute('uv', new THREE.Float32BufferAttribute([1, 0, 0, 0, 0, 1, 1, 1], 2));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    g.computeVertexNormals();
    return g;
  }, []);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh geometry={geometry}>
      <meshBasicMaterial
        map={texture}
        toneMapped={false}
        // Empurra o plano à frente no teste de profundidade: nada da tela do modelo o
        // atravessa, nem com o tilt.
        polygonOffset
        polygonOffsetFactor={-4}
        polygonOffsetUnits={-4}
        // DoubleSide: a ordem dos cantos define para que lado a face aponta, e aqui ela
        // ficava virada para dentro (descartada pelo back-face culling). Desenhar os dois
        // lados evita depender do sentido do winding.
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function Rig({
  isMobile,
  texture,
  drawScreen,
  onReady,
  onDive,
  registerTimeline,
}: {
  isMobile: boolean;
  texture: THREE.Texture;
  drawScreen: (s: ScreenState) => void;
  onReady: () => void;
  onDive: (progress: number) => void;
  registerTimeline: (tl: gsap.core.Timeline) => void;
}) {
  const { camera, invalidate, gl, scene, size } = useThree();

  const auroraRef = useRef<THREE.ShaderMaterial | null>(null);
  const cloudRef = useRef<CloudState>({
    time: 0,
    dive: 0,
    still:
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  });

  const emojiRef = useRef<EmojiState>({
    pop: 0,
    jump: 0,
    bounce: 0,
    fly: 0,
    time: 0,
    // prefers-reduced-motion: objetos ficam parados (sem pop, sem flutuação).
    still:
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  });

  const state = useRef({
    camX: 0, camY: 0, camZ: 0,
    lookX: 0, lookY: 0, lookZ: 0,
    pointerX: 0, pointerY: 0,
    /** 0→1 no mergulho; inclina o `up` da câmera junto com a tela. */
    diveP: 0,
  });

  const pull = isMobile ? CAMERA.mobilePullback : 1;

  /**
   * Pose final: a distância em que o plano da tela cobre a viewport inteira.
   * Para um PerspectiveCamera, a altura visível a uma distância d é 2·d·tan(fov/2). Igualando
   * à altura (ou à largura, via aspect) do plano, obtém-se a distância de "cover".
   */
  const aspect = size.width / size.height;
  const fovRad = (CAMERA.fov * Math.PI) / 180;

  /**
   * Distância em que a TELA cobre a viewport inteira ("cover"): a altura visível a uma
   * distância d é 2·d·tan(fov/2); para a largura, multiplica-se pelo aspect. Cobrir exige a
   * MENOR das duas distâncias.
   */
  const diveDistance = useMemo(() => {
    const [w, h] = LAPTOP.screen.sizeWorld;
    const dH = h / 2 / Math.tan(fovRad / 2);
    const dW = w / 2 / Math.tan(fovRad / 2) / aspect;
    return Math.min(dH, dW) * CAMERA.diveCover;
  }, [aspect, fovRad]);

  /**
   * Distância em que o NOTEBOOK INTEIRO cabe no frame ("fit"): o oposto do cover — usa a
   * MAIOR das duas distâncias, mais uma margem. Calculado do bounding box real do modelo,
   * então funciona em 16:9, 4:3 e no mobile sem ajuste manual.
   */
  const fitDistance = useMemo(() => {
    // Extensão do conjunto em cena: largura ~0.32 e altura ~0.22 (modelo normalizado).
    const w = 0.33;
    const h = 0.23;
    const dH = h / 2 / Math.tan(fovRad / 2);
    const dW = w / 2 / Math.tan(fovRad / 2) / aspect;
    return Math.max(dH, dW) * CAMERA.fitMargin * pull;
  }, [aspect, fovRad, pull]);

  /** Normaliza uma direção e a põe à `dist` do alvo. */
  /**
   * Posição final do mergulho: o centro da tela deslocado ao longo da NORMAL dela (já em
   * coordenadas de cena, depois do yaw do modelo). Entrar por aqui deixa o plano paralelo ao
   * plano da câmera — sem isso o frame final chega rotacionado.
   */
  const diveTarget = useMemo(() => {
    const n = LAPTOP.screen.basis.n;
    // O yaw do modelo (−90°) leva (x,y,z) → (z, y, −x). O resultado aponta para −Z (para
    // dentro da cena), e a câmera está em +Z: daí o sinal invertido, senão ela atravessa a
    // tela e o frame final sai preto.
    const wn = new THREE.Vector3(-n[2], -n[1], n[0]).normalize();
    const c = LAPTOP.screen.centerWorld;
    return [
      c[0] + wn.x * diveDistance,
      c[1] + wn.y * diveDistance,
      c[2] + wn.z * diveDistance,
    ] as const;
  }, [diveDistance]);

  const posFrom = (dir: readonly [number, number, number], look: readonly [number, number, number], dist: number) => {
    const L = Math.hypot(dir[0], dir[1], dir[2]) || 1;
    return [look[0] + (dir[0] / L) * dist, look[1] + (dir[1] / L) * dist, look[2] + (dir[2] / L) * dist];
  };

  useEffect(() => {
    const s = state.current;
    const [lx, ly, lz] = CAMERA.start.look;
    const startPos = posFrom(CAMERA.start.dir, CAMERA.start.look, fitDistance);
    s.camX = startPos[0];
    s.camY = startPos[1];
    s.camZ = startPos[2];
    s.lookX = lx;
    s.lookY = ly;
    s.lookZ = lz;

    camera.position.set(s.camX, s.camY, s.camZ);
    camera.lookAt(lx, ly, lz);
    invalidate();

    /**
     * O conteúdo da tela é FUNÇÃO PURA DO TEMPO do master (ver screenState.ts): um único
     * onUpdate redesenha a partir de `tl.time()`.
     *
     * Antes cada fase vivia no onUpdate de um tween próprio — e tweens não disparam onUpdate
     * num `seek()`, então a tela ficava congelada enquanto a câmera obedecia. Agora reprodução
     * normal e seek mostram exatamente o mesmo frame.
     */
    let lastDrawn = -1;
    const tl = gsap.timeline({
      paused: true,
      onUpdate: () => {
        const t = tl.time();
        // Redesenha só quando o tempo muda de verdade (evita trabalho por frame parado).
        if (Math.abs(t - lastDrawn) < 1 / 120) {
          invalidate();
          return;
        }
        lastDrawn = t;
        // O `up` da câmera também é função pura do tempo (ver nota em screenState.ts): num
        // seek, onUpdate de tween não roda, então derivar daqui é o que mantém seek e
        // reprodução idênticos.
        s.diveP = Math.max(
          0,
          Math.min(1, (t - SCENE.dive.start) / SCENE.dive.duration),
        );
        // --- Camadas do fundo, também função pura do tempo ---
        const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
        // --- Objetos 3D: tudo derivado de `t`, então o seek mostra o mesmo frame ---
        const e = emojiRef.current;
        e.pop = clamp01((t - LAYERS.emojis.start) / LAYERS.emojis.duration);
        // Pulinho e quique: sobem e voltam (meio seno), então são impulsos, não degraus.
        const pulse = (start: number, dur: number) => {
          const p = clamp01((t - start) / dur);
          return Math.sin(p * Math.PI);
        };
        e.jump = pulse(LAYERS.jump.start, LAYERS.jump.duration);
        e.bounce = pulse(LAYERS.bounce.start, LAYERS.bounce.duration);
        e.fly = clamp01((t - LAYERS.fly.start) / LAYERS.fly.duration);
        e.time = t;

        // Nuvens: deriva pelo tempo e avanço do mergulho (a camada da frente atravessa).
        cloudRef.current.time = t;
        cloudRef.current.dive = clamp01((t - SCENE.dive.start) / SCENE.dive.duration);

        if (auroraRef.current) {
          // No mergulho a aurora ganha intensidade e funde com o branco do hero.
          auroraRef.current.uniforms.uBoost.value = clamp01(
            (t - SCENE.dive.start) / SCENE.dive.duration,
          );
        }

        const st = screenStateAt(t);
        // No mergulho a tela passa a desenhar o hero com crop "cover" para o aspect da
        // viewport: assim o último frame do 3D já é, visualmente, o hero real.
        if (t >= SCENE.dive.start) {
          st.hero = 1;
          st.heroAspect = size.width / size.height;
        }
        drawScreen(st);
        invalidate();
      },
    });

    // --- Câmera: 3/4 → frontal, devagar ---
    tl.to(
      s,
      {
        camX: posFrom(CAMERA.front.dir, CAMERA.front.look, fitDistance * 0.82)[0],
        camY: posFrom(CAMERA.front.dir, CAMERA.front.look, fitDistance * 0.82)[1],
        camZ: posFrom(CAMERA.front.dir, CAMERA.front.look, fitDistance * 0.82)[2],
        lookX: CAMERA.front.look[0],
        lookY: CAMERA.front.look[1],
        lookZ: CAMERA.front.look[2],
        duration: SCENE.toFront.duration,
        ease: SCENE.toFront.ease,
      },
      SCENE.toFront.start,
    );

    // --- Mergulho: a câmera entra até a tela cobrir a viewport ---
    tl.to(
      s,
      {
        // A câmera entra ao longo da NORMAL da tela, não no eixo Z: a tela é inclinada ~5,4°,
        // e aproximar em linha reta deixava o frame final torto.
        camX: diveTarget[0],
        camY: diveTarget[1],
        camZ: diveTarget[2],
        lookX: LAPTOP.screen.centerWorld[0],
        lookY: LAPTOP.screen.centerWorld[1],
        lookZ: LAPTOP.screen.centerWorld[2],
        duration: SCENE.dive.duration,
        ease: SCENE.dive.ease,
        onUpdate() {
          onDive(this.progress());
        },
      },
      SCENE.dive.start,
    );

    // Desenha o estado inicial já (o onUpdate só dispara quando o tempo muda).
    drawScreen(screenStateAt(0));
    invalidate();

    registerTimeline(tl);
    onReady();

    return () => {
      tl.kill();
    };
  }, [camera, invalidate, diveDistance, diveTarget, fitDistance, drawScreen, onDive, onReady, size.width, size.height, registerTimeline]);

  // Parallax com o ponteiro (desligado no mobile).
  useEffect(() => {
    if (isMobile) return;
    const onMove = (e: PointerEvent) => {
      state.current.pointerX = (e.clientX / window.innerWidth) * 2 - 1;
      state.current.pointerY = (e.clientY / window.innerHeight) * 2 - 1;
      invalidate();
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [isMobile, invalidate]);

  // Libera tudo que a cena alocou.
  useEffect(
    () => () => {
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        const mat = m.material;
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else if (mat) (mat as THREE.Material).dispose();
      });
      gl.dispose();
    },
    [gl, scene],
  );

  const smooth = useRef({ px: 0, py: 0 });

  useFrame(() => {
    const s = state.current;
    const k = CAMERA.parallax.ease;
    smooth.current.px += (s.pointerX - smooth.current.px) * k;
    smooth.current.py += (s.pointerY - smooth.current.py) * k;
    const ox = isMobile ? 0 : smooth.current.px * CAMERA.parallax.amount;
    const oy = isMobile ? 0 : -smooth.current.py * CAMERA.parallax.amount;

    camera.position.set(s.camX + ox, s.camY + oy, s.camZ);
    // O `up` acompanha a inclinação da tela conforme o mergulho avança: sem isso o frame
    // final chega torto, porque a tela é inclinada ~5,4° e a câmera fica com up = +Y.
    const tilt = LAPTOP.screen.basis.n[1]; // componente Y da normal ≈ sen(tilt)
    camera.up.set(0, 1, -tilt * s.diveP);
    camera.lookAt(s.lookX, s.lookY, s.lookZ);
  });

  return (
    <group>
      {/* Luz: key quente + fill frio + rim ciano discreta. Nada de hotspot saturado. */}
      <ambientLight intensity={LIGHTS.ambient.intensity} />
      <directionalLight
        position={LIGHTS.key.pos as unknown as THREE.Vector3Tuple}
        intensity={LIGHTS.key.intensity}
        color={LIGHTS.key.color}
        shadow-mapSize-width={LIGHTS.key.shadowMapSize}
        shadow-mapSize-height={LIGHTS.key.shadowMapSize}
        shadow-bias={LIGHTS.key.shadowBias}
        shadow-radius={LIGHTS.key.shadowRadius}
        shadow-camera-near={0.05}
        shadow-camera-far={2}
        shadow-camera-left={-0.4}
        shadow-camera-right={0.4}
        shadow-camera-top={0.4}
        shadow-camera-bottom={-0.4}
      />
      <directionalLight
        position={LIGHTS.fill.pos as unknown as THREE.Vector3Tuple}
        intensity={LIGHTS.fill.intensity}
        color={LIGHTS.fill.color}
      />
      <directionalLight
        position={LIGHTS.rim.pos as unknown as THREE.Vector3Tuple}
        intensity={LIGHTS.rim.intensity}
        color={LIGHTS.rim.color}
      />

      {/* --- Camadas do fundo, de trás para frente --- */}
      <Aurora
        isMobile={isMobile}
        onMaterial={(m) => {
          auroraRef.current = m;
        }}
      />
      {/* Nuvens antes dos emojis na árvore: com depthWrite desligado, a ordem de desenho é o
          que decide quem fica na frente — assim alguns emojis aparecem entre as nuvens. */}
      <Clouds isMobile={isMobile} stateRef={cloudRef} />

      <Suspense fallback={null}>
        <FloatingEmojis isMobile={isMobile} stateRef={emojiRef} />
      </Suspense>
      {!isMobile ? <Bokeh /> : null}

      {/*
        Sem chão: um SHADOW CATCHER. O plano é invisível (ShadowMaterial) e só recebe a
        sombra, então o notebook flutua sobre o lavanda do fundo — sem bloco cinza, sem quina
        e sem linha de horizonte em ângulo nenhum.
      */}
      {/*
        Sombra de contato: difusa e sem borda. O ShadowMaterial da luz direcional criava uma
        cunha dura (a silhueta projetada); o ContactShadows com blur alto e opacidade baixa dá
        a mancha macia da referência, e a cor lavanda evita que vire "chão" sobre o fundo.
      */}
      <ContactShadows
        position={[0.0529, 0.0012, -0.041]}
        scale={0.55}
        far={0.14}
        blur={5}
        opacity={0.3}
        resolution={isMobile ? 256 : 512}
        color="#6a5c8c"
      />

      <LaptopModel screen={<ScreenPlane texture={texture} />} />
    </group>
  );
}

export default function LaptopScene({
  isMobile,
  texture,
  drawScreen,
  onReady,
  onDive,
  registerTimeline,
}: {
  isMobile: boolean;
  texture: THREE.Texture;
  drawScreen: (s: ScreenState) => void;
  onReady: () => void;
  onDive: (progress: number) => void;
  registerTimeline: (tl: gsap.core.Timeline) => void;
}) {
  const onCreated = useCallback(({ gl, scene }: { gl: THREE.WebGLRenderer; scene: THREE.Scene }) => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.0;
    // Fundo + fog na MESMA cor: o chão desaparece ao longe e não há horizonte visível.
    scene.fog = new THREE.Fog(STUDIO_BG, 0.8, 3.2);
  }, []);

  return (
    <Canvas
      frameloop="demand"
      shadows
      dpr={[1, isMobile ? QUALITY.dpr.mobile : QUALITY.dpr.desktop]}
      camera={{ fov: CAMERA.fov, near: CAMERA.near, far: CAMERA.far }}
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
        // Em dev o buffer é preservado para que os screenshots de scripts/intro-frames.mjs
        // capturem o que está na tela; com frameloop="demand" ele seria limpo entre frames.
        preserveDrawingBuffer: process.env.NODE_ENV !== 'production',
      }}
      onCreated={onCreated}
    >
      <Rig
        isMobile={isMobile}
        texture={texture}
        drawScreen={drawScreen}
        onReady={onReady}
        onDive={onDive}
        registerTimeline={registerTimeline}
      />
    </Canvas>
  );
}
