// Genera backend/brand/logo-principal-oscuro.jpg (el que incrusta el PDF de planillas y boletas)
// a partir del lockup oficial del kit, sobre Espresso y con área de respeto ≥ 25 % del alto del logo.
// El escritor PDF del backend solo incrusta JPEG (DCTDecode), por eso no se usa el SVG directo.
// Uso (desde la raíz del repo): node docs/brand/kit/herramientas/logo-pdf.mjs
// Requiere Chrome en la ruta por defecto de Windows (igual que raster.mjs).
import { readFileSync, writeFileSync, copyFileSync, mkdtempSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const ANCHO = 1600, ALTO = 480, ALTO_LOGO = 300; // logo 1442.8 x 300 → márgenes 78 px (26 %)
const ESPRESSO = '#321f19';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const raiz = resolve('.');
const svg = readFileSync(join(raiz, 'docs/brand/kit/svg/logo-principal-oscuro.svg'), 'utf8');
const datos = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;

const html = `<!doctype html><body><pre id="o"></pre><script>
const img = new Image();
img.onload = () => {
  const c = document.createElement('canvas'); c.width = ${ANCHO}; c.height = ${ALTO};
  const x = c.getContext('2d'); x.fillStyle = '${ESPRESSO}'; x.fillRect(0, 0, ${ANCHO}, ${ALTO});
  const w = ${ALTO_LOGO} * img.naturalWidth / img.naturalHeight;
  x.drawImage(img, (${ANCHO} - w) / 2, (${ALTO} - ${ALTO_LOGO}) / 2, w, ${ALTO_LOGO});
  document.getElementById('o').textContent = c.toDataURL('image/jpeg', 0.92);
};
img.src = '${datos}';
</script></body>`;

const dir = mkdtempSync(join(tmpdir(), 'logo-pdf-'));
const pagina = join(dir, 'p.html');
writeFileSync(pagina, html);
const dom = execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--virtual-time-budget=5000', '--dump-dom', `file:///${pagina.replaceAll('\\', '/')}`], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const m = dom.match(/data:image\/jpeg;base64,([A-Za-z0-9+/=]+)/);
if (!m) throw new Error('Chrome no devolvió el JPEG');
const jpg = Buffer.from(m[1], 'base64');
const destino = join(raiz, 'backend/brand/logo-principal-oscuro.jpg');
writeFileSync(destino, jpg);
copyFileSync(join(raiz, 'docs/brand/kit/svg/logo-principal-oscuro.svg'), join(raiz, 'backend/brand/logo-principal-oscuro.svg'));
console.log(`OK ${destino} ${ANCHO}x${ALTO} (${jpg.length} bytes)`);
