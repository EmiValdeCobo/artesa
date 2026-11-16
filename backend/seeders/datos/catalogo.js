// Catálogo base del seed: datos fijos y coherentes del rubro (cafetería/pupusería en El Salvador).
// Las cantidades de recetas están en la unidad base del insumo (GR, ML o UND) y son enteras.

export const CONTRASENA_DEMO = 'Cambiar123*';
export const CONTRASENA_CLIENTE_DEMO = 'Cliente123*';

// perfil: volumen relativo. horas: [apertura, cierre) en hora local; turnos: franjas por caja.
export const SUCURSALES = [
  {
    id: 1, codigo: 'M001', nombre: 'Orígenes Escalón', direccion: 'Paseo General Escalón y 79 Av. Norte, Col. Escalón, San Salvador',
    departamento: 'San Salvador', telefono: '2263-4100', perfil: 'ALTO', ticketsBase: 150, apertura: 75.0,
    cajas: [{ id: 1, pv: 'P001', nombre: 'Caja Principal 01' }, { id: 2, pv: 'P002', nombre: 'Caja Barra 02' }],
    turnos: [{ inicio: 6.5, fin: 14 }, { inicio: 14, fin: 21 }],
    horas: { 6: 0.4, 7: 1.3, 8: 1.5, 9: 1.1, 10: 0.8, 11: 0.9, 12: 1.4, 13: 1.3, 14: 0.8, 15: 0.8, 16: 1.0, 17: 1.0, 18: 0.8, 19: 0.6, 20: 0.3 },
    // lunes..domingo
    semana: [0.85, 0.88, 0.93, 0.98, 1.12, 1.35, 1.28],
    lan: '192.168.10.',
  },
  {
    id: 2, codigo: 'M002', nombre: 'Orígenes Santa Tecla', direccion: 'Paseo El Carmen, 1a Av. Norte #4-2, Santa Tecla, La Libertad',
    departamento: 'La Libertad', telefono: '2288-7350', perfil: 'MEDIO', ticketsBase: 85, apertura: 60.0,
    cajas: [{ id: 3, pv: 'P001', nombre: 'Caja Principal 01' }, { id: 4, pv: 'P002', nombre: 'Caja Terraza 02' }],
    turnos: [{ inicio: 7, fin: 14.5 }, { inicio: 14.5, fin: 22 }],
    horas: { 7: 0.5, 8: 0.8, 9: 0.7, 10: 0.6, 11: 0.8, 12: 1.1, 13: 1.0, 14: 0.6, 15: 0.6, 16: 0.8, 17: 1.1, 18: 1.5, 19: 1.7, 20: 1.5, 21: 0.9 },
    semana: [0.78, 0.8, 0.88, 0.95, 1.25, 1.5, 1.3],
    lan: '192.168.20.',
  },
  {
    id: 3, codigo: 'M003', nombre: 'Orígenes Centro Histórico', direccion: 'Calle Delgado y 2a Av. Sur, frente a Plaza Libertad, San Salvador',
    departamento: 'San Salvador', telefono: '2221-0950', perfil: 'BAJO', ticketsBase: 38, apertura: 40.0,
    cajas: [{ id: 5, pv: 'P001', nombre: 'Caja Principal 01' }],
    turnos: [{ inicio: 6.75, fin: 18 }],
    horas: { 7: 1.4, 8: 1.6, 9: 1.0, 10: 0.8, 11: 1.1, 12: 1.7, 13: 1.3, 14: 0.7, 15: 0.6, 16: 0.6, 17: 0.4 },
    semana: [1.05, 1.02, 1.03, 1.06, 1.1, 0.95, 0.55],
    lan: '192.168.30.',
  },
];

export const UNIDADES = [
  { id: 1, codigo: 'GR', nombre: 'Gramo', factor: '1.0000' },
  { id: 2, codigo: 'KG', nombre: 'Kilogramo', factor: '1000.0000' },
  { id: 3, codigo: 'LB', nombre: 'Libra', factor: '453.5924' },
  { id: 4, codigo: 'OZ', nombre: 'Onza', factor: '28.3495' },
  { id: 5, codigo: 'ML', nombre: 'Mililitro', factor: '1.0000' },
  { id: 6, codigo: 'L', nombre: 'Litro', factor: '1000.0000' },
  { id: 7, codigo: 'GAL', nombre: 'Galón', factor: '3785.4118' },
  { id: 8, codigo: 'OZFL', nombre: 'Onza líquida', factor: '29.5735' },
  { id: 9, codigo: 'UND', nombre: 'Unidad', factor: '1.0000' },
  { id: 10, codigo: 'DOC', nombre: 'Docena', factor: '12.0000' },
];

export const CATEGORIAS = [
  { id: 1, nombre: 'Bebidas calientes' },
  { id: 2, nombre: 'Bebidas frías' },
  { id: 3, nombre: 'Desayunos' },
  { id: 4, nombre: 'Platos típicos' },
  { id: 5, nombre: 'Panadería y postres' },
  { id: 6, nombre: 'Reventa' },
];

