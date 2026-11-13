// ── Unidades de medida ────────────────────────────────────────────────────────
export const MOCK_UNIDADES = [
  { id_unidad: 1, codigo: 'g',       nombre: 'Gramo',       factor_conversion: '1.0000',    activo: true },
  { id_unidad: 2, codigo: 'kg',      nombre: 'Kilogramo',   factor_conversion: '1000.0000', activo: true },
  { id_unidad: 3, codigo: 'ml',      nombre: 'Mililitro',   factor_conversion: '1.0000',    activo: true },
  { id_unidad: 4, codigo: 'L',       nombre: 'Litro',       factor_conversion: '1000.0000', activo: true },
  { id_unidad: 5, codigo: 'unidad',  nombre: 'Unidad',      factor_conversion: '1.0000',    activo: true },
  { id_unidad: 6, codigo: 'oz',      nombre: 'Onza',        factor_conversion: '28.3495',   activo: true },
  { id_unidad: 7, codigo: 'bolsa',   nombre: 'Bolsa',       factor_conversion: '1.0000',    activo: true },
  { id_unidad: 8, codigo: 'porcion', nombre: 'Porción',     factor_conversion: '1.0000',    activo: true },
];

// ── Insumos (20) ──────────────────────────────────────────────────────────────
export const MOCK_INSUMOS = [
  { id_insumo: 1,  codigo_sku: 'INS-001', nombre: 'Café molido espresso',   tipo_insumo: 'INGREDIENTE', id_unidad_base: 1, codigo_unidad: 'g',       costo_promedio: '0.0450', stock_minimo: '1000.0000', stock_actual: '5000.0000', activo: true },
  { id_insumo: 2,  codigo_sku: 'INS-002', nombre: 'Leche entera',            tipo_insumo: 'INGREDIENTE', id_unidad_base: 3, codigo_unidad: 'ml',      costo_promedio: '0.0025', stock_minimo: '5000.0000', stock_actual: '3200.0000', activo: true }, // BAJO_MINIMO
  { id_insumo: 3,  codigo_sku: 'INS-003', nombre: 'Azúcar blanca',           tipo_insumo: 'INGREDIENTE', id_unidad_base: 1, codigo_unidad: 'g',       costo_promedio: '0.0012', stock_minimo: '2000.0000', stock_actual: '8000.0000', activo: true },
  { id_insumo: 4,  codigo_sku: 'INS-004', nombre: 'Cacao en polvo',          tipo_insumo: 'INGREDIENTE', id_unidad_base: 1, codigo_unidad: 'g',       costo_promedio: '0.0380', stock_minimo: '500.0000',  stock_actual: '1500.0000', activo: true },
  { id_insumo: 5,  codigo_sku: 'INS-005', nombre: 'Sirope de vainilla',      tipo_insumo: 'INGREDIENTE', id_unidad_base: 3, codigo_unidad: 'ml',      costo_promedio: '0.0150', stock_minimo: '500.0000',  stock_actual: '2000.0000', activo: true },
  { id_insumo: 6,  codigo_sku: 'INS-006', nombre: 'Té negro en bolsita',     tipo_insumo: 'INGREDIENTE', id_unidad_base: 5, codigo_unidad: 'unidad',  costo_promedio: '0.1200', stock_minimo: '50.0000',   stock_actual: '20.0000',   activo: true }, // BAJO_MINIMO
  { id_insumo: 7,  codigo_sku: 'INS-007', nombre: 'Arroz para horchata',     tipo_insumo: 'INGREDIENTE', id_unidad_base: 1, codigo_unidad: 'g',       costo_promedio: '0.0018', stock_minimo: '800.0000',  stock_actual: '3000.0000', activo: true },
  { id_insumo: 8,  codigo_sku: 'INS-008', nombre: 'Canela en polvo',         tipo_insumo: 'INGREDIENTE', id_unidad_base: 1, codigo_unidad: 'g',       costo_promedio: '0.0500', stock_minimo: '100.0000',  stock_actual: '0.0000',    activo: true }, // AGOTADO
  { id_insumo: 9,  codigo_sku: 'INS-009', nombre: 'Mantequilla sin sal',     tipo_insumo: 'INGREDIENTE', id_unidad_base: 1, codigo_unidad: 'g',       costo_promedio: '0.0280', stock_minimo: '1000.0000', stock_actual: '4000.0000', activo: true },
  { id_insumo: 10, codigo_sku: 'INS-010', nombre: 'Harina de trigo',         tipo_insumo: 'INGREDIENTE', id_unidad_base: 1, codigo_unidad: 'g',       costo_promedio: '0.0014', stock_minimo: '3000.0000', stock_actual: '10000.0000',activo: true },
  { id_insumo: 11, codigo_sku: 'INS-011', nombre: 'Huevo fresco',            tipo_insumo: 'INGREDIENTE', id_unidad_base: 5, codigo_unidad: 'unidad',  costo_promedio: '0.2500', stock_minimo: '30.0000',   stock_actual: '120.0000',  activo: true },
  { id_insumo: 12, codigo_sku: 'INS-012', nombre: 'Levadura seca',           tipo_insumo: 'INGREDIENTE', id_unidad_base: 1, codigo_unidad: 'g',       costo_promedio: '0.0600', stock_minimo: '80.0000',   stock_actual: '300.0000',  activo: true },
  { id_insumo: 13, codigo_sku: 'INS-013', nombre: 'Frijoles cocidos',        tipo_insumo: 'INGREDIENTE', id_unidad_base: 1, codigo_unidad: 'g',       costo_promedio: '0.0045', stock_minimo: '1000.0000', stock_actual: '5000.0000', activo: true },
  { id_insumo: 14, codigo_sku: 'INS-014', nombre: 'Masa de maíz',            tipo_insumo: 'INGREDIENTE', id_unidad_base: 1, codigo_unidad: 'g',       costo_promedio: '0.0030', stock_minimo: '1500.0000', stock_actual: '6000.0000', activo: true },
  { id_insumo: 15, codigo_sku: 'INS-015', nombre: 'Queso duro rallado',     tipo_insumo: 'INGREDIENTE', id_unidad_base: 1, codigo_unidad: 'g',       costo_promedio: '0.0520', stock_minimo: '300.0000',  stock_actual: '0.0000',    activo: true }, // AGOTADO
  { id_insumo: 16, codigo_sku: 'INS-016', nombre: 'Chocolate oscuro',        tipo_insumo: 'INGREDIENTE', id_unidad_base: 1, codigo_unidad: 'g',       costo_promedio: '0.0650', stock_minimo: '500.0000',  stock_actual: '2000.0000', activo: true },
  { id_insumo: 17, codigo_sku: 'INS-017', nombre: 'Arándanos deshidratados', tipo_insumo: 'INGREDIENTE', id_unidad_base: 1, codigo_unidad: 'g',       costo_promedio: '0.1100', stock_minimo: '200.0000',  stock_actual: '800.0000',  activo: true },
  { id_insumo: 18, codigo_sku: 'INS-018', nombre: 'Queso crema',             tipo_insumo: 'INGREDIENTE', id_unidad_base: 1, codigo_unidad: 'g',       costo_promedio: '0.0480', stock_minimo: '400.0000',  stock_actual: '1500.0000', activo: true },
  { id_insumo: 19, codigo_sku: 'INS-019', nombre: 'Vaso térmico 12oz',       tipo_insumo: 'EMPAQUE',     id_unidad_base: 5, codigo_unidad: 'unidad',  costo_promedio: '0.0800', stock_minimo: '200.0000',  stock_actual: '650.0000',  activo: true },
  { id_insumo: 20, codigo_sku: 'INS-020', nombre: 'Servilletas kraft',       tipo_insumo: 'EMPAQUE',     id_unidad_base: 5, codigo_unidad: 'unidad',  costo_promedio: '0.0120', stock_minimo: '500.0000',  stock_actual: '1800.0000', activo: true },
];

