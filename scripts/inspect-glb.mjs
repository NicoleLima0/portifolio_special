/**
 * Inspeciona um .glb sem precisar de browser: lista nodes, hierarquia, malhas, materiais e a
 * caixa envolvente de cada peça.
 *
 *   node scripts/inspect-glb.mjs public/models/laptop/laptop.glb
 *
 * Lê o container GLB na mão (header + chunk JSON) — não precisa do three nem de DOM.
 */

import { readFile } from 'node:fs/promises';

const file = process.argv[2] ?? 'public/models/laptop/laptop.glb';

const buf = await readFile(file);

// --- Container GLB: 12 bytes de header, depois chunks (length, type, data) ---
const magic = buf.readUInt32LE(0);
if (magic !== 0x46546c67) throw new Error('não é um .glb (magic inválido)');
const version = buf.readUInt32LE(4);
const total = buf.readUInt32LE(8);

let off = 12;
let json = null;
let binLen = 0;
while (off < buf.length) {
  const len = buf.readUInt32LE(off);
  const type = buf.readUInt32LE(off + 4);
  const data = buf.subarray(off + 8, off + 8 + len);
  if (type === 0x4e4f534a) json = JSON.parse(new TextDecoder().decode(data));
  if (type === 0x004e4942) binLen = len;
  off += 8 + len + ((4 - ((off + 8 + len) % 4)) % 4);
}
if (!json) throw new Error('chunk JSON não encontrado');

console.log(`arquivo: ${file}`);
console.log(`glTF v${version} · ${(total / 1024).toFixed(0)} KB (bin ${(binLen / 1024).toFixed(0)} KB)`);
console.log(`gerador: ${json.asset?.generator ?? '?'}`);
if (json.asset?.copyright) console.log(`copyright: ${json.asset.copyright}`);

const nodes = json.nodes ?? [];
const meshes = json.meshes ?? [];
const mats = json.materials ?? [];

console.log(`\nnodes: ${nodes.length} · meshes: ${meshes.length} · materiais: ${mats.length}`);

// --- Hierarquia ---
const childOf = new Set();
nodes.forEach((n) => (n.children ?? []).forEach((c) => childOf.add(c)));
const roots = nodes.map((_, i) => i).filter((i) => !childOf.has(i));

const fmt = (a, d = 3) => (a ? `[${a.map((v) => v.toFixed(d)).join(', ')}]` : null);

function dump(i, depth) {
  const n = nodes[i];
  const pad = '  '.repeat(depth);
  const bits = [];
  if (n.translation) bits.push(`t=${fmt(n.translation)}`);
  if (n.rotation) bits.push(`r=${fmt(n.rotation)}`);
  if (n.scale) bits.push(`s=${fmt(n.scale, 2)}`);
  if (n.matrix) bits.push('matrix');
  const meshInfo =
    n.mesh !== undefined
      ? ` · mesh#${n.mesh} "${meshes[n.mesh]?.name ?? ''}" prims=${meshes[n.mesh]?.primitives?.length ?? 0}`
      : '';
  console.log(`${pad}[${i}] ${n.name ?? '(sem nome)'}${meshInfo}${bits.length ? ' · ' + bits.join(' ') : ''}`);
  (n.children ?? []).forEach((c) => dump(c, depth + 1));
}

console.log('\n--- hierarquia ---');
roots.forEach((r) => dump(r, 0));

// --- Materiais ---
console.log('\n--- materiais ---');
mats.forEach((m, i) => {
  const p = m.pbrMetallicRoughness ?? {};
  console.log(
    `[${i}] ${m.name ?? '(sem nome)'} · base=${fmt(p.baseColorFactor, 2) ?? '-'} metal=${p.metallicFactor ?? '-'} rough=${p.roughnessFactor ?? '-'}${p.baseColorTexture ? ' · tem textura' : ''}`,
  );
});

// --- Caixa envolvente por mesh (via accessors de POSITION) ---
console.log('\n--- extensão de cada mesh (min/max do POSITION) ---');
meshes.forEach((m, i) => {
  m.primitives?.forEach((prim, pi) => {
    const acc = json.accessors?.[prim.attributes?.POSITION];
    if (!acc) return;
    const matName = prim.material !== undefined ? mats[prim.material]?.name : '-';
    console.log(
      `mesh#${i}${m.primitives.length > 1 ? `/p${pi}` : ''} "${m.name ?? ''}" mat="${matName ?? '-'}" min=${fmt(acc.min)} max=${fmt(acc.max)}`,
    );
  });
});
