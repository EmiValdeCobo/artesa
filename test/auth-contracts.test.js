import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { loginSchema } from '../backend/src/modules/auth/auth.schemas.js';

const leer = (archivo) => readFile(new URL(`../${archivo}`, import.meta.url), 'utf8');
const auth = (archivo) => leer(`backend/src/modules/auth/${archivo}`);

// ─────────────────────────────────────────────────────────────────────────────
// 1. RUTAS Y RATE LIMITING
// ─────────────────────────────────────────────────────────────────────────────
test('auth: loginLimiter protege endpoints de login con límite estricto de intentos', async () => {
  const routes = await auth('auth.routes.js');
  const controller = await auth('auth.controller.js');

  assert.match(routes, /router\.post\('\/login',\s*controller\.loginLimiter/);
  assert.match(routes, /router\.post\('\/cliente\/login',\s*controller\.loginLimiter/);
  assert.match(controller, /limit:\s*5/);
  assert.match(controller, /windowMs:\s*15\s*\*\s*60\s*\*\s*1000/);
});

test('auth: rutas protegidas diferencian portal admin y cliente', async () => {
  const routes = await auth('auth.routes.js');
  assert.match(routes, /router\.post\('\/logout',\s*authenticate/);
  assert.match(routes, /router\.get\('\/me',\s*authenticate,\s*requireTipo\('admin'\)/);
  assert.match(routes, /router\.get\('\/cliente\/me',\s*authenticate,\s*requireTipo\('cliente'\)/);
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. SCHEMAS ZOD
// ─────────────────────────────────────────────────────────────────────────────
test('auth schema: loginSchema valida username y password no vacíos', () => {
  const valido = loginSchema.parse({ username: 'admin', password: 'Password123*' });
  assert.equal(valido.username, 'admin');
  assert.equal(valido.password, 'Password123*');

  assert.throws(() => loginSchema.parse({ username: '', password: '123' }));
  assert.throws(() => loginSchema.parse({ username: '   ', password: '123' }));
  assert.throws(() => loginSchema.parse({ username: 'admin', password: '' }));
  assert.throws(() => loginSchema.parse({}));
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. SERVICE Y SEGURIDAD DE SESIÓN
// ─────────────────────────────────────────────────────────────────────────────
test('auth service: cookies de sesión usan httpOnly y ruta raíz', async () => {
  const service = await auth('auth.service.js');
  assert.match(service, /httpOnly:\s*true/);
  assert.match(service, /path:\s*'\/'/);
  assert.match(service, /sameSite:\s*env\.cookieSameSite/);
  assert.match(service, /secure:\s*env\.cookieSecure/);
});

test('auth service: revalida que el usuario esté activo (activo === true) antes de permitir login', async () => {
  const service = await auth('auth.service.js');
  assert.match(service, /usuario\.activo/);
  assert.match(service, /bcrypt\.compare/);
});

test('auth service: error de login es genérico (401) para no filtrar existencia de usuario', async () => {
  const service = await auth('auth.service.js');
  assert.match(service, /Usuario o contraseña incorrectos.*401|401.*Usuario o contraseña incorrectos/s);
});

test('auth controller: token se remueve del body de respuesta JSON y viaja solo en cookie', async () => {
  const controller = await auth('auth.controller.js');
  assert.match(controller, /res\.cookie\('artesa_session'/);
  assert.match(controller, /delete sesion\.token/);
  assert.match(controller, /res\.clearCookie\('artesa_session'/);
  assert.match(controller, /res\.status\(204\)\.send\(\)/);
});
