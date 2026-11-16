import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const leer = (archivo) => readFile(new URL(`../${archivo}`, import.meta.url), 'utf8');

test('P2.1 bitácora: implementa AbortController y debounce en carga de lista y métricas', async () => {
  const codigo = await leer('frontend/src/modules/seguridad/BitacoraPage.jsx');
  assert.match(codigo, /abortListaRef\s*=\s*useRef\(null\)/);
  assert.match(codigo, /abortMetricasRef\s*=\s*useRef\(null\)/);
  assert.match(codigo, /new AbortController\(\)/);
  assert.match(codigo, /controller\.signal/);
  assert.match(codigo, /api\.get\(`\/bitacora\?\${params}`,\s*\{\s*signal\s*\}\)/);
  assert.match(codigo, /api\.get\(`\/bitacora\/metricas\?\${new URLSearchParams\(periodo\)}`,\s*\{\s*signal\s*\}\)/);
  assert.match(codigo, /setTimeout\(\(\)\s*=>\s*consultaLista\(controller\.signal\),\s*250\)/);
  assert.match(codigo, /setTimeout\(\(\)\s*=>\s*consultaMetricas\(controller\.signal\),\s*350\)/);
  assert.match(codigo, /const consultaLista\s*=\s*useCallback\(/);
  assert.match(codigo, /const consultaMetricas\s*=\s*useCallback\(/);
  assert.match(codigo, /},\s*\[consultaLista\]\);/);
  assert.match(codigo, /},\s*\[consultaMetricas\]\);/);
});

test('P2.2 inventario: guardarReceta implementa lógica de diffing en lugar de destroy masivo', async () => {
  const repo = await leer('backend/src/modules/inventario/inventario.repository.js');
  // Verifica que busca existentes y calcula diferencias
  assert.match(repo, /export const guardarReceta = async\s*\(id,\s*componentes,\s*transaction\)\s*=>/);
  assert.match(repo, /Receta\.findAll\(\{\s*where:\s*\{\s*id_producto:\s*id\s*\},\s*transaction\s*\}\)/);
  assert.match(repo, /const paraEliminar = existentes\.filter/);
  assert.match(repo, /Receta\.destroy\(\{\s*where:\s*\{\s*id_producto:\s*id,\s*id_insumo:\s*idsEliminar\s*\}\s*,\s*transaction\s*\}\)/);
  assert.match(repo, /existente\.update\(\{\s*cantidad_requerida:\s*comp\.cantidadRequerida\s*\}/);
  assert.match(repo, /Receta\.create\(\{/);
});

test('P2.3 inventario: EditorRecetasPage incluye guard de confirmación antes de salir', async () => {
  const editor = await leer('frontend/src/modules/inventario/EditorRecetasPage.jsx');
  assert.match(editor, /const handleVolver = async \(\) =>/);
  assert.match(editor, /if \(hayCambios\)/);
  assert.match(editor, /confirm\(\s*['"]Tienes cambios sin guardar/);
  assert.match(editor, /onClick=\{handleVolver\}/);
});

test('P2.4 inventario: eliminado el residuo || true en filtros de catálogos', async () => {
  const [insumos, productos] = await Promise.all([
    leer('frontend/src/modules/inventario/CatalogoInsumosPage.jsx'),
    leer('frontend/src/modules/inventario/CatalogoProductosPage.jsx'),
  ]);

  assert.doesNotMatch(insumos, /mostrarInactivos \|\| true/);
  assert.doesNotMatch(productos, /mostrarInactivos \|\| true/);
  assert.match(insumos, /mostrarInactivos \? true : ins\.activo !== false/);
  assert.match(productos, /mostrarInactivos \? true : p\.activo !== false/);
});

test('P2.4 accesibilidad: botones de acción con iconos tienen etiquetas aria-label', async () => {
  const [insumos, productos, editor] = await Promise.all([
    leer('frontend/src/modules/inventario/CatalogoInsumosPage.jsx'),
    leer('frontend/src/modules/inventario/CatalogoProductosPage.jsx'),
    leer('frontend/src/modules/inventario/EditorRecetasPage.jsx'),
  ]);

  // Insumos
  assert.match(insumos, /etiqueta=\{`Ver existencias de \$\{fila\.nombre\}`\}/);
  assert.match(insumos, /etiqueta=\{`Editar insumo \$\{fila\.nombre\}`\}/);
  assert.match(insumos, /etiqueta=\{`Eliminar insumo \$\{fila\.nombre\}`\}/);

  // Productos
  assert.match(productos, /etiqueta=\{`Editar producto \$\{p\.nombre\}`\}/);
  assert.match(productos, /etiqueta=\{`Eliminar producto \$\{p\.nombre\}`\}/);

  // Editor
  assert.match(editor, /aria-label=\{`Quitar ingrediente \$\{c\.insumo \|\| c\.nombre_insumo \|\| ''\}`\}/);
});
