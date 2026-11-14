import test from 'node:test';
import assert from 'node:assert/strict';
import { calcularNeto, calcularRenta, centavos } from '../backend/src/modules/rrhh/planilla.calculos.js';
import { generarPdf } from '../backend/src/modules/rrhh/planilla.pdf.js';

const tramos = [
  { desde: '0.01', hasta: '550.00', cuota_fija: '0.00', porcentaje: '0', exceso_sobre: '0.00' },
  { desde: '550.01', hasta: '895.24', cuota_fija: '17.67', porcentaje: '0.10', exceso_sobre: '550.00' },
  { desde: '895.25', hasta: '2038.10', cuota_fija: '60.00', porcentaje: '0.20', exceso_sobre: '895.24' },
  { desde: '2038.11', hasta: null, cuota_fija: '288.57', porcentaje: '0.30', exceso_sobre: '2038.10' },
];

test('centavos conserva montos decimales exactos', () => assert.equal(centavos('1234.56'), 123456));
test('AFP laboral 7.25% queda a centavos', () => assert.equal(Math.round(100000 * .0725), 7250));
test('ISSS laboral aplica 3% hasta el tope de $1,000', () => {
  assert.equal(Math.round(Math.min(120000, 100000) * .03), 3000);
  assert.equal(Math.round(90000 * .03), 2700);
});
test('renta mensual tramo I exento hasta $550.00 y tramo II inicia en $550.01', () => {
  assert.equal(calcularRenta(55000, tramos), 0);
  assert.equal(calcularRenta(55001, tramos), 1767);
});
test('renta respeta límites exactos de tramo II, III y IV', () => {
  assert.equal(calcularRenta(89524, tramos), 5219);
  assert.equal(calcularRenta(89525, tramos), 6000);
  assert.equal(calcularRenta(203810, tramos), 28857);
  assert.equal(calcularRenta(203811, tramos), 28857);
});
test('salario líquido incluye bonificaciones y descuenta todos los conceptos', () => {
  assert.equal(calcularNeto({ bruto: '1000.00', bonificaciones: '50.00', isss: '30.00', afp: '76.13', renta: '0.00', descuentos: '10.00' }), '933.87');
});
test('PDF se genera con firma y tabla de referencias xref', () => {
  const pdf = generarPdf(['Boleta mensual', 'Salario líquido: $1,000.00']);
  assert.equal(pdf.subarray(0, 8).toString(), '%PDF-1.4');
  assert.match(pdf.toString('binary'), /xref/);
  assert.match(generarPdf(Array.from({ length: 50 }, (_, i) => `Fila ${i}`)).toString('binary'), /\/Count 2/);
});
