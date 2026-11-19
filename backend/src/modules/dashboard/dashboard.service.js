import { AppError } from '../../utils/AppError.js';
import * as repo from './dashboard.repository.js';
import { CATALOGO_ALERTAS } from './dashboard.alertas.js';
import { alertasPermitidas, interpretarParametros, modoVentas, proyectarTopProductos, veTodasLasSucursales } from './dashboard.politicas.js';

const ORDEN_SEVERIDAD = { critica: 0, aviso: 1, info: 2 };
const MAX_ALERTAS = 30;
const CACHE_TTL_MS = 30_000;
const cacheVentas = new Map();

// Contexto de cada petición: permisos y alcance se leen de la BD EN CADA llamada (no del token ni del cliente),
// así quitar un permiso o una sucursal surte efecto de inmediato.
async function construirContexto(idUsuario, sucursalSolicitada) {
  const [listaPermisos, filasParametros] = await Promise.all([repo.listarPermisos(idUsuario), repo.cargarParametros()]);
  const permisos = new Set(listaPermisos);
  const alcance = await repo.listarSucursalesAlcance(idUsuario, veTodasLasSucursales(permisos));

  let sucursales = alcance;
  if (sucursalSolicitada != null) {
    sucursales = alcance.filter((s) => s.id === sucursalSolicitada);
    if (sucursales.length === 0) throw new AppError('No tienes acceso a esa sucursal', 403);
  }
  const { zonaHoraria, ...umbrales } = interpretarParametros(filasParametros);
  return { idUsuario, permisos, sucursales, sucursalIds: sucursales.map((s) => s.id), zona: zonaHoraria, umbrales };
}

// ---------- Ventas diarias ----------
export async function ventasDiarias(idUsuario, { dias, sucursal }) {
  const ctx = await construirContexto(idUsuario, sucursal);
  const modo = modoVentas(ctx.permisos);
  if (!modo) throw new AppError('No tienes permiso para ver las ventas', 403);

  const cacheKey = JSON.stringify([idUsuario, dias, sucursal ?? null, modo, ctx.zona, ctx.sucursalIds, [...ctx.permisos].sort()]);
  const cacheada = cacheVentas.get(cacheKey);
  if (cacheada && cacheada.expira > Date.now()) return cacheada.datos;

  const base = { modo, dias, zonaHoraria: ctx.zona, sucursales: ctx.sucursales, generadoEn: new Date().toISOString() };
  if (ctx.sucursales.length === 0) return { ...base, estado: 'sin_sucursal', resumen: null, serie: [] };

  const filtro = { zona: ctx.zona, dias, sucursalIds: ctx.sucursalIds, idUsuario: modo === 'propio' ? idUsuario : null };
  const [serie, r, panel] = await Promise.all([
    repo.ventasPorDia(filtro), repo.resumenVentas(filtro), repo.resumenVentasPanel(filtro),
  ]);
  const zonaOffset = new Intl.DateTimeFormat('en-US', { timeZone: ctx.zona, timeZoneName: 'longOffset' })
    .formatToParts(new Date()).find((parte) => parte.type === 'timeZoneName')?.value.replace('GMT', '') || '+00:00';

  // El resumen previo conserva NUMERIC como string; la forma nueva publica importes en centavos enteros, ambos calculados en PostgreSQL.
  const resultado = {
    ...base,
    estado: r.periodo_tickets === 0 ? 'sin_datos' : 'ok',
    resumen: {
      fecha: r.hoy,
      hoy: { total: r.hoy_total, tickets: r.hoy_tickets },
      ayer: { total: r.ayer_total },
      ultimos7: { total: r.ult7_total },
      previos7: { total: r.prev7_total },
      variacion7dPct: r.variacion7d_pct,
      periodo: { total: r.periodo_total, tickets: r.periodo_tickets },
    },
    serie: serie.map((f) => ({ fecha: f.fecha, total: f.total, tickets: f.tickets, ticketPromedio: f.ticket_promedio })),
    asOf: `${panel.hora_local}${zonaOffset}`,
    today: panel.today,
    comparison: panel.comparison,
    series: panel.series,
    period: panel.period,
  };
  if (cacheVentas.size >= 256) cacheVentas.delete(cacheVentas.keys().next().value);
  cacheVentas.set(cacheKey, { datos: resultado, expira: Date.now() + CACHE_TTL_MS });
  return resultado;
}

