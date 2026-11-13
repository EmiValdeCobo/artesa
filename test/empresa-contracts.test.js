import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { sucursalSchema, parametroSchema } from '../backend/src/modules/empresa/empresa.schemas.js';

const leer = (archivo) => readFile(new URL(`../${archivo}`, import.meta.url), 'utf8');
const emp = (archivo) => leer(`backend/src/modules/empresa/${archivo}`);

// ─────────────────────────────────────────────────────────────────────────────
// 1. RUTAS Y PERMISOS
// ─────────────────────────────────────────────────────────────────────────────
test('empresa: rutas protegidas globalmente con authenticate y requireTipo(admin)', async () => {
  const routes = await emp('empresa.routes.js');
  assert.match(routes, /router\.use\(authenticate,\s*requireTipo\('admin'\)\)/);
});

test('empresa: sucursales exige EMP_GESTIONAR_SUCURSALES en todos sus verbos', async () => {
  const routes = await emp('empresa.routes.js');
  const matches = routes.match(/requirePermiso\('EMP_GESTIONAR_SUCURSALES'\)/g) ?? [];
  assert.equal(matches.length, 4, 'Se esperaban 4 endpoints de sucursales con EMP_GESTIONAR_SUCURSALES (GET, POST, PUT, PATCH)');
});

test('empresa: parámetros exige EMP_EDITAR_PARAMETROS en lectura y escritura', async () => {
  const routes = await emp('empresa.routes.js');
  const matches = routes.match(/requirePermiso\('EMP_EDITAR_PARAMETROS'\)/g) ?? [];
  assert.equal(matches.length, 2, 'Se esperaban 2 endpoints de parámetros con EMP_EDITAR_PARAMETROS (GET, PUT)');
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. SCHEMAS ZOD
// ─────────────────────────────────────────────────────────────────────────────
test('empresa schema: sucursalSchema valida código de 4 caracteres alfanuméricos y lo convierte a mayúsculas', () => {
  const ok = sucursalSchema.parse({
    codigoEstablecimiento: 's001',
    nombre: 'Sucursal Escalón',
    direccion: 'Paseo General Escalón',
    departamento: 'San Salvador',
    telefono: '2222-3333',
    activa: true,
  });
  assert.equal(ok.codigoEstablecimiento, 'S001');

  // Inválidos: menos o más de 4 caracteres, caracteres especiales
  assert.throws(() => sucursalSchema.parse({ codigoEstablecimiento: 'S01', nombre: 'A', direccion: 'B', departamento: 'C' }));
  assert.throws(() => sucursalSchema.parse({ codigoEstablecimiento: 'S0001', nombre: 'A', direccion: 'B', departamento: 'C' }));
  assert.throws(() => sucursalSchema.parse({ codigoEstablecimiento: 'S-01', nombre: 'A', direccion: 'B', departamento: 'C' }));
});

test('empresa schema: sucursalSchema exige nombre mínimo 2 y departamento mínimo 2', () => {
  assert.throws(() => sucursalSchema.parse({ codigoEstablecimiento: 'S001', nombre: 'A', direccion: 'Calle 1', departamento: 'San Salvador' }));
  assert.throws(() => sucursalSchema.parse({ codigoEstablecimiento: 'S001', nombre: 'Café', direccion: 'Calle 1', departamento: 'S' }));
});

test('empresa schema: parametroSchema valida clave y valor no vacíos', () => {
  const res = parametroSchema.parse({ clave: 'iva_porcentaje', valor: '13' });
  assert.equal(res.clave, 'iva_porcentaje');
  assert.equal(res.valor, '13');

  assert.throws(() => parametroSchema.parse({ clave: '', valor: '13' }));
  assert.throws(() => parametroSchema.parse({ clave: 'test', valor: '' }));
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. SERVICE Y TRANSACCIONES
// ─────────────────────────────────────────────────────────────────────────────
test('empresa service: todas las mutaciones usan withTransaction y pasan userId', async () => {
  const service = await emp('empresa.service.js');
  const matches = service.match(/withTransaction/g) ?? [];
  assert.ok(matches.length >= 4, `Se esperaban >=4 usos de withTransaction, encontrados ${matches.length}`);
  assert.match(service, /crearSucursal\s*=.*withTransaction\(.*,\s*uid\)/);
  assert.match(service, /actualizarSucursal\s*=.*withTransaction\(.*,\s*uid\)/);
  assert.match(service, /cambiarEstadoSucursal\s*=.*withTransaction\(.*,\s*uid\)/);
  assert.match(service, /actualizarParametro\s*=.*withTransaction\(.*,\s*uid\)/);
});

test('empresa service: captura error de unicidad (23505) y lanza AppError 409', async () => {
  const service = await emp('empresa.service.js');
  assert.match(service, /code === '23505'/);
  assert.match(service, /409/);
  assert.match(service, /El código de establecimiento ya está registrado/);
});

test('empresa service: sucursal o parámetro inexistente lanza AppError 404', async () => {
  const service = await emp('empresa.service.js');
  assert.match(service, /Sucursal no encontrada.*404|404.*Sucursal no encontrada/s);
  assert.match(service, /Parámetro no encontrado.*404|404.*Parámetro no encontrado/s);
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. REPOSITORY Y CONTROLLER
// ─────────────────────────────────────────────────────────────────────────────
test('empresa repository: consultas usan bind parameters ($1, $2) sin concatenación insegura', async () => {
  const repo = await emp('empresa.repository.js');
  assert.match(repo, /\$1/);
  assert.match(repo, /\$2/);
  assert.doesNotMatch(repo, /`[^`]*\$\{(?:d\.|id|clave|valor)[^`]*`/);
  assert.match(repo, /RETURNING \*/);
});

test('empresa controller: crearSucursal responde con código 201', async () => {
  const controller = await emp('empresa.controller.js');
  assert.match(controller, /res\.status\(201\)\.json/);
});
