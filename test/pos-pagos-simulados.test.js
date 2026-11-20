// Pagos simulados de tarjeta y transferencia: Luhn, máscaras, reglas de monto y no persistencia de datos sensibles.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import {
  TARJETAS_PRUEBA, detectarMarca, mascaraCvv, mascaraNumeroTarjeta, mascaraTitular, mascaraVencimiento,
  procesarPagoTarjeta, validarLuhn, validarTarjeta, validarVencimiento,
} from '../frontend/src/modules/pos/pagosSimulados/tarjeta.js';
import {
  evaluarMontoTransferencia, mascaraReferenciaTransferencia, textoQrTransferencia, validarReferenciaTransferencia,
} from '../frontend/src/modules/pos/pagosSimulados/transferencia.js';
import { mascaraMoneda, completarDecimales } from '../frontend/src/utils/mascaras.js';
import { registrarVentaSchema } from '../backend/src/modules/pos/ventas/ventas.schemas.js';
import { aMetadatosSimulacion, aPagoVenta } from '../backend/src/modules/pos/pagos/pasarelaSimulada.js';

const leer = (rel) => readFile(resolve(process.cwd(), rel), 'utf-8');
const HOY = new Date(2026, 10, 19); // 19-nov-2026
const sinEspera = { esperar: async () => {}, hoy: HOY };
const valida = { numero: '4242 4242 4242 4242', titular: 'ANA PEREZ', vencimiento: '12/28', cvv: '123' };

// ── Luhn y marca ──────────────────────────────────────────────────────────────
test('Luhn: acepta las tarjetas de prueba y rechaza un dígito alterado o largos fuera de 13-19', () => {
  for (const n of Object.values(TARJETAS_PRUEBA)) assert.equal(validarLuhn(n), true, n);
  assert.equal(validarLuhn('4242424242424241'), false);
  assert.equal(validarLuhn('424242424242'), false); // 12 dígitos
  assert.equal(validarLuhn('42424242424242424242'), false); // 20 dígitos
});

test('Marca: Visa, Mastercard (51-55 y 2221-2720) y American Express', () => {
  assert.equal(detectarMarca('4242'), 'VISA');
  assert.equal(detectarMarca('5555 5555'), 'MASTERCARD');
  assert.equal(detectarMarca('2221000000000009'), 'MASTERCARD');
  assert.equal(detectarMarca('378282246310005'), 'AMEX');
  assert.equal(detectarMarca('6011111111111117'), null);
});

// ── Máscaras ──────────────────────────────────────────────────────────────────
test('Máscaras de tarjeta: agrupa de 4 en 4 (Amex 4-6-5), titular solo letras, MM/AA y CVV por marca', () => {
  assert.equal(mascaraNumeroTarjeta('4242abc4242-4242 4242'), '4242 4242 4242 4242');
  assert.equal(mascaraNumeroTarjeta('378282246310005'), '3782 822463 10005');
  assert.equal(mascaraNumeroTarjeta('1'.repeat(25)).replace(/ /g, '').length, 19);
  assert.equal(mascaraTitular('ana  pérez 123!'), 'ANA PÉREZ ');
  assert.equal(mascaraVencimiento('1'), '1');
  assert.equal(mascaraVencimiento('5'), '05/');
  assert.equal(mascaraVencimiento('12'), '12/');
  assert.equal(mascaraVencimiento('1228'), '12/28');
  assert.equal(mascaraVencimiento('12', '12/'), '12'); // al borrar no reinserta la barra
  assert.equal(mascaraCvv('12a345', 'VISA'), '123');
  assert.equal(mascaraCvv('12345', 'AMEX'), '1234');
});

test('Vencimiento: mes 01-12 y no vencida (vigente hasta fin de mes)', () => {
  assert.equal(validarVencimiento('11/26', HOY), '');
  assert.match(validarVencimiento('10/26', HOY), /vencida/);
  assert.match(validarVencimiento('13/28', HOY), /01 y 12/);
  assert.match(validarVencimiento('00/28', HOY), /01 y 12/);
  assert.match(validarVencimiento('1/28', HOY), /MM\/AA/);
});