// clave interna del proveedor -> datos. dias: días de entrega (0=domingo .. 6=sábado).
export const PROVEEDORES = [
  { id: 1, clave: 'CAFE', razon: 'Distribuidora de Café La Cumbre, S.A. de C.V.', nrc: '245871-3', nit: '0614-150398-102-4', contacto: 'Mauricio Henríquez', telefono: '2264-1180', credito: 30, dias: [1], prefijo: 'LC' },
  { id: 2, clave: 'LACTEOS', razon: 'Lácteos del Valle, S.A. de C.V.', nrc: '118254-6', nit: '0614-220791-101-8', contacto: 'Karla Menjívar', telefono: '2273-5520', credito: 15, dias: [1, 3, 5], prefijo: 'LV' },
  { id: 3, clave: 'EMPAQUES', razon: 'Empaques y Desechables SV, S.A. de C.V.', nrc: '301447-0', nit: '0614-030605-103-2', contacto: 'Óscar Rivas', telefono: '2251-9034', credito: 30, dias: [2], prefijo: 'ED' },
  { id: 4, clave: 'ABARROTES', razon: 'Abarrotes y Granos El Sembrador, S.A. de C.V.', nrc: '087312-9', nit: '0511-100488-101-5', contacto: 'Doris Alvarado', telefono: '2228-4417', credito: 15, dias: [2, 5], prefijo: 'ES' },
  { id: 5, clave: 'HORTALIZAS', razon: 'Hortalizas y Frutas Zapotitán, S.A. de C.V.', nrc: '276590-1', nit: '0502-080812-102-7', contacto: 'Rigoberto Mejía', telefono: '2338-0762', credito: 0, dias: [1, 3, 6], prefijo: 'HZ' },
  { id: 6, clave: 'CARNES', razon: 'Avícola y Embutidos Santa Rosa, S.A. de C.V.', nrc: '154038-2', nit: '0614-191194-104-1', contacto: 'Lucía Portillo', telefono: '2440-3381', credito: 15, dias: [2, 5], prefijo: 'SR' },
  { id: 7, clave: 'PANADERIA', razon: 'Panificadora La Espiga, S.A. de C.V.', nrc: '198765-4', nit: '0614-050900-101-3', contacto: 'Ernesto Calderón', telefono: '2225-6619', credito: 0, dias: [1, 2, 3, 4, 5, 6], prefijo: 'PE' },
  { id: 8, clave: 'HIELO', razon: 'Fábrica de Hielo Cristal, S.A. de C.V.', nrc: '063421-8', nit: '0614-120385-102-9', contacto: 'José Ramírez', telefono: '2270-1205', credito: 0, dias: [1, 2, 3, 4, 5, 6], prefijo: 'HC' },
  { id: 9, clave: 'BEBIDAS', razon: 'Bebidas y Distribución Cuscatlán, S.A. de C.V.', nrc: '220913-5', nit: '0614-270502-103-6', contacto: 'Andrea Flores', telefono: '2213-8840', credito: 30, dias: [4], prefijo: 'BC' },
  { id: 10, clave: 'ENERGIA', razon: 'Energía y Servicios del Pacífico, S.A. de C.V.', nrc: '010245-7', nit: '0614-011090-101-0', contacto: 'Atención Empresarial', telefono: '2507-1000', credito: 15, dias: [], prefijo: 'EP' },
  { id: 11, clave: 'MANTENIMIENTO', razon: 'Servicios de Mantenimiento Integral, S.A. de C.V.', nrc: '289104-3', nit: '0614-140615-102-2', contacto: 'Fernando Quintanilla', telefono: '2290-4471', credito: 0, dias: [], prefijo: 'MI' },
];

