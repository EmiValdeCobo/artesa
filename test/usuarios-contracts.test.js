import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { crearUsuarioSchema, actualizarUsuarioSchema } from '../backend/src/modules/seguridad/seguridad.schemas.js';

const leer = (archivo) => readFile(new URL(`../${archivo}`, import.meta.url), 'utf8');
const seg = (archivo) => leer(`backend/src/modules/seguridad/${archivo}`);

// ─────────────────────────────────────────────────────────────────────────────
// 1. RUTAS Y PERMISOS DE USUARIOS
// ─────────────────────────────────────────────────────────────────────────────
test('usuarios: todas las rutas exigen SEG_GESTIONAR_USUARIOS', async () => {
  const routes = await seg('seguridad.routes.js');
  assert.match(routes, /router\.get\('\/usuarios',\s*requirePermiso\('SEG_GESTIONAR_USUARIOS'\)/);
  assert.match(routes, /router\.post\('\/usuarios',\s*requirePermiso\('SEG_GESTIONAR_USUARIOS'\)/);
  assert.match(routes, /router\.put\('\/usuarios\/:id',\s*requirePermiso\('SEG_GESTIONAR_USUARIOS'\)/);
  assert.match(routes, /router\.patch\('\/usuarios\/:id\/desactivar',\s*requirePermiso\('SEG_GESTIONAR_USUARIOS'\)/);
  assert.match(routes, /router\.patch\('\/usuarios\/:id\/activar',\s*requirePermiso\('SEG_GESTIONAR_USUARIOS'\)/);
  assert.match(routes, /router\.delete\('\/usuarios\/:id\/eliminar',\s*requirePermiso\('SEG_GESTIONAR_USUARIOS'\)/);
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. SCHEMAS ZOD
// ─────────────────────────────────────────────────────────────────────────────
test('usuarios schema: crearUsuarioSchema exige username válido, contraseña >= 8 caracteres y sucursales sin duplicados', () => {
  const datosValidos = {
    username: 'cajero.central',
    password: 'Password123*',
    idRol: '2',
    sucursales: ['1', '2'],
  };

  const parsed = crearUsuarioSchema.parse(datosValidos);
  assert.equal(parsed.username, 'cajero.central');
  assert.equal(parsed.idRol, 2);
  assert.deepEqual(parsed.sucursales, [1, 2]);

  // Contraseña menor a 8 caracteres debe fallar
  assert.throws(() => crearUsuarioSchema.parse({ ...datosValidos, password: 'corta' }));

  // Username con caracteres inválidos
  assert.throws(() => crearUsuarioSchema.parse({ ...datosValidos, username: 'usuario con espacios' }));

  // Sucursales vacías
  assert.throws(() => crearUsuarioSchema.parse({ ...datosValidos, sucursales: [] }));

  // Sucursales duplicadas
  assert.throws(() => crearUsuarioSchema.parse({ ...datosValidos, sucursales: [1, 1] }));
});

test('usuarios schema: actualizarUsuarioSchema permite contraseña opcional o vacía', () => {
  const sinClave = {
    username: 'cajero.central',
    idRol: 2,
    sucursales: [1],
  };
  assert.doesNotThrow(() => actualizarUsuarioSchema.parse(sinClave));

  const conClaveVacia = { ...sinClave, password: '' };
  assert.doesNotThrow(() => actualizarUsuarioSchema.parse(conClaveVacia));

  const conClaveInvalida = { ...sinClave, password: '123' };
  assert.throws(() => actualizarUsuarioSchema.parse(conClaveInvalida));
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. SERVICE Y REGLAS DE SEGURIDAD
// ─────────────────────────────────────────────────────────────────────────────
test('usuarios service: operaciones de escritura usan withTransaction y hashean contraseña con bcrypt', async () => {
  const service = await seg('seguridad.service.js');
  assert.match(service, /crearUsuario[\s\S]*?withTransaction/);
  assert.match(service, /actualizarUsuario[\s\S]*?withTransaction/);
  assert.match(service, /desactivarUsuario[\s\S]*?withTransaction/);
  assert.match(service, /eliminarUsuario[\s\S]*?withTransaction/);
  assert.match(service, /bcrypt\.hash\(datos\.password,\s*10\)/);
});

test('usuarios service: previene auto-bloqueo y auto-eliminación de la cuenta en sesión', async () => {
  const service = await seg('seguridad.service.js');
  assert.match(service, /No puedes cambiarte a otro rol desde tu propia cuenta/);
  assert.match(service, /No puedes desactivar tu propio usuario/);
  assert.match(service, /No puedes eliminar tu propio usuario/);
});

test('usuarios service: valida que el rol y las sucursales existan y estén activas', async () => {
  const service = await seg('seguridad.service.js');
  assert.match(service, /El rol seleccionado no existe o está inactivo/);
  assert.match(service, /Una o más sucursales no existen o están inactivas/);
});
