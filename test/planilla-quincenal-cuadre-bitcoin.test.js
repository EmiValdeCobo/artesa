import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { periodoFinalizado, rangoPeriodo } from '../backend/src/modules/rrhh/planilla.service.js';
import { periodoSchema } from '../backend/src/modules/rrhh/planilla.schemas.js';
import { registrarVentaSchema } from '../backend/src/modules/pos/ventas/ventas.schemas.js';
import { cerrarTurnoSchema } from '../backend/src/modules/caja/caja.schemas.js';
import { validarReferenciaPago } from '../frontend/src/utils/mascaras.js';

test('planilla: rango mensual y de cada quincena (incluye febrero bisiesto)', () => {
  assert.deepEqual(rangoPeriodo({ periodo: '2028-02' }), { inicio: '2028-02-01', fin: '2028-02-29' });
  assert.deepEqual(rangoPeriodo({ periodo: '2026-11', tipoPeriodo: 'QUINCENAL', quincena: 1 }), { inicio: '2026-11-01', fin: '2026-11-15' });
  assert.deepEqual(rangoPeriodo({ periodo: '2026-12', tipoPeriodo: 'QUINCENAL', quincena: 2 }), { inicio: '2026-12-16', fin: '2026-12-31' });
});

test('planilla: QUINCENAL exige la quincena y MENSUAL sigue siendo el valor por defecto', () => {
  assert.equal(periodoSchema.safeParse({ idSucursal: 1, periodo: '2026-11', tipoPeriodo: 'QUINCENAL' }).success, false);
  assert.equal(periodoSchema.parse({ idSucursal: 1, periodo: '2026-11' }).tipoPeriodo, 'MENSUAL');
  assert.equal(periodoSchema.parse({ idSucursal: 1, periodo: '2026-11', tipoPeriodo: 'QUINCENAL', quincena: '2' }).quincena, 2);
});

test('planilla: solo permite períodos cuya fecha final ya pasó', () => {
  assert.equal(periodoFinalizado({ periodo: '2026-10', tipoPeriodo: 'MENSUAL' }, '2026-11-20'), true);
  assert.equal(periodoFinalizado({ periodo: '2026-11', tipoPeriodo: 'QUINCENAL', quincena: 1 }, '2026-11-20'), true);
  assert.equal(periodoFinalizado({ periodo: '2026-11', tipoPeriodo: 'MENSUAL' }, '2026-11-20'), false);
  assert.equal(periodoFinalizado({ periodo: '2026-11', tipoPeriodo: 'QUINCENAL', quincena: 2 }, '2026-11-20'), false);
  assert.equal(periodoFinalizado({ periodo: '2026-12', tipoPeriodo: 'MENSUAL' }, '2026-11-20'), false);
});

const venta = (pago) => ({ id_turno: '7c1a3f0e-1b2c-4d5e-8f90-123456789abc', tipo_comprobante: 'FCF', items: [{ id_producto: 1, cantidad: 1 }], pagos: [pago] });

test('pagos: cada método no en efectivo exige su comprobante con formato propio', () => {
  const ok = (metodo, referencia) => registrarVentaSchema.safeParse(venta({ metodo, monto: '3.50', referencia })).success;
  assert.equal(ok('EFECTIVO', null), true);
  assert.equal(ok('TARJETA', null), false);
  assert.equal(ok('TARJETA', '123456'), true);
  assert.equal(ok('TARJETA', 'ABC123'), false);
  assert.equal(ok('TRANSFERENCIA', 'TRX20261119001'), true);
  assert.equal(ok('BITCOIN_CHIVO', 'a'.repeat(64)), true); // hash Lightning
  assert.equal(ok('BITCOIN_CHIVO', '1234'), false);
});

test('pagos: el frontend valida con las mismas reglas que el backend', () => {
  assert.equal(validarReferenciaPago('EFECTIVO', ''), '');
  assert.notEqual(validarReferenciaPago('BITCOIN_CHIVO', ''), '');
  assert.equal(validarReferenciaPago('BITCOIN_CHIVO', 'f'.repeat(64)), '');
  assert.equal(validarReferenciaPago('TARJETA', '654321'), '');
});

test('caja: el cierre recibe Bitcoin/Chivo aparte de las transferencias', () => {
  const datos = cerrarTurnoSchema.parse({ efectivo: '10.00', tarjeta: '0.00', digital: '5.00', bitcoin: '18.75' });
  assert.equal(datos.bitcoin, '18.75');
  assert.equal(cerrarTurnoSchema.parse({ efectivo: '1.00', tarjeta: '0.00', digital: '0.00' }).bitcoin, '0.00');
});

test('migración 019 idéntica en database/init (paridad) y separa Bitcoin en la vista de cuadre', () => {
  const mig = readFileSync('database/migrations/019_planilla_quincenal_cuadre_bitcoin.sql', 'utf8');
  assert.equal(readFileSync('database/init/21_planilla_quincenal_cuadre_bitcoin.sql', 'utf8'), mig);
  assert.match(mig, /FILTER \(WHERE p\.metodo = 'BITCOIN_CHIVO'\) AS bitcoin/);
  assert.match(mig, /tipo_periodo IN \('QUINCENAL','MENSUAL'\)/);
  assert.match(mig, /WHERE tipo_periodo=pl\.tipo_periodo/);
});
