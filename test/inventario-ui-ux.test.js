import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { calcularPrecioSugerido, calcularMargen } from '../frontend/src/modules/inventario/costeo.js';

const leer = (archivo) => readFile(new URL(`../${archivo}`, import.meta.url), 'utf8');

test('costeo: calcularPrecioSugerido calcula precio con IVA 13% para margen 40% con aritmética BigInt anti-float', () => {
  // Caso 1: Costo $0.60 -> Precio neto $1.00 -> Precio con IVA (13%) = $1.13 -> Margen = 40.0%
  const p1 = calcularPrecioSugerido('0.6000', 0.40);
  assert.equal(p1, '1.13');
  assert.equal(calcularMargen(p1, '0.6000'), 40.0);

  // Caso 2: Costo $2.00 -> Precio neto $3.3333 -> Precio con IVA (13%) = $3.77 -> Margen = 40.1%
  const p2 = calcularPrecioSugerido('2.0000', 0.40);
  assert.equal(p2, '3.77');
  assert.equal(calcularMargen(p2, '2.0000'), 40.1);

  // Caso 3: Costo $0.35 -> Precio neto $0.5833 -> Precio con IVA (13%) = $0.66 -> Margen = 40.1%
  const p3 = calcularPrecioSugerido('0.3500', 0.40);
  assert.equal(p3, '0.66');
  assert.equal(calcularMargen(p3, '0.3500'), 40.1);

  // Casos límite: costo cero o negativo
  assert.equal(calcularPrecioSugerido('0.0000'), '0.00');
  assert.equal(calcularPrecioSugerido('-1.0000'), '0.00');
});

test('UI/UX: CatalogoProductosPage implementa badge alineado, costo whitespace-nowrap, acciones h-9, modal preview y redirección', async () => {
  const codigo = await leer('frontend/src/modules/inventario/CatalogoProductosPage.jsx');

  // 1. Alineación uniforme del badge de ingredientes bajo el nombre y h-9 en acciones
  assert.match(codigo, /setProductoPrevisualizar\(p\)/, 'El badge abre la previsualización al hacer clic');
  assert.match(codigo, /h-9.*whitespace-nowrap/, 'El botón Editar receta y acciones tienen h-9 y whitespace-nowrap');
  assert.match(codigo, /font-mono whitespace-nowrap[\s\S]*?p\.costo_teorico/, 'Columna costo usa whitespace-nowrap y formato 2 decimales');

  // 2. Modal de Previsualización Rápida
  assert.match(codigo, /function ModalPrevisualizacionReceta/, 'Define componente ModalPrevisualizacionReceta');
  assert.match(codigo, /Editar receta completa/, 'El modal ofrece botón para editar receta completa');
  assert.match(codigo, /Cerrar/, 'El modal ofrece botón para cerrar');
  assert.match(codigo, /calcularSubtotalLinea/, 'El modal calcula subtotales anti-float');

  // 3. Redirección automática tras crear producto elaborado
  assert.match(codigo, /navigate\(`\/catalogo\/productos\/\$\{idCreado\}\/receta`\)/, 'Redirige automáticamente al editor de recetas tras crear producto elaborado');
  assert.match(codigo, /Producto creado\. Agrega ahora los ingredientes de su receta\./, 'Muestra notificación clara tras crear producto elaborado');

  // 5. Skeleton Loaders cálidos (sin Spinner circular)
  assert.match(codigo, /CatalogoSkeleton/, 'Usa skeleton loader para el catálogo');
  assert.doesNotMatch(codigo, /<Spinner\s+texto="Cargando catálogo de productos/, 'No usa spinner circular en la tabla');
});

test('UI/UX: EditorRecetasPage implementa flujo dual, skeletons cálidos, selector sucursales y ajuste rápido de precio', async () => {
  const codigo = await leer('frontend/src/modules/inventario/EditorRecetasPage.jsx');

  // 4. Flujo dual: Ficha técnica (solo lectura) y Constructor interactivo (edición)
  assert.match(codigo, /modoEdicion/, 'Maneja estado para alternar entre ficha y constructor');
  assert.match(codigo, /Ficha técnica de receta \(Solo lectura\)/, 'Expone título de Ficha técnica');
  assert.match(codigo, /Constructor interactivo de receta/, 'Expone título de Constructor interactivo');
  assert.match(codigo, /setModoEdicion\(true\)/, 'Permite cambiar al modo edición');
  assert.match(codigo, /Cancelar cambios/, 'Ofrece botón para cancelar cambios y volver');
  assert.match(codigo, /Guardar receta/, 'Ofrece botón para guardar receta');

  // 5. Skeleton Loaders cálidos (sin Spinners circulares)
  assert.match(codigo, /RecetaWorkspaceSkeleton/, 'Implementa skeleton del workspace dividido');
  assert.match(codigo, /TablaRecetaSkeleton/, 'Implementa skeleton de la tabla de componentes');
  assert.doesNotMatch(codigo, /<Spinner\s+texto=/, 'No utiliza spinners circulares');

  // 6. Selector de sucursal en Disponibilidad Operativa
  assert.match(codigo, /id="selector-sucursal-disponibilidad"/, 'Incluye selector compacto de sucursal en cabecera');
  assert.match(codigo, /Todas las sucursales \(Global\)/, 'Opción global por defecto');
  assert.match(codigo, /subtituloDisponibilidad/, 'Subtítulo dinámico según sucursal elegida');
  assert.match(codigo, /insumoAgotado/, 'Alerta específica si un insumo tiene stock en 0');

  // 7. Ajuste rápido de precio desde Simulador Financiero
  assert.match(codigo, /calcularPrecioSugerido/, 'Importa y usa calcularPrecioSugerido para margen 40% con IVA');
  assert.match(codigo, /Ajuste rápido de precio/, 'Panel de ajuste rápido de precio');
  assert.match(codigo, /Aplicar sugerido/, 'Botón para aplicar precio sugerido');
  assert.match(codigo, /Actualizar precio del producto/, 'Botón para actualizar precio');
  assert.match(codigo, /updateProducto/, 'Guarda el nuevo precio en el backend');
});
