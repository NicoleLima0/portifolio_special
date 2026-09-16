'use client';

import { useRef } from 'react';
import { gsap, MOTION_OK, ScrollTrigger, SplitText, useGSAP } from '@/lib/gsap';
import { fx } from '@/components/fx/fxStore';
import AboutFlair from './AboutFlair';
import styles from './About.module.scss';

/**
 * Manifesto coreografado pelo scroll — o efeito da seção "Why GSAP" do gsap.com.
 *
 * A frase chega INTEIRA E LEGÍVEL (branca, estática). O scroll não "acende" a frase: ele
 * dispara três efeitos DIFERENTES em três palavras-chave, como um mini-showcase. O resto do
 * texto nunca se mexe.
 *
 * Medido no gsap.com (amostrando os transforms computados durante o scroll), os três são:
 *
 *   draw            → um traço SVG grande é desenhado (drawSVG) no fim da PRIMEIRA LINHA do
 *                     texto — não preso a uma palavra-chave, porque a palavra muda de linha
 *                     dependendo da largura da tela e "acima dela" às vezes caía em cima do
 *                     texto vizinho. A primeira linha sempre tem o respiro do eyebrow acima.
 *   data-fx="spin"  → cada letra gira 360° no eixo X ("mortal"), ganhando cor NO MEIO do giro
 *                     e voltando ao branco ao pousar. Não é ScrambleText — os scripts deles
 *                     têm rotationX/rotationY/drawSVG e nenhum scrambleText. A cor é o RASTRO
 *                     do movimento, não um estado final.
 *   data-fx="rise"  → as letras entram de baixo: translate(0,100px) scale(0.6) opacity 0 → 0/1/1,
 *                     na ÚLTIMA palavra da frase — como o "fun stuff." do gsap.com.
 *
 * A coreografia dispara NA ORDEM DA LEITURA: draw → spin → rise.
 *
 * Referência medida em "silky" (gsap.com), letra 's' ao longo do scroll:
 *   matrix3d 0.894, 0.447  (~27°)   cor rgb(15,228,75)
 *   matrix3d -0.590,-0.807 (~234°)  → de cabeça pra baixo
 *   matrix3d 0.991,-0.130  (~352°)  → voltando
 *   matrix(1,0,0,1)                 → pousou, cor de volta ao normal
 */

/**
 * A frase em pedaços: o que é texto comum e o que é palavra-chave.
 *
 * As palavras-chave já nascem como <span data-fx> para cada efeito ter seu próprio alvo; o
 * SplitText roda depois e embrulha os caracteres DENTRO de cada uma.
 */
type Piece = { text: string; fx?: 'spin' | 'rise' };

const PIECES: Piece[] = [
  { text: 'Eu tiro sua ideia do papel e coloco no ar. Sites ' },
  { text: 'rápidos', fx: 'spin' },
  { text: ', bonitos e feitos pra ' },
  { text: 'converter', fx: 'spin' },
  { text: ', do rascunho ao lançamento, cuido da parte técnica pra você focar no ' },
  // O rise fecha a frase, como o "fun stuff." do gsap.com. Sendo a ÚLTIMA palavra, o espaço
  // que ela ocupa enquanto está invisível fica na borda do texto, não num vão no meio.
  { text: 'seu negócio.', fx: 'rise' },
];

/** A frase inteira, para o leitor de tela (o visual fica aria-hidden). */
const MANIFESTO = PIECES.map((p) => p.text).join('');

/** Cor do RASTRO do giro (violeta da paleta). A letra volta ao branco ao pousar. */
const SPIN_COLOR = '#a668ff';
const LIT = '#ffffff';