// costo: dólares por unidad base, sin IVA. paquete: múltiplo de compra en unidad base.
export const INSUMOS = [
  { clave: 'cafe_grano', nombre: 'Café en grano de especialidad', tipo: 'INGREDIENTE', unidad: 'GR', costo: '0.024000', prov: 'CAFE', paquete: 1000 },
  { clave: 'cafe_filtrado', nombre: 'Café molido para filtrado', tipo: 'INGREDIENTE', unidad: 'GR', costo: '0.016000', prov: 'CAFE', paquete: 1000 },
  { clave: 'leche', nombre: 'Leche entera', tipo: 'INGREDIENTE', unidad: 'ML', costo: '0.001150', prov: 'LACTEOS', paquete: 1000 },
  { clave: 'leche_deslac', nombre: 'Leche deslactosada', tipo: 'INGREDIENTE', unidad: 'ML', costo: '0.001350', prov: 'LACTEOS', paquete: 1000 },
  { clave: 'leche_almendra', nombre: 'Bebida de almendra', tipo: 'INGREDIENTE', unidad: 'ML', costo: '0.004200', prov: 'LACTEOS', paquete: 946 },
  { clave: 'crema_batida', nombre: 'Crema para batir', tipo: 'INGREDIENTE', unidad: 'ML', costo: '0.006500', prov: 'LACTEOS', paquete: 1000 },
  { clave: 'crema_acida', nombre: 'Crema ácida', tipo: 'INGREDIENTE', unidad: 'ML', costo: '0.004500', prov: 'LACTEOS', paquete: 1000 },
  { clave: 'quesillo', nombre: 'Quesillo', tipo: 'INGREDIENTE', unidad: 'GR', costo: '0.008500', prov: 'LACTEOS', paquete: 1000 },
  { clave: 'queso_duro', nombre: 'Queso duro blandito', tipo: 'INGREDIENTE', unidad: 'GR', costo: '0.009000', prov: 'LACTEOS', paquete: 500 },
  { clave: 'mozzarella', nombre: 'Queso mozzarella', tipo: 'INGREDIENTE', unidad: 'GR', costo: '0.010000', prov: 'LACTEOS', paquete: 1000 },
  { clave: 'mantequilla', nombre: 'Mantequilla sin sal', tipo: 'INGREDIENTE', unidad: 'GR', costo: '0.009000', prov: 'LACTEOS', paquete: 454 },
  { clave: 'azucar', nombre: 'Azúcar blanca', tipo: 'INGREDIENTE', unidad: 'GR', costo: '0.001100', prov: 'ABARROTES', paquete: 2000 },
  { clave: 'azucar_morena', nombre: 'Azúcar morena', tipo: 'INGREDIENTE', unidad: 'GR', costo: '0.001400', prov: 'ABARROTES', paquete: 2000 },
  { clave: 'jarabe_vainilla', nombre: 'Jarabe de vainilla', tipo: 'INGREDIENTE', unidad: 'ML', costo: '0.012000', prov: 'ABARROTES', paquete: 750 },
  { clave: 'jarabe_caramelo', nombre: 'Jarabe de caramelo', tipo: 'INGREDIENTE', unidad: 'ML', costo: '0.012000', prov: 'ABARROTES', paquete: 750 },
  { clave: 'salsa_chocolate', nombre: 'Salsa de chocolate', tipo: 'INGREDIENTE', unidad: 'ML', costo: '0.009000', prov: 'ABARROTES', paquete: 1000 },
  { clave: 'cacao', nombre: 'Cacao en polvo', tipo: 'INGREDIENTE', unidad: 'GR', costo: '0.011000', prov: 'CAFE', paquete: 500 },
  { clave: 'chocolate_amargo', nombre: 'Chocolate de mesa amargo', tipo: 'INGREDIENTE', unidad: 'GR', costo: '0.018000', prov: 'CAFE', paquete: 500 },
  { clave: 'te_negro', nombre: 'Té negro en bolsita', tipo: 'INGREDIENTE', unidad: 'UND', costo: '0.090000', prov: 'CAFE', paquete: 100 },
  { clave: 'matcha', nombre: 'Té verde matcha', tipo: 'INGREDIENTE', unidad: 'GR', costo: '0.080000', prov: 'CAFE', paquete: 100 },
  { clave: 'hielo', nombre: 'Hielo en cubos', tipo: 'INGREDIENTE', unidad: 'GR', costo: '0.000200', prov: 'HIELO', paquete: 10000 },
  { clave: 'horchata', nombre: 'Horchata de morro en polvo', tipo: 'INGREDIENTE', unidad: 'GR', costo: '0.008500', prov: 'ABARROTES', paquete: 1000 },
  { clave: 'canela', nombre: 'Canela molida', tipo: 'INGREDIENTE', unidad: 'GR', costo: '0.025000', prov: 'ABARROTES', paquete: 250 },
  { clave: 'avena', nombre: 'Avena en hojuelas', tipo: 'INGREDIENTE', unidad: 'GR', costo: '0.003000', prov: 'ABARROTES', paquete: 1000 },
  { clave: 'harina_trigo', nombre: 'Harina de trigo', tipo: 'INGREDIENTE', unidad: 'GR', costo: '0.001200', prov: 'ABARROTES', paquete: 2000 },
  { clave: 'masa', nombre: 'Harina de maíz nixtamalizado', tipo: 'INGREDIENTE', unidad: 'GR', costo: '0.001000', prov: 'ABARROTES', paquete: 2000 },
  { clave: 'frijol', nombre: 'Frijol rojo molido', tipo: 'INGREDIENTE', unidad: 'GR', costo: '0.003500', prov: 'ABARROTES', paquete: 2000 },
  { clave: 'aceite', nombre: 'Aceite vegetal', tipo: 'INGREDIENTE', unidad: 'ML', costo: '0.002800', prov: 'ABARROTES', paquete: 3785 },
  { clave: 'salsa_tomate', nombre: 'Salsa de tomate para pupusas', tipo: 'INGREDIENTE', unidad: 'ML', costo: '0.003000', prov: 'ABARROTES', paquete: 1000 },
  { clave: 'huevo', nombre: 'Huevo de granja', tipo: 'INGREDIENTE', unidad: 'UND', costo: '0.140000', prov: 'CARNES', paquete: 30 },
  { clave: 'pollo', nombre: 'Pechuga de pollo', tipo: 'INGREDIENTE', unidad: 'GR', costo: '0.006800', prov: 'CARNES', paquete: 1000 },
  { clave: 'jamon', nombre: 'Jamón de pavo', tipo: 'INGREDIENTE', unidad: 'GR', costo: '0.012000', prov: 'CARNES', paquete: 500 },
  { clave: 'chicharron', nombre: 'Chicharrón molido', tipo: 'INGREDIENTE', unidad: 'GR', costo: '0.011000', prov: 'CARNES', paquete: 1000 },
  { clave: 'pan_baguette', nombre: 'Pan baguette', tipo: 'INGREDIENTE', unidad: 'UND', costo: '0.450000', prov: 'PANADERIA', paquete: 10 },
  { clave: 'pan_sandwich', nombre: 'Pan de caja (rebanada)', tipo: 'INGREDIENTE', unidad: 'UND', costo: '0.080000', prov: 'PANADERIA', paquete: 20 },
  { clave: 'loroco', nombre: 'Loroco', tipo: 'INGREDIENTE', unidad: 'GR', costo: '0.018000', prov: 'HORTALIZAS', paquete: 500 },
  { clave: 'curtido', nombre: 'Curtido de repollo', tipo: 'INGREDIENTE', unidad: 'GR', costo: '0.003000', prov: 'HORTALIZAS', paquete: 2000 },
  { clave: 'lechuga', nombre: 'Lechuga romana', tipo: 'INGREDIENTE', unidad: 'GR', costo: '0.004000', prov: 'HORTALIZAS', paquete: 1000 },
  { clave: 'tomate', nombre: 'Tomate', tipo: 'INGREDIENTE', unidad: 'GR', costo: '0.001800', prov: 'HORTALIZAS', paquete: 1000 },
  { clave: 'aguacate', nombre: 'Aguacate Hass', tipo: 'INGREDIENTE', unidad: 'UND', costo: '0.550000', prov: 'HORTALIZAS', paquete: 10 },
  { clave: 'limon', nombre: 'Limón pérsico', tipo: 'INGREDIENTE', unidad: 'UND', costo: '0.080000', prov: 'HORTALIZAS', paquete: 50 },
  { clave: 'naranja', nombre: 'Naranja', tipo: 'INGREDIENTE', unidad: 'UND', costo: '0.150000', prov: 'HORTALIZAS', paquete: 50 },
  { clave: 'platano', nombre: 'Plátano maduro', tipo: 'INGREDIENTE', unidad: 'UND', costo: '0.250000', prov: 'HORTALIZAS', paquete: 20 },
  { clave: 'fresa', nombre: 'Fresa congelada', tipo: 'INGREDIENTE', unidad: 'GR', costo: '0.006000', prov: 'HORTALIZAS', paquete: 1000 },
  { clave: 'mango', nombre: 'Mango congelado', tipo: 'INGREDIENTE', unidad: 'GR', costo: '0.004500', prov: 'HORTALIZAS', paquete: 1000 },
  { clave: 'vaso12', nombre: 'Vaso de papel 12 oz', tipo: 'EMPAQUE', unidad: 'UND', costo: '0.080000', prov: 'EMPAQUES', paquete: 50 },
  { clave: 'vaso16', nombre: 'Vaso de papel 16 oz', tipo: 'EMPAQUE', unidad: 'UND', costo: '0.100000', prov: 'EMPAQUES', paquete: 50 },
  { clave: 'tapadera', nombre: 'Tapadera para vaso', tipo: 'EMPAQUE', unidad: 'UND', costo: '0.030000', prov: 'EMPAQUES', paquete: 100 },
  { clave: 'pajilla', nombre: 'Pajilla de papel', tipo: 'EMPAQUE', unidad: 'UND', costo: '0.010000', prov: 'EMPAQUES', paquete: 200 },
  { clave: 'servilleta', nombre: 'Servilleta', tipo: 'EMPAQUE', unidad: 'UND', costo: '0.005000', prov: 'EMPAQUES', paquete: 500 },
  { clave: 'caja_llevar', nombre: 'Caja kraft para llevar', tipo: 'EMPAQUE', unidad: 'UND', costo: '0.250000', prov: 'EMPAQUES', paquete: 50 },
  { clave: 'bolsa_papel', nombre: 'Bolsa de papel', tipo: 'EMPAQUE', unidad: 'UND', costo: '0.060000', prov: 'EMPAQUES', paquete: 100 },
  { clave: 'agua_botella', nombre: 'Agua embotellada 600 ml', tipo: 'REVENTA', unidad: 'UND', costo: '0.300000', prov: 'BEBIDAS', paquete: 24 },
  { clave: 'gaseosa', nombre: 'Gaseosa de cola lata 355 ml', tipo: 'REVENTA', unidad: 'UND', costo: '0.450000', prov: 'BEBIDAS', paquete: 24 },
  { clave: 'jugo_botella', nombre: 'Jugo de naranja 500 ml', tipo: 'REVENTA', unidad: 'UND', costo: '0.650000', prov: 'BEBIDAS', paquete: 12 },
  { clave: 'kolashampan', nombre: 'Gaseosa Kolashampan lata 355 ml', tipo: 'REVENTA', unidad: 'UND', costo: '0.420000', prov: 'BEBIDAS', paquete: 24 },
  { clave: 'agua_coco', nombre: 'Agua de coco 330 ml', tipo: 'REVENTA', unidad: 'UND', costo: '0.750000', prov: 'BEBIDAS', paquete: 12 },
  { clave: 'galleta', nombre: 'Galleta de avena empacada', tipo: 'REVENTA', unidad: 'UND', costo: '0.400000', prov: 'BEBIDAS', paquete: 24 },
  { clave: 'cafe_bolsa', nombre: 'Café molido Orígenes 340 g', tipo: 'REVENTA', unidad: 'UND', costo: '4.200000', prov: 'CAFE', paquete: 6 },
  { clave: 'chocolate_barra', nombre: 'Chocolate artesanal 70 % cacao', tipo: 'REVENTA', unidad: 'UND', costo: '1.600000', prov: 'CAFE', paquete: 10 },
];

