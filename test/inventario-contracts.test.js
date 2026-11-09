import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const leer = (archivo) => readFile(new URL(`../${archivo}`, import.meta.url), 'utf8');

test('inventario: el kardex conserva autenticación admin y permiso INV_VER_STOCK', async () => {
  const routes = await leer('backend/src/modules/inventario/inventario.routes.js');
  assert.match(routes, /router\.use\(authenticate, requireTipo\('admin'\)\)/);
  assert.match(routes, /router\.get\('\/movimientos', requirePermiso\('INV_VER_STOCK'\)/);
});

test('inventario: el costo unitario solo se selecciona con INV_VER_COSTOS', async () => {
  const [service, repository] = await Promise.all([
    leer('backend/src/modules/inventario/inventario.service.js'),
    leer('backend/src/modules/inventario/inventario.repository.js'),
  ]);
  const sinCosto = repository.match(/const SQL_MOVIMIENTOS_SIN_COSTO = `([\s\S]*?)`;/)?.[1];
  const conCosto = repository.match(/const SQL_MOVIMIENTOS_CON_COSTO = `([\s\S]*?)`;/)?.[1];
  assert.ok(sinCosto, 'debe existir una consulta para usuarios sin permiso de costos');
  assert.ok(conCosto, 'debe existir una consulta para usuarios con permiso de costos');
  assert.doesNotMatch(sinCosto, /costo_unitario/);
  assert.match(conCosto, /m\.costo_unitario/);
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
