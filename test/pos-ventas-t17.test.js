/**
 * T17 — Tests de contrato: Backend de Ventas POS
 *
 * Estrategia: tests ESTÁTICOS — leen el código fuente y verifican que
 * cada capa cumpla las reglas del proyecto sin necesidad de levantar la BD.
 * Se ejecutan con: pnpm test "test/pos-ventas-t17.test.js"
 *
 * Estructura:
 *   backend/src/modules/pos/ventas/ventas.{schemas,repository,service,controller,routes}.js
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const leer = (ruta) => readFile(new URL(`../${ruta}`, import.meta.url), 'utf8');
const pos  = (archivo) => leer(`backend/src/modules/pos/ventas/${archivo}`);

// ─────────────────────────────────────────────────────────────────────────────
// 1. RUTAS — seguridad y permisos
// ─────────────────────────────────────────────────────────────────────────────
test('T17 rutas: exigen autenticación admin globalmente', async () => {
  const routes = await pos('ventas.routes.js');
  assert.match(routes, /use\(authenticate, requireTipo\('admin'\)\)/);
});

test('T17 rutas: POST y GET protegidos con POS_COBRAR', async () => {
  const routes = await pos('ventas.routes.js');
  const matches = routes.match(/requirePermiso\('POS_COBRAR'\)/g) ?? [];
  assert.ok(matches.length >= 2, `Se esperaban ≥2 usos de POS_COBRAR, encontrados ${matches.length}`);
});

test('T17 rutas: valida body del POST con registrarVentaSchema', async () => {
  const routes = await pos('ventas.routes.js');
  assert.match(routes, /validate\(registrarVentaSchema\)/);
});

test('T17 rutas: montada en /api/pos/ventas en el index de módulos', async () => {
  const index = await leer('backend/src/modules/index.js');
  assert.match(index, /ventas\/ventas\.routes\.js/);
  assert.match(index, /router\.use\('\/pos\/ventas', ventasRoutes\)/);
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. SCHEMAS ZOD — validaciones de entrada
// ─────────────────────────────────────────────────────────────────────────────
test('T17 schemas: tipo_comprobante solo acepta FCF o CCF', async () => {
  const schemas = await pos('ventas.schemas.js');
  assert.match(schemas, /'FCF'.*'CCF'|'CCF'.*'FCF'/);
});

test('T17 schemas: métodos de pago incluyen los 4 válidos del schema SQL', async () => {
  const schemas = await pos('ventas.schemas.js');
  assert.match(schemas, /EFECTIVO/);
  assert.match(schemas, /TARJETA/);
  assert.match(schemas, /BITCOIN_CHIVO/);
  assert.match(schemas, /TRANSFERENCIA/);
});

test('T17 schemas: monto validado con regex de 2 decimales (no float)', async () => {
  const schemas = await pos('ventas.schemas.js');
  assert.match(schemas, /\\d\+\\.\\d\{2\}/);
});

test('T17 schemas: CCF requiere id_cliente (superRefine)', async () => {
  const schemas = await pos('ventas.schemas.js');
  assert.match(schemas, /superRefine/);
  assert.match(schemas, /CCF.*id_cliente|id_cliente.*CCF/);
});

test('T17 schemas: items requiere al menos 1 producto', async () => {
  const schemas = await pos('ventas.schemas.js');
  assert.match(schemas, /items.*\.min\(1/);
});

test('T17 schemas: pagos requiere al menos 1 pago', async () => {
  const schemas = await pos('ventas.schemas.js');
  assert.match(schemas, /pagos.*\.min\(1/);
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. REPOSITORY — llama la función SQL, nunca reimplementa lógica
// ─────────────────────────────────────────────────────────────────────────────
test('T17 repository: llama pos.fn_registrar_venta con SELECT', async () => {
  const repo = await pos('ventas.repository.js');
  assert.match(repo, /pos\.fn_registrar_venta/);
  assert.match(repo, /SELECT.*pos\.fn_registrar_venta|pos\.fn_registrar_venta.*SELECT/s);
});

test('T17 repository: items y pagos se pasan como ::jsonb (JSON.stringify)', async () => {
  const repo = await pos('ventas.repository.js');
  assert.match(repo, /JSON\.stringify\(items\)/);
  assert.match(repo, /JSON\.stringify\(pagos\)/);
  assert.match(repo, /::jsonb/);
});

test('T17 repository: usa bind params ($1…$7), no interpolación de valores', async () => {
  const repo = await pos('ventas.repository.js');
  assert.match(repo, /\$1.*\$2.*\$3.*\$4.*\$5.*\$6.*\$7/s);
  assert.doesNotMatch(repo, /`[^`]*SELECT[^`]*\$\{(?:req|body|params|user\.)[^`]*`/);
});

test('T17 repository: precio NO se recalcula en JS (no hay cálculos de IVA en código ejecutable)', async () => {
  const repo = await pos('ventas.repository.js');
  // Eliminar líneas de comentario antes de verificar (comentarios pueden mencionar IVA para documentar)
  const sinComentarios = repo.split('\n').filter(l => !l.trim().startsWith('//')).join('\n');
  assert.doesNotMatch(sinComentarios, /\* 0\.13|iva\s*=\s*total|subtotal\s*=\s*precio/i);
});

test('T17 repository: montos de lectura salen como string (cast ::text)', async () => {
  const repo = await pos('ventas.repository.js');
  assert.match(repo, /subtotal::text|iva::text|total::text/);
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. SERVICE — withTransaction, mapeo de errores P0001
// ─────────────────────────────────────────────────────────────────────────────
test('T17 service: registrar venta usa withTransaction', async () => {
  const service = await pos('ventas.service.js');
  assert.match(service, /withTransaction/);
});

test('T17 service: mapea errores P0001 de PostgreSQL a AppError HTTP', async () => {
  const service = await pos('ventas.service.js');
  assert.match(service, /P0001/);
  assert.match(service, /AppError/);
  assert.match(service, /mapearErrorPG/);
});

test('T17 service: turno cerrado → 400', async () => {
  const service = await pos('ventas.service.js');
  assert.match(service, /está cerrado|turno no existe/);
  assert.match(service, /400/);
});

test('T17 service: CCF sin cliente → 400', async () => {
  const service = await pos('ventas.service.js');
  assert.match(service, /CCF requiere cliente/);
  assert.match(service, /400/);
});

test('T17 service: pagos que no cuadran → 400', async () => {
  const service = await pos('ventas.service.js');
  assert.match(service, /no cuadran/);
  assert.match(service, /400/);
});

test('T17 service: venta no encontrada → AppError 404', async () => {
  const service = await pos('ventas.service.js');
  assert.match(service, /Venta no encontrada/);
  assert.match(service, /404/);
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. CONTROLLER — solo HTTP, formato JSend
// ─────────────────────────────────────────────────────────────────────────────
test('T17 controller: POST responde 201', async () => {
  const ctrl = await pos('ventas.controller.js');
  assert.match(ctrl, /res\.status\(201\)/);
});

test('T17 controller: no tiene SQL ni acceso directo a sequelize', async () => {
  const ctrl = await pos('ventas.controller.js');
  assert.doesNotMatch(ctrl, /sequelize|QueryTypes|\.query\(/);
});

test('T17 controller: respuestas usan formato JSend { status, data }', async () => {
  const ctrl = await pos('ventas.controller.js');
  const matches = ctrl.match(/status: 'success'/g) ?? [];
  assert.ok(matches.length >= 2, `Se esperaban ≥2 respuestas JSend success`);
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. DINERO — nunca floats
// ─────────────────────────────────────────────────────────────────────────────
test('T17 dinero: ningún archivo convierte montos a float', async () => {
  const [service, repo, ctrl] = await Promise.all([
    pos('ventas.service.js'),
    pos('ventas.repository.js'),
    pos('ventas.controller.js'),
  ]);
  const codigo = [service, repo, ctrl].join('\n');
  assert.doesNotMatch(
    codigo,
    /parseFloat|Number\(.*monto|Number\(.*precio|Number\(.*total/,
    'El dinero NO debe convertirse a float en ninguna capa',
  );
});
