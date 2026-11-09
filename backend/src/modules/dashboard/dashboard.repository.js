import { query } from '../../config/db.js';

// Capa de acceso a datos del dashboard. Solo SQL parametrizado ($1…); cada dato calculado sale de una
// agregación en PostgreSQL (nunca se traen ventas sueltas para sumarlas en JS) y el dinero se queda como
// string NUMERIC. Los fragmentos de SQL que se concatenan son constantes de este archivo, jamás datos del usuario.
//
// Zona horaria: pos.ventas.fecha_emision es TIMESTAMP sin zona y se guarda en UTC (Sequelize fija la sesión en
// +00:00). "Hoy" y los cortes por día se calculan en la zona del negocio ($zona), pero los límites del rango
// se convierten a UTC para comparar contra la columna tal cual y poder usar los índices (ix_ventas_emitidas_fecha).

// `ph` es el marcador de parámetro de la zona horaria ('$1'), no un valor.
const LOCAL = (ph) => `(CURRENT_TIMESTAMP AT TIME ZONE ${ph}::text)`;
// Inicio de un día local (date) expresado en UTC naive, comparable con las columnas TIMESTAMP.
const INICIO_UTC = (fecha, ph) => `((${fecha})::timestamp AT TIME ZONE ${ph}::text AT TIME ZONE 'UTC')`;

// ---------- Contexto del usuario ----------
export async function listarPermisos(idUsuario) {
  const filas = await query('SELECT permiso FROM reportes.vw_permisos_usuario WHERE id_usuario = $1::uuid', [idUsuario]);
  return filas.map((f) => f.permiso);
}

export const listarSucursalesAlcance = (idUsuario, todas) => query(
  `SELECT s.id_sucursal AS id, s.nombre
   FROM empresa.sucursales s
   WHERE s.activa
     AND ($2::boolean OR EXISTS (SELECT 1 FROM seguridad.usuario_sucursal us
                                 WHERE us.id_usuario = $1::uuid AND us.id_sucursal = s.id_sucursal))
   ORDER BY s.id_sucursal`,
  [idUsuario, todas],
);

export const cargarParametros = () => query(
  "SELECT clave, valor FROM empresa.parametros WHERE clave = 'zona_horaria' OR starts_with(clave, 'dash_')",
);

// ---------- Ventas diarias ----------
// expDias es una EXPRESIÓN SQL constante (p. ej. '$2::int'), nunca un valor recibido del usuario.
const CTE_RANGO = (expDias) => `
  rango AS (
    SELECT hoy.d - (${expDias} - 1) AS desde, hoy.d AS hasta,
           ${INICIO_UTC(`hoy.d - (${expDias} - 1)`, '$1')} AS ini,
           ${INICIO_UTC('hoy.d + 1', '$1')} AS fin
    FROM (SELECT ${LOCAL('$1')}::date AS d) hoy
  )`;

const CTE_DIARIO = (filtroUsuario) => `
  diario AS (
    SELECT ((v.fecha_emision AT TIME ZONE 'UTC') AT TIME ZONE $1::text)::date AS fecha,
           COUNT(*)::int AS tickets, SUM(v.subtotal) AS subtotal, SUM(v.iva) AS iva, SUM(v.total) AS total
    FROM pos.ventas v, rango r
    WHERE v.estado = 'EMITIDA' AND v.fecha_emision >= r.ini AND v.fecha_emision < r.fin
      AND v.id_sucursal = ANY($3::int[]) ${filtroUsuario}
    GROUP BY 1
  )`;

// En modo "propio" el filtro por usuario lo pone el SERVIDOR; no existe ningún parámetro de la petición que lo altere.
const filtroDeUsuario = (idUsuario) => (idUsuario ? 'AND v.id_usuario = $4::uuid' : '');
const bindsVentas = ({ zona, dias, sucursalIds, idUsuario }) => [zona, dias, sucursalIds, ...(idUsuario ? [idUsuario] : [])];

/** Serie continua: un renglón por día, con ceros donde no hubo ventas. */
export const ventasPorDia = (filtro) => query(
  `WITH ${CTE_RANGO('$2::int')}, ${CTE_DIARIO(filtroDeUsuario(filtro.idUsuario))}
   SELECT (r.desde + k)::text AS fecha,
          COALESCE(d.tickets, 0) AS tickets,
          COALESCE(d.total, 0)::numeric(12,2) AS total,
          CASE WHEN d.tickets > 0 THEN ROUND(d.total / d.tickets, 2) ELSE 0 END::numeric(12,2) AS ticket_promedio
   FROM rango r CROSS JOIN generate_series(0, $2::int - 1) k
   LEFT JOIN diario d ON d.fecha = r.desde + k
   ORDER BY 1`,
  bindsVentas(filtro),
);