// franja: afinidad horaria. peso: popularidad base (estrella > 6, medio 2-6, baja < 2).
// suc: multiplicador por sucursal (1 Escalón, 2 Santa Tecla, 3 Centro).
export const PRODUCTOS = [
  { clave: 'espresso', nombre: 'Espresso', cat: 1, precio: '1.75', franja: 'cafe', peso: 3, receta: { cafe_grano: 18, azucar: 5, servilleta: 1 } },
  { clave: 'americano', nombre: 'Café americano', cat: 1, precio: '2.00', franja: 'cafe', peso: 10, receta: { cafe_grano: 18, azucar: 8, vaso12: 1, tapadera: 1, servilleta: 1 } },
  { clave: 'casa', nombre: 'Café de la casa (filtrado)', cat: 1, precio: '1.50', franja: 'cafe', peso: 8, suc: { 3: 1.6, 1: 0.7 }, receta: { cafe_filtrado: 15, azucar_morena: 10, vaso12: 1, tapadera: 1, servilleta: 1 } },
  { clave: 'cappuccino', nombre: 'Cappuccino', cat: 1, precio: '3.25', franja: 'cafe', peso: 8, suc: { 1: 1.2 }, receta: { cafe_grano: 18, leche: 150, canela: 1, vaso12: 1, tapadera: 1, servilleta: 1 } },
  { clave: 'latte', nombre: 'Café latte', cat: 1, precio: '3.50', franja: 'cafe', peso: 9, suc: { 1: 1.25, 3: 0.7 }, receta: { cafe_grano: 18, leche: 240, vaso16: 1, tapadera: 1, servilleta: 1 } },
  { clave: 'mocha', nombre: 'Mocha', cat: 1, precio: '3.95', franja: 'cafe', peso: 4, receta: { cafe_grano: 18, leche: 200, salsa_chocolate: 30, crema_batida: 20, vaso16: 1, tapadera: 1, servilleta: 1 } },
  { clave: 'chocolate', nombre: 'Chocolate caliente de mesa', cat: 1, precio: '3.00', franja: 'cafe', peso: 3, receta: { chocolate_amargo: 35, leche: 240, azucar: 15, canela: 1, vaso12: 1, tapadera: 1, servilleta: 1 } },
  { clave: 'te_negro', nombre: 'Té negro con limón', cat: 1, precio: '1.75', franja: 'cafe', peso: 0.8, receta: { te_negro: 1, limon: 1, azucar: 8, vaso12: 1, tapadera: 1 } },
  { clave: 'matcha_latte', nombre: 'Matcha latte con almendra', cat: 1, precio: '4.25', franja: 'cafe', peso: 0.7, suc: { 1: 1.8, 3: 0.3 }, receta: { matcha: 4, leche_almendra: 240, jarabe_vainilla: 10, vaso16: 1, tapadera: 1 } },
  { clave: 'avena', nombre: 'Avena con canela', cat: 1, precio: '2.25', franja: 'desayuno', peso: 1, suc: { 3: 1.5 }, receta: { avena: 40, leche: 200, azucar: 15, canela: 1, vaso12: 1, tapadera: 1 } },
  { clave: 'frappe_cafe', nombre: 'Frappé de café', cat: 2, precio: '4.50', franja: 'frio', peso: 6, suc: { 2: 1.3, 3: 0.7 }, receta: { cafe_grano: 18, leche: 150, hielo: 200, azucar: 20, crema_batida: 25, vaso16: 1, tapadera: 1, pajilla: 1 } },
  { clave: 'frappe_caramelo', nombre: 'Frappé de caramelo', cat: 2, precio: '4.75', franja: 'frio', peso: 3.5, suc: { 2: 1.3, 3: 0.6 }, receta: { cafe_grano: 18, leche: 150, hielo: 200, jarabe_caramelo: 30, crema_batida: 25, vaso16: 1, tapadera: 1, pajilla: 1 } },
  { clave: 'smoothie_fresa', nombre: 'Smoothie de fresa', cat: 2, precio: '4.25', franja: 'frio', peso: 2.5, receta: { fresa: 180, leche: 120, azucar: 15, hielo: 100, vaso16: 1, tapadera: 1, pajilla: 1 } },
  { clave: 'smoothie_mango', nombre: 'Smoothie de mango', cat: 2, precio: '4.25', franja: 'frio', peso: 1, receta: { mango: 180, leche: 120, azucar: 10, hielo: 100, vaso16: 1, tapadera: 1, pajilla: 1 } },
  { clave: 'limonada', nombre: 'Limonada natural', cat: 2, precio: '2.25', franja: 'frio', peso: 3.5, receta: { limon: 3, azucar: 30, hielo: 150, vaso16: 1, tapadera: 1, pajilla: 1 } },
  { clave: 'horchata', nombre: 'Horchata de morro', cat: 2, precio: '2.00', franja: 'frio', peso: 3, suc: { 2: 1.3, 3: 1.3 }, receta: { horchata: 40, leche: 100, azucar: 20, canela: 1, hielo: 120, vaso16: 1, tapadera: 1, pajilla: 1 } },
  { clave: 'jugo_natural', nombre: 'Jugo de naranja natural', cat: 2, precio: '2.75', franja: 'desayuno', peso: 2, receta: { naranja: 4, hielo: 80, vaso16: 1, tapadera: 1, pajilla: 1 } },
  { clave: 'desayuno', nombre: 'Desayuno típico', cat: 3, precio: '5.50', franja: 'desayuno', peso: 6, suc: { 3: 1.3 }, receta: { huevo: 2, frijol: 100, platano: 1, crema_acida: 30, queso_duro: 40, masa: 60, aceite: 15, servilleta: 2 } },
  { clave: 'platanos', nombre: 'Plátanos fritos con crema y frijoles', cat: 3, precio: '3.75', franja: 'desayuno', peso: 2.5, receta: { platano: 1, aceite: 30, crema_acida: 40, frijol: 80, servilleta: 1 } },
  { clave: 'pupusa_revuelta', nombre: 'Pupusa revuelta', cat: 4, precio: '0.90', franja: 'pupusa', peso: 12, cantidad: 'pupusa', suc: { 1: 0.6, 2: 1.4, 3: 1.6 }, receta: { masa: 90, chicharron: 20, frijol: 20, quesillo: 20, aceite: 3, curtido: 40, salsa_tomate: 20, servilleta: 1 } },
  { clave: 'pupusa_loroco', nombre: 'Pupusa de queso con loroco', cat: 4, precio: '1.00', franja: 'pupusa', peso: 6, cantidad: 'pupusa', suc: { 1: 0.6, 2: 1.4, 3: 1.6 }, receta: { masa: 90, quesillo: 35, loroco: 8, aceite: 3, curtido: 40, salsa_tomate: 20, servilleta: 1 } },
  { clave: 'pupusa_frijol', nombre: 'Pupusa de frijol con queso', cat: 4, precio: '0.90', franja: 'pupusa', peso: 5, cantidad: 'pupusa', suc: { 1: 0.6, 2: 1.4, 3: 1.6 }, receta: { masa: 90, frijol: 30, quesillo: 20, aceite: 3, curtido: 40, salsa_tomate: 20, servilleta: 1 } },
  { clave: 'sandwich', nombre: 'Sándwich de jamón y queso', cat: 4, precio: '4.25', franja: 'comida', peso: 3, receta: { pan_sandwich: 2, jamon: 60, mozzarella: 40, mantequilla: 10, lechuga: 15, tomate: 30, bolsa_papel: 1, servilleta: 1 } },
  { clave: 'panini', nombre: 'Panini de pollo', cat: 4, precio: '5.75', franja: 'comida', peso: 3, suc: { 1: 1.3 }, receta: { pan_baguette: 1, pollo: 120, mozzarella: 40, tomate: 30, mantequilla: 10, aceite: 5, servilleta: 1 } },
  { clave: 'ensalada', nombre: 'Ensalada de pollo y aguacate', cat: 4, precio: '6.25', franja: 'comida', peso: 1.2, suc: { 1: 1.6, 3: 0.5 }, receta: { lechuga: 120, pollo: 120, tomate: 60, aguacate: 1, aceite: 10, limon: 1, caja_llevar: 1 } },
  { clave: 'croissant', nombre: 'Croissant de mantequilla', cat: 5, precio: '2.25', franja: 'postre', peso: 3, receta: { harina_trigo: 60, mantequilla: 30, huevo: 1, azucar: 8, bolsa_papel: 1 } },
  { clave: 'pastel', nombre: 'Pastel de chocolate (porción)', cat: 5, precio: '3.50', franja: 'postre', peso: 1.2, receta: { harina_trigo: 50, cacao: 15, azucar: 40, huevo: 1, mantequilla: 25, leche: 40, servilleta: 1 } },
  { clave: 'quesadilla', nombre: 'Quesadilla salvadoreña (porción)', cat: 5, precio: '2.50', franja: 'postre', peso: 1.5, suc: { 3: 1.4 }, receta: { harina_trigo: 40, queso_duro: 30, crema_acida: 25, azucar: 35, huevo: 1, mantequilla: 20, servilleta: 1 } },
  { clave: 'empanada', nombre: 'Empanada de plátano con leche', cat: 5, precio: '1.25', franja: 'postre', peso: 0.8, receta: { platano: 1, leche: 60, azucar: 15, harina_trigo: 10, aceite: 20, servilleta: 1 } },
  { clave: 'agua', nombre: 'Agua embotellada 600 ml', cat: 6, precio: '1.00', franja: 'reventa', peso: 3, reventa: 'agua_botella' },
  { clave: 'gaseosa', nombre: 'Gaseosa de cola lata', cat: 6, precio: '1.50', franja: 'reventa', peso: 3, reventa: 'gaseosa' },
  { clave: 'kolashampan', nombre: 'Kolashampan lata', cat: 6, precio: '1.50', franja: 'reventa', peso: 1.2, suc: { 2: 1.4, 3: 1.4 }, reventa: 'kolashampan' },
  { clave: 'jugo_botella', nombre: 'Jugo de naranja 500 ml', cat: 6, precio: '2.00', franja: 'reventa', peso: 1, reventa: 'jugo_botella' },
  { clave: 'galleta', nombre: 'Galleta de avena', cat: 6, precio: '1.25', franja: 'reventa', peso: 2, reventa: 'galleta' },
  { clave: 'agua_coco', nombre: 'Agua de coco 330 ml', cat: 6, precio: '2.25', franja: 'reventa', peso: 0.3, reventa: 'agua_coco' },
  { clave: 'cafe_bolsa', nombre: 'Café molido Orígenes 340 g', cat: 6, precio: '9.50', franja: 'reventa', peso: 0.15, suc: { 1: 1.5 }, reventa: 'cafe_bolsa' },
  { clave: 'chocolate_barra', nombre: 'Chocolate artesanal 70 %', cat: 6, precio: '4.00', franja: 'reventa', peso: 0.2, reventa: 'chocolate_barra' },
];