// ── Categorías (6) ────────────────────────────────────────────────────────────
export const MOCK_CATEGORIAS = [
  { id_categoria: 1, nombre: 'Bebidas Calientes',    descripcion: 'Cafés, tés y bebidas servidas calientes',   activo: true },
  { id_categoria: 2, nombre: 'Bebidas Frías',        descripcion: 'Frappes, helados, refrescos naturales',      activo: true },
  { id_categoria: 3, nombre: 'Panadería Artesanal',  descripcion: 'Panes y masas horneadas en tienda',          activo: true },
  { id_categoria: 4, nombre: 'Empaquetados',         descripcion: 'Productos de reventa sellados de fábrica',   activo: true },
  { id_categoria: 5, nombre: 'Repostería',           descripcion: 'Postres y dulces artesanales',               activo: true },
  { id_categoria: 6, nombre: 'Otros',                descripcion: 'Artículos misceláneos',                      activo: true },
];

// ── Productos (15 elaborados + 3 reventa) ─────────────────────────────────────
export const MOCK_PRODUCTOS = [
  // Bebidas Calientes
  { id_producto: 1,  id_categoria: 1, nombre_categoria: 'Bebidas Calientes',   nombre: 'Latte Grande',               codigo_barra: '7400001000011', precio_venta: '3.5000', es_elaborado: true,  id_insumo_reventa: null, activo: true },
  { id_producto: 2,  id_categoria: 1, nombre_categoria: 'Bebidas Calientes',   nombre: 'Cappuccino',                 codigo_barra: '7400001000028', precio_venta: '3.0000', es_elaborado: true,  id_insumo_reventa: null, activo: true },
  { id_producto: 3,  id_categoria: 1, nombre_categoria: 'Bebidas Calientes',   nombre: 'Espresso Doble',             codigo_barra: '7400001000035', precio_venta: '2.5000', es_elaborado: true,  id_insumo_reventa: null, activo: true },
  { id_producto: 4,  id_categoria: 1, nombre_categoria: 'Bebidas Calientes',   nombre: 'Americano',                  codigo_barra: '7400001000042', precio_venta: '2.2500', es_elaborado: true,  id_insumo_reventa: null, activo: true },
  // Bebidas Frías
  { id_producto: 5,  id_categoria: 2, nombre_categoria: 'Bebidas Frías',       nombre: 'Mocha Frío',                 codigo_barra: '7400001000059', precio_venta: '3.7500', es_elaborado: true,  id_insumo_reventa: null, activo: true },
  { id_producto: 6,  id_categoria: 2, nombre_categoria: 'Bebidas Frías',       nombre: 'Frappe de Vainilla',         codigo_barra: '7400001000066', precio_venta: '4.0000', es_elaborado: true,  id_insumo_reventa: null, activo: true },
  { id_producto: 7,  id_categoria: 2, nombre_categoria: 'Bebidas Frías',       nombre: 'Té Helado',                  codigo_barra: '7400001000073', precio_venta: '2.0000', es_elaborado: true,  id_insumo_reventa: null, activo: true },
  { id_producto: 8,  id_categoria: 2, nombre_categoria: 'Bebidas Frías',       nombre: 'Horchata Artesanal',         codigo_barra: '7400001000080', precio_venta: '2.5000', es_elaborado: true,  id_insumo_reventa: null, activo: true },
  // Panadería Artesanal
  { id_producto: 9,  id_categoria: 3, nombre_categoria: 'Panadería Artesanal', nombre: 'Croissant de Mantequilla',   codigo_barra: '7400001000097', precio_venta: '1.7500', es_elaborado: true,  id_insumo_reventa: null, activo: true },
  { id_producto: 10, id_categoria: 3, nombre_categoria: 'Panadería Artesanal', nombre: 'Pan de Masa Madre (rebanada)',codigo_barra: '7400001000103', precio_venta: '1.2500', es_elaborado: true,  id_insumo_reventa: null, activo: true },
  { id_producto: 11, id_categoria: 3, nombre_categoria: 'Panadería Artesanal', nombre: 'Empanada de Frijol',         codigo_barra: '7400001000110', precio_venta: '1.0000', es_elaborado: true,  id_insumo_reventa: null, activo: true },
  { id_producto: 12, id_categoria: 3, nombre_categoria: 'Panadería Artesanal', nombre: 'Quesadilla de Maíz',         codigo_barra: '7400001000127', precio_venta: '1.2500', es_elaborado: true,  id_insumo_reventa: null, activo: true },
  // Repostería
  { id_producto: 13, id_categoria: 5, nombre_categoria: 'Repostería',          nombre: 'Brownie de Chocolate',       codigo_barra: '7400001000134', precio_venta: '2.0000', es_elaborado: true,  id_insumo_reventa: null, activo: true },
  { id_producto: 14, id_categoria: 5, nombre_categoria: 'Repostería',          nombre: 'Muffin de Arándano',         codigo_barra: '7400001000141', precio_venta: '1.7500', es_elaborado: true,  id_insumo_reventa: null, activo: true },
  { id_producto: 15, id_categoria: 5, nombre_categoria: 'Repostería',          nombre: 'Tarta de Queso',             codigo_barra: '7400001000158', precio_venta: '2.5000', es_elaborado: true,  id_insumo_reventa: null, activo: true },
  // Reventa
  { id_producto: 16, id_categoria: 4, nombre_categoria: 'Empaquetados',        nombre: 'Agua embotellada 500ml',     codigo_barra: '7400001000165', precio_venta: '0.7500', es_elaborado: false, id_insumo_reventa: 2,    activo: true },
  { id_producto: 17, id_categoria: 4, nombre_categoria: 'Empaquetados',        nombre: 'Galletas empacadas',         codigo_barra: '7400001000172', precio_venta: '1.0000', es_elaborado: false, id_insumo_reventa: 6,    activo: true },
  { id_producto: 18, id_categoria: 4, nombre_categoria: 'Empaquetados',        nombre: 'Café en bolsa 250g',         codigo_barra: '7400001000189', precio_venta: '5.5000', es_elaborado: false, id_insumo_reventa: 1,    activo: true },
];

