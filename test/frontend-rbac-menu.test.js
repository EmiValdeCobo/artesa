import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ROL_ADMIN,
  PERMISOS_CRITICOS,
  PATRON_CODIGO,
  normalizar,
  agruparPorModulo,
  coincidePermiso,
  validarRol,
  validarPermiso,
} from '../frontend/src/modules/seguridad/rbac.js';
import { menu, filtrarMenu } from '../frontend/src/config/menu.js';

// ─────────────────────────────────────────────────────────────────────────────
// 1. REGLAS RBAC EN FRONTEND (frontend/src/modules/seguridad/rbac.js)
// ─────────────────────────────────────────────────────────────────────────────
test('rbac: rol ADMIN y permisos críticos del sistema están definidos', () => {
  assert.equal(ROL_ADMIN, 'ADMIN');
  assert.ok(PERMISOS_CRITICOS.includes('SEG_GESTIONAR_ROLES'));
  assert.ok(PERMISOS_CRITICOS.includes('SEG_GESTIONAR_USUARIOS'));
});

test('rbac: normalizar remueve acentos y pasa a minúsculas', () => {
  assert.equal(normalizar('Módulo de Panadería'), 'modulo de panaderia');
  assert.equal(normalizar('PLANILLA'), 'planilla');
});

test('rbac: PATRON_CODIGO exige formato de permisos MAYUSCULAS_SNAKE_CASE', () => {
  assert.ok(PATRON_CODIGO.test('POS_COBRAR'));
  assert.ok(PATRON_CODIGO.test('INV_VER_STOCK'));
  assert.ok(PATRON_CODIGO.test('SEG_GESTIONAR_ROLES'));

  // Inválidos: minúsculas, espacios, guión medio, termina en guión bajo
  assert.equal(PATRON_CODIGO.test('pos_cobrar'), false);
  assert.equal(PATRON_CODIGO.test('POS COBRAR'), false);
  assert.equal(PATRON_CODIGO.test('POS-COBRAR'), false);
  assert.equal(PATRON_CODIGO.test('POS_'), false);
});

test('rbac: agruparPorModulo agrupa permisos por su módulo y mantiene etiquetas legibles', () => {
  const permisos = [
    { id_permiso: 1, codigo: 'SEG_GESTIONAR_ROLES', modulo: 'SEGURIDAD', descripcion: 'Roles' },
    { id_permiso: 2, codigo: 'EMP_GESTIONAR_SUCURSALES', modulo: 'EMPRESA', descripcion: 'Sucursales' },
    { id_permiso: 3, codigo: 'SEG_GESTIONAR_USUARIOS', modulo: 'SEGURIDAD', descripcion: 'Usuarios' },
  ];

  const grupos = agruparPorModulo(permisos);
  assert.equal(grupos.length, 2);

  const grupoSeg = grupos.find((g) => g.modulo === 'SEGURIDAD');
  assert.ok(grupoSeg);
  assert.equal(grupoSeg.permisos.length, 2);
  assert.equal(grupoSeg.etiqueta, 'Seguridad');
});

test('rbac: coincidePermiso busca insensible a mayúsculas y acentos', () => {
  const permiso = { codigo: 'RRHH_VER_PLANILLA', modulo: 'RRHH', descripcion: 'Ver la nómina de salarios' };

  assert.equal(coincidePermiso(permiso, 'nomina'), true);
  assert.equal(coincidePermiso(permiso, 'NÓMINA'), true);
  assert.equal(coincidePermiso(permiso, 'rrhh'), true);
  assert.equal(coincidePermiso(permiso, 'inventario'), false);
});

test('rbac: validarRol y validarPermiso validan entradas del formulario', () => {
  // Rol válido
  assert.deepEqual(validarRol({ nombre: 'Supervisor de Barra' }, []), {});

  // Nombre muy corto
  const errNombre = validarRol({ nombre: 'A' }, []);
  assert.ok(errNombre.nombre);

  // Permiso válido
  assert.deepEqual(validarPermiso({ codigo: 'POS_REVERTIR_VENTA', modulo: 'POS' }, []), {});

  // Código inválido
  const errPermiso = validarPermiso({ codigo: 'codigo invalido', modulo: 'POS' }, []);
  assert.ok(errPermiso.codigo);
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. FILTRADO DE MENÚ LATERAL (frontend/src/config/menu.js)
// ─────────────────────────────────────────────────────────────────────────────
test('menu: filtrarMenu muestra Inicio para cualquier usuario autenticado', () => {
  const tieneNinguno = () => false;
  const visible = filtrarMenu(menu, tieneNinguno);

  // La ruta de inicio no requiere permiso
  const inicio = visible.find((item) => item.ruta === '/');
  assert.ok(inicio);
  assert.equal(inicio.texto, 'Inicio');
});

test('menu: filtrarMenu oculta secciones y rutas si el usuario no tiene los permisos', () => {
  // Cajero solo tiene POS_COBRAR y CAJA_ABRIR_TURNO
  const permisosCajero = new Set(['POS_COBRAR', 'CAJA_ABRIR_TURNO']);
  const tiene = (p) => permisosCajero.has(p);

  const visible = filtrarMenu(menu, tiene);
  const seccionOperacion = visible.find((s) => s.seccion === 'Operación');
  assert.ok(seccionOperacion);

  const rutasOperacion = seccionOperacion.items.map((i) => i.ruta);
  assert.ok(rutasOperacion.includes('/pos'));
  assert.ok(rutasOperacion.includes('/caja'));
  assert.equal(rutasOperacion.includes('/inventario'), false);

  // Secciones vacías (como Administración si no tiene permisos) deben desaparecer
  const seccionAdmin = visible.find((s) => s.seccion === 'Administración');
  assert.equal(seccionAdmin, undefined);
});

test('menu: filtrarMenu preserva submenús hijos cuando se tiene el permiso', () => {
  const tieneAdmin = (p) => p === 'SEG_GESTIONAR_ROLES';
  const visible = filtrarMenu(menu, tieneAdmin);

  const seccionAdmin = visible.find((s) => s.seccion === 'Administración');
  assert.ok(seccionAdmin);

  const grupoUsuariosRoles = seccionAdmin.items.find((i) => i.texto === 'Usuarios y roles');
  assert.ok(grupoUsuariosRoles);
  assert.equal(grupoUsuariosRoles.hijos.length, 1);
  assert.equal(grupoUsuariosRoles.hijos[0].ruta, '/seguridad');
});
