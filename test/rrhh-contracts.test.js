import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { empleadoSchema } from '../backend/src/modules/rrhh/rrhh.schemas.js';

const leer = (archivo) => readFile(new URL(`../${archivo}`, import.meta.url), 'utf8');

test('rrhh: expone CRUD protegido para puestos y empleados', async () => {
  const routes = await leer('backend/src/modules/rrhh/rrhh.routes.js');
  assert.match(routes, /authenticate, requireTipo\('admin'\), requirePermiso\('RRHH_GESTIONAR_EMPLEADOS'\)/);
  assert.match(routes, /router\.post\('\/puestos'/);
  assert.match(routes, /router\.put\('\/empleados\/:id'/);
  assert.match(routes, /router\.delete\('\/empleados\/:id'/);
});

test('rrhh: valida identidad, salarios, DUI y referencias', async () => {
  const schemas = await leer('backend/src/modules/rrhh/rrhh.schemas.js');
  const service = await leer('backend/src/modules/rrhh/rrhh.service.js');
  assert.match(schemas, /El DUI debe tener el formato/);
  assert.match(schemas, /El salario debe ser mayor a cero/);
  assert.match(schemas, /z\.string\(\)\.uuid/);
  assert.match(service, /La sucursal no existe o está inactiva/);
  assert.match(service, /El puesto no existe o está inactivo/);
});

test('rrhh: las escrituras usan transacciones y el borrado es lógico', async () => {
  const service = await leer('backend/src/modules/rrhh/rrhh.service.js');
  const repository = await leer('backend/src/modules/rrhh/rrhh.repository.js');
  const migration = await leer('database/migrations/006_rrhh_empleados_puestos.sql');
  assert.match(service, /withTransaction/);
  assert.match(repository, /activo: false/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS activo/);
  assert.match(migration, /Encargado de Compras/);
});

test('rrhh: acepta NIT nulo o vacío cuando está homologado con el DUI', () => {
  const base = {
    idSucursal: 1,
    idPuesto: 1,
    nombres: 'Ana',
    apellidos: 'Prueba',
    dui: '12345678-9',
    fechaIngreso: '2025-01-15',
    salarioNominal: '500.00',
  };
  assert.equal(empleadoSchema.parse({ ...base }).nit, null);
  assert.equal(empleadoSchema.parse({ ...base, nit: null }).nit, null);
  assert.equal(empleadoSchema.parse({ ...base, nit: '   ' }).nit, null);
  assert.equal(empleadoSchema.parse({ ...base, nit: '0614-010190-101-1' }).nit, '0614-010190-101-1');
  assert.throws(() => empleadoSchema.parse({ ...base, nit: '12345678-9' }));
});
