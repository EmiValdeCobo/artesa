import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const leer = (archivo) => readFile(new URL(`../${archivo}`, import.meta.url), 'utf8');

test('inventario: el kardex conserva autenticación admin y usa INV_VER_KARDEX', async () => {
  const routes = await leer('backend/src/modules/inventario/inventario.routes.js');
  assert.match(routes, /router\.use\(authenticate, requireTipo\('admin'\)\)/);
  assert.match(routes, /router\.get\('\/movimientos', requirePermiso\('INV_VER_KARDEX'\)/);
  assert.match(routes, /router\.get\('\/stock', requirePermiso\('INV_VER_STOCK'\)/);
  assert.match(routes, /router\.get\('\/alertas', requirePermiso\('INV_VER_STOCK'\)/);
});

test('inventario: el seeder asigna el kardex solo a roles autorizados y restringe costos de BODEGUERO', async () => {
  const seeder = await leer('database/seeders/003_inventario_kardex.sql');
  assert.match(seeder, /'INV_VER_KARDEX'[\s\S]*ON CONFLICT \(codigo\) DO NOTHING/);
  assert.match(seeder, /r\.nombre IN \('ADMIN', 'GERENTE_SUCURSAL', 'BODEGUERO'\)/);
  assert.match(seeder, /ON CONFLICT DO NOTHING/);
  assert.match(seeder, /r\.nombre NOT IN \('ADMIN', 'GERENTE_SUCURSAL', 'BODEGUERO'\)/);
  const quitarCostos = seeder.slice(seeder.lastIndexOf('DELETE FROM'));
  assert.ok(quitarCostos);
  assert.match(quitarCostos, /p\.codigo = 'INV_VER_COSTOS'/);
  assert.match(quitarCostos, /r\.nombre = 'BODEGUERO'/);
  assert.doesNotMatch(quitarCostos, /ADMIN|GERENTE_SUCURSAL|CONTADOR/);
});

test('inventario: el costo unitario requiere acceso al kardex y permiso INV_VER_COSTOS', async () => {
  const [routes, service, repository] = await Promise.all([
    leer('backend/src/modules/inventario/inventario.routes.js'),
    leer('backend/src/modules/inventario/inventario.service.js'),
    leer('backend/src/modules/inventario/inventario.repository.js'),
  ]);
  const sinCosto = repository.match(/const SQL_MOVIMIENTOS_SIN_COSTO = `([\s\S]*?)`;/)?.[1];
  const conCosto = repository.match(/const SQL_MOVIMIENTOS_CON_COSTO = `([\s\S]*?)`;/)?.[1];
  assert.ok(sinCosto, 'debe existir una consulta para usuarios sin permiso de costos');
  assert.ok(conCosto, 'debe existir una consulta para usuarios con permiso de costos');
  assert.doesNotMatch(sinCosto, /costo_unitario/);
  assert.match(conCosto, /m\.costo_unitario/);
  assert.match(routes, /router\.get\('\/movimientos', requirePermiso\('INV_VER_KARDEX'\)/);
  assert.match(service, /usuarioTienePermiso\(userId, 'INV_VER_COSTOS'\)/);
  assert.match(repository, /verCostos \? SQL_MOVIMIENTOS_CON_COSTO : SQL_MOVIMIENTOS_SIN_COSTO/);
  assert.doesNotMatch(repository, /SELECT\s+m\.\*/i);
});

test('inventario: sucursal e insumo se filtran en SQL antes del límite de movimientos', async () => {
  const repository = await leer('backend/src/modules/inventario/inventario.repository.js');
  const sql = repository.match(/const SQL_MOVIMIENTOS_SIN_COSTO = `([\s\S]*?)`;/)?.[1];
  assert.ok(sql);
  const asignacion = sql.indexOf('seguridad.usuario_sucursal');
  const filtroSucursal = sql.indexOf('$2::int');
  const filtroInsumo = sql.indexOf('$3::int');
  const orden = sql.indexOf('ORDER BY m.creado_en DESC, m.id_movimiento DESC');
  const limite = sql.indexOf('LIMIT 500');
  assert.ok(asignacion >= 0 && asignacion < filtroSucursal);
  assert.ok(filtroSucursal < filtroInsumo && filtroInsumo < orden && orden < limite);
  assert.match(repository, /\[idUsuario, idSucursal, idInsumo\]/);
  assert.match(repository, /sequelize\.query\(sql, \{ bind, transaction, type: QueryTypes\.SELECT \}\)/);
});

test('inventario: las mermas conservan transacción, función SQL y manejo de P0001', async () => {
  const [service, repository] = await Promise.all([
    leer('backend/src/modules/inventario/inventario.service.js'),
    leer('backend/src/modules/inventario/inventario.repository.js'),
  ]);
  assert.match(service, /withTransaction\(/);
  assert.match(service, /pg\.code === 'P0001'/);
  assert.match(repository, /inventario\.fn_registrar_merma\(\$1,\$2,\$3,\$4,\$5\)/);
  assert.doesNotMatch(repository, /UPDATE\s+inventario\.stock_sucursal\s+SET\s+stock_actual/i);
});

test('inventario: listar insumos une unidades con id_unidad_base y devuelve tipo_insumo', async () => {
  const repository = await leer('backend/src/modules/inventario/inventario.repository.js');
  const consulta = repository.match(/export const listarInsumos = ([^\n]+);/)?.[1];
  assert.ok(consulta, 'debe existir la consulta de insumos');
  assert.match(consulta, /i\.tipo_insumo/);
  assert.match(consulta, /JOIN inventario\.unidades_medida u ON u\.id_unidad = i\.id_unidad_base/);
  assert.doesNotMatch(consulta, /USING\s*\(id_unidad\)/);
});

test('inventario: el controller de merma lee el parámetro :id declarado por la ruta', async () => {
  const [controller, routes] = await Promise.all([
    leer('backend/src/modules/inventario/inventario.controller.js'),
    leer('backend/src/modules/inventario/inventario.routes.js'),
  ]);
  assert.match(routes, /router\.post\('\/insumos\/:id\/mermas'/);
  assert.match(controller, /registrarMerma = async \(req, res\) => res\.status\(201\)\.json\(await service\.registrarMerma\(parseId\(req\.params\.id\), req\.body, req\.user\.id\)\)/);
  assert.doesNotMatch(controller, /registrarMerma[^\n]*req\.params\.idInsumo/);
});

test('inventario: los chips de T10 usan tipos reales recibidos del endpoint de insumos', async () => {
  const page = await leer('frontend/src/modules/inventario/InventarioPage.jsx');
  assert.match(page, /api\.get\('\/inventario\/insumos'\)/);
  assert.match(page, /insumo\.tipo_insumo/);
  assert.match(page, /tiposPorInsumo\[String\(fila\.id_insumo\)\] === filtroTipo/);
  assert.match(page, /valor: 'INGREDIENTE'/);
  assert.match(page, /valor: 'EMPAQUE'/);
  assert.match(page, /valor: 'REVENTA'/);
});
