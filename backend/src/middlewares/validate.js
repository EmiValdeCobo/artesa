// Valida req.body con un esquema Zod; deja el resultado limpio en req.body
export const validate = (schema) => (req, _res, next) => {
  const resultado = schema.safeParse(req.body);
  if (!resultado.success) return next(resultado.error);
  req.body = resultado.data;
  next();
};

// Valida req.query y conserva el resultado transformado por Zod (coerciones y valores por defecto).
export const validateQuery = (schema) => (req, _res, next) => {
  const resultado = schema.safeParse(req.query);
  if (!resultado.success) return next(resultado.error);
  Object.keys(req.query).forEach((clave) => delete req.query[clave]);
  Object.assign(req.query, resultado.data);
  next();
};