// Cambios históricos que la bitácora registra y las ventas respetan (dia: días antes de hoy).
export const CAMBIOS_PRECIO = [
  { producto: 'pupusa_revuelta', dia: 60, antes: '0.85', usuario: 'admin' },
  { producto: 'latte', dia: 45, antes: '3.25', usuario: 'admin' },
  { producto: 'frappe_cafe', dia: 30, antes: '4.25', usuario: 'admin' },
];
export const CAMBIOS_RECETA = [{ producto: 'latte', insumo: 'cafe_grano', dia: 35, antes: 16, usuario: 'admin' }];
export const PRODUCTO_DESACTIVADO = { producto: 'empanada', dia: 12, usuario: 'gerente1' };
export const PRODUCTO_ELIMINADO = { producto: 'agua_coco', dia: 25, usuario: 'admin' };

// Matriz de permisos por rol (por módulo). '*' = todos los permisos existentes.
export const ROLES = [
  { id: 1, nombre: 'ADMIN', descripcion: 'Acceso total', sistema: true, permisos: '*' },
  {
    id: 2, nombre: 'GERENTE_SUCURSAL', descripcion: 'Opera y supervisa una sucursal', sistema: true,
    permisos: ['INV_VER_STOCK', 'INV_VER_KARDEX', 'INV_GESTIONAR_INSUMOS', 'INV_REGISTRAR_MERMA', 'INV_VER_COSTOS',
      'POS_CREAR_ORDEN', 'POS_VER_COLA_PREPARACION', 'POS_COBRAR', 'POS_EMITIR_CCF', 'POS_APLICAR_DESCUENTO', 'POS_ANULAR_VENTA', 'POS_GESTIONAR_CLIENTES',
      'CAJA_ABRIR_TURNO', 'CAJA_CERRAR_TURNO', 'CAJA_MOVIMIENTOS', 'CAJA_VER_CUADRES', 'CAJA_CERRAR_CUALQUIER_TURNO',
      'COM_REGISTRAR_COMPRA', 'COM_VER_CXP', 'RRHH_VER_PLANILLA', 'REP_VER_DASHBOARD', 'DASH_VER_TOP_PRODUCTOS'],
  },
  {
    id: 3, nombre: 'CAJERO', descripcion: 'Toma pedidos, cobra y cierra su caja', sistema: true,
    permisos: ['POS_CREAR_ORDEN', 'POS_COBRAR', 'POS_EMITIR_CCF', 'POS_GESTIONAR_CLIENTES', 'CAJA_ABRIR_TURNO', 'CAJA_CERRAR_TURNO', 'CAJA_MOVIMIENTOS',
      'INV_VER_STOCK', 'DASH_VER_MIS_VENTAS', 'DASH_VER_TOP_PRODUCTOS'],
  },
  { id: 4, nombre: 'BARISTA', descripcion: 'Ve y prepara pedidos, consulta stock', sistema: true, permisos: ['POS_VER_COLA_PREPARACION', 'INV_VER_STOCK', 'INV_REGISTRAR_MERMA', 'DASH_VER_TOP_PRODUCTOS'] },
  {
    id: 5, nombre: 'BODEGUERO', descripcion: 'Inventario y compras', sistema: true,
    permisos: ['INV_VER_STOCK', 'INV_VER_KARDEX', 'INV_GESTIONAR_INSUMOS', 'INV_REGISTRAR_MERMA', 'COM_GESTIONAR_PROVEEDORES', 'COM_REGISTRAR_COMPRA', 'COM_VER_CXP'],
  },
  {
    id: 6, nombre: 'CONTADOR', descripcion: 'Compras, cuentas por pagar, planilla y reportes', sistema: true,
    permisos: ['COM_REGISTRAR_COMPRA', 'COM_PAGAR_PROVEEDOR', 'COM_VER_CXP', 'CAJA_VER_CUADRES', 'RRHH_VER_PLANILLA', 'RRHH_VER_SALARIOS', 'REP_VER_DASHBOARD',
      'INV_VER_COSTOS', 'DASH_VER_TOP_PRODUCTOS', 'DASH_TODAS_SUCURSALES'],
  },
  { id: 7, nombre: 'RRHH', descripcion: 'Gestión de personal y planilla', sistema: true, permisos: ['RRHH_GESTIONAR_EMPLEADOS', 'RRHH_VER_SALARIOS', 'RRHH_CALCULAR_PLANILLA', 'RRHH_VER_PLANILLA', 'DASH_TODAS_SUCURSALES'] },
  {
    id: 8, nombre: 'SUPERVISOR_ZONAL', descripcion: 'Supervisa varias sucursales: cuadres, anulaciones y reportes', sistema: false,
    permisos: ['REP_VER_DASHBOARD', 'DASH_VER_TOP_PRODUCTOS', 'CAJA_VER_CUADRES', 'CAJA_CERRAR_CUALQUIER_TURNO', 'POS_ANULAR_VENTA', 'INV_VER_STOCK', 'INV_VER_KARDEX'],
  },
];
// Cambios de permisos registrados en bitácora: el estado final ya está reflejado en ROLES.
export const CAMBIOS_PERMISOS = [
  { dia: 50, rol: 'SUPERVISOR_ZONAL', accion: 'INSERT', permisos: ROLES[7].permisos },
  { dia: 15, rol: 'BODEGUERO', accion: 'DELETE', permisos: ['INV_VER_COSTOS'] },
];

