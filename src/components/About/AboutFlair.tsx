/**
 * O desenho que acompanha "ideia do papel" — a peça da Etapa 4.
 *
 * Mais perto do espírito do gsap.com: uma espiral orgânica que sobe e termina numa FLOR/
 * asterisco maior — a peça central do desenho, não um enfeite pequeno no canto. É o mesmo
 * papel que a flor tem na palavra "animate" deles: o clímax visual do traço, desenhado por
 * último.
 *
 * GEOMETRIA: viewBox quadrado (0 0 200 200), a composição inteira cabe numa caixa compacta —
 * o posicionamento na página (ficar ao lado da linha de texto, sem cruzar nada) é resolvido
 * pelo About.tsx medindo o layout real, não por este componente.
 *
 * Os `data-flair` são os alvos que o About.tsx anima. Trocar o desenho é só mexer nos `d`.
 */
export default function AboutFlair({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      {/* O traço: espiral que nasce embaixo à esquerda e sobe girando até o centro, onde a
          flor desabrocha. Curvas orgânicas (não segmentos retos) para parecer desenhado à
          mão, como o "stem" do gsap.com. */}
      <path
        data-flair="stroke"
        d="M10 176C34 184 62 178 72 156C82 134 68 112 46 114C26 116 18 136 32 150C54 172 92 176 118 156C146 134 152 98 132 74C116 54 88 46 68 58"
        stroke="var(--violet)"
        strokeWidth="7"
        strokeLinecap="round"
      />

      {/* A FLOR — peça central, no espírito do gsap.com. Pétalas como retângulos arredondados
          saindo do centro em cruz (mesma técnica do deles: 4 formas ortogonais + rotação),
          maior que qualquer outro elemento do desenho. Entra por último, crescendo do zero. */}
      <g data-flair="flower">
        <rect x="120" y="16" width="16" height="52" rx="8" fill="var(--violet)" />
        <rect x="120" y="16" width="16" height="52" rx="8" fill="var(--violet)" transform="rotate(45 128 42)" />
        <rect x="120" y="16" width="16" height="52" rx="8" fill="var(--violet)" transform="rotate(90 128 42)" />
        <rect x="120" y="16" width="16" height="52" rx="8" fill="var(--violet)" transform="rotate(135 128 42)" />
        <circle cx="128" cy="42" r="10" fill="var(--cyan)" />
      </g>

      {/* Faísca menor, apoio — mesmo papel que os pontinhos soltos do gsap.com. */}
      <path
        data-flair="spark"
        d="M164 96V116M154 106H174"
        stroke="var(--cyan)"
        strokeWidth="6"
        strokeLinecap="round"
      />

      {/* Bolinha de apoio, quebra a simetria. */}
      <circle data-flair="dot" cx="30" cy="90" r="6" fill="var(--magenta)" />
    </svg>
  );
}
