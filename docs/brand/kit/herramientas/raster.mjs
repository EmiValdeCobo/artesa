// Rasteriza SVG → PNG con Chrome headless (canvas → dataURL vía --dump-dom) y arma favicon.ico.
// Uso: node raster.mjs <carpetaKit>
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const K = resolve(process.argv[2]);
const SVG = join(K, 'svg'), PNG = join(K, 'png');
mkdirSync(PNG, { recursive: true });
const b64 = (f) => 'data:image/svg+xml;base64,' + readFileSync(join(SVG, f)).toString('base64');
// [salida, svg, tamaño]
const trabajos = [
  ['favicon-16.png', 'favicon-estatico.svg', 16], ['favicon-32.png', 'favicon-estatico.svg', 32], ['favicon-48.png', 'favicon-estatico.svg', 48],
  ['apple-touch-icon.png', 'app-icon-maskable.svg', 180],
  ['icon-192.png', 'app-icon.svg', 192], ['icon-512.png', 'app-icon.svg', 512],
  ['icon-maskable-512.png', 'app-icon-maskable.svg', 512],
  ['app-icon-48.png', 'app-icon-pequeno.svg', 48],
  ['isotipo-1024.png', 'isotipo.svg', 1024], ['logo-principal-1600.png', 'logo-principal.svg', 1600],
  ['logo-principal-negro-600.png', 'logo-principal-negro.svg', 600],
];
const html = join(PNG, '_raster.html');
writeFileSync(html, `<!doctype html><body><pre id="o"></pre><script>
const T=${JSON.stringify(trabajos.map(([o, f, n]) => [o, b64(f), n]))};
Promise.all(T.map(([o,src,n])=>new Promise(ok=>{const i=new Image();i.onload=()=>{
  const ar=i.naturalWidth/i.naturalHeight||1, w=ar>=1?n:Math.round(n*ar), h=ar>=1?Math.round(n/ar):n;
  const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');
  x.imageSmoothingQuality='high';x.drawImage(i,0,0,w,h);ok(o+' '+c.toDataURL('image/png'));};i.src=src;})))
.then(r=>{document.getElementById('o').textContent=r.join('\\n');});
</script>`);
const dom = execFileSync('C:/Program Files/Google/Chrome/Application/chrome.exe',
  ['--headless=new', '--disable-gpu', '--virtual-time-budget=5000', '--dump-dom', pathToFileURL(html).href], { encoding: 'utf8', maxBuffer: 64e6 });
const pngs = {};
for (const m of dom.matchAll(/([\w-]+\.png) data:image\/png;base64,([A-Za-z0-9+/=]+)/g)) {
  pngs[m[1]] = Buffer.from(m[2], 'base64'); writeFileSync(join(PNG, m[1]), pngs[m[1]]);
}
// favicon.ico con PNG embebidos (16, 32, 48)
const ico = ['favicon-16.png', 'favicon-32.png', 'favicon-48.png'].map((n) => [n, pngs[n]]);
const head = Buffer.alloc(6 + 16 * ico.length); head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(ico.length, 4);
let offset = head.length;
ico.forEach(([n, buf], i) => { const s = +n.match(/\d+/)[0], e = 6 + 16 * i;
  head.writeUInt8(s, e); head.writeUInt8(s, e + 1); head.writeUInt16LE(1, e + 4); head.writeUInt16LE(32, e + 6);
  head.writeUInt32LE(buf.length, e + 8); head.writeUInt32LE(offset, e + 12); offset += buf.length; });
writeFileSync(join(PNG, 'favicon.ico'), Buffer.concat([head, ...ico.map(([, b]) => b)]));
console.log(Object.keys(pngs).length, 'PNG + favicon.ico');
