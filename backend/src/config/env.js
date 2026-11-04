import 'dotenv/config';

const tieneConexionPorUrl = Boolean(process.env.DATABASE_URL);
const variablesConexion = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
const tieneConexionPorComponentes = variablesConexion.every((clave) => Boolean(process.env[clave]));
const faltantes = [
  ...(!tieneConexionPorUrl && !tieneConexionPorComponentes ? ['DATABASE_URL o variables DB_*'] : []),
  ...(!process.env.JWT_SECRET ? ['JWT_SECRET'] : []),
];
if (faltantes.length > 0) {
  throw new Error(`Faltan variables de entorno: ${faltantes.join(', ')} (copia .env.example a .env)`);
}

export const env = {
  port: Number(process.env.PORT) || 3000,
  databaseUrl: process.env.DATABASE_URL,
  database: tieneConexionPorComponentes ? {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  } : null,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  cookieSecure: process.env.COOKIE_SECURE === 'true',
  cookieSameSite: process.env.COOKIE_SAMESITE || 'lax',
};
