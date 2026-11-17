import { z } from 'zod';

const enteroQuery = (minimo, maximo, predeterminado) => z.union([
  z.number().int(),
  z.string().regex(/^\d+$/).transform(Number),
]).pipe(z.number().int().min(minimo).max(maximo)).default(predeterminado);

export const camposPaginacion = {
  page: enteroQuery(1, 1_000_000, 1),
  limit: enteroQuery(1, 100, 50),
};

export function enviarHeadersPaginacion(res, { page, limit, total }) {
  const totalPaginas = Math.ceil(total / limit);
  res.set({
    'X-Page': String(page),
    'X-Limit': String(limit),
    'X-Total': String(total),
    'X-Total-Pages': String(totalPaginas),
    'X-Has-Next-Page': String(page < totalPaginas),
    'X-Has-Previous-Page': String(page > 1 && total > 0),
  });
}
