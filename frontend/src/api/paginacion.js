import { api } from './client.js';

// Recorre todas las páginas de un endpoint paginado por headers (X-Total, X-Has-Next-Page).
// `tope` evita descargar sin límite: si se alcanza, `truncado` avisa a la pantalla.
export async function obtenerTodasLasPaginas(endpoint, { params = {}, limite = 100, tope = Infinity, ...opciones } = {}) {
  const filas = [];
  let pagina = 1;
  let total = 0;
  while (true) {
    const q = new URLSearchParams(Object.fromEntries(Object.entries({ ...params, page: pagina, limit: limite })
      .filter(([, v]) => v !== '' && v != null)));
    const { data, meta } = await api.getConMeta(`${endpoint}?${q}`, opciones);
    const lote = Array.isArray(data) ? data : [];
    filas.push(...lote);
    total = meta?.total ?? filas.length;
    // Sin headers se usa la regla anterior: un lote incompleto es la última página.
    const hayMas = meta ? meta.hasNext : lote.length === limite;
    if (!hayMas) return { filas, total, truncado: false };
    if (filas.length >= tope) return { filas, total, truncado: true };
    pagina += 1;
  }
}