// ── Recetas por producto ──────────────────────────────────────────────────────
const RECETAS = {
  // Latte Grande (id 1)
  1: { componentes: [
    { id_insumo: 1,  nombre_insumo: 'Café molido espresso',   codigo_unidad: 'g',  costo_promedio: '0.0450', cantidad_requerida: '18.0000' },
    { id_insumo: 2,  nombre_insumo: 'Leche entera',           codigo_unidad: 'ml', costo_promedio: '0.0025', cantidad_requerida: '250.0000' },
    { id_insumo: 3,  nombre_insumo: 'Azúcar blanca',          codigo_unidad: 'g',  costo_promedio: '0.0012', cantidad_requerida: '8.0000' },
  ]},
  // Cappuccino (id 2)
  2: { componentes: [
    { id_insumo: 1,  nombre_insumo: 'Café molido espresso',   codigo_unidad: 'g',  costo_promedio: '0.0450', cantidad_requerida: '14.0000' },
    { id_insumo: 2,  nombre_insumo: 'Leche entera',           codigo_unidad: 'ml', costo_promedio: '0.0025', cantidad_requerida: '120.0000' },
    { id_insumo: 3,  nombre_insumo: 'Azúcar blanca',          codigo_unidad: 'g',  costo_promedio: '0.0012', cantidad_requerida: '5.0000' },
  ]},
  // Mocha Frío (id 5)
  5: { componentes: [
    { id_insumo: 1,  nombre_insumo: 'Café molido espresso',   codigo_unidad: 'g',  costo_promedio: '0.0450', cantidad_requerida: '18.0000' },
    { id_insumo: 2,  nombre_insumo: 'Leche entera',           codigo_unidad: 'ml', costo_promedio: '0.0025', cantidad_requerida: '200.0000' },
    { id_insumo: 4,  nombre_insumo: 'Cacao en polvo',         codigo_unidad: 'g',  costo_promedio: '0.0380', cantidad_requerida: '20.0000' },
    { id_insumo: 3,  nombre_insumo: 'Azúcar blanca',          codigo_unidad: 'g',  costo_promedio: '0.0012', cantidad_requerida: '12.0000' },
    { id_insumo: 19, nombre_insumo: 'Hielo en cubos',         codigo_unidad: 'g',  costo_promedio: '0.0005', cantidad_requerida: '150.0000' },
    { id_insumo: 20, nombre_insumo: 'Crema batida',           codigo_unidad: 'ml', costo_promedio: '0.0180', cantidad_requerida: '30.0000' },
  ]},
  // Frappe de Vainilla (id 6)
  6: { componentes: [
    { id_insumo: 1,  nombre_insumo: 'Café molido espresso',   codigo_unidad: 'g',  costo_promedio: '0.0450', cantidad_requerida: '14.0000' },
    { id_insumo: 2,  nombre_insumo: 'Leche entera',           codigo_unidad: 'ml', costo_promedio: '0.0025', cantidad_requerida: '180.0000' },
    { id_insumo: 5,  nombre_insumo: 'Sirope de vainilla',     codigo_unidad: 'ml', costo_promedio: '0.0150', cantidad_requerida: '30.0000' },
    { id_insumo: 19, nombre_insumo: 'Hielo en cubos',         codigo_unidad: 'g',  costo_promedio: '0.0005', cantidad_requerida: '200.0000' },
    { id_insumo: 20, nombre_insumo: 'Crema batida',           codigo_unidad: 'ml', costo_promedio: '0.0180', cantidad_requerida: '40.0000' },
  ]},
  // Horchata Artesanal (id 8)
  8: { componentes: [
    { id_insumo: 7,  nombre_insumo: 'Arroz para horchata',    codigo_unidad: 'g',  costo_promedio: '0.0018', cantidad_requerida: '80.0000' },
    { id_insumo: 8,  nombre_insumo: 'Canela en polvo',        codigo_unidad: 'g',  costo_promedio: '0.0500', cantidad_requerida: '5.0000' },
    { id_insumo: 3,  nombre_insumo: 'Azúcar blanca',          codigo_unidad: 'g',  costo_promedio: '0.0012', cantidad_requerida: '20.0000' },
    { id_insumo: 19, nombre_insumo: 'Hielo en cubos',         codigo_unidad: 'g',  costo_promedio: '0.0005', cantidad_requerida: '100.0000' },
  ]},
  // Croissant de Mantequilla (id 9)
  9: { componentes: [
    { id_insumo: 10, nombre_insumo: 'Harina de trigo',        codigo_unidad: 'g',  costo_promedio: '0.0014', cantidad_requerida: '120.0000' },
    { id_insumo: 9,  nombre_insumo: 'Mantequilla sin sal',    codigo_unidad: 'g',  costo_promedio: '0.0280', cantidad_requerida: '60.0000' },
    { id_insumo: 11, nombre_insumo: 'Huevo fresco',           codigo_unidad: 'unidad', costo_promedio: '0.2500', cantidad_requerida: '1.0000' },
    { id_insumo: 12, nombre_insumo: 'Levadura seca',          codigo_unidad: 'g',  costo_promedio: '0.0600', cantidad_requerida: '5.0000' },
    { id_insumo: 3,  nombre_insumo: 'Azúcar blanca',          codigo_unidad: 'g',  costo_promedio: '0.0012', cantidad_requerida: '10.0000' },
  ]},
  // Brownie de Chocolate (id 13)
  13: { componentes: [
    { id_insumo: 16, nombre_insumo: 'Chocolate oscuro',       codigo_unidad: 'g',  costo_promedio: '0.0650', cantidad_requerida: '80.0000' },
    { id_insumo: 9,  nombre_insumo: 'Mantequilla sin sal',    codigo_unidad: 'g',  costo_promedio: '0.0280', cantidad_requerida: '50.0000' },
    { id_insumo: 3,  nombre_insumo: 'Azúcar blanca',          codigo_unidad: 'g',  costo_promedio: '0.0012', cantidad_requerida: '90.0000' },
    { id_insumo: 11, nombre_insumo: 'Huevo fresco',           codigo_unidad: 'unidad', costo_promedio: '0.2500', cantidad_requerida: '2.0000' },
    { id_insumo: 10, nombre_insumo: 'Harina de trigo',        codigo_unidad: 'g',  costo_promedio: '0.0014', cantidad_requerida: '50.0000' },
  ]},
  // Tarta de Queso (id 15)
  15: { componentes: [
    { id_insumo: 18, nombre_insumo: 'Queso crema',            codigo_unidad: 'g',  costo_promedio: '0.0480', cantidad_requerida: '150.0000' },
    { id_insumo: 3,  nombre_insumo: 'Azúcar blanca',          codigo_unidad: 'g',  costo_promedio: '0.0012', cantidad_requerida: '60.0000' },
    { id_insumo: 11, nombre_insumo: 'Huevo fresco',           codigo_unidad: 'unidad', costo_promedio: '0.2500', cantidad_requerida: '3.0000' },
    { id_insumo: 10, nombre_insumo: 'Harina de trigo',        codigo_unidad: 'g',  costo_promedio: '0.0014', cantidad_requerida: '40.0000' },
    { id_insumo: 9,  nombre_insumo: 'Mantequilla sin sal',    codigo_unidad: 'g',  costo_promedio: '0.0280', cantidad_requerida: '30.0000' },
  ]},
};

