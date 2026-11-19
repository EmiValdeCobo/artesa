import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { registrarCompraSchema } from '../backend/src/modules/compras/facturas/facturas.schemas.js';

const leer = (ruta) => readFile(new URL(`../${ruta}`, import.meta.url), 'utf8');
const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/El_Salvador' }).format(new Date());
const base = {
  idProveedor: 1, idSucursal: 1, numeroFactura: 'A-1', fechaEmision: hoy, condicionPago: 'CONTADO',
  items: [{ idInsumo: 1, cantidad: '1', costoUnitario: '11.30' }],
};

test('compras: tipoDocumento es opcional, por defecto CCF y solo admite CCF/CF/FSE', () => {
  assert.equal(registrarCompraSchema.parse(base).tipoDocumento, 'CCF');
  for (const tipo of ['CCF', 'CF', 'FSE']) {
    assert.equal(registrarCompraSchema.parse({ ...base, tipoDocumento: tipo }).tipoDocumento, tipo);
  }
  assert.equal(registrarCompraSchema.safeParse({ ...base, tipoDocumento: 'TICKET' }).success, false);
  const gasto = registrarCompraSchema.parse({
    ...base, tipoCosto: 'GASTO', tipoDocumento: 'CF', items: [{ descripcion: 'Luz', cantidad: '1', costoUnitario: '5' }],
  });
  assert.equal(gasto.tipoDocumento, 'CF');
});

test('compras: migración 018 e init 20 son idénticas y no editan históricos', async () => {
  const migracion = await leer('database/migrations/018_compras_tipo_documento_margen.sql');
  const init = await leer('database/init/20_compras_tipo_documento_margen.sql');
  assert.equal(init, migracion);
  assert.match(migracion, /tipo_documento VARCHAR\(3\) NOT NULL DEFAULT 'CCF'/);
  assert.match(migracion, /CHECK \(tipo_documento IN \('CCF', 'CF', 'FSE'\)\)/);
  assert.doesNotMatch(migracion, /UPDATE compras\./i);
});

test('compras: fn_registrar_compra solo separa IVA en CCF; CF/FSE costean con precio completo', async () => {
  const sql = await leer('database/migrations/018_compras_tipo_documento_margen.sql');
  assert.match(sql, /DROP FUNCTION IF EXISTS compras\.fn_registrar_compra\(INT, INT, VARCHAR, DATE, VARCHAR, JSONB, UUID, VARCHAR\)/);
  assert.match(sql, /p_tipo_documento VARCHAR DEFAULT 'CCF'\s*\) RETURNS UUID/);
  assert.match(sql, /RAISE EXCEPTION 'Tipo de documento inválido/);
  assert.match(sql, /v_tasa := CASE WHEN p_tipo_documento = 'CCF' THEN empresa\.fn_param\('tasa_iva'\)::NUMERIC ELSE 0 END/);
  assert.match(sql, /ROUND\(i\.costo_unitario \/ \(1 \+ v_tasa\), 6\)/);
  assert.match(sql, /v_sub, v_iva, v_total,\s*p_tipo_documento/);
});

test('reportes: parámetro margen_minimo y vista de margen bajo en NUMERIC con permisos', async () => {
  const sql = await leer('database/migrations/018_compras_tipo_documento_margen.sql');
  assert.match(sql, /'margen_minimo', '0\.60'[\s\S]*ON CONFLICT DO NOTHING/);
  assert.match(sql, /CREATE OR REPLACE VIEW reportes\.vw_productos_margen_bajo/);
  assert.match(sql, /m\.precio_sin_iva > 0/);
  assert.match(sql, /AS margen_pct/);
  assert.match(sql, /AS margen_minimo_pct/);
  assert.doesNotMatch(sql, /::(float|double|real)/i);
  assert.match(sql, /GRANT SELECT ON reportes\.vw_productos_margen_bajo TO web_user/);
});

test('backend: compra pasa $9, devuelve alertasMargen con permiso y expone /reportes/margen-bajo', async () => {
  const repo = await leer('backend/src/modules/compras/facturas/facturas.repository.js');
  const service = await leer('backend/src/modules/compras/facturas/facturas.service.js');
  const controller = await leer('backend/src/modules/compras/facturas/facturas.controller.js');
  const rutas = await leer('backend/src/modules/reportes/reportes.routes.js');
  const repRep = await leer('backend/src/modules/reportes/reportes.repository.js');
  assert.match(repo, /\$8::varchar, \$9::varchar/);
  assert.match(repo, /id_insumo_reventa = ANY\(\$1::int\[\]\)/);
  assert.match(service, /datos\.tipoCosto === 'COSTO' && await repo\.usuarioTienePermiso\(userId, 'INV_VER_COSTOS'/);
  assert.match(controller, /json\(\{ id_compra: idCompra, idCompra, alertasMargen \}\)/);
  assert.match(rutas, /router\.get\('\/margen-bajo', requirePermiso\('INV_VER_COSTOS'\)/);
  for (const campo of ['idProducto', 'precioSinIva', 'costoReceta', 'margenPct', 'margenMinimoPct']) {
    assert.match(repRep, new RegExp(`AS "${campo}"`));
    assert.match(repo, new RegExp(`AS "${campo}"`));
  }
});

test('compras: listados de CxP y pagos incluyen tipo_documento', async () => {
  assert.match(await leer('backend/src/modules/compras/cuentas-por-pagar.repository.js'), /f\.tipo_documento/);
  assert.match(await leer('backend/src/modules/compras/pagos/pagos.repository.js'), /f\.tipo_documento/);
});