// creado: días antes de hoy en que se creó (por defecto al inicio); baja: días antes de hoy.
export const USUARIOS = [
  { username: 'admin', rol: 'ADMIN', sucursales: [1, 2, 3] },
  { username: 'gerente1', rol: 'GERENTE_SUCURSAL', sucursales: [1] },
  { username: 'gerente2', rol: 'GERENTE_SUCURSAL', sucursales: [2] },
  { username: 'gerente3', rol: 'GERENTE_SUCURSAL', sucursales: [3] },
  { username: 'supervisor1', rol: 'SUPERVISOR_ZONAL', sucursales: [2, 3], creado: 50 },
  { username: 'cajero1', rol: 'CAJERO', sucursales: [1] },
  { username: 'cajero2', rol: 'CAJERO', sucursales: [1] },
  { username: 'cajero3', rol: 'CAJERO', sucursales: [1] },
  { username: 'cajero4', rol: 'CAJERO', sucursales: [1] },
  { username: 'cajero5', rol: 'CAJERO', sucursales: [1], eliminado: 60 },
  { username: 'cajero6', rol: 'CAJERO', sucursales: [2] },
  { username: 'cajero7', rol: 'CAJERO', sucursales: [2] },
  { username: 'cajero8', rol: 'CAJERO', sucursales: [2] },
  { username: 'cajero9', rol: 'CAJERO', sucursales: [2], creado: 40 },
  { username: 'cajero10', rol: 'CAJERO', sucursales: [3], desactivado: 25 },
  { username: 'cajero11', rol: 'CAJERO', sucursales: [3] },
  { username: 'barista1', rol: 'BARISTA', sucursales: [1] },
  { username: 'barista2', rol: 'BARISTA', sucursales: [1] },
  { username: 'barista3', rol: 'BARISTA', sucursales: [2] },
  { username: 'barista4', rol: 'BARISTA', sucursales: [3] },
  { username: 'bodega1', rol: 'BODEGUERO', sucursales: [1] },
  { username: 'bodega2', rol: 'BODEGUERO', sucursales: [2, 3] },
  { username: 'contador1', rol: 'CONTADOR', sucursales: [1, 2, 3] },
  { username: 'rrhh1', rol: 'RRHH', sucursales: [1, 2, 3] },
];

