// test/frontend-pos-sucursal-n1.test.js
// Validación de corrección de sucursal fija y eliminación de N+1 en POS
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const raiz = join(import.meta.dirname, '..');
const leer = (rel) => readFile(join(raiz, rel), 'utf8');

test('posApi: no tiene sucursal fija hardcodeada (SUCURSAL_POR_DEFECTO eliminada)', async () => {
  const src = await leer('frontend/src/modules/pos/posApi.js');
  assert.doesNotMatch(src, /SUCURSAL_POR_DEFECTO/, 'No debe existir SUCURSAL_POR_DEFECTO fija');
  assert.match(src, /export async function obtenerProductos\(idSucursal\s*=/, 'obtenerProductos debe aceptar idSucursal');
});

test('posApi: filtra el stock por idSucursal y no hace peticiones N+1 de recetas', async () => {
  const src = await leer('frontend/src/modules/pos/posApi.js');
  // Consulta stock con parámetro
  assert.match(src, /\/stock\$\{queryStock\}/, 'debe consultar stock con idSucursal opcional');
  // Consulta bulk de recetas
  assert.match(src, /\/recetas/, 'debe consultar /recetas en lote');
  // NO debe hacer peticiones N+1 mapeando receta por cada producto elaborado
  assert.doesNotMatch(
    src,
    /activos\.map\(\(p\)\s*=>\s*\(p\.es_elaborado\s*\?\s*api\.get\(`\$\{BASE\}\/productos\/\$\{p\.id_producto\}\/receta`\)/,
    'No debe realizar N+1 peticiones individuales de recetas en el flujo principal',
  );
});

test('inventario backend: expone GET /api/inventario/recetas protegido por INV_VER_STOCK', async () => {
  const routes = await leer('backend/src/modules/inventario/inventario.routes.js');
  const repo = await leer('backend/src/modules/inventario/inventario.repository.js');
  const service = await leer('backend/src/modules/inventario/inventario.service.js');

  assert.match(routes, /router\.get\('\/recetas',.*requirePermiso\(.*INV_VER_STOCK/, 'Ruta /recetas debe existir y requerir INV_VER_STOCK');
  assert.match(service, /export const listarRecetas\s*=/, 'service debe exponer listarRecetas');
  assert.match(repo, /export const listarTodasLasRecetas\s*=/, 'repository debe exponer listarTodasLasRecetas');
});

test('PosPage: sincroniza sucursal con turno de caja activo o selector de sucursales del usuario', async () => {
  const src = await leer('frontend/src/modules/pos/PosPage.jsx');
  assert.match(src, /cajaApi\.obtenerTurnoActual\(\)/, 'debe consultar turno activo para obtener sucursal del cajero');
  assert.match(src, /obtenerProductos\(idSucursal\)/, 'debe pasar idSucursal a obtenerProductos');
  assert.match(src, /Seleccionar sucursal/, 'debe permitir cambiar de sucursal si el usuario tiene varias asignadas');
});