/** Indicadores del encabezado. Ventana fija de 14 días como mínimo para comparar 7 contra 7. */
export async function resumenVentas(filtro) {
  const [fila] = await query(
    `WITH ${CTE_RANGO('GREATEST($2::int, 14)')}, ${CTE_DIARIO(filtroDeUsuario(filtro.idUsuario))},
     hoy AS (SELECT hasta AS d FROM rango),
     indicadores AS (
       SELECT (SELECT d FROM hoy)::text AS hoy,
              COALESCE(SUM(total)   FILTER (WHERE fecha = (SELECT d FROM hoy)), 0)::numeric(12,2) AS hoy_total,
              COALESCE(SUM(tickets) FILTER (WHERE fecha = (SELECT d FROM hoy)), 0)::int           AS hoy_tickets,
              COALESCE(SUM(total)   FILTER (WHERE fecha = (SELECT d FROM hoy) - 1), 0)::numeric(12,2) AS ayer_total,
              COALESCE(SUM(total)   FILTER (WHERE fecha >  (SELECT d FROM hoy) - 7), 0)::numeric(12,2) AS ult7_total,
              COALESCE(SUM(total)   FILTER (WHERE fecha <= (SELECT d FROM hoy) - 7 AND fecha > (SELECT d FROM hoy) - 14), 0)::numeric(12,2) AS prev7_total,
              COALESCE(SUM(total)   FILTER (WHERE fecha >  (SELECT d FROM hoy) - $2::int), 0)::numeric(12,2) AS periodo_total,
              COALESCE(SUM(tickets) FILTER (WHERE fecha >  (SELECT d FROM hoy) - $2::int), 0)::int           AS periodo_tickets
       FROM diario
     )
     SELECT *, CASE WHEN prev7_total > 0 THEN ROUND((ult7_total - prev7_total) / prev7_total * 100, 1) END AS variacion7d_pct
     FROM indicadores`,
    bindsVentas(filtro),
  );
  return fila;
}

// ---------- Top de productos ----------
export const topProductos = ({ zona, dias, sucursalIds, limite }) => query(
  `WITH ${CTE_RANGO('$2::int')},
   base AS (
     SELECT d.id_producto, SUM(d.cantidad)::int AS unidades, SUM(d.subtotal_linea) AS ingreso
     FROM pos.ventas v
     JOIN pos.venta_detalles d ON d.id_venta = v.id_venta, rango r
     WHERE v.estado = 'EMITIDA' AND v.fecha_emision >= r.ini AND v.fecha_emision < r.fin
       AND v.id_sucursal = ANY($3::int[])
     GROUP BY d.id_producto
   )
   SELECT b.id_producto AS id, p.nombre, b.unidades, b.ingreso::numeric(12,2) AS ingreso,
          ROUND(b.unidades * 100.0 / SUM(b.unidades) OVER (), 1) AS participacion_pct,
          SUM(b.unidades) OVER ()::int AS total_unidades
   FROM base b JOIN inventario.productos p ON p.id_producto = b.id_producto
   ORDER BY b.unidades DESC, b.ingreso DESC, p.nombre
   LIMIT $4::int`,
  [zona, dias, sucursalIds, limite],
);

// ---------- Alertas (una consulta agregada por tipo) ----------
// Stock: igual que reportes.vw_alertas_stock, pero con alcance por sucursal y agrupado en la BD.
// Un insumo sin mínimo definido (0) no genera alerta mientras no tenga stock negativo.
export const alertasStock = (sucursalIds) => query(
  `SELECT s.id_sucursal, s.nombre AS sucursal,
          CASE WHEN ss.stock_actual <= 0 THEN 'AGOTADO' ELSE 'BAJO_MINIMO' END AS nivel,
          COUNT(*)::int AS total,
          (array_agg(i.nombre ORDER BY ss.stock_minimo - ss.stock_actual DESC, i.nombre))[1:3] AS ejemplos
   FROM inventario.stock_sucursal ss
   JOIN inventario.insumos i ON i.id_insumo = ss.id_insumo
   JOIN empresa.sucursales s ON s.id_sucursal = ss.id_sucursal
   WHERE i.activo AND ss.id_sucursal = ANY($1::int[])
     AND ss.stock_actual <= ss.stock_minimo AND (ss.stock_minimo > 0 OR ss.stock_actual < 0)
   GROUP BY 1, 2, 3
   ORDER BY 3, 2`,
  [sucursalIds],
);

