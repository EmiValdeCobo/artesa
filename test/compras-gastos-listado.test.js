import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { listarTodasLasPaginas } from '../frontend/src/modules/compras/paginacionApi.js';

const leer = (archivo) => readFile(new URL(`../${archivo}`, import.meta.url), 'utf8');

test('el historial pide GASTO al servidor antes de filtrar por estado y sucursal', async () => {
  const schema = await leer('backend/src/modules/compras/cuentas-por-pagar/cuentas-por-pagar.schemas.js');
  const repositorio = await leer('backend/src/modules/compras/cuentas-por-pagar.repository.js');
  const api = await leer('frontend/src/modules/compras/comprasApi.js');
  const pantalla = await leer('frontend/src/modules/compras/CompraFacturaPage.jsx');
  assert.match(schema, /tipoCosto: z\.enum\(\['COSTO', 'GASTO'\]\)\.optional\(\)/);
  assert.match(repositorio, /AND \(\$7::text IS NULL OR f\.tipo_costo = \$7::text\)[\s\S]*LIMIT \$8::int OFFSET \$9::int/);
  assert.match(api, /listarCuentasPorPagar\(\{ \.\.\.filtros, \.\.\.paginacion, tipoCosto: 'GASTO' \}\)/);
  assert.match(pantalla, /listarGastos\(\{ estado, \.\.\.\(sucursal \?/);
  assert.match(pantalla, /setFilas\(datos\)/);
  assert.doesNotMatch(pantalla, /datos\.filter\(\(fila\) => fila\.tipo_costo === 'GASTO'\)/);
});

test('el historial recorre todas las páginas del tipo filtrado y no pierde filas posteriores', async () => {
  const llamadas = [];
  const todas = await listarTodasLasPaginas(async ({ estado, page, limit }) => {
    llamadas.push({ estado, page, limit });
    if (page === 1) return [{ id: 'gasto-1' }, { id: 'gasto-2' }];
    if (page === 2) return [{ id: 'gasto-3' }, { id: 'gasto-4' }];
    return [{ id: 'gasto-5' }];
  }, { estado: 'pagadas' }, 2);
  assert.deepEqual(todas.map(({ id }) => id), ['gasto-1', 'gasto-2', 'gasto-3', 'gasto-4', 'gasto-5']);
  assert.deepEqual(llamadas, [
    { estado: 'pagadas', page: 1, limit: 2 },
    { estado: 'pagadas', page: 2, limit: 2 },
    { estado: 'pagadas', page: 3, limit: 2 },
  ]);
});

test('un GASTO CONTADO se confirma pagado y se recarga en el listado de pagadas', async () => {
  const service = await leer('backend/src/modules/compras/facturas/facturas.service.js');
  const repository = await leer('backend/src/modules/compras/facturas/facturas.repository.js');
  const pantalla = await leer('frontend/src/modules/compras/CompraFacturaPage.jsx');
  const query = await leer('backend/src/modules/compras/cuentas-por-pagar.repository.js');
  assert.match(service, /if \(datos\.condicionPago === 'CONTADO'\)[\s\S]*repo\.insertarPagoContado\(idCompra, userId, transaction\)[\s\S]*repo\.obtenerEstadoPago\(idCompra, transaction\) !== 'PAGADO'/);
  assert.match(repository, /INSERT INTO compras\.pagos_proveedor/);
  assert.match(pantalla, /if \(gasto && puedeVerCuentas\) setRecargarClave/);
  assert.match(pantalla, /listarGastos\(\{ estado, \...\(sucursal \?/);
  assert.match(query, /\$6::text = 'pagadas' AND f\.estado_pago = 'PAGADO'/);
});

test('un GASTO CREDITO queda pendiente y se puede listar en Cuentas por pagar', async () => {
  const service = await leer('backend/src/modules/compras/facturas/facturas.service.js');
  const query = await leer('backend/src/modules/compras/cuentas-por-pagar.repository.js');
  const api = await leer('frontend/src/modules/compras/comprasApi.js');
  const cxp = await leer('frontend/src/modules/compras/CuentasPorPagarPage.jsx');
  const pantalla = await leer('frontend/src/modules/compras/CompraFacturaPage.jsx');
  assert.match(service, /else if \(compra\.estado_pago !== 'PENDIENTE'\)/);
  assert.match(query, /\$6::text = 'pendientes' AND f\.estado_pago IN \('PENDIENTE', 'PARCIAL'\)/);
  // AUDITORIA C2/C4: recorre todas las páginas leyendo los headers X-* del backend.
  assert.match(api, /listarTodasLasCuentasPorPagar = async \(filtros = \{\}\) => \(\s*await obtenerTodasLasPaginas\('\/compras\/cuentas-por-pagar'/);
  assert.match(cxp, /setFilas\(await listarTodasLasCuentasPorPagar\(/);
  assert.match(pantalla, /Gasto registrado como pendiente/);
  assert.match(pantalla, /Registrar abono/);
});

test('la fecha futura se explica en el campo y Compras queda bajo Gestión sin enlace a CxP desde gastos', async () => {
  const pantalla = await leer('frontend/src/modules/compras/CompraFacturaPage.jsx');
  const menu = await leer('frontend/src/config/menu.js');
  assert.match(pantalla, /max=\{hoy\(\)\}/);
  assert.match(pantalla, /La fecha de emisión no puede ser futura/);
  assert.match(pantalla, /vencimiento del crédito sí puede ser futura/);
  assert.doesNotMatch(pantalla, /Abrir cuentas por pagar/);
  assert.match(menu, /seccion: 'Gestión', items: \[\s*\{ id: 'compras'/);
});
