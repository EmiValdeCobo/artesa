// Kit de marca artesa — concepto A "Masa enrollada". Uso: node kit.mjs <carpetaSalida>
// Todo se construye como contornos rellenos (sin stroke, sin texto vivo).
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const OUT = process.argv[2];
mkdirSync(OUT, { recursive: true });
const C = { espresso: '#321F19', terracota: '#B15C3D', ocre: '#E1A651', alabastro: '#F7F5F0', negro: '#000000' };
const r1 = (n) => Math.round(n * 10) / 10;

// ---------- geometría: muestreo de curvas ----------
const linea = (a, b) => [a, b];
const cubica = (p0, p1, p2, p3, n = 40) => Array.from({ length: n + 1 }, (_, i) => {
  const t = i / n, u = 1 - t;
  return [u ** 3 * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t ** 3 * p3[0],
          u ** 3 * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t ** 3 * p3[1]];
});
const cuadratica = (p0, p1, p2, n = 30) => Array.from({ length: n + 1 }, (_, i) => {
  const t = i / n, u = 1 - t;
  return [u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]];
});
const arco = (cx, cy, r, t0, t1, n = 90) => Array.from({ length: n + 1 }, (_, i) => {
  const t = t0 + ((t1 - t0) * i) / n; return [cx + r * Math.cos(t), cy + r * Math.sin(t)];
});
const unir = (...tramos) => tramos.reduce((acc, t) => acc.concat(acc.length ? t.slice(1) : t), []);

