import 'dotenv/config';
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const command = process.argv[2];
const folder = command === 'seed' ? 'database/seeders' : 'database/migrations';
if (!['migrate', 'seed'].includes(command)) throw new Error('Uso: node scripts/db.js migrate|seed');

const adminConnectionString = (process.env.POSTGRES_USER && process.env.POSTGRES_PASSWORD && process.env.POSTGRES_DB)
  ? `postgres://${encodeURIComponent(process.env.POSTGRES_USER)}:${encodeURIComponent(process.env.POSTGRES_PASSWORD)}@${process.env.POSTGRES_HOST || 'localhost'}:${process.env.POSTGRES_PORT || 5432}/${process.env.POSTGRES_DB}`
  : null;

const connectionString = process.env.DATABASE_ADMIN_URL
  || adminConnectionString
  || process.env.DATABASE_URL;

const client = new pg.Client({ connectionString });
await client.connect();
try {
  await client.query(`CREATE TABLE IF NOT EXISTS public.schema_migrations (
    nombre TEXT PRIMARY KEY, aplicado_en TIMESTAMPTZ NOT NULL DEFAULT now(), checksum TEXT NOT NULL, tipo TEXT NOT NULL
  )`);
  const files = (await readdir(path.join(root, folder))).filter((file) => file.endsWith('.sql')).sort();
  for (const nombre of files) {
    const sql = await readFile(path.join(root, folder, nombre), 'utf8');
    const checksum = createHash('sha256').update(sql).digest('hex');
    const existente = await client.query('SELECT checksum FROM public.schema_migrations WHERE nombre = $1', [nombre]);
    if (existente.rowCount) {
      if (existente.rows[0].checksum !== checksum) throw new Error(`${nombre} cambió después de ser aplicado`);
      console.log(`Omitiendo ${nombre}: ya aplicado.`);
      continue;
    }
    if (nombre === '002_usuario_web.sql' && process.env.WEB_DB_PASSWORD) {
      const rol = await client.query("SELECT 1 FROM pg_roles WHERE rolname = 'web_user'");
      if (!rol.rowCount) await client.query('CREATE ROLE web_user LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE INHERIT NOREPLICATION NOBYPASSRLS');
      await client.query(`GRANT CONNECT ON DATABASE "${client.database.replaceAll('"', '""')}" TO web_user`);
    }
    await client.query('BEGIN');
    try {
      if (nombre === '002_usuario_web.sql' && process.env.WEB_DB_PASSWORD) {
        await client.query('SELECT set_config($1, $2, false)', ['app.web_db_password', process.env.WEB_DB_PASSWORD]);
      }
      await client.query(sql);
      await client.query('INSERT INTO public.schema_migrations(nombre, checksum, tipo) VALUES ($1, $2, $3)', [nombre, checksum, command]);
      await client.query('COMMIT');
      console.log(`Aplicado ${nombre}.`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  }
} finally {
  await client.end();
}
