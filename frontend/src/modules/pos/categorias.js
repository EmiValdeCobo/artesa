// Agrupa el catálogo por categoría para mostrarlo como menú. Función pura (sin React) para poder probarla.
// Orden de las categorías: por id_categoria (orden de creación en la BD) y, si falta, por primera aparición;
// "Sin categoría" siempre al final. Dentro de cada grupo, productos por nombre (es). No modifica los datos.
export const SIN_CATEGORIA = 'Sin categoría';

const porNombre = (a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' });

export function agruparPorCategoria(productos) {
  const grupos = new Map();
  for (const p of productos) {
    const nombre = p.categoria || SIN_CATEGORIA;
    if (!grupos.has(nombre)) grupos.set(nombre, { nombre, orden: p.id_categoria ?? null, primera: grupos.size, productos: [] });
    grupos.get(nombre).productos.push(p);
  }
  const lista = [...grupos.values()].sort((a, b) => {
    if ((a.nombre === SIN_CATEGORIA) !== (b.nombre === SIN_CATEGORIA)) return a.nombre === SIN_CATEGORIA ? 1 : -1;
    if (a.orden !== null && b.orden !== null && a.orden !== b.orden) return a.orden - b.orden;
    return a.primera - b.primera;
  });
  return lista.map(({ nombre, productos: ps }) => ({ nombre, productos: [...ps].sort(porNombre) }));
}
