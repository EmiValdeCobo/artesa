import { readFileSync, statSync } from 'node:fs';
import { basename } from 'node:path';
for (const f of process.argv.slice(2)) {
  const s = readFileSync(f, 'utf8');
  const colores = new Set((s.match(/#[0-9a-f]{6}\b/gi) || []).map((c) => c.toLowerCase()));
  const checks = {
    viewBox: /viewBox="[^"]+"/.test(s),
    sinTextoVivo: !/<text|<tspan|font-family|@font-face/i.test(s),
    sinImagenes: !/<image|data:/i.test(s),
    sinTransform: !/transform=/.test(s),
    colores_le2: colores.size <= 2,
  };
  const nodos = (s.match(/[MLCQAHVZ]/g) || []).length;
  const trazos = /stroke-width="(?!8")/.test(s) ? 'sí (contornear en el kit)' : 'no';
  const ok = Object.values(checks).every(Boolean);
  console.log(`${ok ? 'PASA' : 'FALLA'}  ${basename(f).padEnd(18)} ${String(statSync(f).size).padStart(6)} B  nodos≈${String(nodos).padStart(4)}  colores=${[...colores].join(',')}  trazos=${trazos}  ${Object.entries(checks).filter(([, v]) => !v).map(([k]) => '✗' + k).join(' ')}`);
}
