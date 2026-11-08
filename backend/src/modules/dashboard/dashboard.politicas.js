// Políticas de acceso del dashboard. Lógica PURA (sin BD ni HTTP): se prueba sin levantar nada.
// Regla de diseño: el servidor decide por PERMISOS, nunca por el nombre del rol. Así un rol creado
// mañana desde "Roles y permisos" funciona sin tocar código.
//
// Matriz (ver docs/dashboard.md):
//   REP_VER_DASHBOARD       → ventas diarias de sus sucursales + importes en el top de productos
//   DASH_VER_MIS_VENTAS     → solo las ventas que ÉL registró (nunca las de otros)
//   DASH_VER_TOP_PRODUCTOS  → ranking por unidades (sin importes si falta REP_VER_DASHBOARD)
//   DASH_TODAS_SUCURSALES   → alcance global; sin él, solo las sucursales de usuario_sucursal
//   Alertas                 → cada tipo exige el permiso de su módulo (ver dashboard.alertas.js)

export const PERMISOS = Object.freeze({
  VENTAS_SUCURSAL: 'REP_VER_DASHBOARD',
  VENTAS_PROPIAS: 'DASH_VER_MIS_VENTAS',
  TOP_PRODUCTOS: 'DASH_VER_TOP_PRODUCTOS',
  TODAS_SUCURSALES: 'DASH_TODAS_SUCURSALES',
  VER_CUADRES: 'CAJA_VER_CUADRES',
});

/** 'sucursal' (todo lo de su alcance) · 'propio' (solo sus ventas) · null (sin acceso). */
export function modoVentas(permisos) {
  if (permisos.has(PERMISOS.VENTAS_SUCURSAL)) return 'sucursal';
  if (permisos.has(PERMISOS.VENTAS_PROPIAS)) return 'propio';
  return null;
}

export const veTodasLasSucursales = (permisos) => permisos.has(PERMISOS.TODAS_SUCURSALES);

/** Los importes (ingreso) del top de productos son información de ventas: exigen el permiso de ventas. */
export const veImportesDeProductos = (permisos) => permisos.has(PERMISOS.VENTAS_SUCURSAL);

/** Quita campos que el rol no debe recibir. Se aplica en el servidor, antes de responder. */
export function proyectarTopProductos(filas, permisos) {
  const conImportes = veImportesDeProductos(permisos);
  return filas.map(({ ingreso, ...resto }, i) => ({ posicion: i + 1, ...resto, ...(conImportes ? { ingreso } : {}) }));
}

/** Entradas del catálogo de alertas que el usuario puede evaluar (basta UNO de los permisos de la entrada). */
export const alertasPermitidas = (catalogo, permisos) => catalogo.filter((a) => a.permisos.some((p) => permisos.has(p)));

// ---------- Parámetros (empresa.parametros) con valores por defecto y topes ----------
const DEFECTOS = Object.freeze({
  zonaHoraria: 'America/El_Salvador',
  caidaVentasPct: 30,
  caidaVentasHoraMin: 11,
  cxpDiasAviso: 3,
  turnoHorasMax: 12,
  anulacionesMaxDia: 3,
  preparacionMinutosMax: 15,
});

const CLAVES = {
  dash_caida_ventas_pct: ['caidaVentasPct', 1, 100],
  dash_caida_ventas_hora_min: ['caidaVentasHoraMin', 0, 23],
  dash_cxp_dias_aviso: ['cxpDiasAviso', 0, 60],
  dash_turno_horas_max: ['turnoHorasMax', 1, 72],
  dash_anulaciones_max_dia: ['anulacionesMaxDia', 1, 100],
  dash_preparacion_minutos_max: ['preparacionMinutosMax', 1, 240],
};

// Solo "Región/Ciudad" o "UTC": el nombre llega a SQL como parámetro, pero así un dato corrupto
// en la tabla nunca provoca un error 500 en todo el dashboard.
const ZONA_VALIDA = /^(UTC|[A-Za-z_]+\/[A-Za-z_+\-/0-9]+)$/;

export function interpretarParametros(filas) {
  const resultado = { ...DEFECTOS };
  for (const { clave, valor } of filas) {
    if (clave === 'zona_horaria') {
      if (ZONA_VALIDA.test(valor)) resultado.zonaHoraria = valor;
      continue;
    }
    const regla = CLAVES[clave];
    if (!regla) continue;
    const [campo, min, max] = regla;
    const numero = Number(valor);
    if (Number.isFinite(numero) && numero >= min && numero <= max) resultado[campo] = Math.trunc(numero);
  }
  return resultado;
}