// Quién cobra en cada sucursal (rotación diaria). Los gerentes cubren cuando falta personal.
export const CAJEROS_POR_SUCURSAL = {
  1: ['cajero1', 'cajero2', 'cajero3', 'cajero4', 'cajero5'],
  2: ['cajero6', 'cajero7', 'cajero8', 'cajero9', 'gerente2'],
  3: ['cajero10', 'cajero11', 'gerente3'],
};

export const CLIENTES = [
  { nombre: 'Cliente Demo', tipo: 'DUI', doc: null, email: 'cliente.demo@artesa.local', telefono: '7012-3456', username: 'cliente.demo' },
  { nombre: 'Consultores Tecnológicos Cuscatlán, S.A. de C.V.', tipo: 'NIT', doc: '0614-111111-111-1', nrc: '998877-6', giro: 'Servicios de consultoría informática', direccion: 'Col. Escalón, 85 Av. Norte #612, San Salvador', email: 'compras@ctcuscatlan.com.sv', telefono: '2264-9910', ccf: 1 },
  { nombre: 'Despacho Jurídico Martínez & Asociados', tipo: 'NIT', doc: '0614-020287-102-3', nrc: '145236-9', giro: 'Servicios jurídicos', direccion: 'Edificio Torre Futura, Col. Escalón, San Salvador', email: 'admin@martinezasoc.com.sv', telefono: '2257-3300', ccf: 1 },
  { nombre: 'Agencia Creativa Volcán, S.A. de C.V.', tipo: 'NIT', doc: '0614-090915-103-8', nrc: '287410-2', giro: 'Publicidad y mercadeo', direccion: 'Calle La Mascota #220, San Salvador', email: 'facturas@volcan.sv', telefono: '2245-1180', ccf: 1 },
  { nombre: 'Clínica Dental Sonrisas, S.A. de C.V.', tipo: 'NIT', doc: '0511-150310-101-4', nrc: '201874-5', giro: 'Servicios odontológicos', direccion: '4a Calle Poniente, Santa Tecla', email: 'contabilidad@sonrisas.sv', telefono: '2228-7700', ccf: 2 },
  { nombre: 'Inversiones El Carmen, S.A. de C.V.', tipo: 'NIT', doc: '0511-210608-102-6', nrc: '176390-8', giro: 'Arrendamiento de inmuebles', direccion: 'Paseo El Carmen #15, Santa Tecla', email: 'pagos@invelcarmen.sv', telefono: '2288-1020', ccf: 2 },
  { nombre: 'Universidad Tecnológica Libertad (cafetería docente)', tipo: 'NIT', doc: '0511-300199-101-1', nrc: '052147-3', giro: 'Educación superior', direccion: 'Km 12 Carretera Panamericana, Santa Tecla', email: 'proveeduria@utl.edu.sv', telefono: '2241-5000', ccf: 2 },
  { nombre: 'Cooperativa de Comerciantes del Centro, de R.L.', tipo: 'NIT', doc: '0614-180592-104-7', nrc: '098563-1', giro: 'Asociación cooperativa de comercio', direccion: 'Calle Arce #310, Centro Histórico, San Salvador', email: 'tesoreria@cocentro.coop.sv', telefono: '2271-4455', ccf: 3 },
  { nombre: 'Notaría Hernández Bonilla', tipo: 'NIT', doc: '0614-251178-101-9', nrc: '064418-2', giro: 'Servicios notariales', direccion: '2a Av. Norte #118, San Salvador', email: 'notaria.hb@correo.sv', telefono: '2222-8136', ccf: 3 },
  { nombre: 'Distribuidora Óptica Visión Clara', tipo: 'NIT', doc: '0614-070706-102-5', nrc: '231457-7', giro: 'Venta de artículos ópticos', direccion: 'Calle Rubén Darío #820, San Salvador', email: 'facturacion@visionclara.sv', telefono: '2221-6070', ccf: 3 },
  { nombre: 'María José Castillo Rivera', tipo: 'DUI', doc: '04512378-1', email: 'mjcastillo@correo.sv', telefono: '7745-2210', fcf: 1 },
  { nombre: 'Carlos Eduardo Mejía Portillo', tipo: 'DUI', doc: '03874519-6', email: 'cemejia@correo.sv', telefono: '7890-1145', fcf: 1 },
  { nombre: 'Gabriela Alejandra Flores Ayala', tipo: 'DUI', doc: '05123987-0', email: 'gaby.flores@correo.sv', telefono: '6123-7781', fcf: 2 },
  { nombre: 'José Roberto Hernández Cruz', tipo: 'DUI', doc: '02987456-3', email: 'jrhernandez@correo.sv', telefono: '7310-4498', fcf: 2 },
  { nombre: 'Ana Patricia Guardado Molina', tipo: 'DUI', doc: '04765123-8', email: 'apguardado@correo.sv', telefono: '7652-0037', fcf: 3 },
];

export const PUESTOS = [
  { id: 1, nombre: 'Administrador general', salario: '1800.00' },
  { id: 2, nombre: 'Gerente de sucursal', salario: '1100.00' },
  { id: 3, nombre: 'Supervisor zonal', salario: '1300.00' },
  { id: 4, nombre: 'Cajero', salario: '450.00' },
  { id: 5, nombre: 'Barista', salario: '480.00' },
  { id: 6, nombre: 'Cocinero', salario: '520.00' },
  { id: 7, nombre: 'Ayudante de cocina', salario: '420.00' },
  { id: 8, nombre: 'Mesero', salario: '410.00' },
  { id: 9, nombre: 'Bodeguero', salario: '460.00' },
  { id: 10, nombre: 'Contador', salario: '950.00' },
  { id: 11, nombre: 'Especialista de RRHH', salario: '900.00' },
];

