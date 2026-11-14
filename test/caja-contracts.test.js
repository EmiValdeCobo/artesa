import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const leer = (archivo) => readFile(new URL(`../${archivo}`, import.meta.url), 'utf8');

test('caja: rutas protegidas con sesión admin y permisos CAJA_*', async () => {
  const routes = await leer('backend/src/modules/caja/caja.routes.js');
  assert.match(routes, /use\(authenticate, requireTipo\('admin'\)\)/);
  assert.match(routes, /requirePermiso\('CAJA_ABRIR_TURNO'\)/);
  assert.match(routes, /requirePermiso\('CAJA_MOVIMIENTOS'\)/);
});

test('caja: el turno único lo respalda la BD y se traduce a 409', async () => {
  const service = await leer('backend/src/modules/caja/caja.service.js');
  assert.match(service, /uq_turno_abierto_caja/);
  assert.match(service, /uq_turno_abierto_usuario/);
  assert.match(service, /409/);
});

test('caja: el dinero nunca se convierte a float', async () => {
  const codigo = [
    await leer('backend/src/modules/caja/caja.service.js'),
    await leer('backend/src/modules/caja/caja.repository.js'),
  ].join('\n');
  assert.doesNotMatch(codigo, /parseFloat|Number\(monto/);
});

test('caja: el cierre valida la tolerancia de descuadre desde el parámetro tolerancia_cuadre', async () => {
  const service = await leer('backend/src/modules/caja/caja.service.js');
  const repo = await leer('backend/src/modules/caja/caja.repository.js');
  assert.match(repo, /fn_param\('tolerancia_cuadre'\)/);
  assert.match(service, /validarToleranciaDescuadre/);
  assert.match(service, /422/);
  // la validación ocurre antes de llamar a la función SQL que cierra el turno
  assert.ok(service.indexOf('await validarToleranciaDescuadre(') < service.indexOf('await repo.cerrarTurno('));
});

