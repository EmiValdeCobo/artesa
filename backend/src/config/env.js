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

const jwtSecret = process.env.JWT_SECRET;
const jwtSecretDebil = !jwtSecret
  || Buffer.byteLength(jwtSecret, 'utf8') < 32
  || /CAMBIAR|CHANGE_ME|EXAMPLE/i.test(jwtSecret);
if (process.env.NODE_ENV === 'production' && jwtSecretDebil) {
  throw new Error('En producción, JWT_SECRET debe tener al menos 32 bytes y no ser un valor de ejemplo');
}

function parseTrustProxy(valor) {
  if (valor === undefined || valor === '') return 1;
  if (valor === 'true') return true;
  if (valor === 'false') return false;
  const numero = Number(valor);
  return Number.isNaN(numero) ? valor : numero;
}

function parseCookieSecure(valor, esProduccion) {
  if (valor === 'true') return true;
  if (valor === 'false') return false;
  return esProduccion;
}

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';
const isTest = nodeEnv === 'test';

export const env = {
  nodeEnv,
  isProduction,
  isTest,
  port: Number(process.env.PORT) || 3000,
  databaseUrl: process.env.DATABASE_URL,
  database: tieneConexionPorComponentes ? {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  } : null,
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  cookieSecure: parseCookieSecure(process.env.COOKIE_SECURE, isProduction),
  cookieSameSite: process.env.COOKIE_SAMESITE || 'lax',
  trustProxy: parseTrustProxy(process.env.TRUST_PROXY),
  morganFormat: process.env.MORGAN_FORMAT || (isProduction ? 'combined' : 'dev'),
};