// usuario: enlaza al usuario del sistema (si tiene). ingreso: AAAA-MM-DD.
export const EMPLEADOS = [
  { suc: 1, puesto: 1, usuario: 'admin', nombres: 'Emilio Andrés', apellidos: 'Valdés Cobo', ingreso: '2021-02-01', salario: '1800.00' },
  { suc: 1, puesto: 2, usuario: 'gerente1', nombres: 'Claudia Marcela', apellidos: 'Rivas Zelaya', ingreso: '2021-03-15', salario: '1150.00' },
  { suc: 2, puesto: 2, usuario: 'gerente2', nombres: 'Javier Alonso', apellidos: 'Mendoza Pineda', ingreso: '2022-06-01', salario: '1100.00' },
  { suc: 3, puesto: 2, usuario: 'gerente3', nombres: 'Sofía Beatriz', apellidos: 'Aguilar Campos', ingreso: '2023-01-09', salario: '1050.00' },
  { suc: 2, puesto: 3, usuario: 'supervisor1', nombres: 'Ricardo Ernesto', apellidos: 'Montoya Lemus', ingreso: '2026-09-01', salario: '1300.00' },
  { suc: 1, puesto: 4, usuario: 'cajero1', nombres: 'Daniela Sofía', apellidos: 'Martínez López', ingreso: '2022-04-04', salario: '460.00' },
  { suc: 1, puesto: 4, usuario: 'cajero2', nombres: 'Kevin Alexander', apellidos: 'Ramos Guevara', ingreso: '2023-02-13', salario: '450.00' },
  { suc: 1, puesto: 4, usuario: 'cajero3', nombres: 'Fátima Abigail', apellidos: 'Orellana Cruz', ingreso: '2023-08-21', salario: '450.00' },
  { suc: 1, puesto: 4, usuario: 'cajero4', nombres: 'Luis Fernando', apellidos: 'Chávez Henríquez', ingreso: '2024-05-06', salario: '450.00' },
  { suc: 2, puesto: 4, usuario: 'cajero6', nombres: 'Andrea Lisseth', apellidos: 'Peña Sorto', ingreso: '2022-07-11', salario: '455.00' },
  { suc: 2, puesto: 4, usuario: 'cajero7', nombres: 'Brayan Josué', apellidos: 'Alvarenga Díaz', ingreso: '2023-10-02', salario: '450.00' },
  { suc: 2, puesto: 4, usuario: 'cajero8', nombres: 'Michelle Alejandra', apellidos: 'Quintanilla Ruiz', ingreso: '2024-01-15', salario: '450.00' },
  { suc: 2, puesto: 4, usuario: 'cajero9', nombres: 'Diego Armando', apellidos: 'Castro Velásquez', ingreso: '2026-10-05', salario: '450.00' },
  { suc: 3, puesto: 4, usuario: 'cajero11', nombres: 'Rosa Elena', apellidos: 'Figueroa Molina', ingreso: '2023-03-20', salario: '450.00' },
  { suc: 1, puesto: 5, usuario: 'barista1', nombres: 'Marvin Antonio', apellidos: 'Escobar Rosales', ingreso: '2022-09-05', salario: '500.00' },
  { suc: 1, puesto: 5, usuario: 'barista2', nombres: 'Gabriela María', apellidos: 'Linares Fuentes', ingreso: '2024-02-19', salario: '480.00' },
  { suc: 2, puesto: 5, usuario: 'barista3', nombres: 'Jonathan Eliseo', apellidos: 'Serrano Reyes', ingreso: '2023-06-12', salario: '480.00' },
  { suc: 3, puesto: 5, usuario: 'barista4', nombres: 'Karen Yamileth', apellidos: 'Bonilla Pérez', ingreso: '2024-07-01', salario: '480.00' },
  { suc: 1, puesto: 9, usuario: 'bodega1', nombres: 'Wilfredo José', apellidos: 'Hernández Sibrián', ingreso: '2022-01-17', salario: '470.00' },
  { suc: 2, puesto: 9, usuario: 'bodega2', nombres: 'Mario Ernesto', apellidos: 'Portillo Ayala', ingreso: '2023-05-08', salario: '460.00' },
  { suc: 1, puesto: 10, usuario: 'contador1', nombres: 'Patricia Carolina', apellidos: 'Guzmán Arévalo', ingreso: '2021-04-05', salario: '950.00' },
  { suc: 1, puesto: 11, usuario: 'rrhh1', nombres: 'Verónica Isabel', apellidos: 'Menjívar Tobar', ingreso: '2022-11-14', salario: '900.00' },
  { suc: 1, puesto: 6, nombres: 'Santos Rafael', apellidos: 'Cornejo Martínez', ingreso: '2021-05-03', salario: '560.00' },
  { suc: 1, puesto: 6, nombres: 'Blanca Lidia', apellidos: 'Mejía Henríquez', ingreso: '2022-08-08', salario: '520.00' },
  { suc: 1, puesto: 7, nombres: 'Erick Mauricio', apellidos: 'Landaverde Gómez', ingreso: '2024-03-04', salario: '420.00' },
  { suc: 1, puesto: 8, nombres: 'Tatiana Lisbeth', apellidos: 'Rodríguez Saravia', ingreso: '2023-09-11', salario: '410.00' },
  { suc: 1, puesto: 8, nombres: 'Josué Alberto', apellidos: 'Funes Rivera', ingreso: '2025-01-20', salario: '410.00' },
  { suc: 2, puesto: 6, nombres: 'María Teresa', apellidos: 'Velásquez Amaya', ingreso: '2022-06-20', salario: '520.00' },
  { suc: 2, puesto: 7, nombres: 'Henry Osmín', apellidos: 'Rauda Cáceres', ingreso: '2024-10-07', salario: '420.00' },
  { suc: 2, puesto: 8, nombres: 'Lorena Beatriz', apellidos: 'Galdámez Ortiz', ingreso: '2023-11-27', salario: '410.00' },
  { suc: 2, puesto: 8, nombres: 'Cristian Omar', apellidos: 'Villalta Durán', ingreso: '2025-03-10', salario: '410.00' },
  { suc: 3, puesto: 6, nombres: 'Dolores del Carmen', apellidos: 'Pineda Recinos', ingreso: '2023-01-16', salario: '520.00' },
  { suc: 3, puesto: 8, nombres: 'Edwin Geovanni', apellidos: 'Argueta Lara', ingreso: '2024-04-15', salario: '410.00' },
];
