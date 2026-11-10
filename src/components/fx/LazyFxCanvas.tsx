'use client';

import dynamic from 'next/dynamic';

// Efeito de cursor em WebGL: não é necessário para a primeira pintura, então sai do bundle
// inicial e carrega depois (só no cliente).
const FxCanvas = dynamic(() => import('./FxCanvas'), { ssr: false });

export default function LazyFxCanvas() {
  return <FxCanvas />;
}
