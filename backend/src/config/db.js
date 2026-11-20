import pg from 'pg';
import { QueryTypes, Sequelize } from 'sequelize';
import { env } from './env.js';
import { obtenerContextoSolicitud } from '../utils/requestContext.js';

// Las columnas TIMESTAMP (sin zona) guardan hora UTC: la sesión de PostgreSQL corre en UTC y
// CURRENT_TIMESTAMP/now() escriben UTC. node-postgres, por defecto, las interpreta en la zona del
// proceso Node: dentro de Docker (TZ=UTC) cuadraba, pero en un equipo con America/El_Salvador
// desplazaba 6 h todas las horas (aperturas "en el futuro", "hace un momento", minutos inconsistentes).
// Se fija la interpretación en UTC para que el resultado no dependa de dónde corre el backend.
const OID_TIMESTAMP = 1114;
pg.types.setTypeParser(OID_TIMESTAMP, (valor) => (valor === null ? null : new Date(`${valor.replace(' ', 'T')}Z`)));

const opciones = {
  dialect: 'postgres',
  logging: false,
  timezone: '+00:00',
};

export const sequelize = env.database
  ? new Sequelize({ ...env.database, ...opciones })
  : new Sequelize(env.databaseUrl, opciones);

export const query = (texto, params = []) => sequelize.query(texto, {
  bind: params,
  type: QueryTypes.SELECT,
});

/**
 * Ejecuta fn dentro de una transacción Sequelize.
 * app.user_id queda disponible para los triggers de bitácora de PostgreSQL.
 */
export async function withTransaction(fn, userId = null) {
  return sequelize.transaction(async (transaction) => {
    const contexto = obtenerContextoSolicitud();
    if (userId) {
      await sequelize.query("SELECT set_config('app.user_id', $1, true)", {
        bind: [userId],
        transaction,
        type: QueryTypes.SELECT,
      });
    }
    await sequelize.query("SELECT set_config('app.client_ip', $1, true), set_config('app.user_agent', $2, true)", {
      bind: [contexto.ip ?? '', contexto.agente ?? ''],
      transaction,
      type: QueryTypes.SELECT,
    });
    return fn(transaction);
  });
}
