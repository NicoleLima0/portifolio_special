// Passada barata que só marca o stencil: onde o fluido pode aparecer.
// Quads com (posição, uv). uMode: 0 = caixa de letra (só onde a máscara tem furo),
// 1 = quad inteiro, 2 = disco inscrito no quad (ponto do rastro).
export const COVERAGE_VERTEX = /* glsl */ `
attribute vec2 aPos;
attribute vec2 aUv;
varying vec2 vUv;
void main(){ vUv = aUv; gl_Position = vec4(aPos, 0.0, 1.0); }
`;

export const COVERAGE_FRAGMENT = /* glsl */ `
precision mediump float;
uniform sampler2D uMask;
uniform vec2 uRes;
uniform float uMode;
varying vec2 vUv;
void main(){
  if (uMode > 1.5) {
    if (dot(vUv, vUv) > 1.0) discard;
  } else if (uMode < 0.5) {
    if (texture2D(uMask, gl_FragCoord.xy / uRes).a < 0.002) discard;
  }
  gl_FragColor = vec4(0.0);
}
`;