// Caída de ventas: hoy hasta ESTA hora contra el promedio del mismo día de la semana (4 semanas atrás, mismo corte horario).
// Pide al menos 2 semanas de historia para no dar falsas alarmas en una sucursal nueva.
export const alertasCaidaVentas = ({ zona, sucursalIds, caidaVentasPct, caidaVentasHoraMin }) => query(
  `WITH ahora AS (SELECT ${LOCAL('$1')} AS local),
   ventanas AS (
     SELECT k, ${INICIO_UTC('a.local::date - 7 * k', '$1')} AS ini,
            ((a.local - make_interval(days => 7 * k)) AT TIME ZONE $1::text AT TIME ZONE 'UTC') AS fin
     FROM ahora a CROSS JOIN generate_series(0, 4) k
   ),
   por_semana AS (
     SELECT v.id_sucursal, w.k, SUM(v.total) AS total
     FROM ventanas w
     JOIN pos.ventas v ON v.fecha_emision >= w.ini AND v.fecha_emision < w.fin
                      AND v.estado = 'EMITIDA' AND v.id_sucursal = ANY($2::int[])
     GROUP BY v.id_sucursal, w.k
   ),
   resumen AS (
     SELECT id_sucursal,
            COALESCE(SUM(total) FILTER (WHERE k = 0), 0) AS hoy,
            SUM(total) FILTER (WHERE k > 0) / NULLIF(COUNT(*) FILTER (WHERE k > 0), 0) AS base,
            COUNT(*) FILTER (WHERE k > 0)::int AS semanas
     FROM por_semana GROUP BY id_sucursal
   )
   SELECT s.id_sucursal, s.nombre AS sucursal, r.hoy::numeric(12,2) AS hoy_total, r.base::numeric(12,2) AS base_total,
          r.semanas, ROUND((1 - r.hoy / r.base) * 100, 1) AS caida_pct
   FROM resumen r JOIN empresa.sucursales s ON s.id_sucursal = r.id_sucursal CROSS JOIN ahora a
   WHERE r.semanas >= 2 AND r.base > 0 AND EXTRACT(HOUR FROM a.local) >= $4::int
     AND (1 - r.hoy / r.base) * 100 >= $3::numeric
   ORDER BY caida_pct DESC`,
  [zona, sucursalIds, caidaVentasPct, caidaVentasHoraMin],
);

export const alertasCuadres = ({ zona, sucursalIds }) => query(
  `SELECT s.id_sucursal, s.nombre AS sucursal, COUNT(*)::int AS turnos,
          SUM(ABS(COALESCE(t.dif_efectivo, 0)) + ABS(COALESCE(t.dif_tarjeta, 0)) + ABS(COALESCE(t.dif_digital, 0)))::numeric(12,2) AS diferencia_total
   FROM pos.turnos_caja t
   JOIN pos.cajas c ON c.id_caja = t.id_caja
   JOIN empresa.sucursales s ON s.id_sucursal = c.id_sucursal
   WHERE t.estado = 'CERRADO' AND c.id_sucursal = ANY($2::int[])
     AND t.cerrado_en >= ${INICIO_UTC(`${LOCAL('$1')}::date - 6`, '$1')}
     AND (COALESCE(t.dif_efectivo, 0) <> 0 OR COALESCE(t.dif_tarjeta, 0) <> 0 OR COALESCE(t.dif_digital, 0) <> 0)
   GROUP BY 1, 2
   ORDER BY 2`,
  [zona, sucursalIds],
);

// soloPropios: el cajero solo ve su propio turno; quien tiene CAJA_VER_CUADRES ve los de todo su alcance.
export const alertasTurnosLargos = ({ sucursalIds, turnoHorasMax, idUsuario, soloPropios }) => query(
  `SELECT t.id_turno AS id, s.id_sucursal, s.nombre AS sucursal, c.nombre_identificador AS caja, u.username AS usuario,
          FLOOR(EXTRACT(EPOCH FROM ((CURRENT_TIMESTAMP AT TIME ZONE 'UTC') - t.abierto_en)) / 3600)::int AS horas
   FROM pos.turnos_caja t
   JOIN pos.cajas c ON c.id_caja = t.id_caja
   JOIN empresa.sucursales s ON s.id_sucursal = c.id_sucursal
   JOIN seguridad.usuarios u ON u.id_usuario = t.id_usuario
   WHERE t.estado = 'ABIERTO' AND c.id_sucursal = ANY($1::int[])
     AND t.abierto_en < (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') - make_interval(hours => $2::int)
     ${soloPropios ? 'AND t.id_usuario = $3::uuid' : ''}
   ORDER BY t.abierto_en
   LIMIT 5`,
  [sucursalIds, turnoHorasMax, ...(soloPropios ? [idUsuario] : [])],
);