export default function About() {
  const rootRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add(MOTION_OK, () => {
        const text = rootRef.current?.querySelector<HTMLElement>('[data-about-text]');
        if (!text) return;

        // O glow iridescente do FxCanvas (z-index 40) segue o cursor por cima das seções pretas.
        // Aqui ele atrapalha: o preto precisa ficar limpo para as palavras-chave terem contraste.
        // Desligado só enquanto o Sobre está na tela; ao sair, Serviços recupera o glow.
        const glowOff = ScrollTrigger.create({
          trigger: rootRef.current,
          start: 'top bottom',
          end: 'bottom top',
          onToggle: (self) => {
            fx.glow.enabled = !self.isActive;
          },
        });

        let split: SplitText | null = null;
        let tl: gsap.core.Timeline | null = null;

        /** Os chars de uma palavra-chave. Filtra os spans VAZIOS que o SplitText deixa quando
         *  uma quebra de linha cai dentro da palavra (ele duplica o nó e um dos dois fica sem
         *  caractere nenhum) — sem isso o tween miraria um alvo vazio. */
        const charsOf = (fxName: string): HTMLElement[] => {
          const out: HTMLElement[] = [];
          text.querySelectorAll<HTMLElement>(`[data-fx="${fxName}"]`).forEach((key) => {
            key.querySelectorAll<HTMLElement>(`.${styles.about__char}`).forEach((c) => out.push(c));
          });
          return out;
        };

        const build = () => {
          split = SplitText.create(text, {
            type: 'lines,words,chars',
            linesClass: styles.about__line,
            wordsClass: styles.about__word,
            charsClass: styles.about__char,
            tag: 'span',
            // A frase completa já está no .sr-only ao lado: sem isto o leitor de tela
            // anunciaria caractere por caractere.
            aria: 'hidden',
          });

          const spinChars = charsOf('spin');
          const riseChars = charsOf('rise');

          // A frase NÃO acende: ela já está branca e legível. Só as palavras do "rise" começam
          // escondidas, porque o efeito delas é justamente entrar.
          gsap.set(riseChars, { yPercent: 100, scale: 0.6, opacity: 0 });

          // Posiciona o desenho no FIM DA PRIMEIRA LINHA — não numa palavra-chave fixa. Uma
          // palavra específica ("coloco") muda de linha dependendo da largura da tela (linha 1
          // no desktop, linha 2 no mobile), e "acima dela" às vezes cai em cima do texto da
          // linha anterior, não do eyebrow. A primeira linha, por definição, SEMPRE tem o
          // eyebrow acima — é o único ponto de ancoragem que funciona em qualquer largura.
          //
          // O anchor é IRMÃO de `text` no DOM (não filho): um span dentro do elemento que o
          // SplitText processa era reprocessado a cada split e ficava com width/height 0
          // (medido — o SplitText reestrutura TODOS os filhos em linhas/palavras/chars, e um
          // span solto sem texto virava um nó vazio dentro dessa árvore). Como irmão, ancorado
          // no `.about__inner` (que tem `position: relative` — ver About.module.scss), ele
          // nunca é tocado pelo split e mantém suas dimensões normalmente.
          const anchor = rootRef.current?.querySelector<HTMLElement>('[data-flair-anchor]');
          const inner = text.closest<HTMLElement>(`.${styles.about__inner}`);
          const firstLine = split.lines[0] as HTMLElement | undefined;
          if (anchor && inner && firstLine) {
            const lineBox = firstLine.getBoundingClientRect();
            const innerBox = inner.getBoundingClientRect();
            anchor.style.left = `${lineBox.right - innerBox.left}px`;
            anchor.style.top = `${lineBox.top - innerBox.top}px`;
          }

          // UMA timeline, disparada UMA VEZ quando a seção entra na viewport — e daí em diante
          // ela roda no próprio tempo, independente do scroll.
          //
          // NÃO é scrub. Medido no gsap.com: com a página PARADA (scrollY fixo), as letras de
          // "silky" giraram sozinhas e terminaram em ~2s —
          //   t+0s: none | t+0.5s: matrix3d(0.979…) verde | t+1s: matrix3d(-0.967…) de cabeça
          //   para baixo | t+1.5s: matrix3d(0.986…) | t+2s: matrix normal, cor de volta.
          // Com scrub, nada disso aconteceria sem rolar.
          //
          // `once: true`: a coreografia é uma entrada, não um estado que acompanha a rolagem —
          // repetir a cada passagem viraria distração.
          // `start: 'top 60%'`: dispara quando a frase já está DENTRO da tela, não quando ela
          // mal apareceu pela borda de baixo. Com 75% o giro acontecia enquanto o texto ainda
          // estava entrando e metade do efeito se perdia antes de dar para ler.
          tl = gsap.timeline({
            scrollTrigger: {
              trigger: text,
              start: 'top 60%',
              once: true,
            },
          });

          // --- Efeito DRAW: o desenho no fim da primeira linha ---
          // Entra PRIMEIRO (0): é o primeiro efeito na ordem da leitura.
          // Busca a partir de `anchor` (não de `text`): o SVG é IRMÃO de `text` no DOM agora,
          // não descendente — `text.querySelector` nunca o encontraria (o mesmo bug que fez a
          // timeline inteira do draw não disparar: `flair` ficava `null` e o `if` era pulado).
          const flair = anchor?.querySelector<SVGSVGElement>(`.${styles['about__flair-svg']}`) ?? null;
          const tetherEl = anchor?.querySelector<HTMLElement>(`.${styles['about__flair-tether']}`) ?? null;
          const drawEnd = 1.35; // quando o desenho termina de pousar — os próximos efeitos emendam aqui
          if (flair) {
            const stroke = flair.querySelectorAll<SVGPathElement>('[data-flair="stroke"], [data-flair="arrow"]');
            const spark = flair.querySelector<SVGGElement>('[data-flair="spark"]');
            const dots = flair.querySelectorAll<SVGCircleElement>('[data-flair="dot"]');

            // O SVG nasce com opacity 0 no CSS (para não piscar completo antes do JS).
            tl.set(flair, { opacity: 1 }, 0);

            // O TETHER entra ANTES do desenho: a linha "cresce" da palavra pra cima primeiro,
            // como se estivesse puxando o desenho consigo — é o que dá a sensação de conexão
            // (sem ele, o desenho grande fica boiando sozinho no espaço em branco).
            tl.fromTo(tetherEl, { scaleY: 0, opacity: 0 }, { scaleY: 1, opacity: 1, transformOrigin: '100% 100%', ease: 'power1.out', duration: 0.25 }, 0);

            // O traço sendo DESENHADO: drawSVG de 0% a 100% é o stroke-dasharray animando.
            // O laço e a ponta da seta são desenhados em sequência (stagger), não juntos —
            // é o que faz parecer um traço contínuo de caneta. Mais longo que antes (o traço
            // é maior agora): 0.85s em vez de 0.5s, para a velocidade do desenho não mudar.
            tl.fromTo(
              stroke,
              { drawSVG: '0%' },
              { drawSVG: '100%', ease: 'power2.out', duration: 0.85, stagger: 0.22 },
              0,
            );

            // Os enfeites entram girando e crescendo, como no gsap.com (lá eles partem de
            // translate(0,100px) rotate(-180deg) scale(0)).
            tl.from(
              spark,
              { scale: 0, rotate: -180, transformOrigin: '50% 50%', ease: 'back.out(2)', duration: 0.5 },
              0.55,
            );
            tl.from(
              dots,
              { scale: 0, transformOrigin: '50% 50%', ease: 'back.out(3)', duration: 0.4, stagger: 0.1 },
              0.75,
            );

            // SAI animado, não corta seco: sobe um pouco mais e desaparece — o mesmo tipo de
            // movimento que trouxe o desenho (crescendo, back.out) espelhado na saída (encolhendo
            // e subindo, um "voou embora" em vez de um "desligou"). Começa em 1.0 (o conjunto já
            // está montado havia ~0.25s) e termina antes do SPIN começar (drawEnd = 1.35), para a
            // coreografia não ter dois efeitos brigando por atenção ao mesmo tempo. O tether sai
            // junto (mesmo tempo, mesma direção) — os dois desaparecem como um conjunto só.
            tl.to(
              flair,
              { y: -18, scale: 0.7, opacity: 0, transformOrigin: '50% 100%', ease: 'power1.in', duration: 0.35 },
              1.0,
            );
            tl.to(tetherEl, { opacity: 0, ease: 'power1.in', duration: 0.3 }, 1.0);
          }

          // --- Efeito SPIN: o "mortal" letra por letra ---
          // Emenda logo depois do desenho pousar, em vez de esperar o fim da timeline —
          // é o que faz a coreografia soar contínua em vez de efeitos isolados por pausas.
          // Durações em tempo real (não mais fatias de scrub): no gsap.com a volta de uma letra
          // leva ~1.2s e a palavra inteira resolve em ~2s, que é o ritmo reproduzido aqui.
          tl.from(
            spinChars,
            {
              rotationX: 360,
              ease: 'power1.inOut',
              duration: 1.2,
              stagger: { each: 0.055, from: 'start' },
            },
            drawEnd,
          );

          // A cor é o RASTRO do giro: entra no violeta e volta ao branco (yoyo com repeat 1),
          // então a letra está colorida exatamente enquanto está de cabeça pra baixo.
          // Metade da duração do giro em cada perna (0.6 + 0.6 = os mesmos 1.2s).
          tl.fromTo(
            spinChars,
            { color: LIT },
            {
              color: SPIN_COLOR,
              ease: 'none',
              duration: 0.6,
              repeat: 1,
              yoyo: true,
              stagger: { each: 0.055, from: 'start' },
            },
            drawEnd,
          );

          // --- Efeito RISE: as letras sobem ---
          // "seu negócio." é a ÚLTIMA palavra da frase (como o "fun stuff." do gsap.com), então
          // emenda enquanto o giro ainda está pousando — não há vão no meio do texto para
          // disfarçar, o efeito só precisa continuar o ritmo da coreografia.
          tl.to(
            riseChars,
            {
              yPercent: 0,
              scale: 1,
              opacity: 1,
              ease: 'power2.out',
              duration: 0.7,
              stagger: { each: 0.04, from: 'start' },
            },
            drawEnd + 1.1,
          );
        };

        build();

        // Re-split no resize (a quebra de linha muda), com debounce.
        let t = 0;
        let lastW = window.innerWidth;
        const onResize = () => {
          if (window.innerWidth === lastW) return; // no mobile, barra de endereço não conta
          lastW = window.innerWidth;
          window.clearTimeout(t);
          t = window.setTimeout(() => {
            tl?.scrollTrigger?.kill();
            tl?.kill();
            split?.revert();
            build();
          }, 150);
        };
        window.addEventListener('resize', onResize);

        return () => {
          window.clearTimeout(t);
          window.removeEventListener('resize', onResize);
          glowOff.kill();
          fx.glow.enabled = true; // não deixa o resto do site sem glow se o Sobre desmontar
          tl?.scrollTrigger?.kill();
          tl?.kill();
          split?.revert();
        };
      });
    },
    { scope: rootRef },
  );

  return (
    <section ref={rootRef} id="sobre" className={styles.about} aria-labelledby="sobre-title">
      <div className={styles.about__inner}>
        <h2 id="sobre-title" className={styles.about__eyebrow}>
          Sobre
        </h2>
        {/* A frase completa, lida naturalmente pelo leitor de tela. */}
        <p className="sr-only">{MANIFESTO}</p>
        <p className={styles.about__text} data-about-text aria-hidden="true">
          {PIECES.map((piece, i) =>
            piece.fx ? (
              <span key={i} className={styles.about__key} data-fx={piece.fx}>
                {piece.text}
              </span>
            ) : (
              piece.text
            ),
          )}
        </p>
        {/* O desenho fica ancorado no FIM DA PRIMEIRA LINHA (não numa palavra-chave): a posição
            real de "onde a linha 1 termina" muda com a largura da tela, e só o About.tsx (depois
            do split) sabe medir isso. FORA do <p data-about-text> de propósito: o SplitText
            reprocessa TODOS os filhos desse elemento — um span solto lá dentro era "engolido"
            pela reestruturação em linhas/palavras/chars e acabava com dimensão zero (medido:
            width/height computados em 0px mesmo com width explícito no CSS). Como irmão do
            texto, ancorado no `.about__inner` (relative), ele sobrevive aos re-splits inteiro. */}
        <span className={styles['about__flair-anchor']} data-flair-anchor="true">
          <span className={styles['about__flair-tether']} data-flair="tether" />
          <AboutFlair className={styles['about__flair-svg']} />
        </span>
      </div>
    </section>
  );
}
