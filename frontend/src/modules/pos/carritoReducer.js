// Estado del carrito: arreglo de { id_producto, nombre, precio, cantidad, stock }.
export const carritoInicial = [];

export function carritoReducer(items, accion) {
  switch (accion.tipo) {
    case 'agregar': {
      const p = accion.producto;
      const existente = items.find((i) => i.id_producto === p.id_producto);
      if (!existente) {
        return [...items, { id_producto: p.id_producto, nombre: p.nombre, precio: p.precio, cantidad: 1, stock: p.stock }];
      }
      return items.map((i) => (i.id_producto === p.id_producto && i.cantidad < i.stock ? { ...i, cantidad: i.cantidad + 1 } : i));
    }
    case 'cambiarCantidad':
      return items
        .map((i) => (i.id_producto === accion.id ? { ...i, cantidad: Math.min(Math.max(accion.cantidad, 0), i.stock) } : i))
        .filter((i) => i.cantidad > 0);
    case 'quitar':
      return items.filter((i) => i.id_producto !== accion.id);
    case 'vaciar':
      return carritoInicial;
    default:
      return items;
  }
}