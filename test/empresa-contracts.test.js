import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { aperturaSchema, sucursalSchema, parametroSchema } from '../backend/src/modules/empresa/empresa.schemas.js';

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
  assert.equal(matches.length, 6, 'Se esperaban 6 endpoints de sucursales con EMP_GESTIONAR_SUCURSALES (GET, POST, PUT, PATCH y apertura GET/POST)');
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

// ─────────────────────────────────────────────────────────────────────────────
// 5. APERTURA DE SUCURSAL Y MÁSCARAS
// ─────────────────────────────────────────────────────────────────────────────
test('empresa schema: teléfono acepta 8 dígitos con o sin guion y se guarda con máscara 2222-3333', () => {
  const base = { codigoEstablecimiento: 'S001', nombre: 'Café', direccion: 'Calle 1', departamento: 'San Salvador' };
  assert.equal(sucursalSchema.parse({ ...base, telefono: '22223333' }).telefono, '2222-3333');
  assert.equal(sucursalSchema.parse({ ...base, telefono: '' }).telefono, null);
  assert.throws(() => sucursalSchema.parse({ ...base, telefono: '2222-333' }));
  assert.throws(() => sucursalSchema.parse({ ...base, telefono: '(503) 2222' }));
});

test('empresa schema: aperturaSchema exige enteros (mínimo > 0, carga ≥ 0) y sin insumos repetidos', () => {
  const ok = aperturaSchema.parse({ items: [{ idInsumo: 1, stockMinimo: '5', cantidadInicial: '10' }] });
  assert.deepEqual(ok.items[0], { idInsumo: 1, stockMinimo: 5, cantidadInicial: 10 });
  assert.throws(() => aperturaSchema.parse({ items: [] }));
  assert.throws(() => aperturaSchema.parse({ items: [{ idInsumo: 1, stockMinimo: 0 }] }));
  assert.throws(() => aperturaSchema.parse({ items: [{ idInsumo: 1, stockMinimo: '1.5' }] }));
  assert.throws(() => aperturaSchema.parse({ items: [{ idInsumo: 1, stockMinimo: 2 }, { idInsumo: 1, stockMinimo: 3 }] }));
});

test('empresa service: crear sucursal asigna a los ADMIN activos y la apertura usa fn_mover_stock en transacción', async () => {
  const [service, repo] = await Promise.all([emp('empresa.service.js'), emp('empresa.repository.js')]);
  assert.match(service, /crearSucursal\s*=.*asignarAdministradores/);
  assert.match(repo, /r\.nombre = 'ADMIN' AND u\.activo AND u\.deleted_at IS NULL/);
  assert.match(service, /registrarApertura\s*=.*withTransaction/);
  assert.match(repo, /inventario\.fn_mover_stock\(\$1,\$2,\$3,'INVENTARIO_INICIAL'/);
});
