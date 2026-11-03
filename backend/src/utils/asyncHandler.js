// Envuelve handlers async para que los errores (promesas rechazadas) lleguen al errorHandler
export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
