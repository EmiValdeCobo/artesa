import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { costoBorradorConIva, resumenCompra, aMicros } from '../frontend/src/modules/compras/ivaCompras.js';

const leer = (archivo) => readFile(new URL(`../${archivo}`, import.meta.url), 'utf8');

test('el costo unitario se pide con IVA incluido y ya no dice "sin IVA"', async () => {
  const pantalla = await leer('frontend/src/modules/compras/CompraFacturaPage.jsx');
  assert.match(pantalla, /USD, IVA incluido/);
  assert.doesNotMatch(pantalla, /USD, sin IVA/);
});

test('el borrador convierte el costo promedio neto a precio con IVA solo en CCF', () => {
  assert.equal(costoBorradorConIva('2.00', 'CCF'), '2.26');
  assert.equal(costoBorradorConIva('1.234567', 'CCF'), '1.395061');
  assert.equal(costoBorradorConIva('2.00', 'CF'), '2');
  assert.equal(costoBorradorConIva('2.50', 'FSE'), '2.5');
  assert.equal(costoBorradorConIva('abc', 'CCF'), '');
});

test('el resumen replica la fórmula de fn_registrar_compra sin float', () => {
  const items = [{ cantidad: '3', costoUnitario: '1.13' }, { cantidad: '2', costoUnitario: '0.505' }];
  // CCF: 3.39 → 3.00 + 0.39; 1.01 → 0.89 + 0.12
  assert.deepEqual(resumenCompra(items, 'CCF'), { subtotal: 389n, iva: 51n, total: 440n });
  assert.deepEqual(resumenCompra(items, 'CF'), { subtotal: 440n, iva: 0n, total: 440n });
  assert.deepEqual(resumenCompra([{ cantidad: '', costoUnitario: '' }], 'CCF'), { subtotal: 0n, iva: 0n, total: 0n });
  assert.equal(aMicros('0.1'), 100000n);
});

test('la pantalla envía tipoDocumento, ofrece CCF/CF/FSE y consume alertasMargen', async () => {
  const pantalla = await leer('frontend/src/modules/compras/CompraFacturaPage.jsx');
  const utilidades = await leer('frontend/src/modules/compras/ivaCompras.js');
  assert.match(pantalla, /tipoDocumento: 'CCF'/);
  assert.match(pantalla, /tipoDocumento: form\.tipoDocumento/);
  assert.match(pantalla, /etiqueta="Tipo de documento"/);
  for (const tipo of ['CCF', 'CF', 'FSE']) assert.match(utilidades, new RegExp(`valor: '${tipo}'`));
  assert.match(pantalla, /Array\.isArray\(respuesta\?\.alertasMargen\)/);
  assert.match(pantalla, /notificar\.advertencia\('Margen bajo el mínimo'/);
  assert.match(pantalla, /alerta\.margenPct[\s\S]*alerta\.margenMinimoPct/);
  assert.match(pantalla, /costoBorradorConIva\(linea\.costoUnitario, actual\.tipoDocumento\)/);
});

test('los cálculos de IVA no usan Number, parseFloat ni toFixed', async () => {
  const utilidades = await leer('frontend/src/modules/compras/ivaCompras.js');
  assert.doesNotMatch(utilidades, /parseFloat|toFixed|Number\(|Math\./);
  assert.match(utilidades, /BigInt/);
});

test('los listados muestran tipo_documento de forma discreta', async () => {
  const pantalla = await leer('frontend/src/modules/compras/CompraFacturaPage.jsx');
  const cxp = await leer('frontend/src/modules/compras/CuentasPorPagarPage.jsx');
  assert.match(pantalla, /fila\.tipo_documento/);
  assert.match(cxp, /factura\.tipo_documento/);
});
