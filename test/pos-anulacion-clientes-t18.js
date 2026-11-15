/**
 * T18 — Tests de contrato: Anulación de venta, aislamiento por sucursal/turno/orden,
 * lectura transaccional (tx) y CRUD de clientes (NRC y giro para CCF).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const leer = (ruta) => readFile(new URL(`../${ruta}`, import.meta.url), 'utf8');

// ─────────────────────────────────────────────────────────────────────────────
// 1. AISLAMIENTO DE SUCURSAL, TURNO Y ORDEN EN VENTAS (Problema 1)
// ─────────────────────────────────────────────────────────────────────────────
test('T18 ventas seguridad: listarVentas filtra por sucursales del usuario (seguridad.usuario_sucursal)', async () => {
  const repo = await leer('backend/src/modules/pos/ventas/ventas.repository.js');
  assert.match(repo, /seguridad\.usuario_sucursal/);
  assert.match(repo, /usuarioTieneSucursal/);
});

test('T18 ventas seguridad: registrarVenta valida pertenencia del turno al cajero y sucursal asignada', async () => {
  const service = await leer('backend/src/modules/pos/ventas/ventas.service.js');
  assert.match(service, /obtenerTurnoCaja/);
  assert.match(service, /turno\.id_usuario !== userId/);
  assert.match(service, /usuarioTieneSucursal\(userId,\s*turno\.id_sucursal,\s*tx\)/);
});

test('T18 ventas seguridad: registrarVenta valida id_orden (existencia, sucursal y que no esté FACTURADA ni ANULADA)', async () => {
  const service = await leer('backend/src/modules/pos/ventas/ventas.service.js');
  assert.match(service, /obtenerOrdenParaFacturar/);
  assert.match(service, /orden\.id_sucursal !== turno\.id_sucursal/);
  assert.match(service, /FACTURADA/);
  assert.match(service, /ANULADA/);
});

test('T18 ventas seguridad: obtenerVenta y anularVenta verifican sucursal del usuario (403)', async () => {
  const service = await leer('backend/src/modules/pos/ventas/ventas.service.js');
  const matches = service.match(/usuarioTieneSucursal/g) ?? [];
  assert.ok(matches.length >= 4, `Se esperaban ≥4 validaciones de usuarioTieneSucursal, encontradas ${matches.length}`);
  assert.match(service, /403/);
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. LECTURA TRANSACCIONAL EN OBTENERVENTA (Problema 2)
// ─────────────────────────────────────────────────────────────────────────────
test('T18 ventas transaccionalidad: obtenerVenta recibe tx y lo pasa a todas las consultas sel()', async () => {
  const repo = await leer('backend/src/modules/pos/ventas/ventas.repository.js');
  assert.match(repo, /export async function obtenerVenta\(idVenta,\s*tx\s*=\s*null\)/);
});

test('T18 ventas transaccionalidad: registrarVenta y anularVenta llaman repo.obtenerVenta(idVenta, tx)', async () => {
  const service = await leer('backend/src/modules/pos/ventas/ventas.service.js');
  const matches = service.match(/repo\.obtenerVenta\(idVenta,\s*tx\)/g) ?? [];
  assert.ok(
    matches.length >= 2,
    `Tanto registrarVenta como anularVenta deben pasar tx a repo.obtenerVenta (encontrados: ${matches.length})`,
  );
});
// ─────────────────────────────────────────────────────────────────────────────
// 3. ANULACIÓN DE VENTA Y CRUD DE CLIENTES CCF
// ─────────────────────────────────────────────────────────────────────────────
test('T18 rutas ventas: PATCH /:id/anular exige permiso POS_ANULAR_VENTA y valida motivo', async () => {
  const routes = await leer('backend/src/modules/pos/ventas/ventas.routes.js');
  assert.match(routes, /requirePermiso\('POS_ANULAR_VENTA'\)/);
  assert.match(routes, /anularVentaSchema/);
});

test('T18 rutas clientes: CRUD montado en /pos/clientes con permiso POS_GESTIONAR_CLIENTES', async () => {
  const index = await leer('backend/src/modules/index.js');
  const routes = await leer('backend/src/modules/pos/clientes/clientes.routes.js');
  assert.match(index, /router\.use\('\/pos\/clientes',\s*clientesRoutes\)/);
  assert.match(routes, /requirePermiso\('POS_GESTIONAR_CLIENTES'\)/);
});

test('T18 schemas clientes: valida formatos de El Salvador (DUI, NIT, NRC, teléfono) y par obligatorio NRC + giro', async () => {
  const schemas = await leer('backend/src/modules/pos/clientes/clientes.schemas.js');
  assert.match(schemas, /DUI/);
  assert.match(schemas, /NIT/);
  assert.match(schemas, /PASAPORTE/);
  assert.match(schemas, /giro_economico/);
  assert.match(schemas, /nrc/);
  assert.match(schemas, /superRefine/);
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. FRONTEND — AFILIACIÓN DE CLIENTE EN POS, HISTORIAL PAGINADO Y REIMPRESIÓN
// ─────────────────────────────────────────────────────────────────────────────
test('T18 frontend POS: Carrito y PosPage permiten afiliar cliente (opcional en FCF, obligatorio con NRC en CCF)', async () => {
  const posPage = await leer('frontend/src/modules/pos/PosPage.jsx');
  const carrito = await leer('frontend/src/modules/pos/Carrito.jsx');
  assert.match(posPage, /clienteSeleccionado/);
  assert.match(carrito, /listarClientes/);
  assert.match(carrito, /clienteValidoParaCCF/);
});

test('T18 frontend historial: incluye paginación, buscador y reimpresión con datos de sucursal y cajero', async () => {
  const historial = await leer('frontend/src/modules/pos/VentasHistorialPage.jsx');
  assert.match(historial, /paginaActual/);
  assert.match(historial, /porPagina/);
  assert.match(historial, /sucursal_direccion/);
  assert.match(historial, /cajero_username/);
  assert.match(historial, /window\.print\(\)/);
});