/**
 * Devuelve la receta (BOM) de un producto elaborado.
 * @param {number} idProducto
 * @returns {{ componentes: Array } | null}
 */
export function mockRecetaPorProducto(idProducto) {
  return RECETAS[idProducto] ?? null;
}

// ── Stock por sucursal (sucursal 1 = Casa Matriz) ─────────────────────────────
export const MOCK_STOCK_SUCURSAL = [
  { id_insumo: 1,  nombre_insumo: 'Café molido espresso',   codigo_unidad: 'g',      stock_actual: '5000.0000', stock_minimo: '1000.0000' },
  { id_insumo: 2,  nombre_insumo: 'Leche entera',           codigo_unidad: 'ml',     stock_actual: '20000.0000',stock_minimo: '5000.0000' },
  { id_insumo: 3,  nombre_insumo: 'Azúcar blanca',          codigo_unidad: 'g',      stock_actual: '8000.0000', stock_minimo: '2000.0000' },
  { id_insumo: 4,  nombre_insumo: 'Cacao en polvo',         codigo_unidad: 'g',      stock_actual: '1500.0000', stock_minimo: '500.0000'  },
  { id_insumo: 5,  nombre_insumo: 'Sirope de vainilla',     codigo_unidad: 'ml',     stock_actual: '2000.0000', stock_minimo: '500.0000'  },
  { id_insumo: 6,  nombre_insumo: 'Té negro en bolsita',    codigo_unidad: 'unidad', stock_actual: '200.0000',  stock_minimo: '50.0000'   },
  { id_insumo: 7,  nombre_insumo: 'Arroz para horchata',    codigo_unidad: 'g',      stock_actual: '3000.0000', stock_minimo: '800.0000'  },
  { id_insumo: 8,  nombre_insumo: 'Canela en polvo',        codigo_unidad: 'g',      stock_actual: '500.0000',  stock_minimo: '100.0000'  },
  { id_insumo: 9,  nombre_insumo: 'Mantequilla sin sal',    codigo_unidad: 'g',      stock_actual: '4000.0000', stock_minimo: '1000.0000' },
  { id_insumo: 10, nombre_insumo: 'Harina de trigo',        codigo_unidad: 'g',      stock_actual: '10000.0000',stock_minimo: '3000.0000' },
  { id_insumo: 11, nombre_insumo: 'Huevo fresco',           codigo_unidad: 'unidad', stock_actual: '120.0000',  stock_minimo: '30.0000'   },
  { id_insumo: 12, nombre_insumo: 'Levadura seca',          codigo_unidad: 'g',      stock_actual: '300.0000',  stock_minimo: '80.0000'   },
  { id_insumo: 13, nombre_insumo: 'Frijoles cocidos',       codigo_unidad: 'g',      stock_actual: '5000.0000', stock_minimo: '1000.0000' },
  { id_insumo: 14, nombre_insumo: 'Masa de maíz',           codigo_unidad: 'g',      stock_actual: '6000.0000', stock_minimo: '1500.0000' },
  { id_insumo: 15, nombre_insumo: 'Queso duro rallado',     codigo_unidad: 'g',      stock_actual: '1200.0000', stock_minimo: '300.0000'  },
  { id_insumo: 16, nombre_insumo: 'Chocolate oscuro',       codigo_unidad: 'g',      stock_actual: '2000.0000', stock_minimo: '500.0000'  },
  { id_insumo: 17, nombre_insumo: 'Arándanos deshidratados',codigo_unidad: 'g',      stock_actual: '800.0000',  stock_minimo: '200.0000'  },
  { id_insumo: 18, nombre_insumo: 'Queso crema',            codigo_unidad: 'g',      stock_actual: '1500.0000', stock_minimo: '400.0000'  },
  { id_insumo: 19, nombre_insumo: 'Hielo en cubos',         codigo_unidad: 'g',      stock_actual: '15000.0000',stock_minimo: '5000.0000' },
  { id_insumo: 20, nombre_insumo: 'Crema batida',           codigo_unidad: 'ml',     stock_actual: '3000.0000', stock_minimo: '800.0000'  },
];
