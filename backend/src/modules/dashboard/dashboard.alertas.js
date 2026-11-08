import * as repo from './dashboard.repository.js';
import { PERMISOS } from './dashboard.politicas.js';

// Catálogo de alertas. Para AGREGAR una alerta nueva:
//   1) una consulta agregada en dashboard.repository.js,
//   2) una entrada aquí con su `modulo` y los `permisos` que la habilitan (basta uno),
//   3) una función `mapear` pura que convierte las filas en alertas.
// El front no cambia: pinta lo que llegue. Quien no tenga el permiso nunca la recibe (se filtra en el servicio).

const CRITICA = 'critica';
const AVISO = 'aviso';

const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;
const dinero = (valor) => `$${valor}`; // el valor llega como string NUMERIC desde PostgreSQL: no se opera con él

function resumirEjemplos(ejemplos, total) {
  const texto = ejemplos.join(', ');
  return total > ejemplos.length ? `${texto} y ${total - ejemplos.length} más` : texto;
}

// ---------- Mapeadores (puros: se prueban sin base de datos) ----------
export const mapearStock = (filas) => filas.map((f) => ({
  id: `STOCK:${f.id_sucursal}:${f.nivel}`,
  tipo: 'STOCK',
  severidad: f.nivel === 'AGOTADO' ? CRITICA : AVISO,
  sucursal: f.sucursal,
  titulo: f.nivel === 'AGOTADO'
    ? plural(f.total, 'insumo agotado', 'insumos agotados')
    : plural(f.total, 'insumo bajo el mínimo', 'insumos bajo el mínimo'),
  detalle: resumirEjemplos(f.ejemplos, f.total),
  cantidad: f.total,
}));

export const mapearCaidaVentas = (filas) => filas.map((f) => ({
  id: `CAIDA_VENTAS:${f.id_sucursal}`,
  tipo: 'CAIDA_VENTAS',
  severidad: Number(f.caida_pct) >= 50 ? CRITICA : AVISO,
  sucursal: f.sucursal,
  titulo: `Ventas ${f.caida_pct} % por debajo de lo habitual`,
  detalle: `Llevan ${dinero(f.hoy_total)} contra ${dinero(f.base_total)} de promedio a esta hora (últimas ${f.semanas} semanas, mismo día).`,
  cantidad: null,
}));

export const mapearCuadres = (filas) => filas.map((f) => ({
  id: `CUADRE:${f.id_sucursal}`,
  tipo: 'CUADRE',
  severidad: AVISO,
  sucursal: f.sucursal,
  titulo: plural(f.turnos, 'turno cerrado con diferencia de caja', 'turnos cerrados con diferencia de caja'),
  detalle: `Últimos 7 días. Diferencia acumulada: ${dinero(f.diferencia_total)}.`,
  cantidad: f.turnos,
}));

export const mapearTurnosLargos = (filas) => filas.map((f) => ({
  id: `TURNO_LARGO:${f.id}`,
  tipo: 'TURNO_LARGO',
  severidad: AVISO,
  sucursal: f.sucursal,
  titulo: `Turno abierto hace ${f.horas} h`,
  detalle: `${f.caja}, a cargo de ${f.usuario}.`,
  cantidad: null,
}));

export const mapearCuentasPorPagar = (filas, diasAviso) => filas.flatMap((f) => [
  ...(f.vencidas > 0 ? [{
    id: `CXP_VENCIDA:${f.id_sucursal}`,
    tipo: 'CXP_VENCIDA',
    severidad: CRITICA,
    sucursal: f.sucursal,
    titulo: plural(f.vencidas, 'factura de compra vencida', 'facturas de compra vencidas'),
    detalle: `Saldo pendiente: ${dinero(f.saldo_vencido)}.`,
    cantidad: f.vencidas,
  }] : []),
  ...(f.por_vencer > 0 ? [{
    id: `CXP_POR_VENCER:${f.id_sucursal}`,
    tipo: 'CXP_POR_VENCER',
    severidad: AVISO,
    sucursal: f.sucursal,
    titulo: `${plural(f.por_vencer, 'factura vence', 'facturas vencen')} en ${diasAviso} días o menos`,
    detalle: `Saldo por pagar: ${dinero(f.saldo_por_vencer)}.`,
    cantidad: f.por_vencer,
  }] : []),
]);

