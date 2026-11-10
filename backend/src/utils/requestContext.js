import { AsyncLocalStorage } from 'node:async_hooks';

const contexto = new AsyncLocalStorage();

export function contextoSolicitud(req, _res, next) {
  contexto.run({
    ip: req.ip || req.socket?.remoteAddress || null,
    agente: req.get('user-agent')?.slice(0, 500) || null,
  }, next);
}

export const obtenerContextoSolicitud = () => contexto.getStore() ?? {};
