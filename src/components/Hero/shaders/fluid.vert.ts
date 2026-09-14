// Quads em clip space (a geometria vem do FluidCanvas: só as regiões visíveis).
// (Shaders ficam em .ts como string para funcionar no Turbopack sem loader de .glsl.)
export const FLUID_VERTEX = /* glsl */ `
attribute vec2 aPos;
void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }
`;
