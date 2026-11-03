import pg from 'pg';
import { env } from './env.js';

// NUMERIC llega como string (evita errores de punto flotante con dinero)
export const pool = new pg.Pool({ connectionString: env.databaseUrl });

export const query = (texto, params) => pool.query(texto, params);

/**
 * Ejecuta fn(client) dentro de una transacción.
 * Si se pasa userId, queda disponible en la BD como app.user_id (lo usa la bitácora).
 */
export async function withTransaction(fn, userId = null) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (userId) await client.query("SELECT set_config('app.user_id', $1, true)", [userId]);
    const resultado = await fn(client);
    await client.query('COMMIT');
    return resultado;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