// Cuentas por pagar: el saldo se calcula SOLO para las facturas pendientes que vencen pronto (índice parcial),
// no agregando toda la tabla de pagos.
export const alertasCuentasPorPagar = ({ zona, sucursalIds, cxpDiasAviso }) => query(
  `SELECT s.id_sucursal, s.nombre AS sucursal,
          COUNT(*) FILTER (WHERE f.fecha_vencimiento <  h.d)::int AS vencidas,
          COALESCE(SUM(x.saldo) FILTER (WHERE f.fecha_vencimiento <  h.d), 0)::numeric(12,2) AS saldo_vencido,
          COUNT(*) FILTER (WHERE f.fecha_vencimiento >= h.d)::int AS por_vencer,
          COALESCE(SUM(x.saldo) FILTER (WHERE f.fecha_vencimiento >= h.d), 0)::numeric(12,2) AS saldo_por_vencer
   FROM (SELECT ${LOCAL('$1')}::date AS d) h
   JOIN compras.facturas_compra f ON f.estado_pago <> 'PAGADO' AND f.fecha_vencimiento <= h.d + $3::int
                                 AND f.id_sucursal = ANY($2::int[])
   JOIN empresa.sucursales s ON s.id_sucursal = f.id_sucursal
   CROSS JOIN LATERAL (SELECT f.total - COALESCE(SUM(p.monto), 0) AS saldo
                       FROM compras.pagos_proveedor p WHERE p.id_compra = f.id_compra) x
   WHERE x.saldo > 0
   GROUP BY 1, 2
   ORDER BY 2`,
  [zona, sucursalIds, cxpDiasAviso],
);

export const alertasAnulaciones = ({ zona, sucursalIds, anulacionesMaxDia }) => query(
  `SELECT s.id_sucursal, s.nombre AS sucursal, COUNT(*)::int AS anuladas, SUM(v.total)::numeric(12,2) AS monto
   FROM pos.ventas v
   JOIN empresa.sucursales s ON s.id_sucursal = v.id_sucursal
   WHERE v.estado = 'ANULADA' AND v.id_sucursal = ANY($2::int[])
     AND v.anulada_en >= ${INICIO_UTC(`${LOCAL('$1')}::date`, '$1')}
   GROUP BY 1, 2
   HAVING COUNT(*) >= $3::int
   ORDER BY 2`,
  [zona, sucursalIds, anulacionesMaxDia],
);

export const alertasPreparacion = ({ sucursalIds, preparacionMinutosMax }) => query(
  `SELECT s.id_sucursal, s.nombre AS sucursal, COUNT(*)::int AS pedidos,
          FLOOR(MAX(EXTRACT(EPOCH FROM ((CURRENT_TIMESTAMP AT TIME ZONE 'UTC') - o.creado_en))) / 60)::int AS minutos_max
   FROM pos.ordenes o
   JOIN pos.turnos_caja t ON t.id_turno = o.id_turno
   JOIN pos.cajas c ON c.id_caja = t.id_caja
   JOIN empresa.sucursales s ON s.id_sucursal = c.id_sucursal
   WHERE o.estado = 'EN_PREPARACION' AND c.id_sucursal = ANY($1::int[])
     AND o.creado_en < (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') - make_interval(mins => $2::int)
   GROUP BY 1, 2
   ORDER BY 2`,
  [sucursalIds, preparacionMinutosMax],
);

export const alertasPlanillas = ({ zona, sucursalIds }) => query(
  `SELECT s.id_sucursal, s.nombre AS sucursal, COUNT(*)::int AS planillas, MAX(h.d - p.periodo_fin)::int AS dias_atraso
   FROM (SELECT ${LOCAL('$1')}::date AS d) h
   JOIN rrhh.planillas p ON NOT p.procesada AND p.periodo_fin < h.d AND p.id_sucursal = ANY($2::int[])
   JOIN empresa.sucursales s ON s.id_sucursal = p.id_sucursal
   GROUP BY 1, 2
   ORDER BY 2`,
  [zona, sucursalIds],
);
