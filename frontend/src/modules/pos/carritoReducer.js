// Estado del carrito: arreglo de líneas
//   { clave, id_producto, nombre, precio, cantidad, stock, nota, extras: [{ id_producto, nombre, precio }] }
// Una línea se identifica por `clave` (no por id_producto): el mismo producto puede ir en dos líneas
// con observaciones o extras distintos ("Latte" y "Latte — sin azúcar + shot").
export const carritoInicial = [];

let secuencia = 0;
const nuevaClave = (idProducto) => `${idProducto}-${Date.now().toString(36)}-${(secuencia += 1)}`;

const firmaExtras = (extras = []) => extras.map((e) => e.id_producto).sort((a, b) => a - b).join(',');
const lineaSimple = (i) => !i.nota && !(i.extras?.length);

export function carritoReducer(items, accion) {
  switch (accion.tipo) {
    case 'agregar': {
      const p = accion.producto;
      // Solo se acumula sobre una línea "simple" del mismo producto; las personalizadas quedan aparte.
      const existente = items.find((i) => i.id_producto === p.id_producto && lineaSimple(i));
      if (!existente) {
        return [...items, { clave: nuevaClave(p.id_producto), id_producto: p.id_producto, nombre: p.nombre, precio: p.precio, cantidad: 1, stock: p.stock, nota: '', extras: [] }];
      }
      return items.map((i) => (i.clave === existente.clave && i.cantidad < i.stock ? { ...i, cantidad: i.cantidad + 1 } : i));
    }
    case 'cambiarCantidad':
      return items
        .map((i) => (i.clave === accion.id ? { ...i, cantidad: Math.min(Math.max(accion.cantidad, 0), i.stock) } : i))
        .filter((i) => i.cantidad > 0);
    case 'personalizar': {
      // Cambia observación y extras; si queda idéntica a otra línea del mismo producto, se fusionan.
      const nota = (accion.nota ?? '').trim().slice(0, 200);
      const extras = accion.extras ?? [];
      const actual = items.find((i) => i.clave === accion.id);
      if (!actual) return items;
      const gemela = items.find((i) => i.clave !== actual.clave && i.id_producto === actual.id_producto
        && (i.nota || '') === nota && firmaExtras(i.extras) === firmaExtras(extras));
      if (gemela) {
        return items
          .filter((i) => i.clave !== actual.clave)
          .map((i) => (i.clave === gemela.clave ? { ...i, cantidad: Math.min(i.cantidad + actual.cantidad, i.stock) } : i));
      }
      return items.map((i) => (i.clave === actual.clave ? { ...i, nota, extras } : i));
    }
    case 'quitar':
      return items.filter((i) => i.clave !== accion.id);
    case 'vaciar':
      return carritoInicial;
    case 'restaurar':
      return accion.items.map((item) => ({ ...item }));
    default:
      return items;
  }
}

// Precio de una unidad de la línea con sus extras (para totales y la columna del carrito).
export const precioLinea = (i) => i.precio + (i.extras ?? []).reduce((s, e) => s + e.precio, 0);

// Cantidad total de un producto en el carrito (sumando todas sus líneas).
export const cantidadDeProducto = (items, idProducto) =>
  items.reduce((n, i) => n + (i.id_producto === idProducto ? i.cantidad : 0), 0);

// Ítems para POST /pos/ventas: cada extra va inmediatamente después de su línea y apunta a ella con
// extra_de (posición 1-based). El extra se cobra por cada unidad de la línea principal.
export function itemsParaVenta(items) {
  const salida = [];
  for (const i of items) {
    salida.push({ id_producto: i.id_producto, cantidad: i.cantidad, nota: i.nota?.trim() || null });
    const posicion = salida.length;
    for (const e of i.extras ?? []) {
      salida.push({ id_producto: e.id_producto, cantidad: i.cantidad, nota: null, extra_de: posicion });
    }
  }
  return salida;
}
