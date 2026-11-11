import test from 'node:test';
import assert from 'node:assert/strict';
import { IVA, PRECIOS_INCLUYEN_IVA, calcularTotales, formatoMoneda } from '../frontend/src/modules/pos/impuestos.js';
import { carritoInicial, carritoReducer } from '../frontend/src/modules/pos/carritoReducer.js';

// ─────────────────────────────────────────────────────────────────────────────
// 1. IMPUESTOS Y CÁLCULO DE TOTALES (POS)
// ─────────────────────────────────────────────────────────────────────────────
test('pos impuestos: IVA configurado al 13% e inclusión de IVA activa', () => {
  assert.equal(IVA, 0.13);
  assert.equal(PRECIOS_INCLUYEN_IVA, true);
});

test('pos impuestos: calcularTotales desglosa correctamente IVA incluido', () => {
  // Ejemplo: 1 café a $1.13 con IVA incluido -> subtotal $1.00, IVA $0.13, total $1.13
  const items = [{ precio: 1.13, cantidad: 1 }];
  const resultado = calcularTotales(items);

  assert.equal(resultado.total, 1.13);
  assert.equal(resultado.subtotal, 1.0);
  assert.equal(resultado.iva, 0.13);
  assert.equal(Math.round((resultado.subtotal + resultado.iva) * 100) / 100, resultado.total);
});

test('pos impuestos: calcularTotales con múltiples productos y cantidades', () => {
  const items = [
    { precio: 2.26, cantidad: 2 }, // 4.52 (subtotal 4.00, iva 0.52)
    { precio: 1.13, cantidad: 1 }, // 1.13 (subtotal 1.00, iva 0.13)
  ];
  const resultado = calcularTotales(items);

  assert.equal(resultado.total, 5.65);
  assert.equal(resultado.subtotal, 5.0);
  assert.equal(resultado.iva, 0.65);
});

test('pos impuestos: calcularTotales con carrito vacío retorna ceros', () => {
  const resultado = calcularTotales([]);
  assert.equal(resultado.total, 0);
  assert.equal(resultado.subtotal, 0);
  assert.equal(resultado.iva, 0);
});

test('pos impuestos: formatoMoneda da formato USD con símbolo de dólar', () => {
  const formatted = formatoMoneda(15.5);
  assert.match(formatted, /\$/);
  assert.match(formatted, /15\.50/);
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. REDUCER DEL CARRITO DE COMPRAS (POS)
// ─────────────────────────────────────────────────────────────────────────────
test('carritoReducer: estado inicial es un arreglo vacío', () => {
  assert.deepEqual(carritoInicial, []);
});

test('carritoReducer: agregar añade un nuevo producto con cantidad 1', () => {
  const producto = { id_producto: 10, nombre: 'Croissant Almendras', precio: 2.75, stock: 5 };
  const estado1 = carritoReducer([], { tipo: 'agregar', producto });

  assert.equal(estado1.length, 1);
  assert.equal(estado1[0].id_producto, 10);
  assert.equal(estado1[0].cantidad, 1);
  assert.equal(estado1[0].stock, 5);
});

test('carritoReducer: agregar producto existente incrementa cantidad hasta el tope de stock', () => {
  const producto = { id_producto: 10, nombre: 'Croissant Almendras', precio: 2.75, stock: 2 };
  let estado = carritoReducer([], { tipo: 'agregar', producto });
  assert.equal(estado[0].cantidad, 1);

  // Segunda vez: llega al stock máximo (2)
  estado = carritoReducer(estado, { tipo: 'agregar', producto });
  assert.equal(estado[0].cantidad, 2);

  // Tercera vez: no debe superar el stock de 2
  estado = carritoReducer(estado, { tipo: 'agregar', producto });
  assert.equal(estado[0].cantidad, 2);
});

test('carritoReducer: cambiarCantidad ajusta dentro del límite y elimina si es 0', () => {
  const inicial = [{ id_producto: 1, nombre: 'Café', precio: 1.5, cantidad: 2, stock: 10 }];

  // Modificar a 4
  const modificado = carritoReducer(inicial, { tipo: 'cambiarCantidad', id: 1, cantidad: 4 });
  assert.equal(modificado[0].cantidad, 4);

  // Si se cambia a 0, se elimina del carrito
  const vaciado = carritoReducer(inicial, { tipo: 'cambiarCantidad', id: 1, cantidad: 0 });
  assert.equal(vaciado.length, 0);

  // Si se pide más que el stock, se limita al stock
  const tope = carritoReducer(inicial, { tipo: 'cambiarCantidad', id: 1, cantidad: 99 });
  assert.equal(tope[0].cantidad, 10);
});

test('carritoReducer: quitar y vaciar limpian los ítems correspondientes', () => {
  const items = [
    { id_producto: 1, nombre: 'Café', precio: 1.5, cantidad: 1, stock: 5 },
    { id_producto: 2, nombre: 'Pan dulce', precio: 0.75, cantidad: 2, stock: 10 },
  ];

  // Quitar solo el producto 1
  const filtrado = carritoReducer(items, { tipo: 'quitar', id: 1 });
  assert.equal(filtrado.length, 1);
  assert.equal(filtrado[0].id_producto, 2);

  // Vaciar carrito
  const vacio = carritoReducer(items, { tipo: 'vaciar' });
  assert.deepEqual(vacio, []);
});
