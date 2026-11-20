import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

process.env.DATABASE_URL ??= 'postgres://test:test@127.0.0.1:5432/test';
process.env.JWT_SECRET ??= 'test-secret-for-contract-tests';

const { sequelize } = await import('../backend/src/config/db.js');
const { listarCuentasPorPagar } = await import('../backend/src/modules/compras/cuentas-por-pagar.repository.js');
const { filtrosCuentasPorPagarSchema } = await import('../backend/src/modules/compras/cuentas-por-pagar/cuentas-por-pagar.schemas.js');
const { filtrosCuentasPorPagarSchema: filtrosReportesSchema } = await import('../backend/src/modules/reportes/reportes.schemas.js');
const { movimientos } = await import('../backend/src/modules/inventario/inventario.repository.js');
const { filtrosMovimientosSchema } = await import('../backend/src/modules/inventario/inventario.schemas.js');
const { enviarHeadersPaginacion } = await import('../backend/src/utils/paginacion.js');

const leer = (archivo) => readFile(new URL(`../${archivo}`, import.meta.url), 'utf8');

function filasConTotal(total, id = 'id') {
  return Array.from({ length: 50 }, (_, i) => ({ id, numero: i, importe: '12.34', __total: String(total) }));
}

test('paginación CxP: defaults, filtros válidos y rechazo de páginas o límites inválidos', () => {
  assert.deepEqual(filtrosCuentasPorPagarSchema.parse({}), { estado: 'pendientes', campoFecha: 'emision', page: 1, limit: 50 });
  assert.deepEqual(filtrosReportesSchema.parse({}), { page: 1, limit: 50 });
  assert.deepEqual(filtrosCuentasPorPagarSchema.parse({ page: '3', limit: '100', estado: 'todas' }), {
    page: 3, limit: 100, estado: 'todas', campoFecha: 'emision',
  });
  assert.equal(filtrosCuentasPorPagarSchema.parse({ tipoCosto: 'GASTO' }).tipoCosto, 'GASTO');
  assert.throws(() => filtrosCuentasPorPagarSchema.parse({ tipoCosto: 'MERMA' }));
  for (const entrada of [{ page: 0 }, { page: '-1' }, { page: '1.1' }, { page: '1e2' }, { page: 'texto' }, { limit: 0 }, { limit: 101 }]) {
    assert.throws(() => filtrosCuentasPorPagarSchema.parse(entrada));
  }
});

test('paginación CxP: páginas consecutivas recorren un total superior a 500 con SQL parametrizado', async (t) => {
  const calls = [];
  t.mock.method(sequelize, 'query', async (sql, opciones) => {
    calls.push({ sql, opciones });
    return filasConTotal(501, 'compra');
  });

  const primera = await listarCuentasPorPagar('usuario', { estado: 'todas', page: 1, limit: 50 });
  const segunda = await listarCuentasPorPagar('usuario', { estado: 'todas', page: 2, limit: 50 });
  assert.equal(primera.pagination.total, 501);
  assert.equal(segunda.pagination.page, 2);
  assert.equal(primera.data.length, 50);
  assert.equal(typeof primera.data[0].importe, 'string');
  assert.match(calls[0].sql, /LIMIT \$9::int OFFSET \$10::int/);
  assert.match(calls[0].sql, /ORDER BY f\.fecha_vencimiento ASC, pr\.razon_social, f\.num_factura, f\.id_compra/);
  assert.deepEqual(calls[0].opciones.bind.slice(-2), [50, 0]);
  assert.deepEqual(calls[1].opciones.bind.slice(-2), [50, 50]);
  assert.equal(calls[0].opciones.bind[6], null);
  assert.doesNotMatch(calls[0].sql, /LIMIT 500/);
});

