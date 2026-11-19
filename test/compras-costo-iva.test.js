import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { calcularImporteCompraLinea } from '../backend/seeders/lib/simulacion.js';

const leer = (ruta) => readFile(new URL(`../${ruta}`, import.meta.url), 'utf8');

test('compras: $100 con IVA conserva total, separa subtotal/IVA y deriva costo neto', () => {
  const linea = calcularImporteCompraLinea(1, 100_000_000, 13);
  assert.equal(linea.total, 10_000);
  assert.equal(linea.subtotal, 8_850);
  assert.equal(linea.iva, 1_150);
  assert.equal(linea.subtotal + linea.iva, linea.total);
  assert.equal(linea.costoSinIvaMicros, 88_495_575);
});

test('compras: suma redondeos por línea y distribuye diferencias de centavos sin descuadrar factura', () => {
  const lineas = [1, 2, 3].map(() => calcularImporteCompraLinea(1, 1_000_000, 13));
  const subtotal = lineas.reduce((suma, linea) => suma + linea.subtotal, 0);
  const iva = lineas.reduce((suma, linea) => suma + linea.iva, 0);
  const total = lineas.reduce((suma, linea) => suma + linea.total, 0);
  assert.deepEqual([subtotal, iva, total], [264, 36, 300]);
  assert.equal(subtotal + iva, total);
});

test('compras: migración no altera valores históricos y init/migración mantienen paridad', async () => {
  const migracion = await leer('database/migrations/017_compras_costos_con_iva.sql');
  const init = await leer('database/init/19_compras_costos_con_iva.sql');
  assert.equal(init, migracion);
  assert.match(migracion, /costo_unitario_con_iva NUMERIC\(12,6\)/);
  assert.doesNotMatch(migracion, /costo_unitario_con_iva[^;]*NOT NULL|UPDATE compras\.compra_detalles/i);
  assert.match(migracion, /CREATE OR REPLACE FUNCTION compras\.fn_registrar_compra/);
  assert.match(migracion, /ROUND\(i\.costo_unitario \/ \(1 \+ v_tasa\), 6\),\s*i\.costo_unitario/);
});

test('compras: la función SQL usa total recibido, separa IVA por línea y preserva gastos fuera de inventario', async () => {
  const migracion = await leer('database/migrations/017_compras_costos_con_iva.sql');
  assert.match(migracion, /ROUND\(i\.cantidad \* i\.costo_unitario, 2\) AS total_linea/);
  assert.match(migracion, /ROUND\(total_linea \/ \(1 \+ v_tasa\), 2\) AS subtotal_linea/);
  assert.match(migracion, /SUM\(total_linea - subtotal_linea\)/);
  assert.match(migracion, /INSERT INTO compras\.facturas_compra[\s\S]*v_sub, v_iva, v_total/);
  assert.match(migracion, /num_factura, tipo_costo[\s\S]*p_num_factura, p_tipo_costo/);
  assert.match(migracion, /IF NEW\.id_insumo IS NULL THEN RETURN NEW; END IF/);
  assert.match(migracion, /v_costo_sin_iva := NEW\.costo_unitario/);
  assert.match(migracion, /inventario\.fn_mover_stock\([\s\S]*v_costo_sin_iva\)/);
});

test('compras: CONTADO/CREDITO, permisos y pagos continúan bajo los contratos existentes', async () => {
  const route = await leer('backend/src/modules/compras/facturas/facturas.routes.js');
  const service = await leer('backend/src/modules/compras/facturas/facturas.service.js');
  const repository = await leer('backend/src/modules/compras/facturas/facturas.repository.js');
  assert.match(route, /requirePermiso\('COM_REGISTRAR_COMPRA'\)/);
  assert.match(repository, /SELECT id_compra, CURRENT_DATE, total, 'EFECTIVO'/);
  assert.match(service, /datos\.condicionPago === 'CONTADO'/);
  assert.match(service, /estado_pago !== 'PENDIENTE'/);
});

test('compras: simulador registra ambos costos y usa el neto para costo promedio', async () => {
  const simulador = await leer('backend/seeders/lib/simulacion.js');
  assert.match(simulador, /costo_unitario: fmtMicros\(it\.importe\.costoSinIvaMicros\)/);
  assert.match(simulador, /costo_unitario_con_iva: fmtMicros\(it\.costoConIvaMicros\)/);
  assert.match(simulador, /costoUnit: it\.importe\.costoSinIvaMicros/);
});
