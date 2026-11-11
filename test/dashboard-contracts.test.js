import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  PERMISOS,
  modoVentas,
  veTodasLasSucursales,
  veImportesDeProductos,
  proyectarTopProductos,
  alertasPermitidas,
} from '../backend/src/modules/dashboard/dashboard.politicas.js';
import {
  ventasDiariasQuery,
  topProductosQuery,
  alertasQuery,
} from '../backend/src/modules/dashboard/dashboard.schemas.js';

const leer = (archivo) => readFile(new URL(`../${archivo}`, import.meta.url), 'utf8');
const dash = (archivo) => leer(`backend/src/modules/dashboard/${archivo}`);

// ─────────────────────────────────────────────────────────────────────────────
// 1. RUTAS Y PERMISOS RBAC
// ─────────────────────────────────────────────────────────────────────────────
test('dashboard: rutas protegidas globalmente con authenticate y requireTipo(admin)', async () => {
  const routes = await dash('dashboard.routes.js');
  assert.match(routes, /router\.use\(authenticate,\s*requireTipo\('admin'\)\)/);
});

test('dashboard: cada endpoint valida query con schema y exige permisos adecuados', async () => {
  const routes = await dash('dashboard.routes.js');
  assert.match(routes, /router\.get\('\/ventas-diarias',\s*requirePermiso\(PERMISOS\.VENTAS_SUCURSAL,\s*PERMISOS\.VENTAS_PROPIAS\),\s*validateQuery\(ventasDiariasQuery\)/);
  assert.match(routes, /router\.get\('\/top-productos',\s*requirePermiso\(PERMISOS\.TOP_PRODUCTOS\),\s*validateQuery\(topProductosQuery\)/);
  assert.match(routes, /router\.get\('\/alertas',\s*requirePermiso\(\.\.\.PERMISOS_ALERTAS\),\s*validateQuery\(alertasQuery\)/);
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. SCHEMAS ZOD
// ─────────────────────────────────────────────────────────────────────────────
test('dashboard schemas: rechazan parámetros desconocidos con strictObject', () => {
  // Parámetros válidos
  assert.doesNotThrow(() => ventasDiariasQuery.parse({ dias: '7', sucursal: '1' }));
  assert.doesNotThrow(() => topProductosQuery.parse({ dias: '14', limite: '10' }));
  assert.doesNotThrow(() => alertasQuery.parse({ sucursal: '2' }));

  // Parámetro desconocido (ej: intentar inyectar idUsuario) debe fallar
  assert.throws(() => ventasDiariasQuery.parse({ dias: '7', idUsuario: 'cualquiera' }));
  assert.throws(() => topProductosQuery.parse({ dias: '7', otroParametro: 'invalido' }));
  assert.throws(() => alertasQuery.parse({ parametroInvalido: 'hack' }));
});

test('dashboard schemas: aplican límites máximos a días y límite de top', () => {
  // Días entre 1 y 90
  assert.throws(() => ventasDiariasQuery.parse({ dias: '0' }));
  assert.throws(() => ventasDiariasQuery.parse({ dias: '91' }));

  // Límite entre 1 y 20
  assert.throws(() => topProductosQuery.parse({ limite: '0' }));
  assert.throws(() => topProductosQuery.parse({ limite: '21' }));
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. POLÍTICAS DE ACCESO (Lógica Pura)
// ─────────────────────────────────────────────────────────────────────────────
test('dashboard políticas: modoVentas identifica alcance sucursal vs propio', () => {
  const adminPermisos = new Set([PERMISOS.VENTAS_SUCURSAL, PERMISOS.VENTAS_PROPIAS]);
  assert.equal(modoVentas(adminPermisos), 'sucursal');

  const cajeroPermisos = new Set([PERMISOS.VENTAS_PROPIAS]);
  assert.equal(modoVentas(cajeroPermisos), 'propio');

  const sinPermisos = new Set();
  assert.equal(modoVentas(sinPermisos), null);
});

test('dashboard políticas: veTodasLasSucursales requiere DASH_TODAS_SUCURSALES', () => {
  assert.equal(veTodasLasSucursales(new Set([PERMISOS.TODAS_SUCURSALES])), true);
  assert.equal(veTodasLasSucursales(new Set([PERMISOS.VENTAS_SUCURSAL])), false);
});

test('dashboard políticas: veImportesDeProductos requiere REP_VER_DASHBOARD', () => {
  assert.equal(veImportesDeProductos(new Set([PERMISOS.VENTAS_SUCURSAL])), true);
  assert.equal(veImportesDeProductos(new Set([PERMISOS.TOP_PRODUCTOS])), false);
});

test('dashboard políticas: proyectarTopProductos enmascara importes si no hay permiso de ventas', () => {
  const filas = [
    { id_producto: 1, nombre: 'Croissant', unidades: 45, ingreso: '112.50' },
    { id_producto: 2, nombre: 'Café Latte', unidades: 30, ingreso: '90.00' },
  ];

  // Sin permiso de ventas: no debe exponer `ingreso`, debe agregar `posicion`
  const proyectadoSinImporte = proyectarTopProductos(filas, new Set([PERMISOS.TOP_PRODUCTOS]));
  assert.equal(proyectadoSinImporte[0].posicion, 1);
  assert.equal(proyectadoSinImporte[0].nombre, 'Croissant');
  assert.equal(proyectadoSinImporte[0].unidades, 45);
  assert.equal(proyectadoSinImporte[0].ingreso, undefined);

  // Con permiso de ventas: expone `ingreso`
  const proyectadoConImporte = proyectarTopProductos(filas, new Set([PERMISOS.VENTAS_SUCURSAL]));
  assert.equal(proyectadoConImporte[0].ingreso, '112.50');
});

test('dashboard políticas: alertasPermitidas filtra catálogo por permisos del usuario', () => {
  const catalogo = [
    { id: 'STOCK', permisos: ['INV_VER_STOCK'] },
    { id: 'TURNO', permisos: ['CAJA_VER_CUADRES', 'CAJA_ABRIR_TURNO'] },
    { id: 'CXP', permisos: ['COM_VER_CXP'] },
  ];

  const usuario = new Set(['INV_VER_STOCK']);
  const permitidas = alertasPermitidas(catalogo, usuario);
  assert.equal(permitidas.length, 1);
  assert.equal(permitidas[0].id, 'STOCK');
});
