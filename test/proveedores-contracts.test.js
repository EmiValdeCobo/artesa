import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { idProveedorSchema, listarProveedoresSchema, proveedorSchema } from '../backend/src/modules/compras/proveedores/proveedores.schemas.js';

const leer = (archivo) => readFile(new URL(`../${archivo}`, import.meta.url), 'utf8');
const base = {
  razonSocial: '  Distribuidora La Central  ',
  nrc: '  NRC-123  ',
  nit: '  0614-123456-123-1  ',
  diasCredito: '30',
};

test('proveedores: normaliza espacios y transforma datos del body al formato de base de datos', () => {
  assert.deepEqual(proveedorSchema.parse(base), {
    razon_social: 'Distribuidora La Central',
    nrc: 'NRC-123',
    nit: '0614-123456-123-1',
    contacto: null,
    telefono: null,
    dias_credito: 30,
  });
});

test('proveedores: rechaza body incompleto, textos sobre límite y días no enteros/negativos/vacíos', () => {
  assert.throws(() => proveedorSchema.parse({ ...base, nit: undefined }));
  assert.throws(() => proveedorSchema.parse({ ...base, razonSocial: 'x'.repeat(151) }));
  for (const diasCredito of [-1, 1.5, '', '1.2']) {
    assert.throws(() => proveedorSchema.parse({ ...base, diasCredito }));
  }
});

test('proveedores: valida ID positivo y filtro opcional booleano', () => {
  assert.equal(idProveedorSchema.parse({ id: '12' }).id, 12);
  assert.throws(() => idProveedorSchema.parse({ id: 'abc' }));
  assert.throws(() => idProveedorSchema.parse({ id: '0' }));
  assert.equal(listarProveedoresSchema.parse({ activo: 'false' }).activo, false);
  assert.equal(listarProveedoresSchema.parse({}).activo, undefined);
  assert.throws(() => listarProveedoresSchema.parse({ activo: 'si' }));
});

test('proveedores: rutas requieren autenticación, tipo admin y permiso en los cuatro verbos', async () => {
  const routes = await leer('backend/src/modules/compras/proveedores/proveedores.routes.js');
  assert.match(routes, /router\.use\(authenticate, requireTipo\('admin'\)\)/);
  assert.equal((routes.match(/requirePermiso\('COM_GESTIONAR_PROVEEDORES'\)/g) ?? []).length, 4);
  for (const verb of ['get', 'post', 'put', 'delete']) assert.match(routes, new RegExp(`router\\.${verb}\\('/proveedores`));
});

