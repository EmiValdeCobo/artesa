import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const leer = (archivo) => readFile(new URL(`../${archivo}`, import.meta.url), 'utf8');

test('caja: el cierre llama la función SQL y exige dueño del turno', async () => {
  const repo = await leer('backend/src/modules/caja/caja.repository.js');
  const service = await leer('backend/src/modules/caja/caja.service.js');
  assert.match(repo, /pos\.fn_cerrar_turno/);
  assert.match(service, /Solo el cajero del turno puede cerrarlo/);
});

test('reportes: solo lectura protegida con REP_VER_DASHBOARD y costos sensibles', async () => {
  const routes = await leer('backend/src/modules/reportes/reportes.routes.js');
  assert.match(routes, /requirePermiso\('REP_VER_DASHBOARD'\)/);
  assert.match(routes, /requirePermiso\('INV_VER_COSTOS'\)/);
  assert.doesNotMatch(routes, /router\.(post|put|patch|delete)/);
});

test('preparación: solo avanza estados y bloquea la orden', async () => {
  const service = await leer('backend/src/modules/pos/preparacion/preparacion.service.js');
  const repo = await leer('backend/src/modules/pos/preparacion/preparacion.repository.js');
  assert.match(service, /ABIERTA: \['EN_PREPARACION'\]/);
  assert.match(repo, /FOR UPDATE OF o/);
});