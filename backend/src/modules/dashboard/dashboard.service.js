import { AppError } from '../../utils/AppError.js';
import * as repo from './dashboard.repository.js';
import { CATALOGO_ALERTAS } from './dashboard.alertas.js';
import { alertasPermitidas, interpretarParametros, modoVentas, proyectarTopProductos, veTodasLasSucursales } from './dashboard.politicas.js';

const ORDEN_SEVERIDAD = { critica: 0, aviso: 1, info: 2 };
const MAX_ALERTAS = 30;

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

  const base = { modo, dias, zonaHoraria: ctx.zona, sucursales: ctx.sucursales, generadoEn: new Date().toISOString() };
  if (ctx.sucursales.length === 0) return { ...base, estado: 'sin_sucursal', resumen: null, serie: [] };

  const filtro = { zona: ctx.zona, dias, sucursalIds: ctx.sucursalIds, idUsuario: modo === 'propio' ? idUsuario : null };
  const [serie, r] = await Promise.all([repo.ventasPorDia(filtro), repo.resumenVentas(filtro)]);

  // Todos los importes y la variación llegan ya calculados por PostgreSQL (NUMERIC como string): aquí no se suma dinero.
  return {
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
  };
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
