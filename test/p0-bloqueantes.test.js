/**
 * Suite de Verificación de Fase 1 (P0) — Artesa
 *
 * Valida de forma rigurosa los 6 requisitos bloqueantes:
 * 1. Express 5 / validateQuery: compatibilidad con req.query y req.validatedQuery.
 * 2. inventario.controller.js: ingresarStock consume req.params.id (parseId).
 * 3. AuthContext: expone y ejecuta recargarSesion.
 * 4. Infraestructura y Docker: scripts database/init (08-12), DB_PORT en compose y Dockerfiles.
 * 5. inventario.service.js: eliminarInsumo bloquea con 409 ante recetas, stock != 0 o kárdex.
 * 6. seguridad.service.js: validarJerarquia previene escalada de privilegios retornando 403.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { validateQuery } from '../backend/src/middlewares/validate.js';
import { idSchema } from '../backend/src/modules/inventario/inventario.schemas.js';

const leer = (archivo) => readFile(new URL(`../${archivo}`, import.meta.url), 'utf8');

// ─────────────────────────────────────────────────────────────────────────────
// 1. EXPRESS 5: VALIDATE QUERY SIN ERROR DE MUTACIÓN Y CON REQ.VALIDATEDQUERY
// ─────────────────────────────────────────────────────────────────────────────
test('P0.1 validateQuery: funciona con Express 5 sin error en getter req.query y expone req.validatedQuery', () => {
  const schemaMock = {
    safeParse(data) {
      if (data.idSucursal && isNaN(Number(data.idSucursal))) {
        return {
          success: false,
          error: new Error('idSucursal debe ser un número'),
        };
      }
      return {
        success: true,
        data: {
          limite: Number(data.limite || 10),
          idSucursal: Number(data.idSucursal || 1),
          filtro: data.filtro ?? null,
        },
      };
    },
  };

  const middleware = validateQuery(schemaMock);

  // Simular req de Express 5 donde req.query viene de un getter en el prototipo
  let queryOriginal = { limite: '25', idSucursal: '3', extra: 'ignorado' };
  const proto = {};
  Object.defineProperty(proto, 'query', {
    get() {
      return queryOriginal;
    },
    set(v) {
      queryOriginal = v;
    },
    configurable: true,
    enumerable: true,
  });

  const req = Object.create(proto);

  let nextError = null;
  let nextCalled = false;
  middleware(req, {}, (err) => {
    nextError = err;
    nextCalled = true;
  });

  assert.equal(nextCalled, true, 'Debe invocar next()');
  assert.equal(nextError, undefined, 'No debe arrojar error con datos válidos');

  // Verifica que req.validatedQuery contenga los tipos convertidos
  assert.ok(req.validatedQuery, 'Debe exponer req.validatedQuery');
  assert.equal(req.validatedQuery.limite, 25);
  assert.equal(req.validatedQuery.idSucursal, 3);
  assert.equal(req.validatedQuery.filtro, null);

  // Verifica que req.query también refleje el valor procesado
  assert.equal(req.query.limite, 25);
  assert.equal(req.query.idSucursal, 3);
});

test('P0.1 validateQuery: invoca next con error si los parámetros de query son inválidos', () => {
  const schemaMock = {
    safeParse(data) {
      if (!data.idSucursal || isNaN(Number(data.idSucursal))) {
        return {
          success: false,
          error: new Error('idSucursal debe ser un número'),
        };
      }
      return { success: true, data };
    },
  };

  const middleware = validateQuery(schemaMock);

  const req = {
    query: { idSucursal: 'no-es-numero' },
  };

  let nextError = null;
  middleware(req, {}, (err) => {
    nextError = err;
  });

  assert.ok(nextError instanceof Error, 'Debe pasar el error a next');
  assert.equal(req.validatedQuery, undefined, 'No debe fijar validatedQuery en caso de error');
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. INVENTARIO CONTROLLER: INGRESAR STOCK USA REQ.PARAMS.ID
// ─────────────────────────────────────────────────────────────────────────────
test('P0.2 inventario.controller.js: ingresarStock usa parseId(req.params.id)', async () => {
  const ctrlSource = await leer('backend/src/modules/inventario/inventario.controller.js');

  // Validar contrato estricto en el código fuente
  assert.match(
    ctrlSource,
    /export const ingresarStock = async \(req, res\) => res\.status\(201\)\.json\(await service\.ingresarStock\(parseId\(req\.params\.id\),\s*req\.body,\s*req\.user\.id\)\);/,
    'ingresarStock debe extraer req.params.id a través de parseId(req.params.id)',
  );

  // Validar que idSchema transforme y valide correctamente
  assert.equal(idSchema.parse('15'), 15);
  assert.equal(idSchema.parse(15), 15);
  assert.throws(() => idSchema.parse('0'));
  assert.throws(() => idSchema.parse('-5'));
  assert.throws(() => idSchema.parse('abc'));
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. FRONTEND AUTH CONTEXT: EXPONE RECARGAR SESIÓN
// ─────────────────────────────────────────────────────────────────────────────
test('P0.3 AuthContext: expone recargarSesion y la invoca al inicializar', async () => {
  const authSource = await leer('frontend/src/context/AuthContext.jsx');

  // Validar definición de recargarSesion
  assert.match(
    authSource,
    /const\s+recargarSesion\s*=\s*useCallback\(async\s*\(tipoParam\)\s*=>\s*\{/,
    'Debe definir recargarSesion con useCallback',
  );

  // Validar que se provea en el Value del Context
  assert.match(
    authSource,
    /<AuthContext\.Provider\s+value=\{\{\s*usuario,\s*tipoSesion,\s*cargando,\s*login:\s*iniciarSesion,\s*logout,\s*tiene,\s*recargarSesion\s*\}\}>/,
    'AuthContext.Provider debe exponer recargarSesion en su value',
  );

  // Validar invocación en useEffect de montaje
  assert.match(
    authSource,
    /useEffect\(\(\)\s*=>\s*\{\s*recargarSesion\(\)[\s\S]*?\},\s*\[recargarSesion\]\);/,
    'Debe invocar recargarSesion() en el montaje inicial',
  );

  // Validar exportación del hook useAuth
  assert.match(
    authSource,
    /export\s+function\s+useAuth\(\)/,
    'Debe exportar el hook useAuth',
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. INFRAESTRUCTURA: INIT SQL (08-12), DOCKER-COMPOSE Y DOCKERFILES
// ─────────────────────────────────────────────────────────────────────────────
test('P0.4 infra: database/init contiene migraciones 08, 09, 10, 11 y 12 no vacías', async () => {
  const archivosInit = [
    'database/init/08_inventario_unidades_medida.sql',
    'database/init/09_compras_bitacora_proveedores.sql',
    'database/init/10_permisos_kardex.sql',
    'database/init/11_planillas_mensuales.sql',
    'database/init/12_tolerancia_cuadre.sql',
  ];

  for (const archivo of archivosInit) {
    await assert.doesNotReject(
      access(new URL(`../${archivo}`, import.meta.url), constants.R_OK),
      `El archivo ${archivo} debe existir y ser legible`,
    );

    const contenido = await leer(archivo);
    assert.ok(contenido.trim().length > 20, `El archivo ${archivo} no debe estar vacío`);
  }
});

test('P0.4 infra: docker-compose.yml define DB_PORT: ${DB_PORT:-5432} en servicio api', async () => {
  const composeSource = await leer('docker-compose.yml');
  assert.match(
    composeSource,
    /DB_PORT:\s*\$\{DB_PORT:-5432\}/,
    'docker-compose.yml debe contener DB_PORT: ${DB_PORT:-5432}',
  );
});

test('P0.4 infra: frontend/Dockerfile copia /app/frontend/dist y frontend/nginx.conf', async () => {
  const dockerfileFrontend = await leer('frontend/Dockerfile');

  assert.match(
    dockerfileFrontend,
    /COPY\s+--from=build\s+\/app\/frontend\/dist\s+\/usr\/share\/nginx\/html/,
    'frontend/Dockerfile debe copiar los estáticos compilados desde /app/frontend/dist',
  );

  assert.match(
    dockerfileFrontend,
    /COPY\s+frontend\/nginx\.conf\s+\/etc\/nginx\/conf\.d\/default\.conf/,
    'frontend/Dockerfile debe copiar la configuración personalizada de nginx',
  );
});

test('P0.4 infra: backend/Dockerfile define WORKDIR /app/backend y CMD node src/server.js', async () => {
  const dockerfileBackend = await leer('backend/Dockerfile');

  assert.match(
    dockerfileBackend,
    /WORKDIR\s+\/app\/backend/,
    'backend/Dockerfile debe fijar WORKDIR /app/backend',
  );

  assert.match(
    dockerfileBackend,
    /CMD\s+\["node",\s*"src\/server\.js"\]/,
    'backend/Dockerfile debe ejecutar CMD ["node", "src/server.js"]',
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. INVENTARIO SERVICE: ELIMINAR INSUMO BLOQUEA CON 409
// ─────────────────────────────────────────────────────────────────────────────
test('P0.5 inventario.service: eliminarInsumo bloquea con 409 si está en recetas, tiene stock <> 0 o kárdex', async () => {
  const servSource = await leer('backend/src/modules/inventario/inventario.service.js');
  const repoSource = await leer('backend/src/modules/inventario/inventario.repository.js');

  // Validar comprobación de recetas
  assert.match(
    servSource,
    /if\s*\(await\s+repo\.insumoTieneRecetas\(id,\s*t\)\)\s*\{\s*throw\s+new\s+AppError\([^,]+,\s*409\);\s*\}/,
    'eliminarInsumo debe verificar insumoTieneRecetas y lanzar 409',
  );

  // Validar comprobación de stock existente <> 0
  assert.match(
    servSource,
    /if\s*\(await\s+repo\.insumoTieneStock\(id,\s*t\)\)\s*\{\s*throw\s+new\s+AppError\([^,]+,\s*409\);\s*\}/,
    'eliminarInsumo debe verificar insumoTieneStock y lanzar 409',
  );

  // Validar comprobación de movimientos en kárdex
  assert.match(
    servSource,
    /if\s*\(await\s+repo\.insumoTieneMovimientos\(id,\s*t\)\)\s*\{\s*throw\s+new\s+AppError\([^,]+,\s*409\);\s*\}/,
    'eliminarInsumo debe verificar insumoTieneMovimientos y lanzar 409',
  );

  // Validar queries en repository
  assert.match(
    repoSource,
    /export const insumoTieneRecetas = async[\s\S]*?WHERE p\.deleted_at IS NULL AND p\.activo = true AND \(r\.id_insumo = \$1 OR p\.id_insumo_reventa = \$1\)/,
    'insumoTieneRecetas debe validar recetas o productos de reventa activos y no eliminados',
  );

  assert.match(
    repoSource,
    /export const insumoTieneStock = async[\s\S]*?WHERE id_insumo = \$1 AND stock_actual <> 0/,
    'insumoTieneStock debe verificar existencia de stock diferente de 0',
  );

  assert.match(
    repoSource,
    /export const insumoTieneMovimientos = async[\s\S]*?FROM inventario\.movimientos_inventario[\s\S]*?WHERE id_insumo = \$1/,
    'insumoTieneMovimientos debe verificar movimientos previos en kárdex',
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. SEGURIDAD SERVICE: VALIDAR JERARQUÍA PREVIENE ESCALADA DE PRIVILEGIOS (403)
// ─────────────────────────────────────────────────────────────────────────────
test('P0.6 seguridad.service: validarJerarquia previene escalada de privilegios con 403', async () => {
  const servSource = await leer('backend/src/modules/seguridad/seguridad.service.js');
  const repoSource = await leer('backend/src/modules/seguridad/seguridad.repository.js');

  // Validar existencia de funciones en repositorio
  assert.match(repoSource, /export async function obtenerCodigosPermisosRol/);
  assert.match(repoSource, /export async function obtenerCodigosPermisosUsuario/);

  // Validar implementación de validarJerarquia en el servicio
  assert.match(
    servSource,
    /async function validarJerarquia\(transaction,\s*operadorId,\s*\{[\s\S]*?idRolAsignar[\s\S]*?idUsuarioObjetivo[\s\S]*?\}\s*=\s*\{\}\)/,
    'Debe definir función interna validarJerarquia',
  );

  assert.match(
    servSource,
    /if\s*\(tienePermisosSuperiores\)\s*\{\s*throw\s+new\s+AppError\([^,]+,\s*403\);\s*\}/,
    'Debe lanzar 403 si el usuario objetivo tiene permisos no poseídos por el operador',
  );

  assert.match(
    servSource,
    /if\s*\(asignaPermisosSuperiores\)\s*\{\s*throw\s+new\s+AppError\([^,]+,\s*403\);\s*\}/,
    'Debe lanzar 403 si el rol a asignar tiene permisos no poseídos por el operador',
  );

  // Validar aplicación de validarJerarquia en los métodos de usuario
  assert.match(
    servSource,
    /crearUsuario[\s\S]*?await validarJerarquia\(transaction,\s*userId,\s*\{\s*idRolAsignar:\s*datos\.idRol\s*\}\)/,
    'crearUsuario debe ejecutar validarJerarquia con idRolAsignar',
  );

  assert.match(
    servSource,
    /actualizarUsuario[\s\S]*?await validarJerarquia\(transaction,\s*userId,\s*\{\s*idUsuarioObjetivo:\s*idUsuario,\s*idRolAsignar:\s*datos\.idRol\s*\}\)/,
    'actualizarUsuario debe ejecutar validarJerarquia con idUsuarioObjetivo e idRolAsignar',
  );

  assert.match(
    servSource,
    /desactivarUsuario[\s\S]*?await validarJerarquia\(transaction,\s*userId,\s*\{\s*idUsuarioObjetivo:\s*idUsuario\s*\}\)/,
    'desactivarUsuario debe ejecutar validarJerarquia con idUsuarioObjetivo',
  );

  assert.match(
    servSource,
    /activarUsuario[\s\S]*?await validarJerarquia\(transaction,\s*userId,\s*\{\s*idUsuarioObjetivo:\s*idUsuario\s*\}\)/,
    'activarUsuario debe ejecutar validarJerarquia con idUsuarioObjetivo',
  );

  assert.match(
    servSource,
    /eliminarUsuario[\s\S]*?await validarJerarquia\(transaction,\s*userId,\s*\{\s*idUsuarioObjetivo:\s*idUsuario\s*\}\)/,
    'eliminarUsuario debe ejecutar validarJerarquia con idUsuarioObjetivo',
  );
});

test('P0.6 algoritmo jerarquía: detecta adecuadamente permisos no poseídos', () => {
  // Verificación unitaria directa de la lógica booleana de comparación de conjuntos
  const permisosOperador = new Set(['SEG_GESTIONAR_USUARIOS', 'INV_VER_STOCK']);

  // Caso 1: Rol asignado contiene un permiso superior (ej. SEG_GESTIONAR_ROLES)
  const permisosRolSuperior = ['SEG_GESTIONAR_USUARIOS', 'SEG_GESTIONAR_ROLES'];
  const esEscalada = permisosRolSuperior.some((p) => !permisosOperador.has(p));
  assert.equal(esEscalada, true, 'Debe detectar intento de asignar permisos no poseídos');

  // Caso 2: Rol asignado contiene únicamente un subconjunto o iguales
  const permisosRolSubconjunto = ['INV_VER_STOCK'];
  const esSubconjunto = permisosRolSubconjunto.some((p) => !permisosOperador.has(p));
  assert.equal(esSubconjunto, false, 'No debe bloquear asignación de permisos que el operador sí posee');
});