test('Validación de tarjeta: mensajes en español por campo y CVV de 4 para Amex', () => {
  assert.deepEqual(validarTarjeta(valida, HOY), { numero: '', titular: '', vencimiento: '', cvv: '' });
  const e = validarTarjeta({ numero: '4242 4242 4242 4241', titular: '', vencimiento: '09/26', cvv: '12' }, HOY);
  assert.match(e.numero, /no es válido/);
  assert.match(e.titular, /titular/);
  assert.match(e.vencimiento, /vencida/);
  assert.match(e.cvv, /3 dígitos/);
  assert.match(validarTarjeta({ ...valida, numero: '378282246310005', cvv: '123' }, HOY).cvv, /4 dígitos/);
});

test('Moneda: InputMoneda bloquea letras, negativos y más de 2 decimales y completa a 2 decimales', () => {
  assert.equal(mascaraMoneda('-12a.5'), '12.5');
  assert.equal(mascaraMoneda('3.999'), '3.99');
  assert.equal(completarDecimales('5'), '5.00');
  assert.equal(completarDecimales('12.5'), '12.50');
});

test('Referencia de transferencia: alfanumérica en mayúsculas, sin espacios, 6 a 20', () => {
  assert.equal(mascaraReferenciaTransferencia('trx 12-34_56'), 'TRX123456');
  assert.equal(mascaraReferenciaTransferencia('A'.repeat(30)).length, 20);
  assert.equal(validarReferenciaTransferencia('TRX123'), '');
  assert.match(validarReferenciaTransferencia('AB12'), /6 a 20/);
  assert.match(validarReferenciaTransferencia(''), /Escribe/);
});

// ── Reglas de monto en transferencia ─────────────────────────────────────────
test('Transferencia: menor bloquea, igual confirma y mayor muestra el excedente (no es vuelto)', () => {
  assert.equal(evaluarMontoTransferencia('9.99', '10.00').estado, 'insuficiente');
  assert.equal(evaluarMontoTransferencia('9.99', '10.00').faltante, '0.01');
  assert.equal(evaluarMontoTransferencia('10.00', '10.00').estado, 'exacto');
  const mayor = evaluarMontoTransferencia('12.50', '10.00');
  assert.equal(mayor.estado, 'excedente');
  assert.equal(mayor.excedente, '2.50');
  assert.match(mayor.mensaje, /No se entrega vuelto/);
  assert.equal(evaluarMontoTransferencia('0.00', '10.00').estado, 'invalido');
  assert.equal(evaluarMontoTransferencia('', '10.00').estado, 'invalido');
});

test('QR: codifica ARTESA-SIM|sucursal|monto|referencia', () => {
  assert.equal(textoQrTransferencia({ sucursal: 'Centro', monto: '4.50', referencia: 'COB1' }), 'ARTESA-SIM|Centro|4.50|COB1');
});

// ── Procesamiento simulado ───────────────────────────────────────────────────
test('Tarjeta simulada: 4242… aprueba y devuelve solo marca, últimos 4 y autorización', async () => {
  const r = await procesarPagoTarjeta(valida, sinEspera);
  assert.deepEqual(Object.keys(r).sort(), ['autorizacion', 'marca', 'ultimos4']);
  assert.equal(r.marca, 'VISA');
  assert.equal(r.ultimos4, '4242');
  assert.match(r.autorizacion, /^\d{6}$/);
});

test('Tarjeta simulada: 4000 0000 0000 0002 rechaza con "Tarjeta rechazada (simulación)"', async () => {
  await assert.rejects(
    procesarPagoTarjeta({ ...valida, numero: '4000 0000 0000 0002' }, sinEspera),
    /Tarjeta rechazada \(simulación\)/,
  );
});