export const mapearAnulaciones = (filas) => filas.map((f) => ({
  id: `ANULACIONES:${f.id_sucursal}`,
  tipo: 'ANULACIONES',
  severidad: AVISO,
  sucursal: f.sucursal,
  titulo: `${plural(f.anuladas, 'venta anulada', 'ventas anuladas')} hoy`,
  detalle: `Total anulado: ${dinero(f.monto)}. Conviene revisar los motivos.`,
  cantidad: f.anuladas,
}));

export const mapearPreparacion = (filas, minutosMax) => filas.map((f) => ({
  id: `PREPARACION:${f.id_sucursal}`,
  tipo: 'PREPARACION',
  severidad: f.minutos_max >= minutosMax * 2 ? CRITICA : AVISO,
  sucursal: f.sucursal,
  titulo: `${plural(f.pedidos, 'pedido lleva', 'pedidos llevan')} más de ${minutosMax} min en preparación`,
  detalle: `El más antiguo espera ${f.minutos_max} min.`,
  cantidad: f.pedidos,
}));

export const mapearPlanillas = (filas) => filas.map((f) => ({
  id: `PLANILLA:${f.id_sucursal}`,
  tipo: 'PLANILLA',
  severidad: AVISO,
  sucursal: f.sucursal,
  titulo: plural(f.planillas, 'planilla sin procesar', 'planillas sin procesar'),
  detalle: `El periodo más antiguo terminó hace ${f.dias_atraso} días.`,
  cantidad: f.planillas,
}));

// ---------- Catálogo ----------
// ctx = { idUsuario, permisos:Set, sucursalIds:number[], zona, umbrales }
export const CATALOGO_ALERTAS = [
  { tipo: 'STOCK', modulo: 'Inventario', permisos: ['INV_VER_STOCK'],
    evaluar: async (ctx) => mapearStock(await repo.alertasStock(ctx.sucursalIds)) },
  { tipo: 'CAIDA_VENTAS', modulo: 'Ventas', permisos: [PERMISOS.VENTAS_SUCURSAL],
    evaluar: async (ctx) => mapearCaidaVentas(await repo.alertasCaidaVentas({ zona: ctx.zona, sucursalIds: ctx.sucursalIds, ...ctx.umbrales })) },
  { tipo: 'ANULACIONES', modulo: 'Ventas', permisos: ['POS_ANULAR_VENTA'],
    evaluar: async (ctx) => mapearAnulaciones(await repo.alertasAnulaciones({ zona: ctx.zona, sucursalIds: ctx.sucursalIds, ...ctx.umbrales })) },
  { tipo: 'CUADRE', modulo: 'Caja', permisos: [PERMISOS.VER_CUADRES],
    evaluar: async (ctx) => mapearCuadres(await repo.alertasCuadres({ zona: ctx.zona, sucursalIds: ctx.sucursalIds })) },
  { tipo: 'TURNO_LARGO', modulo: 'Caja', permisos: [PERMISOS.VER_CUADRES, 'CAJA_CERRAR_TURNO'],
    evaluar: async (ctx) => mapearTurnosLargos(await repo.alertasTurnosLargos({
      sucursalIds: ctx.sucursalIds,
      turnoHorasMax: ctx.umbrales.turnoHorasMax,
      idUsuario: ctx.idUsuario,
      soloPropios: !ctx.permisos.has(PERMISOS.VER_CUADRES),
    })) },
  { tipo: 'CXP', modulo: 'Compras', permisos: ['COM_VER_CXP'],
    evaluar: async (ctx) => mapearCuentasPorPagar(
      await repo.alertasCuentasPorPagar({ zona: ctx.zona, sucursalIds: ctx.sucursalIds, cxpDiasAviso: ctx.umbrales.cxpDiasAviso }),
      ctx.umbrales.cxpDiasAviso,
    ) },
  { tipo: 'PREPARACION', modulo: 'Preparación', permisos: ['POS_VER_COLA_PREPARACION'],
    evaluar: async (ctx) => mapearPreparacion(
      await repo.alertasPreparacion({ sucursalIds: ctx.sucursalIds, preparacionMinutosMax: ctx.umbrales.preparacionMinutosMax }),
      ctx.umbrales.preparacionMinutosMax,
    ) },
  { tipo: 'PLANILLA', modulo: 'RR. HH.', permisos: ['RRHH_VER_PLANILLA'],
    evaluar: async (ctx) => mapearPlanillas(await repo.alertasPlanillas({ zona: ctx.zona, sucursalIds: ctx.sucursalIds })) },
];

// Permisos que abren el endpoint de alertas (la unión de los de cada entrada del catálogo).
export const PERMISOS_ALERTAS = [...new Set(CATALOGO_ALERTAS.flatMap((a) => a.permisos))];
