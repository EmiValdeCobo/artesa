import { QueryTypes } from 'sequelize';
import { sequelize } from '../../config/db.js';

const consultar = (sql, bind) => sequelize.query(sql, { bind, type: QueryTypes.SELECT });

function construirWhere(filtros, incluirAccion = true, incluirBusqueda = false, ventanaReciente = false) {
  const condiciones = [];
  const bind = [];
  const agregar = (condicion, valor) => { bind.push(valor); condiciones.push(condicion.replace('?', `$${bind.length}`)); };
  if (filtros.startDate) agregar('b.creado_en >= ?::date', filtros.startDate);
  if (filtros.endDate) agregar("b.creado_en < (?::date + INTERVAL '1 day')", filtros.endDate);
  if (ventanaReciente && !filtros.startDate && !filtros.endDate) condiciones.push("b.creado_en >= (CURRENT_TIMESTAMP AT TIME ZONE 'America/El_Salvador') - INTERVAL '30 days'");
  if (filtros.module) {
    bind.push(filtros.module);
    condiciones.push(`(split_part(b.entidad, '.', 1) = lower($${bind.length}) OR lower(b.entidad) = lower($${bind.length}))`);
  }
  if (filtros.user) agregar("COALESCE(u.username, b.datos_despues->>'usuario') ILIKE ?", `%${filtros.user}%`);
  if (incluirAccion && filtros.action) {
    bind.push(filtros.action);
    condiciones.push(`b.accion = CASE $${bind.length}::text WHEN 'CREATE' THEN 'INSERT' ELSE $${bind.length}::text END`);
  }
  if (incluirBusqueda && filtros.search) {
    const n = bind.length + 1;
    bind.push(`%${filtros.search}%`);
    condiciones.push(`concat_ws(' ', u.username, b.accion, b.entidad, b.ip_cliente, b.agente_cliente, (b.datos_antes - 'password_hash' - 'token' - 'refresh_token')::text, (b.datos_despues - 'password_hash' - 'token' - 'refresh_token')::text) ILIKE $${n}`);
  }
  return { sql: condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '', bind };
}

export async function listar(filtros) {
  const { sql, bind } = construirWhere(filtros, true, true);
  const totalRows = await consultar(
    `SELECT COUNT(*)::int AS total FROM seguridad.bitacora b LEFT JOIN seguridad.usuarios u USING (id_usuario) ${sql}`,
    bind,
  );
  const total = totalRows[0]?.total ?? 0;
  const offset = (filtros.page - 1) * filtros.limit;
  const filas = await consultar(
    `SELECT b.id_bitacora, b.creado_en, b.id_usuario, COALESCE(u.username, b.datos_despues->>'usuario', 'Sistema') AS usuario,
            CASE b.accion WHEN 'INSERT' THEN 'CREATE' ELSE b.accion END AS accion,
            b.entidad, split_part(b.entidad, '.', 1) AS modulo,
            b.ip_cliente, b.agente_cliente, b.severidad,
            b.datos_antes - 'password_hash' - 'token' - 'refresh_token' AS datos_antes,
            b.datos_despues - 'password_hash' - 'token' - 'refresh_token' AS datos_despues
     FROM seguridad.bitacora b LEFT JOIN seguridad.usuarios u USING (id_usuario)
     ${sql}
     ORDER BY b.creado_en DESC, b.id_bitacora DESC
     LIMIT $${bind.length + 1} OFFSET $${bind.length + 2}`,
    [...bind, filtros.limit, offset],
  );
  return { data: filas, pagination: { page: filtros.page, limit: filtros.limit, total, totalPages: Math.ceil(total / filtros.limit) } };
}

export async function metricas(filtros) {
  const { sql: where, bind } = construirWhere(filtros, false, false, true);
  const porHora = filtros.granularity === 'hour';
  const tendencia = await consultar(
    `SELECT date_trunc($${bind.length + 1}, b.creado_en) AS periodo, COUNT(*)::int AS total
     FROM seguridad.bitacora b LEFT JOIN seguridad.usuarios u USING (id_usuario)
     ${where}
     GROUP BY periodo ORDER BY periodo`,
    [...bind, filtros.granularity],
  );
  const severidadModulo = await consultar(
    `SELECT split_part(b.entidad, '.', 1) AS modulo, b.severidad, COUNT(*)::int AS total
     FROM seguridad.bitacora b LEFT JOIN seguridad.usuarios u USING (id_usuario)
     ${where}
     GROUP BY modulo, b.severidad ORDER BY modulo, b.severidad`, bind,
  );
  const modulos = await consultar(
    `SELECT DISTINCT split_part(entidad, '.', 1) AS modulo
     FROM seguridad.bitacora ORDER BY modulo`, [],
  );
  const usuarios = await consultar(
    `SELECT COALESCE(u.username, b.datos_despues->>'usuario', 'Sistema') AS usuario,
            COUNT(*) FILTER (WHERE b.accion IN ('UPDATE', 'DELETE'))::int AS cambios_sensibles,
            COUNT(*) FILTER (WHERE b.accion = 'LOGIN' AND (EXTRACT(HOUR FROM b.creado_en) >= 22 OR EXTRACT(HOUR FROM b.creado_en) < 6))::int AS accesos_fuera_horario,
            COUNT(*) FILTER (WHERE b.accion IN ('UPDATE','DELETE') OR (b.accion = 'LOGIN' AND (EXTRACT(HOUR FROM b.creado_en) >= 22 OR EXTRACT(HOUR FROM b.creado_en) < 6)))::int AS total
     FROM seguridad.bitacora b LEFT JOIN seguridad.usuarios u USING (id_usuario)
     ${where}
     GROUP BY usuario HAVING COUNT(*) FILTER (WHERE b.accion IN ('UPDATE','DELETE') OR (b.accion = 'LOGIN' AND (EXTRACT(HOUR FROM b.creado_en) >= 22 OR EXTRACT(HOUR FROM b.creado_en) < 6))) > 0
     ORDER BY total DESC, usuario LIMIT 8`, bind,
  );
  const heatmap = await consultar(
    `SELECT EXTRACT(DOW FROM b.creado_en)::int AS dia_semana,
            EXTRACT(HOUR FROM b.creado_en)::int AS hora, COUNT(*)::int AS total
     FROM seguridad.bitacora b LEFT JOIN seguridad.usuarios u USING (id_usuario)
     ${where}
     GROUP BY dia_semana, hora ORDER BY dia_semana, hora`, bind,
  );
  return { tendencia, severidadModulo, modulos: modulos.map((fila) => fila.modulo), usuarios, heatmap, granularidad: porHora ? 'hour' : 'day', ventanaFueraHorario: '22:00–05:59' };
}
