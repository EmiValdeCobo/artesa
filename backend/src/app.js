import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { sequelize } from './config/db.js';
import routes from './modules/index.js';
import { notFound, errorHandler } from './middlewares/error.js';
import { contextoSolicitud } from './utils/requestContext.js';
import { limitadorGlobal } from './middlewares/rateLimit.js';

const app = express();
app.set('trust proxy', env.trustProxy);
app.use(helmet());
app.use(cors({
  origin: env.corsOrigin,
  credentials: true,
  exposedHeaders: ['X-Page', 'X-Limit', 'X-Total', 'X-Total-Pages', 'X-Has-Next-Page', 'X-Has-Previous-Page'],
}));
app.use(cookieParser());
// Límite de cuerpo: los lotes más grandes (ítems de venta, permisos) caben con holgura.
app.use(express.json({ limit: '100kb' }));
if (env.nodeEnv !== 'test') {
  app.use(
    morgan(env.morganFormat, {
      skip: () => process.env.NODE_ENV === 'test',
    }),
  );
}
app.use(contextoSolicitud);

app.get('/api/health', async (_req, res) => {
  try {
    await sequelize.authenticate();
    res.json({ estado: 'ok', baseDeDatos: 'conectada' });
  } catch {
    res.status(503).json({ estado: 'error', baseDeDatos: 'sin conexión' });
  }
});

app.use('/api', limitadorGlobal, routes);
app.use(notFound);
app.use(errorHandler);

export default app;
