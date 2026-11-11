import * as service from './bitacora.service.js';
import { listaBitacoraQuery, metricasBitacoraQuery } from './bitacora.schemas.js';

export const listar = async (req, res) => res.json(await service.listar(listaBitacoraQuery.parse(req.query)));
export const metricas = async (req, res) => res.json(await service.metricas(metricasBitacoraQuery.parse(req.query)));
