/**
 * T02 — Tests de contrato: Backend de Órdenes POS
 *
 * Estrategia: tests ESTÁTICOS — leen el código fuente y verifican que
 * cada capa cumpla las reglas del proyecto sin necesidad de levantar la BD.
 * Se ejecutan con: pnpm test  (desde la raíz)
 *
 * Estructura real de archivos:
 *   backend/src/modules/pos/ordenes/ordenes.{schemas,repository,service,controller,routes}.js
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Helper: resuelve rutas relativas a la raíz del repo
const leer = (ruta) => readFile(new URL(`../${ruta}`, import.meta.url), 'utf8');
const pos  = (archivo) => leer(`backend/src/modules/pos/ordenes/${archivo}`);

// ─────────────────────────────────────────────────────────────────────────────
// 1. RUTAS — seguridad y permisos
// ─────────────────────────────────────────────────────────────────────────────
test('T02 rutas: todas las rutas exigen autenticación admin', async () => {
  const routes = await pos('ordenes.routes.js');
  assert.match(
    routes,
    /use\(authenticate, requireTipo\('admin'\)\)/,
    'El middleware authenticate + requireTipo debe aplicarse globalmente al router',
  );
});

test('T02 rutas: crear y listar exigen POS_CREAR_ORDEN', async () => {
  const routes = await pos('ordenes.routes.js');
  const matches = routes.match(/requirePermiso\('POS_CREAR_ORDEN'\)/g) ?? [];
  assert.ok(
    matches.length >= 2,
    `Se esperaban al menos 2 usos de POS_CREAR_ORDEN, se encontraron ${matches.length}`,
  );
});

test('T02 rutas: cambio de estado exige POS_VER_COLA_PREPARACION', async () => {
  const routes = await pos('ordenes.routes.js');
  assert.match(routes, /requirePermiso\('POS_VER_COLA_PREPARACION'\)/);
});

test('T02 rutas: valida body con schema Zod en POST, PUT y PATCH', async () => {
  const routes = await pos('ordenes.routes.js');
  assert.match(routes, /validate\(crearOrdenSchema\)/);
  assert.match(routes, /validate\(editarOrdenSchema\)/);
  assert.match(routes, /validate\(cambiarEstadoOrdenSchema\)/);
});

test('T02 rutas: registrada bajo /api/pos/ordenes en el index de módulos', async () => {
  const index = await leer('backend/src/modules/index.js');
  assert.match(index, /ordenes\/ordenes\.routes\.js/);
  assert.match(index, /router\.use\('\/pos\/ordenes', ordenesRoutes\)/);
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. SCHEMAS ZOD — validaciones de entrada
// ─────────────────────────────────────────────────────────────────────────────
test('T02 schemas: canal solo acepta MESA | LLEVAR | DOMICILIO', async () => {
  const schemas = await pos('ordenes.schemas.js');
  assert.match(schemas, /'MESA'.*'LLEVAR'.*'DOMICILIO'/);
});

test('T02 schemas: items requiere al menos 1 elemento', async () => {
  const schemas = await pos('ordenes.schemas.js');
  assert.match(schemas, /z\.array\(itemSchema\)\.min\(1/);
});

test('T02 schemas: cantidad de ítem mínimo 1', async () => {
  const schemas = await pos('ordenes.schemas.js');
  assert.match(schemas, /cantidad.*z\.number\(\)\.int\(\)\.min\(1\)/);
});

test('T02 schemas: estados válidos para cambiar estado incluyen ANULADA', async () => {
  const schemas = await pos('ordenes.schemas.js');
  assert.match(schemas, /EN_PREPARACION/);
  assert.match(schemas, /LISTA/);
  assert.match(schemas, /ENTREGADA/);
  assert.match(schemas, /ANULADA/);
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. REPOSITORY — SQL limpio y seguro
// ─────────────────────────────────────────────────────────────────────────────
test('T02 repository: precio_unitario se lee de BD (inventario.productos)', async () => {
  const repo = await pos('ordenes.repository.js');
  assert.match(repo, /inventario\.productos/);
  assert.match(repo, /precio_venta/);
});

test('T02 repository: usa bind params y ANY($1::int[]) para arrays — sin interpolación de datos', async () => {
  const repo = await pos('ordenes.repository.js');
  // Usa bind params ($1, $2…)
  assert.match(repo, /\$1/);
  // Array de IDs pasa como bind param con ANY(), no interpolado
  assert.match(repo, /ANY\(\$1::int\[\]\)/);
  // No hay concatenación de strings SQL con valores que vengan del request (ej. `... ${req.body...}`)
  assert.doesNotMatch(repo, /`[^`]*\$\{(?:req|body|params|user\.|id[A-Z])[^`]*`/);
});

test('T02 repository: bloquea la orden con FOR UPDATE para evitar condiciones de carrera', async () => {
  const repo = await pos('ordenes.repository.js');
  assert.match(repo, /FOR UPDATE OF o/);
});

test('T02 repository: total de orden es SUM calculado en SQL, no en JS', async () => {
  const repo = await pos('ordenes.repository.js');
  assert.match(repo, /SUM\(d\.cantidad \* d\.precio_unitario\)/);
});

test('T02 repository: precio sale como string desde la BD (cast a text o numeric)', async () => {
  const repo = await pos('ordenes.repository.js');
  // precio_venta::text O precio_unitario::text O ::numeric garantizan string, no float
  assert.match(repo, /precio_venta::text|precio_unitario::text|::numeric/);
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. SERVICE — reglas de negocio
// ─────────────────────────────────────────────────────────────────────────────
test('T02 service: todas las escrituras usan withTransaction', async () => {
  const service = await pos('ordenes.service.js');
  const matches = service.match(/withTransaction/g) ?? [];
  assert.ok(
    matches.length >= 3,
    `Se esperaban ≥3 usos de withTransaction (crear, editar, cambiarEstado), se encontraron ${matches.length}`,
  );
});

test('T02 service: precio NO proviene del frontend — se recupera de BD con mapaPrecios', async () => {
  const service = await pos('ordenes.service.js');
  assert.match(service, /obtenerProductosOrden/);
  assert.match(service, /mapaPrecios/);
});

test('T02 service: FSM correcta — ABIERTA permite EN_PREPARACION y ANULADA', async () => {
  const service = await pos('ordenes.service.js');
  assert.match(service, /ABIERTA:\s*\['EN_PREPARACION', 'ANULADA'\]/);
});

test('T02 service: FSM correcta — EN_PREPARACION permite LISTA y ANULADA', async () => {
  const service = await pos('ordenes.service.js');
  assert.match(service, /EN_PREPARACION:\s*\['LISTA', 'ANULADA'\]/);
});

test('T02 service: edición bloqueada si orden no está ABIERTA → lanza 409', async () => {
  const service = await pos('ordenes.service.js');
  assert.match(service, /estado !== 'ABIERTA'/);
  assert.match(service, /409/);
});

test('T02 service: producto inexistente lanza AppError con mensaje descriptivo', async () => {
  const service = await pos('ordenes.service.js');
  assert.match(service, /no existe o está inactivo/);
  assert.match(service, /AppError/);
});

test('T02 service: turno cerrado o inexistente lanza AppError 400', async () => {
  const service = await pos('ordenes.service.js');
  assert.match(service, /turno no existe|no está abierto/);
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. CONTROLLER — solo HTTP, sin lógica de negocio ni SQL
// ─────────────────────────────────────────────────────────────────────────────
test('T02 controller: POST responde 201 al crear', async () => {
  const ctrl = await pos('ordenes.controller.js');
  assert.match(ctrl, /res\.status\(201\)/);
});

test('T02 controller: no tiene SQL ni acceso directo a sequelize', async () => {
  const ctrl = await pos('ordenes.controller.js');
  assert.doesNotMatch(ctrl, /sequelize|QueryTypes|\.query\(/);
});

test('T02 controller: todas las respuestas usan formato JSend { status, data }', async () => {
  const ctrl = await pos('ordenes.controller.js');
  const matches = ctrl.match(/status: 'success'/g) ?? [];
  assert.ok(
    matches.length >= 4,
    `Se esperaban ≥4 respuestas JSend (crear, listar, detalle, editar, estado), se encontraron ${matches.length}`,
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. DINERO — nunca floats
// ─────────────────────────────────────────────────────────────────────────────
test('T02 dinero: ningún archivo convierte montos a float con parseFloat/Number', async () => {
  const [service, repo, ctrl] = await Promise.all([
    pos('ordenes.service.js'),
    pos('ordenes.repository.js'),
    pos('ordenes.controller.js'),
  ]);
  const codigo = [service, repo, ctrl].join('\n');
  assert.doesNotMatch(
    codigo,
    /parseFloat|Number\(.*monto|Number\(.*precio|Number\(.*total/,
    'El dinero NO debe convertirse a float en ninguna capa del módulo de órdenes',
  );
});
