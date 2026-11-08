// Datos semilla de respaldo, para trabajar sin backend. Se activan con USAR_DATOS_SEMILLA en posApi.js.
// Forma de cada producto: id_producto, nombre, categoria, precio, stock, stock_minimo, tipo.
export const productosSemilla = [
  { id_producto: 1, nombre: 'Latte Grande', categoria: 'Bebidas calientes', precio: 3.5, stock: 40, stock_minimo: 10, tipo: 'elaborado' },
  { id_producto: 2, nombre: 'Espresso', categoria: 'Bebidas calientes', precio: 1.75, stock: 60, stock_minimo: 10, tipo: 'elaborado' },
  { id_producto: 3, nombre: 'Americano', categoria: 'Bebidas calientes', precio: 2.25, stock: 55, stock_minimo: 10, tipo: 'elaborado' },
  { id_producto: 4, nombre: 'Capuchino', categoria: 'Bebidas calientes', precio: 3.25, stock: 8, stock_minimo: 10, tipo: 'elaborado' },
  { id_producto: 5, nombre: 'Moka', categoria: 'Bebidas calientes', precio: 3.75, stock: 30, stock_minimo: 10, tipo: 'elaborado' },
  { id_producto: 6, nombre: 'Frappé de caramelo', categoria: 'Bebidas frías', precio: 4.5, stock: 25, stock_minimo: 8, tipo: 'elaborado' },
  { id_producto: 7, nombre: 'Café frío (cold brew)', categoria: 'Bebidas frías', precio: 3.95, stock: 20, stock_minimo: 8, tipo: 'elaborado' },
  { id_producto: 8, nombre: 'Limonada de la casa', categoria: 'Bebidas frías', precio: 2.5, stock: 0, stock_minimo: 5, tipo: 'elaborado' },
  { id_producto: 9, nombre: 'Croissant de mantequilla', categoria: 'Panadería', precio: 2.25, stock: 18, stock_minimo: 6, tipo: 'elaborado' },
  { id_producto: 10, nombre: 'Pan dulce de la casa', categoria: 'Panadería', precio: 1.25, stock: 35, stock_minimo: 10, tipo: 'elaborado' },
  { id_producto: 11, nombre: 'Sándwich de pollo', categoria: 'Comida', precio: 5.5, stock: 12, stock_minimo: 5, tipo: 'elaborado' },
  { id_producto: 12, nombre: 'Pupusas (orden de 2)', categoria: 'Comida', precio: 2.0, stock: 50, stock_minimo: 10, tipo: 'elaborado' },
  { id_producto: 13, nombre: 'Agua embotellada 500ml', categoria: 'Reventa', precio: 1.0, stock: 48, stock_minimo: 12, tipo: 'reventa' },
  { id_producto: 14, nombre: 'Jugo de naranja empacado', categoria: 'Reventa', precio: 1.5, stock: 4, stock_minimo: 8, tipo: 'reventa' },
  { id_producto: 15, nombre: 'Galletas de avena', categoria: 'Reventa', precio: 1.75, stock: 22, stock_minimo: 6, tipo: 'reventa' },
  { id_producto: 16, nombre: 'Café en grano 340g', categoria: 'Reventa', precio: 9.5, stock: 14, stock_minimo: 4, tipo: 'reventa' },
];