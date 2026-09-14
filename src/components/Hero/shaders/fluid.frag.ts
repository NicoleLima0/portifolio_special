// Fluido iridescente holográfico — referência canônica (brief §6.4).
// Único parâmetro: nº de oitavas do FBM (6 no desktop; 5 em ponteiro "coarse"/mobile, brief §3.6).
// NÃO alterar os coeficientes da paleta: é exatamente a combinação aprovada.
export function fluidFragment(octaves = 6): string {
  return /* glsl */ `
precision highp float;
uniform float uTime;   // segundos desde o início
uniform vec2  uRes;    // resolução do canvas (px de device)
uniform vec2  uMouse;  // posição do mouse em px de device (y invertido p/ WebGL)
uniform float uShift;  // acumulador de cor dirigido pelo movimento do mouse

float hash(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
float noise(vec2 p){
  vec2 i=floor(p), f=fract(p);
  float a=hash(i), b=hash(i+vec2(1.,0.)), c=hash(i+vec2(0.,1.)), d=hash(i+vec2(1.,1.));
  vec2 u=f*f*(3.-2.*f);
  return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
}
float fbm(vec2 p){ float v=0.,a=0.5; for(int i=0;i<${octaves};i++){ v+=a*noise(p); p*=2.02; a*=0.5; } return v; }

vec3 pal(float t){
  vec3 a=vec3(0.12,0.06,0.20), b=vec3(0.45,0.30,0.55), c=vec3(1.0,1.0,1.0), d=vec3(0.00,0.18,0.40);
  return a + b*cos(6.28318*(c*t+d));
}

void main(){
  vec2 uv = gl_FragCoord.xy / uRes.xy;
  float aspect = uRes.x / uRes.y;
  vec2 p = uv;  p.x *= aspect;
  vec2 m = uMouse / uRes.xy;  m.x *= aspect;
  float t = uTime * 0.06;

  vec2 q = vec2(fbm(p*2.2 + t), fbm(p*2.2 + vec2(3.1,1.7) - t));
  float md = distance(p, m);
  q += 0.40 * (p - m) * exp(-2.5*md);
  vec2 r = vec2(fbm(p*2.2 + 1.8*q + 0.15*t),
                fbm(p*2.2 + 1.8*q + vec2(8.3,2.8) - 0.15*t));
  float n = fbm(p*2.6 + 2.2*r);

  n += 0.18 * sin(14.0*md - uTime*2.5) * exp(-3.0*md);

  vec3 col = pal(n + 0.25*r.x + 0.1 + uShift);

  float crease = pow(abs(sin((r.x - r.y)*6.2831 + n*4.0 + uTime*0.4)), 10.0);
  col += crease * vec3(0.7, 0.6, 1.0);

  col += pal(uShift + 0.35) * 0.55 * exp(-4.0*md);

  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;
}
