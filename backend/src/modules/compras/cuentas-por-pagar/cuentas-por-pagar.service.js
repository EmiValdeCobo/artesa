import { listarCuentasPorPagar } from '../cuentas-por-pagar.repository.js';

export const listar = (filtros, userId) => listarCuentasPorPagar(userId, { ...filtros, periodoRecientePorDefecto: false });
