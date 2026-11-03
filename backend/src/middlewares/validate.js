// Valida req.body con un esquema Zod; deja el resultado limpio en req.body
export const validate = (schema) => (req, _res, next) => {
  const resultado = schema.safeParse(req.body);
  if (!resultado.success) return next(resultado.error);
  req.body = resultado.data;
  next();
};