// ---------- Top de productos ----------
export async function topProductos(idUsuario, { dias, limite, sucursal }) {
  const ctx = await construirContexto(idUsuario, sucursal);
  const base = { dias, limite, sucursales: ctx.sucursales, generadoEn: new Date().toISOString() };
  const conImportes = modoVentas(ctx.permisos) === 'sucursal';
  if (ctx.sucursales.length === 0) return { ...base, estado: 'sin_sucursal', incluyeImportes: conImportes, totalUnidades: 0, productos: [] };

  const filas = await repo.topProductos({ zona: ctx.zona, dias, limite, sucursalIds: ctx.sucursalIds });
  const productos = proyectarTopProductos(
    filas.map(({ total_unidades: _total, participacion_pct: participacionPct, ...f }) => ({ ...f, participacionPct })),
    ctx.permisos,
  );
  return {
    ...base,
    estado: productos.length ? 'ok' : 'sin_datos',
    incluyeImportes: conImportes,
    totalUnidades: filas[0]?.total_unidades ?? 0,
    productos,
  };
}

// ---------- Alertas ----------
export async function alertas(idUsuario, { sucursal }) {
  const ctx = await construirContexto(idUsuario, sucursal);
  const catalogo = alertasPermitidas(CATALOGO_ALERTAS, ctx.permisos);
  if (catalogo.length === 0) throw new AppError('No tienes alertas asignadas a tu rol', 403);

  const base = { categorias: [...new Set(catalogo.map((a) => a.modulo))], sucursales: ctx.sucursales, generadoEn: new Date().toISOString() };
  if (ctx.sucursales.length === 0) {
    return { ...base, estado: 'sin_sucursal', alertas: [], resumen: { critica: 0, aviso: 0 }, incompleto: false, fallos: [] };
  }

  // Cada tipo se evalúa por separado: si una consulta falla, el resto llega y la respuesta marca `incompleto`.
  const resultados = await Promise.allSettled(catalogo.map((a) => a.evaluar(ctx)));
  const fallos = [];
  const lista = [];
  resultados.forEach((r, i) => {
    if (r.status === 'fulfilled') lista.push(...r.value.map((a) => ({ ...a, modulo: catalogo[i].modulo })));
    else {
      console.error(`[dashboard] falló la alerta ${catalogo[i].tipo}:`, r.reason);
      fallos.push({ tipo: catalogo[i].tipo, modulo: catalogo[i].modulo });
    }
  });
  if (fallos.length === catalogo.length) throw resultados[0].reason; // nada utilizable: error real (500)

  lista.sort((a, b) => (ORDEN_SEVERIDAD[a.severidad] - ORDEN_SEVERIDAD[b.severidad]) || a.sucursal.localeCompare(b.sucursal) || a.id.localeCompare(b.id));
  const recortada = lista.slice(0, MAX_ALERTAS);
  const resumen = { critica: 0, aviso: 0 };
  for (const a of lista) resumen[a.severidad] += 1;

  return { ...base, estado: 'ok', alertas: recortada, totalAlertas: lista.length, resumen, incompleto: fallos.length > 0, fallos };
}

// ---------- Órdenes recientes ----------
// Mismo alcance que las ventas: con permiso de sucursal ve todas; con "mis ventas", solo las suyas (filtro del servidor).
export async function ordenesRecientes(idUsuario, { limite, sucursal }) {
  const ctx = await construirContexto(idUsuario, sucursal);
  const modo = modoVentas(ctx.permisos);
  if (!modo) throw new AppError('No tienes permiso para ver las ventas', 403);

  const base = { modo, limite, zonaHoraria: ctx.zona, sucursales: ctx.sucursales, generadoEn: new Date().toISOString() };
  if (ctx.sucursales.length === 0) return { ...base, estado: 'sin_sucursal', ordenes: [] };

  const filas = await repo.ordenesRecientes({
    zona: ctx.zona, sucursalIds: ctx.sucursalIds, limite, idUsuario: modo === 'propio' ? idUsuario : null,
  });
  const ordenes = filas.map((f) => ({
    id: f.id,
    comprobante: f.correlativo,
    fecha: f.fecha_utc,
    fechaLocal: f.fecha_local,
    sucursal: f.sucursal,
    cliente: f.cliente,
    canal: f.canal,
    items: f.items,
    metodoPago: f.metodo_pago,
    estado: f.estado,
    total: f.total,
  }));
  return { ...base, estado: ordenes.length ? 'ok' : 'sin_datos', ordenes };
}
