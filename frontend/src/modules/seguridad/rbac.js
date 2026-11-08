// Reglas y utilidades de roles y permisos del frontend.
// Sin dependencias de React: se puede probar con `node --test`.
// Las validaciones de formato replican seguridad.schemas.js del backend; las de negocio
// (anti-bloqueo, roles en uso) son EXTRA para evitar errores antes de llamar a la API.
// El backend sigue siendo quien decide: aquí solo se ahorra el viaje y se explica mejor.

export const ROL_ADMIN = 'ADMIN';
// Sin estos permisos nadie podría administrar roles/usuarios: no se pueden revocar a ADMIN ni borrar.
export const PERMISOS_CRITICOS = ['SEG_GESTIONAR_ROLES', 'SEG_GESTIONAR_USUARIOS'];
export const PERMISO_ROLES = 'SEG_GESTIONAR_ROLES';

export const LIMITES = {
  rolNombre: { min: 2, max: 50 },
  descripcion: 500,
  permisoCodigo: { min: 2, max: 80 },
  modulo: { min: 2, max: 50 },
};
export const PATRON_CODIGO = /^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*$/;

const MODULOS_INFO = {
  SEGURIDAD: { etiqueta: 'Seguridad', descripcion: 'Acceso y administración del sistema' },
  EMPRESA: { etiqueta: 'Empresa', descripcion: 'Configuración de sucursales y parámetros' },
  INVENTARIO: { etiqueta: 'Inventario', descripcion: 'Existencias, productos y costos' },
  POS: { etiqueta: 'Punto de venta', descripcion: 'Pedidos, cobros y clientes' },
  CAJA: { etiqueta: 'Caja', descripcion: 'Turnos, movimientos y cuadres' },
  COMPRAS: { etiqueta: 'Compras', descripcion: 'Proveedores y cuentas por pagar' },
  RRHH: { etiqueta: 'Recursos humanos', descripcion: 'Personal, salarios y planilla' },
  REPORTES: { etiqueta: 'Reportes', descripcion: 'Indicadores y reportes del negocio' },
};
const ORDEN_MODULOS = Object.keys(MODULOS_INFO);