// ---------- contorno de un trazo (stroke → fill) ----------
function normales(pts, cerrado) {
  const n = pts.length;
  return pts.map((p, i) => {
    const a = pts[cerrado ? (i - 1 + n) % n : Math.max(i - 1, 0)];
    const b = pts[cerrado ? (i + 1) % n : Math.min(i + 1, n - 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
    return [-dy / L, dx / L];
  });
}
const off = (pts, ns, s) => pts.map((p, i) => [p[0] + ns[i][0] * s, p[1] + ns[i][1] * s]);
const sub = (pts) => 'M' + pts.map((p) => `${r1(p[0])} ${r1(p[1])}`).join(' L') + ' Z';
const ang = (v) => Math.atan2(v[1], v[0]);
// Trazo abierto con remates redondos → un subpath cerrado.
function trazo(pts, w) {
  const h = w / 2, ns = normales(pts, false);
  const izq = off(pts, ns, h), der = off(pts, ns, -h).reverse();
  const fin = pts[pts.length - 1], ini = pts[0], nf = ns[ns.length - 1], ni = ns[0];
  const capFin = arco(fin[0], fin[1], h, ang(nf), ang(nf) - Math.PI, 32).slice(1, -1);
  const capIni = arco(ini[0], ini[1], h, ang([-ni[0], -ni[1]]), ang([-ni[0], -ni[1]]) - Math.PI, 32).slice(1, -1);
  return sub([...izq, ...capFin, ...der, ...capIni]);
}
// Anillo (trazo cerrado): dos subpaths de orientación opuesta → hueco con regla nonzero.
function anillo(cx, cy, r, w) {
  const ext = arco(cx, cy, r + w / 2, 2 * Math.PI, 0, 120).slice(0, -1);
  const int = arco(cx, cy, r - w / 2, 0, 2 * Math.PI, 120).slice(0, -1);
  return sub(ext) + ' ' + sub(int);
}
const circulo = (cx, cy, r) => sub(arco(cx, cy, r, 2 * Math.PI, 0, 90).slice(0, -1));

// ---------- símbolo: "a" con masa enrollada (concepto A v3) ----------
function simbolo() {
  const cx = 232, cy = 282, R = 130, paso = 72, vueltas = 1.36, pts = [];
  for (let f = -vueltas * 2 * Math.PI; f <= 1e-9; f += Math.PI / 90) {
    const r = R + (paso / (2 * Math.PI)) * f;
    pts.push([cx + r * Math.cos(f), cy - r * Math.sin(f)]);
  }
  return [trazo(pts, 40), trazo(linea([cx + R, 190], [cx + R, cy + R]), 44)];
}
// Corte para tamaños pequeños (≤ 32 px): ojo cerrado + punto de masa, trazos más gruesos.
function simboloPequeno() {
  const cx = 226, cy = 290, R = 122;
  return [anillo(cx, cy, R - 4, 64), circulo(cx, cy, 34), trazo(linea([cx + R + 6, 186], [cx + R + 6, cy + R]), 68)];
}

// ---------- wordmark "artesa" (minúsculas construidas) ----------
function wordmark() {
  const sw = 30, base = 300, top = 100, cyx = 200, r = 85, d = [];
  let x = 40;
  const a = () => { const cx = x + r + sw / 2; d.push(anillo(cx, cyx, r, sw), trazo(linea([cx + r, top + 6], [cx + r, base]), sw)); x = cx + r + sw / 2 + 26; };
  const rr = () => { const sx = x + sw / 2; d.push(trazo(linea([sx, top + 6], [sx, base]), sw), trazo(cubica([sx, cyx + 10], [sx, top + 30], [sx + 38, top], [sx + 80, top + 18]), sw)); x = sx + 108; };
  const t = () => { const sx = x + sw / 2 + 10; d.push(trazo(unir(linea([sx, top - 70], [sx, base - 46]), cuadratica([sx, base - 46], [sx, base], [sx + 54, base - 4])), sw), trazo(linea([sx - 10, top + 6], [sx + 56, top + 6]), sw)); x = sx + 78; };
  const e = () => { const cx = x + r + sw / 2; d.push(trazo(linea([cx - r, cyx], [cx + r, cyx]), sw), trazo(arco(cx, cyx, r, 0, -1.8 * Math.PI, 160), sw)); x = cx + r + sw / 2 + 24; };
  const s = () => { const w = 120, sx = x + sw / 2, q = (base - top) / 4;
    d.push(trazo(unir(cubica([sx + w - 6, top + q * 0.6], [sx + w - 30, top], [sx + 6, top], [sx + 6, top + q * 1.05]),
      cubica([sx + 6, top + q * 1.05], [sx + 6, cyx], [sx + w, cyx], [sx + w, base - q * 1.05]),
      cubica([sx + w, base - q * 1.05], [sx + w, base], [sx + 20, base], [sx, base - q * 0.6])), sw));
    x = sx + w + sw / 2 + 26; };
  a(); rr(); t(); e(); s(); a();
  return d;
}

// ---------- utilidades de composición ----------
function bbox(paths) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of paths) for (const m of p.matchAll(/(-?[\d.]+) (-?[\d.]+)/g)) {
    const x = +m[1], y = +m[2]; x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
  }
  return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0 };
}
// Normaliza a origen (0,0) y escala: devuelve paths transformados (coordenadas reescritas, sin transform).
function colocar(paths, s, dx, dy) {
  const b = bbox(paths);
  return paths.map((p) => p.replace(/(-?[\d.]+) (-?[\d.]+)/g, (_, x, y) => `${r1((+x - b.x0) * s + dx)} ${r1((+y - b.y0) * s + dy)}`));
}
const titulo = 'artesa — Sistema ERP y POS para Restaurante Orígenes';
const svg = (w, h, cuerpo, extra = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${r1(w)} ${r1(h)}" role="img" aria-label="${titulo}">${extra}<title>${titulo}</title>\n${cuerpo}\n</svg>\n`;
const grupo = (paths, fill) => `<path fill="${fill}" d="${paths.join(' ')}"/>`;

const SIM = simbolo(), SIMP = simboloPequeno(), WM = wordmark();
const bS = bbox(SIM), bW = bbox(WM);
const PAD = 0; // los archivos se recortan al contenido; el área de respeto se documenta en la guía.

const variantes = {
  '': { s: C.terracota, w: C.espresso },            // sobre fondo claro
  '-oscuro': { s: C.ocre, w: C.alabastro },         // sobre fondo oscuro
  '-mono-oscuro': { s: C.espresso, w: C.espresso }, // 1 tinta para fondo claro
  '-mono-claro': { s: C.alabastro, w: C.alabastro },// 1 tinta (inverso) para fondo oscuro
  '-negro': { s: C.negro, w: C.negro },             // recibo térmico / fotocopia
};
const archivos = {};
for (const [suf, col] of Object.entries(variantes)) {
  // Isotipo (símbolo) y corte pequeño
  archivos[`isotipo${suf}.svg`] = svg(bS.w, bS.h, grupo(colocar(SIM, 1, 0, 0), col.s));
  const bP = bbox(SIMP);
  archivos[`isotipo-pequeno${suf}.svg`] = svg(bP.w, bP.h, grupo(colocar(SIMP, 1, 0, 0), col.s));
  // Logotipo (solo wordmark)
  archivos[`logotipo${suf}.svg`] = svg(bW.w, bW.h, grupo(colocar(WM, 1, 0, 0), col.w));
  // Horizontal: símbolo a la altura total del wordmark (asc. de la t → base), separación = 0,45 × altura x
  const hS = bW.h * 1.0, sS = hS / bS.h, gap = 200 * 0.45;
  const simH = colocar(SIM, sS, 0, (bW.h - hS) / 2);
  const wmH = colocar(WM, 1, bS.w * sS + gap, 0);
  archivos[`logo-principal${suf}.svg`] = svg(bS.w * sS + gap + bW.w, bW.h, grupo(simH, col.s) + '\n' + grupo(wmH, col.w));
  // Apilado: símbolo centrado arriba, ancho ≈ 42 % del wordmark
  const sA = (bW.w * 0.42) / bS.w, hA = bS.h * sA, gapA = 200 * 0.55;
  const simA = colocar(SIM, sA, (bW.w - bS.w * sA) / 2, 0);
  const wmA = colocar(WM, 1, 0, hA + gapA);
  archivos[`logo-apilado${suf}.svg`] = svg(bW.w, hA + gapA + bW.h, grupo(simA, col.s) + '\n' + grupo(wmA, col.w));
}

// Favicon SVG: corte pequeño, cambia de color con el tema del navegador.
{
  const bP = bbox(SIMP), lado = Math.max(bP.w, bP.h) * 1.08, s = 1;
  const p = colocar(SIMP, s, (lado - bP.w) / 2, (lado - bP.h) / 2);
  archivos['favicon.svg'] = svg(lado, lado, `<path class="m" d="${p.join(' ')}"/>`,
    `<style>.m{fill:${C.terracota}}@media (prefers-color-scheme:dark){.m{fill:${C.ocre}}}</style>`);
  // Fuente estática para PNG/ICO: el rasterizador podría aplicar la media query del tema del sistema.
  archivos['favicon-estatico.svg'] = svg(lado, lado, grupo(p, C.terracota));
}
// App icon: cuadrado redondeado Espresso + símbolo Ocre (zona segura 62 %).
function appIcon(paths, conRadio = true, zona = 0.62) {
  const L = 512, b = bbox(paths), s = (L * zona) / Math.max(b.w, b.h);
  const p = colocar(paths, s, (L - b.w * s) / 2, (L - b.h * s) / 2);
  const fondo = conRadio ? `<rect width="${L}" height="${L}" rx="112" fill="${C.espresso}"/>` : `<rect width="${L}" height="${L}" fill="${C.espresso}"/>`;
  return svg(L, L, fondo + '\n' + grupo(p, C.ocre));
}
archivos['app-icon.svg'] = appIcon(SIM);
archivos['app-icon-pequeno.svg'] = appIcon(SIMP, true, 0.66);
archivos['app-icon-maskable.svg'] = appIcon(SIM, false, 0.5);

for (const [n, s] of Object.entries(archivos)) writeFileSync(join(OUT, n), s);
console.log(Object.keys(archivos).length, 'archivos');
