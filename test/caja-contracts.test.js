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

test('caja: el cierre lo hace el dueño o un supervisor con CAJA_CERRAR_CUALQUIER_TURNO de la sucursal', async () => {
  const service = await leer('backend/src/modules/caja/caja.service.js');
  const repo = await leer('backend/src/modules/caja/caja.repository.js');
  const migracion = await leer('database/migrations/014_caja_cierre_supervisor.sql');
  assert.match(service, /validarQuienCierra/);
  assert.match(service, /CAJA_CERRAR_CUALQUIER_TURNO/);
  assert.match(service, /Solo el cajero del turno o un supervisor de su sucursal puede cerrarlo/);
  // el supervisor solo puede cerrar turnos de sucursales que tiene asignadas
  assert.match(service, /usuarioTieneSucursal\(userId, turno\.id_sucursal/);
  // la validación de quién cierra ocurre antes de validar la tolerancia y de cerrar
  assert.ok(service.indexOf('await validarQuienCierra(') < service.indexOf('await validarToleranciaDescuadre('));
  // bloquearTurno trae la sucursal del turno
  assert.match(repo, /c\.id_sucursal[\s\S]*FOR UPDATE OF t/);
  // la migración crea el permiso y se lo da a ADMIN y GERENTE_SUCURSAL
  assert.match(migracion, /CAJA_CERRAR_CUALQUIER_TURNO/);
  assert.match(migracion, /'ADMIN'/);
  assert.match(migracion, /'GERENTE_SUCURSAL'/);
});

