import { QueryTypes, Sequelize } from 'sequelize';
import { env } from './env.js';

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
    if (userId) {
      await sequelize.query("SELECT set_config('app.user_id', $1, true)", {
        bind: [userId],
        transaction,
        type: QueryTypes.SELECT,
      });
    }
    return fn(transaction);
  });
}