// Compara sin mayúsculas ni tildes: "Planilla" encuentra "planilla" y "módulo" encuentra "modulo".
export const normalizar = (texto) => String(texto ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export const infoModulo = (modulo) => {
  const clave = String(modulo ?? '').toUpperCase();
  if (MODULOS_INFO[clave]) return MODULOS_INFO[clave];
  const legible = clave.charAt(0) + clave.slice(1).toLowerCase();
  return { etiqueta: legible || 'Sin módulo', descripcion: 'Permisos agregados a este módulo' };
};

// Agrupa los permisos que vienen de la BD por su columna `modulo` (los módulos nuevos aparecen solos).
export function agruparPorModulo(permisos) {
  const grupos = new Map();
  for (const permiso of permisos) {
    const clave = String(permiso.modulo ?? '').toUpperCase();
    if (!grupos.has(clave)) grupos.set(clave, { modulo: clave, ...infoModulo(clave), permisos: [] });
    grupos.get(clave).permisos.push(permiso);
  }
  const indice = (clave) => { const i = ORDEN_MODULOS.indexOf(clave); return i === -1 ? ORDEN_MODULOS.length : i; };
  return [...grupos.values()].sort((a, b) => indice(a.modulo) - indice(b.modulo) || a.etiqueta.localeCompare(b.etiqueta, 'es'));
}

export function coincidePermiso(permiso, filtro) {
  const buscado = normalizar(filtro).trim();
  if (!buscado) return true;
  return normalizar(`${permiso.descripcion ?? ''} ${permiso.codigo} ${infoModulo(permiso.modulo).etiqueta}`).includes(buscado);
}

// ── Validación de formularios ──────────────────────────────────────────────────

export function validarRol({ nombre = '', descripcion = '' }, { roles = [], idActual = null } = {}) {
  const errores = {};
  const limpio = nombre.trim();
  if (!limpio) errores.nombre = 'Escribe el nombre del rol.';
  else if (limpio.length < LIMITES.rolNombre.min) errores.nombre = `El nombre debe tener al menos ${LIMITES.rolNombre.min} caracteres.`;
  else if (limpio.length > LIMITES.rolNombre.max) errores.nombre = `El nombre debe tener como máximo ${LIMITES.rolNombre.max} caracteres.`;
  else if (roles.some((rol) => rol.id_rol !== idActual && normalizar(rol.nombre) === normalizar(limpio))) {
    errores.nombre = 'Ya existe un rol con ese nombre. Elige otro.';
  }
  if (descripcion.trim().length > LIMITES.descripcion) errores.descripcion = `La descripción debe tener como máximo ${LIMITES.descripcion} caracteres.`;
  return errores;
}

export function validarPermiso({ codigo = '', modulo = '', descripcion = '' }, { permisos = [], idActual = null } = {}) {
  const errores = {};
  const limpioCodigo = codigo.trim();
  if (!limpioCodigo) errores.codigo = 'Escribe el código del permiso.';
  else if (limpioCodigo.length < LIMITES.permisoCodigo.min) errores.codigo = `El código debe tener al menos ${LIMITES.permisoCodigo.min} caracteres.`;
  else if (limpioCodigo.length > LIMITES.permisoCodigo.max) errores.codigo = `El código debe tener como máximo ${LIMITES.permisoCodigo.max} caracteres.`;
  else if (!PATRON_CODIGO.test(limpioCodigo)) errores.codigo = 'Usa MAYÚSCULAS, números y guiones bajos, sin espacios (ej. POS_COBRAR).';
  else if (permisos.some((permiso) => permiso.id_permiso !== idActual && permiso.codigo === limpioCodigo)) errores.codigo = 'Ya existe un permiso con ese código.';

  const limpioModulo = modulo.trim();
  if (!limpioModulo) errores.modulo = 'Escribe o elige el módulo.';
  else if (limpioModulo.length < LIMITES.modulo.min) errores.modulo = `El módulo debe tener al menos ${LIMITES.modulo.min} caracteres.`;
  else if (limpioModulo.length > LIMITES.modulo.max) errores.modulo = `El módulo debe tener como máximo ${LIMITES.modulo.max} caracteres.`;

  if (descripcion.trim().length > LIMITES.descripcion) errores.descripcion = `La descripción debe tener como máximo ${LIMITES.descripcion} caracteres.`;
  return errores;
}

// El backend guarda `null` cuando no hay descripción; así se evita guardar cadenas vacías.
export const descripcionONull = (texto) => texto.trim() || null;

// ── Reglas de negocio (devuelven el motivo del bloqueo o null si se puede) ───────

const esRolAdmin = (rol) => Boolean(rol?.es_sistema) && rol?.nombre === ROL_ADMIN;
const esRolDeLaSesion = (rol, usuarioSesion) => Boolean(usuarioSesion?.rol) && usuarioSesion.rol === rol?.nombre;

export function motivoBloqueoRevocar(rol, codigo, usuarioSesion) {
  if (esRolAdmin(rol) && PERMISOS_CRITICOS.includes(codigo)) return 'Es obligatorio para el rol ADMIN: sin él nadie podría administrar la seguridad.';
  if (codigo === PERMISO_ROLES && esRolDeLaSesion(rol, usuarioSesion)) return 'Es el permiso de tu propio rol: si lo quitas perderías el acceso a esta pantalla.';
  return null;
}

export function motivoBloqueoEliminarRol(rol, { usuariosAsignados = null, usuarioSesion = null } = {}) {
  if (rol.es_sistema) return 'Los roles del sistema no se pueden eliminar.';
  if (!rol.activo) return 'Está inactivo y no se puede modificar desde aquí.';
  if (esRolDeLaSesion(rol, usuarioSesion)) return 'Es el rol con el que iniciaste sesión.';
  if (usuariosAsignados > 0) return `Tiene ${usuariosAsignados} ${usuariosAsignados === 1 ? 'usuario asignado' : 'usuarios asignados'}. Reasígnalos a otro rol antes de eliminarlo.`;
  return null;
}

export const motivoBloqueoPermiso = (permiso) => (PERMISOS_CRITICOS.includes(permiso.codigo)
  ? 'El sistema lo usa para proteger la administración de seguridad; no se puede renombrar ni eliminar.'
  : null);

// ── Selección de permisos de un rol ────────────────────────────────────────────

export const mismosIds = (a, b) => a.length === b.length && a.every((id) => b.includes(id));

export function diferencias(base, seleccion) {
  return {
    agregados: seleccion.filter((id) => !base.includes(id)),
    quitados: base.filter((id) => !seleccion.includes(id)),
  };
}

// Valida la selección completa antes de enviar PUT /roles/:id/permisos.
export function validarAsignacion(rol, idsSeleccionados, permisos, usuarioSesion) {
  const porId = new Map(permisos.map((permiso) => [permiso.id_permiso, permiso]));
  if (!rol?.activo) return 'Este rol está inactivo y no se puede modificar.';
  if (new Set(idsSeleccionados).size !== idsSeleccionados.length) return 'No repitas permisos en la asignación.';
  if (idsSeleccionados.some((id) => !porId.has(id))) return 'Uno de los permisos seleccionados ya no existe. Actualiza la pantalla.';
  const codigos = idsSeleccionados.map((id) => porId.get(id).codigo);
  for (const critico of PERMISOS_CRITICOS) {
    const motivo = codigos.includes(critico) ? null : motivoBloqueoRevocar(rol, critico, usuarioSesion);
    if (motivo) return `No puedes quitar «${critico}». ${motivo}`;
  }
  return null;
}