test('paginación CxP: filtra tipo de compra antes de paginar y conserva binds del listado', async (t) => {
  let llamada;
  t.mock.method(sequelize, 'query', async (sql, opciones) => {
    llamada = { sql, opciones };
    return Array.from({ length: 38 }, (_, i) => ({ id_compra: `gasto-${i}`, tipo_costo: 'GASTO', __total: '38' }));
  });
  const filtros = filtrosCuentasPorPagarSchema.parse({ estado: 'pagadas', tipoCosto: 'GASTO', page: '1', limit: '100' });
  const resultado = await listarCuentasPorPagar('usuario', filtros);
  assert.equal(resultado.pagination.total, 38);
  assert.equal(resultado.data.length, 38);
  assert.match(llamada.sql, /f\.estado_pago = 'PAGADO'[\s\S]*f\.tipo_costo = \$7::text[\s\S]*LIMIT \$9::int OFFSET \$10::int/);
  assert.deepEqual(llamada.opciones.bind, ['usuario', null, null, null, false, 'pagadas', 'GASTO', 'emision', 100, 0]);
});

test('paginación CxP: una página vacía conserva el total real para marcar el fin del recorrido', async (t) => {
  let llamada = 0;
  t.mock.method(sequelize, 'query', async () => {
    llamada += 1;
    return llamada === 1 ? [] : [{ total: '501' }];
  });
  const resultado = await listarCuentasPorPagar('usuario', { estado: 'pendientes', page: 12, limit: 50 });
  assert.deepEqual(resultado.data, []);
  assert.deepEqual(resultado.pagination, { page: 12, limit: 50, total: 501 });
});

test('paginación Kárdex: páginas sucesivas filtran en SQL y conservan variantes de costos', async (t) => {
  const calls = [];
  t.mock.method(sequelize, 'query', async (sql, opciones) => {
    calls.push({ sql, opciones });
    return filasConTotal(777, 'movimiento');
  });
  const filtros = filtrosMovimientosSchema.parse({
    idSucursal: '2', idInsumo: '5', desde: '2026-11-01', hasta: '2026-11-15',
    tipos: 'COMPRA,MERMA', direccion: 'salidas', q: 'ajuste', page: '2', limit: '25',
  });

  const resultado = await movimientos('usuario', filtros, false);
  const costos = await movimientos('usuario', { ...filtros, page: 3 }, true);
  assert.equal(resultado.pagination.total, 777);
  assert.equal(resultado.pagination.page, 2);
  assert.deepEqual(calls[0].opciones.bind.slice(-2), [25, 25]);
  assert.deepEqual(calls[0].opciones.bind.slice(1, 8), [2, 5, '2026-11-01', '2026-11-15', ['COMPRA', 'MERMA'], 'salidas', 'ajuste']);
  assert.match(calls[0].sql, /COUNT\(\*\) OVER\(\)::text AS __total/);
  assert.match(calls[0].sql, /LIMIT \$9::int OFFSET \$10::int/);
  assert.doesNotMatch(calls[0].sql, /costo_unitario/);
  assert.equal(calls[1].opciones.bind.at(-1), 50);
  assert.match(calls[1].sql, /m\.costo_unitario/);
  assert.doesNotMatch(calls[0].sql, /LIMIT 500/);
});

test('paginación: headers incluyen total y estado de navegación y CORS los expone', async () => {
  let headers;
  enviarHeadersPaginacion({ set: (value) => { headers = value; } }, { page: 2, limit: 50, total: 121 });
  assert.deepEqual(headers, {
    'X-Page': '2',
    'X-Limit': '50',
    'X-Total': '121',
    'X-Total-Pages': '3',
    'X-Has-Next-Page': 'true',
    'X-Has-Previous-Page': 'true',
  });
  const app = await leer('backend/src/app.js');
  for (const header of ['X-Page', 'X-Limit', 'X-Total', 'X-Total-Pages', 'X-Has-Next-Page', 'X-Has-Previous-Page']) {
    assert.match(app, new RegExp(header));
  }
});
