import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const leer = (archivo) => readFile(new URL(`../${archivo}`, import.meta.url), 'utf8');

test('roles y permisos: rutas CRUD y asignaciones exigen SEG_GESTIONAR_ROLES', async () => {
  const routes = await leer('backend/src/modules/seguridad/seguridad.routes.js');
  assert.match(routes, /router\.post\('\/roles'.*requirePermiso\('SEG_GESTIONAR_ROLES'\)/s);
  assert.match(routes, /router\.delete\('\/permisos\/:id'.*requirePermiso\('SEG_GESTIONAR_ROLES'\)/s);
  assert.match(routes, /router\.put\('\/roles\/:id\/permisos'.*requirePermiso\('SEG_GESTIONAR_ROLES'\)/s);
  assert.match(routes, /router\.delete\('\/roles\/:id\/permisos\/:idPermiso'.*requirePermiso\('SEG_GESTIONAR_ROLES'\)/s);
});

test('roles y permisos: valida códigos, referencias y duplicados antes de escribir', async () => {
  const schemas = await leer('backend/src/modules/seguridad/seguridad.schemas.js');
  const service = await leer('backend/src/modules/seguridad/seguridad.service.js');
  assert.match(schemas, /MAYÚSCULAS/);
  assert.match(schemas, /No repitas permisos/);
  assert.match(service, /Uno o más permisos no existen/);
  assert.match(service, /Los roles del sistema no se pueden eliminar/);
});

test('roles y permisos: las escrituras usan transacciones con usuario de auditoría', async () => {
  const service = await leer('backend/src/modules/seguridad/seguridad.service.js');
  const models = await leer('backend/src/models/index.js');
  assert.match(service, /withTransaction/);
  assert.match(service, /reemplazarPermisos/);
  assert.match(models, /Rol\.belongsToMany\(Permiso/);
  assert.match(models, /through: RolPermiso/);
});
