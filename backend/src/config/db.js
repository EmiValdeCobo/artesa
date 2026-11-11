import { QueryTypes, Sequelize } from 'sequelize';
import { env } from './env.js';
import { obtenerContextoSolicitud } from '../utils/requestContext.js';

const opciones = {
  dialect: 'postgres',
  logging: false,
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
