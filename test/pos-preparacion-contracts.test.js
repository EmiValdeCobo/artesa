import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { cambiarEstadoSchema, filtrosColaSchema } from '../backend/src/modules/pos/preparacion/preparacion.schemas.js';

const leer = (archivo) => readFile(new URL(`../${archivo}`, import.meta.url), 'utf8');
const prep = (archivo) => leer(`backend/src/modules/pos/preparacion/${archivo}`);

// ─────────────────────────────────────────────────────────────────────────────
// 1. RUTAS Y PERMISOS DE PREPARACIÓN
// ─────────────────────────────────────────────────────────────────────────────
test('preparación: rutas protegidas con authenticate, requireTipo(admin) y POS_VER_COLA_PREPARACION', async () => {
  const routes = await prep('preparacion.routes.js');
  assert.match(routes, /router\.use\(authenticate,\s*requireTipo\('admin'\),\s*requirePermiso\('POS_VER_COLA_PREPARACION'\)\)/);
  assert.match(routes, /router\.get\('\/cola'/);
  assert.match(routes, /router\.patch\('\/ordenes\/:idOrden\/estado'/);
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. SCHEMAS ZOD
// ─────────────────────────────────────────────────────────────────────────────
test('preparación schemas: cambiarEstadoSchema solo permite estados hacia adelante', () => {
  assert.doesNotThrow(() => cambiarEstadoSchema.parse({ estado: 'EN_PREPARACION' }));
  assert.doesNotThrow(() => cambiarEstadoSchema.parse({ estado: 'LISTA' }));
  assert.doesNotThrow(() => cambiarEstadoSchema.parse({ estado: 'ENTREGADA' }));

  // Preparación no puede anular ni facturar directamente
  assert.throws(() => cambiarEstadoSchema.parse({ estado: 'FACTURADA' }));
  assert.throws(() => cambiarEstadoSchema.parse({ estado: 'ANULADA' }));
  assert.throws(() => cambiarEstadoSchema.parse({ estado: 'ABIERTA' }));
});

test('preparación schemas: filtrosColaSchema valida idSucursal positivo opcional', () => {
  assert.doesNotThrow(() => filtrosColaSchema.parse({}));
  assert.equal(filtrosColaSchema.parse({ idSucursal: '5' }).idSucursal, 5);
  assert.throws(() => filtrosColaSchema.parse({ idSucursal: '-1' }));
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. SERVICE Y REPOSITORY
// ─────────────────────────────────────────────────────────────────────────────
test('preparación service: FSM estricta y bloqueo de concurrencia con transacción', async () => {
  const service = await prep('preparacion.service.js');
  assert.match(service, /ABIERTA:\s*\['EN_PREPARACION'\]/);
  assert.match(service, /EN_PREPARACION:\s*\['LISTA'\]/);
  assert.match(service, /LISTA:\s*\['ENTREGADA'\]/);
  assert.match(service, /withTransaction/);
  assert.match(service, /bloquearOrden/);
  assert.match(service, /usuarioTieneSucursal/);
});

test('preparación repository: usa FOR UPDATE OF o para prevenir condiciones de carrera', async () => {
  const repo = await prep('preparacion.repository.js');
  assert.match(repo, /FOR UPDATE OF o/);
  assert.match(repo, /JOIN empresa\.sucursales s ON s\.id_sucursal = c\.id_sucursal/);
});