test('proveedores: registro global usa solo la base /api/compras', async () => {
  const index = await leer('backend/src/modules/index.js');
  const compras = await leer('backend/src/modules/compras/compras.routes.js');
  assert.match(index, /router\.use\('\/compras', comprasRoutes\)/);
  assert.match(compras, /router\.use\(proveedoresRoutes\)/);
  assert.doesNotMatch(index, /router\.use\('\/proveedores'/);
});

test('proveedores: repository limita acceso a la tabla, parametriza SQL y omite eliminados', async () => {
  const repository = await leer('backend/src/modules/compras/proveedores/proveedores.repository.js');
  assert.match(repository, /compras\.proveedores/);
  assert.match(repository, /deleted_at IS NULL/);
  assert.match(repository, /ORDER BY razon_social ASC, id_proveedor ASC/);
  assert.match(repository, /FOR UPDATE/);
  assert.match(repository, /bind,/);
  assert.doesNotMatch(repository, /SELECT \*/i);
  assert.doesNotMatch(repository, /DELETE FROM/i);
  assert.doesNotMatch(repository, /compras\.(?!proveedores)/);
});

test('proveedores: escrituras transaccionales pasan userId a withTransaction', async () => {
  const service = await leer('backend/src/modules/compras/proveedores/proveedores.service.js');
  assert.match(service, /withTransaction/);
  assert.match(service, /repo\.crearProveedor\(datos, transaction\)[\s\S]*?userId/);
  assert.match(service, /repo\.actualizarProveedor\(id, datos, transaction\)[\s\S]*?userId/);
  assert.match(service, /repo\.desactivarProveedor\(id, transaction\)[\s\S]*?userId/);
  assert.match(service, /Proveedor no encontrado', 404/);
  assert.match(service, /ya está inactivo', 409/);
});

test('proveedores: la desactivación es lógica y conserva la FK de facturas', async () => {
  const repository = await leer('backend/src/modules/compras/proveedores/proveedores.repository.js');
  const dbMap = await leer('docs/ai/DB_MAP.md');
  const migration = await leer('database/migrations/008_compras_bitacora_proveedores.sql');
  assert.match(repository, /SET activo = false/);
  assert.match(dbMap, /facturas_compra\(id_compra U, id_proveedor/);
  assert.match(migration, /AFTER INSERT OR UPDATE OR DELETE ON compras\.proveedores/);
  assert.match(migration, /seguridad\.fn_auditar\(\)/);
});

test('proveedores: endpoints y decisión NRC/NIT quedan documentados para frontend', async () => {
  const endpoints = await leer('docs/endpoints.md');
  const page = await leer('frontend/src/App.jsx');
  assert.match(endpoints, /GET\/POST \| `\/api\/compras\/proveedores`/);
  assert.match(endpoints, /no se impone unicidad a NRC\/NIT/);
  assert.match(page, /GET\/POST \/api\/compras\/proveedores/);
  assert.doesNotMatch(page, /GET\/POST \/api\/proveedores/);
});

test('proveedores: la migración de bitácora es idempotente y schema inicial no agrega RBAC', async () => {
  const migration = await leer('database/migrations/008_compras_bitacora_proveedores.sql');
  assert.match(migration, /IF NOT EXISTS/);
  assert.match(migration, /trg_aud_proveedores/);
  assert.doesNotMatch(migration, /INSERT INTO seguridad\.permisos/i);
  assert.doesNotMatch(migration, /ALTER TABLE compras\.proveedores/i);
});

test('proveedores: listado consume el filtro validado y conserva el status 200', async () => {
  const controller = await leer('backend/src/modules/compras/proveedores/proveedores.controller.js');
  const routes = await leer('backend/src/modules/compras/proveedores/proveedores.routes.js');
  assert.match(routes, /validateQuery, asyncHandler\(controller\.listarProveedores\)/);
  assert.match(controller, /service\.listarProveedores\(req\.validatedQuery\.activo\)/);
  assert.match(controller, /res\.json\(/);
});

test('proveedores: create devuelve 201 y update devuelve el objeto actualizado con 200', async () => {
  const controller = await leer('backend/src/modules/compras/proveedores/proveedores.controller.js');
  assert.match(controller, /res\.status\(201\)\.json\(await service\.crearProveedor/);
  assert.match(controller, /res\.json\(await service\.actualizarProveedor/);
});

test('proveedores: rutas validan ID antes de editar y desactivar', async () => {
  const routes = await leer('backend/src/modules/compras/proveedores/proveedores.routes.js');
  assert.match(routes, /put\('\/proveedores\/:id',[^\n]*validateId, validate\(proveedorSchema\)/);
  assert.match(routes, /delete\('\/proveedores\/:id',[^\n]*validateId/);
  assert.match(routes, /req\.validatedParams = resultado\.data/);
});

test('proveedores: la respuesta de DELETE es 204 sin cuerpo', async () => {
  const controller = await leer('backend/src/modules/compras/proveedores/proveedores.controller.js');
  assert.match(controller, /res\.status\(204\)\.end\(\)/);
});

test('proveedores: el servicio distingue eliminados de inactivos y no permite editar soft-deleted', async () => {
  const service = await leer('backend/src/modules/compras/proveedores/proveedores.service.js');
  assert.equal((service.match(/actual\.deleted_at/g) ?? []).length, 2);
  assert.match(service, /ya está inactivo', 409/);
});