// ── Backend: no se persisten datos sensibles ─────────────────────────────────
const venta = (pago) => ({
  id_turno: '6f1c2a3b-1111-4222-8333-944455556666', tipo_comprobante: 'FCF',
  items: [{ id_producto: 1, cantidad: 1 }], pagos: [pago],
});
const tarjetaOk = { metodo: 'TARJETA', monto: '5.00', referencia: '123456', simulado: true, tarjeta: { marca: 'VISA', ultimos4: '4242' } };

test('Backend: acepta tarjeta simulada con marca y últimos 4', () => {
  assert.equal(registrarVentaSchema.safeParse(venta(tarjetaOk)).success, true);
});

test('Backend: rechaza número completo, CVV o vencimiento en el pago o dentro de tarjeta', () => {
  for (const extra of [{ numero: '4242424242424242' }, { cvv: '123' }, { vencimiento: '12/28' }]) {
    assert.equal(registrarVentaSchema.safeParse(venta({ ...tarjetaOk, ...extra })).success, false, Object.keys(extra)[0]);
    const anidado = { ...tarjetaOk, tarjeta: { ...tarjetaOk.tarjeta, ...extra } };
    assert.equal(registrarVentaSchema.safeParse(venta(anidado)).success, false);
  }
  assert.equal(registrarVentaSchema.safeParse(venta({ ...tarjetaOk, tarjeta: { marca: 'VISA', ultimos4: '424242' } })).success, false);
});

test('Backend: lo que llega a la BD no contiene datos sensibles', () => {
  const datos = { ...registrarVentaSchema.parse(venta(tarjetaOk)).pagos[0] };
  const fila = { ...aPagoVenta(datos), ...aMetadatosSimulacion(datos) };
  assert.deepEqual(Object.keys(fila).sort(), ['marca_tarjeta', 'metodo', 'monto', 'monto_recibido', 'referencia', 'simulado', 'ultimos4']);
  assert.doesNotMatch(JSON.stringify(fila), /4242424242424242|cvv|vencimiento/i);
});

test('Backend: transferencia valida referencia 6-20 y monto transferido >= monto aplicado', () => {
  const t = { metodo: 'TRANSFERENCIA', monto: '5.00', monto_recibido: '6.00', referencia: 'TRX123456', simulado: true };
  assert.equal(registrarVentaSchema.safeParse(venta(t)).success, true);
  assert.equal(registrarVentaSchema.safeParse(venta({ ...t, monto_recibido: '4.99' })).success, false);
  assert.equal(registrarVentaSchema.safeParse(venta({ ...t, referencia: 'TRX-123' })).success, false);
  assert.equal(registrarVentaSchema.safeParse(venta({ ...t, metodo: 'CHEQUE' })).success, false);
  assert.equal(registrarVentaSchema.safeParse(venta({ metodo: 'EFECTIVO', monto: '5.00', simulado: true })).success, false);
});

test('Frontend: el payload del cobro nunca incluye número, CVV ni vencimiento', async () => {
  const modal = await leer('frontend/src/modules/pos/ModalCobro.jsx');
  const payload = modal.slice(modal.indexOf('const payload'), modal.indexOf('registrarVenta(payload)'));
  assert.doesNotMatch(payload.replace(/\/\/.*/g, ''), /numero|cvv|vencimiento/i);
  assert.match(payload, /ultimos4/);
  const panel = await leer('frontend/src/modules/pos/pagosSimulados/PagoTarjeta.jsx');
  assert.match(panel, /type="password"/); // CVV enmascarado
  assert.doesNotMatch(panel, /localStorage|sessionStorage|console\./);
});

test('Migración 024: columnas simulado/marca/ultimos4 con paridad init 26', async () => {
  const mig = await leer('database/migrations/024_pos_pagos_simulados.sql');
  assert.equal(mig, await leer('database/init/26_pos_pagos_simulados.sql'));
  assert.match(mig, /simulado\s+BOOLEAN NOT NULL DEFAULT FALSE/);
  assert.match(mig, /ultimos4 ~ '\^\[0-9\]\{4\}\$'/);
  assert.doesNotMatch(mig.replace(/--.*/g, ''), /cvv|numero_tarjeta|vencimiento\s+(VARCHAR|DATE|CHAR)/i);
});
