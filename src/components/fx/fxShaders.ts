// Shaders do canvas de efeitos. Todos desenham um quad unitário posicionado por uRect (px CSS).

// A precisão de uRect/uView precisa bater entre vertex e fragment (mesmo nome = mesmo uniform).
export const FX_VERTEX = /* glsl */ `
precision highp float;
attribute vec2 aPos;          // 0..1
uniform highp vec4 uRect;     // x, y, largura, altura (px CSS, origem no topo-esquerda da viewport)
uniform highp vec2 uView;     // tamanho da viewport (px CSS)
varying vec2 vUv;             // 0..1, y para cima
void main(){
  vec2 px = uRect.xy + aPos * uRect.zw;
  gl_Position = vec4(px.x / uView.x * 2.0 - 1.0, 1.0 - px.y / uView.y * 2.0, 0.0, 1.0);
  vUv = vec2(aPos.x, 1.0 - aPos.y);
}
`;

// Mesma paleta cosine do hero (brief §6.3) + ruído barato (2 amostras de value noise por pixel).
const IRIDESCENCE = /* glsl */ `
float hash(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
float noise(vec2 p){
  vec2 i=floor(p), f=fract(p);
  float a=hash(i), b=hash(i+vec2(1.,0.)), c=hash(i+vec2(0.,1.)), d=hash(i+vec2(1.,1.));
  vec2 u=f*f*(3.-2.*f);
  return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
}
vec3 pal(float t){
  vec3 a=vec3(0.12,0.06,0.20), b=vec3(0.45,0.30,0.55), c=vec3(1.0,1.0,1.0), d=vec3(0.00,0.18,0.40);
  return a + b*cos(6.28318*(c*t+d));
}
vec3 iris(vec2 q, float time, float shift){
  float t = time * 0.08;
  vec2 w = vec2(noise(q * 1.7 + t), noise(q * 1.7 + vec2(4.1, 1.3) - t));
  float n = noise(q * 2.3 + 1.6 * w) * 0.65 + noise(q * 4.6 - w) * 0.35;
  vec3 col = pal(n + 0.25 * w.x + 0.1 + shift);
  float crease = pow(abs(sin((w.x - w.y) * 6.2831 + n * 4.0 + time * 0.4)), 10.0);
  return clamp(col + crease * vec3(0.7, 0.6, 1.0), 0.0, 1.0);
}
`;

export const IRIS_FRAGMENT = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform highp vec4 uRect;
uniform highp vec2 uView;
uniform float uTime;
uniform float uShift;
uniform float uRadius;   // raio do glow, em px
uniform float uAlpha;
${IRIDESCENCE}
void main(){
  vec2 p = (vUv - 0.5) * uRect.zw; // px a partir do centro do quad

  // Só soma luz (alpha 0 com blend ONE, ONE_MINUS_SRC_ALPHA): não escurece o texto por baixo.
  float d = length(p) / uRadius;
  float a = exp(-d * d * 2.6) * uAlpha;
  if (a < 0.002) discard;
  gl_FragColor = vec4(iris(p / 420.0, uTime, uShift) * a, 0.0);
}
`;

export const THUMB_FRAGMENT = /* glsl */ `
precision mediump float;
varying vec2 vUv;
uniform highp vec4 uRect;   // mesma precisão do vertex shader
uniform highp vec2 uView;
uniform sampler2D uTexA;   // imagem anterior (crossfade)
uniform sampler2D uTexB;   // imagem atual
uniform vec2 uScaleA;      // "object-fit: cover" de cada textura
uniform vec2 uScaleB;
uniform float uMix;
uniform vec2 uVel;         // velocidade do cursor (y para cima)
uniform vec2 uParallax;    // -0.5..0.5
uniform float uReveal;     // 0..1, revela de baixo para cima
uniform float uAlpha;
uniform float uRadius;

vec3 sampleTex(sampler2D tex, vec2 uv, vec2 scale, float split){
  vec2 c = (uv - 0.5) * scale + 0.5;
  return vec3(texture2D(tex, c + vec2(split, 0.0)).r, texture2D(tex, c).g, texture2D(tex, c - vec2(split, 0.0)).b);
}

void main(){
  vec2 v = clamp(uVel / 40.0, -1.0, 1.0);
  vec2 uv = vUv;
  // O warp é em UV (0..1): sem normalizar pelo lado menor, a mesma velocidade entorta mais
  // no eixo curto do card. 'bend' deixa o deslocamento equivalente em px nos dois eixos.
  vec2 bend = vec2(0.05) * (min(uRect.z, uRect.w) / uRect.zw);
  uv.x += v.x * bend.x * sin(uv.y * 3.14159);
  uv.y += v.y * bend.y * sin(uv.x * 3.14159);
  uv = (uv - 0.5) * 0.88 + 0.5 + uParallax * 0.05; // zoom leve = margem para o parallax
  float split = length(v) * 0.008;
  vec3 col = mix(sampleTex(uTexA, uv, uScaleA, split), sampleTex(uTexB, uv, uScaleB, split), uMix);

  vec2 p = (vUv - 0.5) * uRect.zw;
  vec2 q = abs(p) - (uRect.zw * 0.5 - uRadius);
  float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - uRadius;
  float m = clamp(0.5 - d, 0.0, 1.0);
  float r = 1.0 - smoothstep(uReveal * 1.1 - 0.1, uReveal * 1.1, vUv.y);
  float a = m * r * uAlpha;
  if (a <= 0.0) discard;
  gl_FragColor = vec4(col * a, a);
}
`;
