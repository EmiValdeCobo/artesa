// test/frontend-preparacion.test.js
// Contrato de la vista de cola de preparación (barra/cocina - KDS)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const raiz = join(import.meta.dirname, '..');
const leer = (rel) => readFile(join(raiz, rel), 'utf8');

// --- API client ---
test('preparacion: preparacionApi expone listarCola y cambiarEstado', async () => {
  const src = await leer('frontend/src/api/preparacion.api.js');
  assert.match(src, /listarCola/, 'debe exponer listarCola');
  assert.match(src, /cambiarEstado/, 'debe exponer cambiarEstado');
  assert.match(src, /\/preparacion\/cola/, 'GET /preparacion/cola');
  assert.match(src, /\/preparacion\/ordenes\//, 'PATCH /preparacion/ordenes/:id/estado');
  assert.match(src, /api\.patch/, 'usa PATCH para cambiar estado');
});

// --- Ruta protegida ---
test('preparacion: App.jsx registra /preparacion con POS_VER_COLA_PREPARACION', async () => {
  const src = await leer('frontend/src/App.jsx');
  assert.match(src, /PreparacionPage/, 'importa PreparacionPage');
  assert.match(src, /path.*preparacion/, 'ruta path="preparacion"');
  assert.match(src, /POS_VER_COLA_PREPARACION/, 'protegida con permiso correcto');
});

// --- Estados del flujo FSM ---
test('preparacion: PreparacionPage define los 3 estados de la FSM de preparación', async () => {
  const src = await leer('frontend/src/modules/pos/PreparacionPage.jsx');
  assert.match(src, /ABIERTA/, 'estado ABIERTA');
  assert.match(src, /EN_PREPARACION/, 'estado EN_PREPARACION');
  assert.match(src, /LISTA/, 'estado LISTA');
  assert.match(src, /ENTREGADA/, 'acción ENTREGADA');
});

// --- Columnas kanban ---
test('preparacion: PreparacionPage muestra columnas kanban por estado', async () => {
  const src = await leer('frontend/src/modules/pos/PreparacionPage.jsx');
  assert.match(src, /COLUMNAS/, 'define COLUMNAS de kanban');
  assert.match(src, /columnas\[estado\]/, 'agrupa órdenes por estado');
});

// --- Polling automático ---
test('preparacion: PreparacionPage implementa polling automático', async () => {
  const src = await leer('frontend/src/modules/pos/PreparacionPage.jsx');
  assert.match(src, /setInterval/, 'usa setInterval para polling');
  assert.match(src, /clearInterval/, 'limpia el intervalo al desmontar');
  assert.match(src, /INTERVALO_POLLING|15.?000|15_000/, 'define intervalo de polling');
});

// --- Avanzar estado ---
test('preparacion: PreparacionPage permite avanzar el estado de una orden', async () => {
  const src = await leer('frontend/src/modules/pos/PreparacionPage.jsx');
  assert.match(src, /cambiarEstado/, 'llama cambiarEstado de la API');
  assert.match(src, /avanzar|onAvanzar/, 'función de avance definida');
  assert.match(src, /enProgreso/, 'maneja estado de carga por orden');
});

// --- Iconos lucide ---
test('preparacion: PreparacionPage importa todos los iconos que usa', async () => {
  const src = await leer('frontend/src/modules/pos/PreparacionPage.jsx');
  const importMatch = src.match(/import\s*\{([^}]+)\}\s*from\s*['"]lucide-react['"]/);
  assert.ok(importMatch, 'debe existir importación de lucide-react');
  const importados = new Set(
    importMatch[1]
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  );
  for (const icono of ['ChefHat', 'Clock', 'RefreshCw', 'AlertCircle', 'ArrowRight']) {
    assert.ok(importados.has(icono), `${icono} debe estar importado`);
  }
});

// --- Menu ---
test('preparacion: menu.js incluye la ruta de preparación con permiso correcto', async () => {
  const src = await leer('frontend/src/config/menu.js');
  assert.match(src, /\/preparacion/, 'ruta /preparacion en el menú');
  assert.match(src, /POS_VER_COLA_PREPARACION/, 'permiso correcto en el menú');
});
