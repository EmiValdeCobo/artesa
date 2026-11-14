import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const leer = (archivo) => readFile(new URL(`../${archivo}`, import.meta.url), 'utf8');

test('inventario: rutas de insumos y productos separan PATCH estado de DELETE eliminar', async () => {
  const routes = await leer('backend/src/modules/inventario/inventario.routes.js');

  // Insumos: PATCH estado y activo dedicados + DELETE eliminar
  assert.match(routes, /router\.patch\('\/insumos\/:id\/estado', requirePermiso\('INV_GESTIONAR_INSUMOS'\), validate\(cambiarEstadoSchema\), asyncHandler\(c\.cambiarEstadoInsumo\)\)/);
  assert.match(routes, /router\.patch\('\/insumos\/:id\/activo', requirePermiso\('INV_GESTIONAR_INSUMOS'\)/);
  assert.match(routes, /router\.delete\('\/insumos\/:id', requirePermiso\('INV_GESTIONAR_INSUMOS'\), asyncHandler\(c\.eliminarInsumo\)\)/);

  // Productos: PATCH estado y activo dedicados + DELETE eliminar
  assert.match(routes, /router\.patch\('\/productos\/:id\/estado', requirePermiso\('INV_GESTIONAR_PRODUCTOS'\), validate\(cambiarEstadoSchema\), asyncHandler\(c\.cambiarEstadoProducto\)\)/);
  assert.match(routes, /router\.patch\('\/productos\/:id\/activo', requirePermiso\('INV_GESTIONAR_PRODUCTOS'\)/);
  assert.match(routes, /router\.delete\('\/productos\/:id', requirePermiso\('INV_GESTIONAR_PRODUCTOS'\), asyncHandler\(c\.eliminarProducto\)\)/);
});

test('inventario: repositorio y servicio separan alternancia de activo frente a soft-delete', async () => {
  const [repo, serv] = await Promise.all([
    leer('backend/src/modules/inventario/inventario.repository.js'),
    leer('backend/src/modules/inventario/inventario.service.js'),
  ]);

  // Repositorio
  assert.match(repo, /export const cambiarEstadoInsumo = async[\s\S]*row\.update\(\{ activo \}/);
  assert.match(repo, /export const eliminarInsumo = async[\s\S]*row\.update\(\{ deleted_at: new Date\(\) \}/);
  assert.match(repo, /export const cambiarEstadoProducto = async[\s\S]*row\.update\(\{ activo \}/);
  assert.match(repo, /export const eliminarProducto = async[\s\S]*row\.update\(\{ deleted_at: new Date\(\) \}/);

  // Consultas administrativas filtran WHERE deleted_at IS NULL
  assert.match(repo, /FROM inventario\.insumos i[\s\S]*WHERE i\.deleted_at IS NULL/);
  assert.match(repo, /FROM inventario\.productos p[\s\S]*WHERE p\.deleted_at IS NULL/);

  // Búsqueda excluye eliminados
  assert.match(repo, /buscarInsumo = \(id, transaction\) => Insumo\.findOne\(\{ where: \{ id_insumo: id, deleted_at: null \}/);
  assert.match(repo, /buscarProducto = \(id, transaction\) => Producto\.findOne\(\{ where: \{ id_producto: id, deleted_at: null \}/);

  // Servicio
  assert.match(serv, /export const cambiarEstadoInsumo =/);
  assert.match(serv, /export const eliminarInsumo =/);
  assert.match(serv, /export const cambiarEstadoProducto =/);
  assert.match(serv, /export const eliminarProducto =/);
});

test('inventario: recetas conservan insumos inactivos históricos con alerta visual y bloquean nuevos inactivos', async () => {
  const [serv, repo, recetasUi] = await Promise.all([
    leer('backend/src/modules/inventario/inventario.service.js'),
    leer('backend/src/modules/inventario/inventario.repository.js'),
    leer('frontend/src/modules/inventario/EditorRecetasPage.jsx'),
  ]);

  // Receta actual expone insumo_activo y filtra deleted_at
  assert.match(repo, /i\.activo AS insumo_activo/);
  assert.match(repo, /WHERE r\.id_producto = \$1 AND i\.deleted_at IS NULL/);

  // Backend: permite conservar insumo inactivo en receta previa, pero rechaza agregar uno nuevo inactivo
  assert.match(serv, /const idsPrevios = new Set\(recetaPrevia\.map/);
  assert.match(serv, /if \(!idsPrevios\.has\(Number\(c\.idInsumo\)\) && !i\.activo\)/);
  assert.match(serv, /No se puede agregar el insumo "\$\{i\.nombre\}" porque está inactivo/);

  // Frontend: alerta visual para receta con insumos inactivos
  assert.match(recetasUi, /Esta receta contiene ingredientes temporalmente inactivos/);
  assert.match(recetasUi, /Insumo inactivo/);
});

test('inventario: frontend API y catálogos diferencian control de estado vs botón eliminar', async () => {
  const [api, insumosUi, productosUi] = await Promise.all([
    leer('frontend/src/modules/inventario/inventarioApi.js'),
    leer('frontend/src/modules/inventario/CatalogoInsumosPage.jsx'),
    leer('frontend/src/modules/inventario/CatalogoProductosPage.jsx'),
  ]);

  // inventarioApi expone endpoints de cambio de estado y eliminación
  assert.match(api, /cambiarEstadoInsumo\s*=\s*\(id,\s*activo\)\s*=>\s*api\.patch\(`\/inventario\/insumos\/\$\{id\}\/estado`/);
  assert.match(api, /cambiarEstadoProducto\s*=\s*\(id,\s*activo\)\s*=>\s*api\.patch\(`\/inventario\/productos\/\$\{id\}\/estado`/);
  assert.match(api, /deleteInsumo\s*=\s*\(id\)\s*=>\s*api\.delete\(`\/inventario\/insumos\/\$\{id\}`\)/);
  assert.match(api, /deleteProducto\s*=\s*\(id\)\s*=>\s*api\.delete\(`\/inventario\/productos\/\$\{id\}`\)/);

  // Insumos UI: acciones separadas y filtro Todos / Activos / Inactivos
  assert.match(insumosUi, /handleToggleEstado/);
  assert.match(insumosUi, /handleEliminarInsumo/);
  assert.match(insumosUi, /title="Eliminar insumo"/);
  assert.match(insumosUi, /filtroEstado/);
  assert.match(insumosUi, />\s*Todos\s*</);
  assert.match(insumosUi, />\s*Activos\s*</);
  assert.match(insumosUi, />\s*Inactivos\s*</);

  // Productos UI: acciones separadas en tabla y tarjetas + filtro Todos / Activos / Inactivos
  assert.match(productosUi, /handleToggleEstado/);
  assert.match(productosUi, /handleEliminarProducto/);
  assert.match(productosUi, /title="Eliminar producto"/);
  assert.match(productosUi, /filtroEstado/);
  assert.match(productosUi, />\s*Todos\s*</);
  assert.match(productosUi, />\s*Activos\s*</);
  assert.match(productosUi, />\s*Inactivos\s*</);
});

test('inventario: migración 009 asegura índices parciales y consistencia de ventas operativas', async () => {
  const migracion = await leer('database/migrations/009_inventario_activo_soft_delete.sql');

  assert.match(migracion, /uq_insumos_nombre_activos[\s\S]*WHERE deleted_at IS NULL/);
  assert.match(migracion, /uq_productos_nombre_activos[\s\S]*WHERE deleted_at IS NULL/);
  assert.match(migracion, /JOIN inventario\.productos p ON p\.id_producto = i\.id_producto AND p\.activo AND p\.deleted_at IS NULL/);
  assert.match(migracion, /CREATE OR REPLACE VIEW reportes\.vw_alertas_stock[\s\S]*WHERE i\.activo AND i\.deleted_at IS NULL/);
  assert.match(migracion, /CREATE OR REPLACE VIEW reportes\.vw_costo_margen_producto[\s\S]*WHERE p\.deleted_at IS NULL/);
});
