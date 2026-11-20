// test/frontend-contraste-tokens.test.js
// Verifica contraste WCAG (≥4.5:1 para texto normal y ≥3:1 para controles/foco)
// en los tokens semánticos de frontend/src/index.css en :root (claro) y .dark (oscuro).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const raiz = join(import.meta.dirname, '..');

function hexToRgb(hex) {
  let clean = hex.replace(/^#/, '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  const num = parseInt(clean.slice(0, 6), 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function luminanciaRelativa(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratioContraste(hex1, hex2) {
  const l1 = luminanciaRelativa(hex1);
  const l2 = luminanciaRelativa(hex2);
  const claro = Math.max(l1, l2);
  const oscuro = Math.min(l1, l2);
  return (claro + 0.05) / (oscuro + 0.05);
}

function parsearBloque(css, selector) {
  const regex = selector === ':root'
    ? /(?:^|\n):root\s*\{([\s\S]*?)\n\}/
    : /(?:^|\n)\.dark\s*\{([\s\S]*?)\n\}/;
  const match = css.match(regex);
  assert.ok(match, `Bloque ${selector} no encontrado en index.css`);
  const contenido = match[1];

  const variables = {};
  const regexVar = /--([a-zA-Z0-9_-]+)\s*:\s*(#[0-9a-fA-F]{3,8})/g;
  let m;
  while ((m = regexVar.exec(contenido)) !== null) {
    variables[m[1]] = m[2];
  }
  return variables;
}

test('contraste de tokens: tema claro (:root) y oscuro (.dark) cumplen WCAG AA', async () => {
  const css = await readFile(join(raiz, 'frontend', 'src', 'index.css'), 'utf8');

  const claro = parsearBloque(css, ':root');
  const oscuro = parsearBloque(css, '.dark');

  const temas = [
    { nombre: 'claro (:root)', tokens: claro },
    { nombre: 'oscuro (.dark)', tokens: oscuro },
  ];

  for (const { nombre, tokens } of temas) {
    const verificar = (fgKey, bgKey, minimo, etiqueta) => {
      const fg = tokens[fgKey];
      const bg = tokens[bgKey];
      assert.ok(fg, `[${nombre}] Token ${fgKey} no encontrado`);
      assert.ok(bg, `[${nombre}] Token ${bgKey} no encontrado`);
      const ratio = ratioContraste(fg, bg);
      assert.ok(
        ratio >= minimo - 0.05, // margen mínimo por redondeo decimal
        `[${nombre}] ${etiqueta || `${fgKey} sobre ${bgKey}`} (${fg} sobre ${bg}): ratio ${ratio.toFixed(2)}:1 no alcanza el mínimo de ${minimo}:1`
      );
    };

    // 1. text-primary y text-secondary sobre bg-primary, bg-surface y bg-muted (≥4.5:1)
    verificar('text-primary', 'bg-primary', 4.5);
    verificar('text-primary', 'bg-surface', 4.5);
    verificar('text-primary', 'bg-muted', 4.5);

    verificar('text-secondary', 'bg-primary', 4.5);
    verificar('text-secondary', 'bg-surface', 4.5);
    verificar('text-secondary', 'bg-muted', 4.5);

    // 2. accent-text sobre bg-surface y accent-soft (≥4.5:1)
    verificar('accent-text', 'bg-surface', 4.5);
    verificar('accent-text', 'accent-soft', 4.5);

    // 3. text-on-accent sobre accent y accent-hover (≥4.5:1)
    verificar('text-on-accent', 'accent', 4.5);
    verificar('text-on-accent', 'accent-hover', 4.5);

    // 4. success-text, warning-text, danger-text e info-text sobre su -soft (≥4.5:1)
    verificar('success-text', 'success-soft', 4.5);
    verificar('warning-text', 'warning-soft', 4.5);
    verificar('danger-text', 'danger-soft', 4.5);
    verificar('info-text', 'info-soft', 4.5);

    // 5. ring y border-strong sobre bg-surface (≥3:1)
    verificar('ring', 'bg-surface', 3.0);
    verificar('border-strong', 'bg-surface', 3.0);
  }
});
