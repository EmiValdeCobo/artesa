import test from 'node:test';
import assert from 'node:assert/strict';
import {
  capitalizar,
  formatoDinero,
  formatoDineroCorto,
  formatoEntero,
  formatearUnidades,
  enteroParaInput,
  fechaLocal,
  fechaISODelNegocio,
  haceCuanto,
} from '../frontend/src/utils/formato.js';
import { traducirError } from '../frontend/src/errors/traducirError.js';
import { ErrorApi } from '../frontend/src/errors/ErrorApi.js';

// ─────────────────────────────────────────────────────────────────────────────
// 1. UTILIDADES DE FORMATO (frontend/src/utils/formato.js)
// ─────────────────────────────────────────────────────────────────────────────
test('formato: capitalizar convierte el primer carácter a mayúscula', () => {
  assert.equal(capitalizar('hola mundo'), 'Hola mundo');
  assert.equal(capitalizar('san salvador'), 'San salvador');
  assert.equal(capitalizar(''), '');
});

test('formato: formatoDinero maneja números y strings numéricos sin perder decimales', () => {
  // Debe incluir el símbolo de dólar y 2 decimales
  assert.match(formatoDinero(12.5), /\$12\.50/);
  assert.match(formatoDinero('100.99'), /\$100\.99/);
  assert.match(formatoDinero(null), /\$0\.00/);
  assert.match(formatoDinero(undefined), /\$0\.00/);
});

test('formato: formatoDineroCorto redondea a 0 decimales para tarjetas de resumen', () => {
  const corto = formatoDineroCorto(1250.75);
  assert.match(corto, /\$1.*251/);
});

test('formato: formatoEntero da formato a números enteros', () => {
  assert.equal(formatoEntero(1500), '1,500');
  assert.equal(formatoEntero(0), '0');
});

test('formato: formatearUnidades renderiza unidades enteras eliminando decimales de PostgreSQL', () => {
  assert.equal(formatearUnidades('1.0000'), '1');
  assert.equal(formatearUnidades('18.00'), '18');
  assert.equal(formatearUnidades(250), '250');
  assert.equal(formatearUnidades('50.0000'), '50');
  assert.equal(formatearUnidades(null), '0');
  assert.equal(formatearUnidades(undefined), '0');
  assert.equal(formatearUnidades(''), '0');
  assert.equal(formatearUnidades(1500), '1,500');
});

test('formato: enteroParaInput limpia valores para campos numéricos enteros', () => {
  assert.equal(enteroParaInput('1.0000'), '1');
  assert.equal(enteroParaInput('18.00'), '18');
  assert.equal(enteroParaInput('50.0000'), '50');
  assert.equal(enteroParaInput(250), '250');
  assert.equal(enteroParaInput(null), '');
  assert.equal(enteroParaInput(undefined), '');
  assert.equal(enteroParaInput(''), '');
});

test('formato: fechaLocal genera un objeto Date sin desfase de zona horaria', () => {
  const d = fechaLocal('2026-11-09');
  assert.equal(d.getFullYear(), 2026);
  assert.equal(d.getMonth(), 10); // 0-indexed -> 10 es noviembre
  assert.equal(d.getDate(), 9);
});

test('formato: fechaISODelNegocio retorna fecha YYYY-MM-DD en la zona del negocio', () => {
  // 2026-11-10T04:00:00Z corresponde a 2026-11-09 a las 22:00 en El Salvador (UTC-6)
  const instanteUtc = new Date('2026-11-10T04:00:00Z').getTime();
  assert.equal(fechaISODelNegocio(instanteUtc), '2026-11-09');
});

test('formato: haceCuanto retorna etiquetas relativas legibles', () => {
  const ahora = new Date('2026-11-09T12:00:00Z').getTime();

  // 10 segundos atrás
  assert.equal(haceCuanto('2026-11-09T11:59:50Z', ahora), 'hace un momento');

  // 5 minutos atrás
  assert.equal(haceCuanto('2026-11-09T11:55:00Z', ahora), 'hace 5 min');

  // 3 horas atrás
  assert.equal(haceCuanto('2026-11-09T09:00:00Z', ahora), 'hace 3 h');

  // 2 días atrás
  assert.equal(haceCuanto('2026-11-07T12:00:00Z', ahora), 'hace más de un día');
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. TRADUCCIÓN DE ERRORES (frontend/src/errors/traducirError.js)
// ─────────────────────────────────────────────────────────────────────────────
test('traducirError: mapea errores de red y timeout a mensajes claros en español', () => {
  const errorRed = new ErrorApi({ tipoFallo: 'red' });
  const traducidoRed = traducirError(errorRed);
  assert.equal(traducidoRed.canal, 'toast');
  assert.match(traducidoRed.titulo, /Sin conexión con el servidor/i);

  const errorTimeout = new ErrorApi({ tipoFallo: 'timeout', metodo: 'GET' });
  const traducidoTimeout = traducirError(errorTimeout);
  assert.equal(traducidoTimeout.reintentable, true);
  assert.match(traducidoTimeout.titulo, /La respuesta tardó demasiado/i);
});

test('traducirError: en el endpoint de login un 401 significa credenciales incorrectas', () => {
  const errorLogin = new ErrorApi({
    status: 401,
    endpoint: '/api/auth/login',
    metodo: 'POST',
    mensajeServidor: 'Usuario o contraseña incorrectos',
  });
  const traducido = traducirError(errorLogin);
  assert.equal(traducido.canal, 'banner');
  assert.equal(traducido.titulo, 'No pudimos iniciar sesión');
});

test('traducirError: maneja errores de validación asignando campos específicos', () => {
  const errorVal = new ErrorApi({
    status: 400,
    detalles: [
      { campo: 'codigoEstablecimiento', mensaje: 'Debe tener 4 caracteres' },
      { campo: 'nombre', mensaje: 'El nombre es obligatorio' },
    ],
  });
  const traducido = traducirError(errorVal);
  assert.equal(traducido.canal, 'campo');
  assert.ok(traducido.campos.codigoEstablecimiento);
  assert.ok(traducido.campos.nombre);
});

test('traducirError: un nombre duplicado de inventario se marca como duplicado', () => {
  const error = new ErrorApi({ status: 409, mensajeServidor: 'Ya existe un registro con ese código o nombre' });
  const traducido = traducirError(error);
  assert.equal(traducido.id, 'DUPLICADO');
  assert.match(traducido.accion, /Cambia el nombre o el código/i);
  assert.ok(traducido.campos.nombre);
});
