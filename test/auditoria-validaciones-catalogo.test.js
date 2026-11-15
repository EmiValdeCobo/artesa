import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { listaBitacoraQuery } from '../backend/src/modules/bitacora/bitacora.schemas.js';
import * as inventarioRepo from '../backend/src/modules/inventario/inventario.repository.js';

const leer = (rel) => fs.readFile(rel, 'utf8');

test('bitácora: migración 010 e init 13 sincronizadas con fn_auditar y triggers', async () => {
  const [migracion, init] = await Promise.all([
    leer('database/migrations/010_auditoria_extendida.sql'),
    leer('database/init/13_auditoria_extendida.sql'),
  ]);

  const cuerpoMigracion = migracion.slice(migracion.indexOf('\n')).trim();
  const cuerpoInit = init.slice(init.indexOf('\n')).trim();
  assert.equal(cuerpoMigracion, cuerpoInit, 'El cuerpo de la migración 010 y el init 13 deben ser idénticos');
  assert.match(migracion, /CREATE OR REPLACE FUNCTION seguridad\.fn_auditar\(\)/);
  assert.match(migracion, /v_accion := 'DELETE';/);
  assert.match(migracion, /v_severidad := 'CRITICAL';/);
  assert.match(migracion, /trg_aud_insumos/);
  assert.match(migracion, /trg_aud_unidades_medida/);
  assert.match(migracion, /trg_aud_usuario_sucursal/);
});

test('bitácora schema: listaBitacoraQuery acepta severity y severidad', () => {
  const parseado1 = listaBitacoraQuery.parse({ severity: 'CRITICAL' });
  assert.equal(parseado1.severity, 'CRITICAL');

  const parseado2 = listaBitacoraQuery.parse({ severidad: 'WARNING' });
  assert.equal(parseado2.severidad, 'WARNING');

  assert.throws(() => listaBitacoraQuery.parse({ severity: 'INVALID' }));
  assert.throws(() => listaBitacoraQuery.parse({ severidad: 'INVALID' }));
});

test('bitácora repository y db: UTC unificado y filtro de severidad', async () => {
  const [repo, db] = await Promise.all([
    leer('backend/src/modules/bitacora/bitacora.repository.js'),
    leer('backend/src/config/db.js'),
  ]);

  assert.match(repo, /b\.creado_en >= now\(\) - INTERVAL '30 days'/);
  assert.doesNotMatch(repo, /America\/El_Salvador/);
  assert.match(repo, /upper\(b\.severidad\) = \$/);

  assert.match(db, /timezone:\s*'\+00:00'/);
});

test('inventario: repositorio soporta buscarProductoPorInsumoReventa y borrado lógico', async () => {
  assert.equal(typeof inventarioRepo.buscarProductoPorInsumoReventa, 'function');

  const [invRepo, dashRepo] = await Promise.all([
    leer('backend/src/modules/inventario/inventario.repository.js'),
    leer('backend/src/modules/dashboard/dashboard.repository.js'),
  ]);

  // Listar productos filtra insumos eliminados en n_ingredientes
  assert.match(invRepo, /COUNT\(\*\)::int FROM inventario\.recetas r JOIN inventario\.insumos ri USING \(id_insumo\) WHERE r\.id_producto = p\.id_producto AND ri\.deleted_at IS NULL/);

  // Alertas de inventario filtran insumos eliminados
  assert.match(invRepo, /JOIN inventario\.insumos i ON i\.nombre = a\.insumo AND i\.deleted_at IS NULL/);

  // Alertas de stock en dashboard filtran insumos eliminados
  assert.match(dashRepo, /WHERE i\.activo AND i\.deleted_at IS NULL AND ss\.id_sucursal = ANY\(\$1::int\[\]\)/);
});

test('inventario service: validaciones de unidad activa y producto de reventa 1:1', async () => {
  const service = await leer('backend/src/modules/inventario/inventario.service.js');

  // Unidad inactiva
  assert.match(service, /No se puede asociar una unidad de medida inactiva/);

  // Producto reventa tipo estricto REVENTA
  assert.match(service, /El insumo asignado para reventa debe ser de tipo REVENTA/);

  // Producto reventa relación estricta 1:1
  assert.match(service, /El insumo de reventa ya está asignado a otro producto/);
});
