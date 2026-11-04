import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { sequelize } from './config/db.js';
import routes from './modules/index.js';
import { notFound, errorHandler } from './middlewares/error.js';

const app = express();
app.use(helmet());
app.use(cors({ origin: env.corsOrigin, credentials: true }));
app.use(cookieParser());
app.use(express.json());
app.use(morgan('dev'));

app.get('/api/health', async (_req, res) => {
  try {
    await sequelize.authenticate();
    res.json({ estado: 'ok', baseDeDatos: 'conectada' });
  } catch {
    res.status(503).json({ estado: 'error', baseDeDatos: 'sin conexión' });
  }
});

app.use('/api', routes);
app.use(notFound);
app.use(errorHandler);

export default app;
