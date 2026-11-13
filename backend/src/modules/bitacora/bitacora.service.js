import * as repo from './bitacora.repository.js';

export const listar = (filtros) => repo.listar(filtros);
export const metricas = (filtros) => repo.metricas(filtros);
