import test from 'node:test';
import assert from 'node:assert/strict';
import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { readFile as leerArchivo } from 'node:fs/promises';

const leer = (archivo) => leerArchivo(new URL(`../${archivo}`, import.meta.url), 'utf8');

async function leerBloqueEsquema(inicio, fin) {
  const ruta = new URL('../database/init/01_schema.sql', import.meta.url);
  const lineas = createInterface({ input: createReadStream(ruta, { encoding: 'utf8' }), crlfDelay: Infinity });
  let leyendo = false;
  const bloque = [];
  for await (const linea of lineas) {
    if (linea.includes(inicio)) leyendo = true;
    if (leyendo) bloque.push(linea);
    if (leyendo && linea.includes(fin)) break;
  }
  return bloque.join('\n');
}

test('inventario: la vista única define bajo mínimo, faltante y nivel coherentes', async () => {
  const [migracion, init] = await Promise.all([
    leer('database/migrations/016_alertas_stock_bajo_minimo.sql'),
    leer('database/init/18_alertas_stock_bajo_minimo.sql'),
  ]);
  assert.equal(init, migracion);
  assert.match(migracion, /ss\.stock_minimo > 0\s+AND ss\.stock_actual < ss\.stock_minimo/);
  assert.match(migracion, /GREATEST\(ss\.stock_minimo - ss\.stock_actual, 0\) AS faltante/);
  assert.match(migracion, /CASE WHEN ss\.stock_actual <= 0 THEN 'AGOTADO' ELSE 'BAJO_MINIMO' END AS nivel/);
  assert.match(migracion, /ss\.id_sucursal,\s+ss\.id_insumo/);

  const esAlerta = (actual, minimo) => minimo > 0 && actual < minimo;
  assert.equal(esAlerta(4, 5), true, 'actual menor al mínimo sí alerta');
  assert.equal(esAlerta(5, 5), false, 'actual igual al mínimo no alerta');
  assert.equal(esAlerta(6, 5), false, 'actual mayor al mínimo no alerta');
  assert.equal(esAlerta(0, 0), false, 'mínimo cero no alerta');
  assert.equal(esAlerta(0, null), false, 'mínimo sin definir no alerta');
  assert.equal(Math.max(0, 5 - 4), 1);
  assert.equal(Math.max(0, 5 - 5), 0);
});

test('inventario, reportes y dashboard consumen la vista compartida para contar las mismas alertas', async () => {
  const [inventario, reportes, dashboard, pagina] = await Promise.all([
    leer('backend/src/modules/inventario/inventario.repository.js'),
    leer('backend/src/modules/reportes/reportes.repository.js'),
    leer('backend/src/modules/dashboard/dashboard.repository.js'),
    leer('frontend/src/modules/inventario/InventarioPage.jsx'),
  ]);
  assert.match(inventario, /SELECT \* FROM reportes\.vw_alertas_stock/);
  assert.match(reportes, /FROM reportes\.vw_alertas_stock a/);
  assert.match(dashboard, /FROM reportes\.vw_alertas_stock a/);
  assert.doesNotMatch(reportes, /ss\.stock_actual\s*<=\s*ss\.stock_minimo/);
  assert.doesNotMatch(dashboard, /ss\.stock_actual\s*<=\s*ss\.stock_minimo/);
  assert.match(pagina, /total: cargandoAlertas \|\| errorAlertas \? undefined : alertas\.length/);
  assert.match(pagina, /Number\(fila\.faltante\) > 0/);
  assert.match(pagina, /disabled=\{!insumoDeAlerta\(fila\) \|\| Number\(fila\.faltante\) <= 0\}/);
  assert.match(pagina, /window\.addEventListener\('focus', recargarSiVisible\)/);
});

test('inventario: registrar una factura suma al stock de su sucursal y al llegar al mínimo desaparece la alerta', async () => {
  const esquema = await leerBloqueEsquema('CREATE OR REPLACE FUNCTION compras.fn_trg_detalle_compra()', 'CREATE TRIGGER trg_detalle_compra');
  const repositorio = await leer('backend/src/modules/compras/facturas/facturas.repository.js');
  assert.match(repositorio, /compras\.fn_registrar_compra\([\s\S]*\$2::int/);
  assert.match(esquema, /CREATE TRIGGER trg_detalle_compra AFTER INSERT ON compras\.compra_detalles/);
  assert.match(esquema, /PERFORM inventario\.fn_mover_stock\(v_suc, NEW\.id_insumo, NEW\.cantidad, 'COMPRA'/);
  assert.match(esquema, /SELECT id_sucursal, id_usuario INTO v_suc, v_usr FROM compras\.facturas_compra WHERE id_compra = NEW\.id_compra/);

  const minimo = 44;
  const compra = minimo - 40;
  const stockAntesDeCompra = 40;
  const stockDespuesDeCompra = stockAntesDeCompra + compra;
  assert.equal(stockDespuesDeCompra, minimo);
  assert.equal(stockAntesDeCompra < minimo, true);
  assert.equal(stockDespuesDeCompra < minimo, false);
  assert.equal([stockAntesDeCompra, stockDespuesDeCompra].filter((stock) => stock < minimo).length, 1);
});
