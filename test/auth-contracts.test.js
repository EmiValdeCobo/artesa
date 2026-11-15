import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { loginSchema } from '../backend/src/modules/auth/auth.schemas.js';
import { contextoSolicitud, obtenerContextoSolicitud } from '../backend/src/utils/requestContext.js';

const leer = (archivo) => readFile(new URL(`../${archivo}`, import.meta.url), 'utf8');
const auth = (archivo) => leer(`backend/src/modules/auth/${archivo}`);

// ─────────────────────────────────────────────────────────────────────────────
// 1. RUTAS Y RATE LIMITING
// ─────────────────────────────────────────────────────────────────────────────
test('auth: loginLimiter protege endpoints de login con límite estricto de intentos y skipSuccessfulRequests', async () => {
  const routes = await auth('auth.routes.js');
  const controller = await auth('auth.controller.js');

  assert.match(routes, /router\.post\('\/login',\s*controller\.loginLimiter/);
  assert.match(routes, /router\.post\('\/cliente\/login',\s*controller\.loginLimiter/);
  assert.match(controller, /limit:\s*5/);
  assert.match(controller, /windowMs:\s*15\s*\*\s*60\s*\*\s*1000/);
  assert.match(controller, /skipSuccessfulRequests:\s*true/);
});

test('auth infra: app configura trust proxy y env.trustProxy permite reversar proxies', async () => {
  const appFile = await leer('backend/src/app.js');
  const envFile = await leer('backend/src/config/env.js');

  assert.match(appFile, /app\.set\('trust proxy',\s*env\.trustProxy\)/);
  assert.match(envFile, /trustProxy:\s*parseTrustProxy\(process\.env\.TRUST_PROXY\)/);
});

test('auth contexto: contextoSolicitud captura IP real del cliente con trust proxy', () => {
  let storeCapturado = null;
  const mockReq = {
    ip: '198.51.100.77',
    socket: { remoteAddress: '172.18.0.2' },
    get: (cabecera) => (cabecera.toLowerCase() === 'user-agent' ? 'Mozilla/5.0 Agente' : undefined),
  };

  contextoSolicitud(mockReq, {}, () => {
    storeCapturado = obtenerContextoSolicitud();
  });

  assert.equal(storeCapturado.ip, '198.51.100.77', 'La IP de auditoría debe ser la IP del cliente (req.ip)');
  assert.equal(storeCapturado.agente, 'Mozilla/5.0 Agente');
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

test('auth timing-attack: login mitiga timing attacks comparando contra DUMMY_HASH cuando el usuario no existe', async () => {
  const service = await auth('auth.service.js');
  assert.match(service, /DUMMY_HASH/);
  assert.match(service, /hashComparar\s*=\s*usuario\?\.password_hash\s*\|\|\s*DUMMY_HASH/);
  assert.match(service, /hashComparar\s*=\s*cliente\?\.password_hash\s*\|\|\s*DUMMY_HASH/);
});

test('auth revocación: controller logout revoca el jti y middleware authenticate rechaza tokens revocados', async () => {
  const controller = await auth('auth.controller.js');
  const middleware = await leer('backend/src/middlewares/auth.js');

  assert.match(controller, /service\.revocarToken\(req\.user\.jti/);
  assert.match(middleware, /esTokenRevocado\(payload\.jti\)/);
  assert.match(middleware, /Token revocado/);
});

test('auth service: revocarToken almacena jti y esTokenRevocado lo detecta de inmediato', async () => {
  const { revocarToken, esTokenRevocado } = await import('../backend/src/modules/auth/auth.service.js');
  const testJti = 'test-jti-uuid-' + Date.now();

  assert.equal(await esTokenRevocado(testJti), false, 'Token nuevo no debe estar revocado');

  await revocarToken(testJti, Math.floor(Date.now() / 1000) + 3600, 'usuario-test');

  assert.equal(await esTokenRevocado(testJti), true, 'Token revocado debe retornar true');
});

test('database: migración 011 e init 14 sincronizadas con seguridad.tokens_revocados', async () => {
  const [migracion, init] = await Promise.all([
    leer('database/migrations/011_revocacion_tokens.sql'),
    leer('database/init/14_revocacion_tokens.sql'),
  ]);

  const cuerpoMigracion = migracion.slice(migracion.indexOf('\n')).trim();
  const cuerpoInit = init.slice(init.indexOf('\n')).trim();
  assert.equal(cuerpoMigracion, cuerpoInit, 'El cuerpo de la migración 011 y el init 14 deben ser idénticos');
  assert.match(migracion, /CREATE TABLE IF NOT EXISTS seguridad\.tokens_revocados/);
  assert.match(migracion, /jti VARCHAR\(64\) PRIMARY KEY/);
  assert.match(migracion, /idx_tokens_revocados_expiracion/);
  assert.match(migracion, /GRANT SELECT, INSERT, UPDATE, DELETE ON seguridad\.tokens_revocados TO web_user/);
});
