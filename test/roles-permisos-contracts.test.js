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

test('roles y permisos: el borrado lógico protege roles con usuarios y nombres reutilizables', async () => {
  const service = await leer('backend/src/modules/seguridad/seguridad.service.js');
  const repository = await leer('backend/src/modules/seguridad/seguridad.repository.js');
  const migration = await leer('database/migrations/005_rbac_roles_activos.sql');
  assert.match(service, /contarUsuariosPorRol/);
  assert.match(service, /No puedes eliminar un rol que tiene usuarios asignados/);
  assert.match(repository, /paranoid: false/);
  assert.match(migration, /DROP CONSTRAINT IF EXISTS roles_nombre_key/);
  assert.match(migration, /WHERE deleted_at IS NULL/);
});

test('roles y permisos: roles del sistema, privilegios propios y permisos SEG_* quedan protegidos', async () => {
  const service = await leer('backend/src/modules/seguridad/seguridad.service.js');
  assert.match(service, /validarRolGestionable/);
  assert.match(service, /Los roles del sistema no se pueden modificar/);
  assert.match(service, /No puedes modificar los privilegios del rol que estás utilizando/);
  assert.match(service, /validarPermisoProtegido/);
  assert.match(service, /SEG_\* están protegidos/);
});

test('roles y permisos: autenticación y autorización excluyen roles eliminados', async () => {
  const auth = await leer('backend/src/middlewares/auth.js');
  const permisos = await leer('backend/src/middlewares/permisos.js');
  const authRepository = await leer('backend/src/modules/auth/auth.repository.js');
  const migration = await leer('database/migrations/005_rbac_roles_activos.sql');
  assert.match(auth, /where: \{ activo: true \}/);
  assert.match(auth, /model: Rol/);
  assert.match(permisos, /r\.deleted_at IS NULL/);
  assert.match(authRepository, /required: true/);
  assert.match(migration, /r\.deleted_at IS NULL/);
});
