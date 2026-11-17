// test/frontend-tabla.test.js
// Pruebas exhaustivas de lógica pura de tabla (ordenamiento, anti-float, paginación) y contratos UI.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  compararStringsNumericos,
  compararValores,
  ordenarFilas,
  calcularPaginacion,
  obtenerRangoPaginas,
  obtenerIdsFilas,
  mismosIds,
} from '../frontend/src/utils/tabla.js';

const raiz = join(import.meta.dirname, '..');
const leer = (rel) => readFile(join(raiz, rel), 'utf8');

// --- 1. Comparación numérica y monetaria sin float (anti-float) ---
test('tabla: compararStringsNumericos compara valores numéricos y dinero sin usar float', () => {
  // Casos básicos solicitados
  assert.equal(compararStringsNumericos('9.50', '10.00'), -1);
  assert.equal(compararStringsNumericos('1000.10', '999.99'), 1);
  assert.equal(compararStringsNumericos('0.05', '0.10'), -1);
  assert.equal(compararStringsNumericos('10.0', '10.00'), 0);
  assert.equal(compararStringsNumericos('-5.00', '2.00'), -1);
  assert.equal(compararStringsNumericos('2.00', '-5.00'), 1);

  // Signos negativos comparados entre sí
  assert.equal(compararStringsNumericos('-5.00', '-2.00'), -1);
  assert.equal(compararStringsNumericos('-2.00', '-5.00'), 1);
  assert.equal(compararStringsNumericos('-5.00', '-5.00'), 0);

  // Ceros en distintas representaciones y signos
  assert.equal(compararStringsNumericos('0', '-0'), 0);
  assert.equal(compararStringsNumericos('0.00', '0'), 0);
  assert.equal(compararStringsNumericos('-0.000', '0.0'), 0);

  // Enteros con ceros a la izquierda y decimales de distinta longitud
  assert.equal(compararStringsNumericos('007.50', '7.5'), 0);
  assert.equal(compararStringsNumericos('12.345', '12.35'), -1);

  // Números que perderían precisión con IEEE-754 float
  assert.equal(
    compararStringsNumericos('10000000000000000.01', '10000000000000000.02'),
    -1
  );
  assert.equal(
    compararStringsNumericos('9007199254740993', '9007199254740992'),
    1
  );
});

// --- 2. Comparación de valores polimórfica (compararValores) ---
test('tabla: compararValores maneja texto con orden natural y reglas en español', () => {
  // Orden natural numérico dentro de texto
  assert.equal(compararValores('Caja 2', 'Caja 10', 'texto'), -1);
  assert.equal(compararValores('Caja 10', 'Caja 2', 'texto'), 1);

  // Tildes y sensibilidad base en español
  const cmpArbolBarco = compararValores('Árbol', 'barco', 'texto');
  assert.ok(cmpArbolBarco < 0, 'Árbol debe ir antes que barco');
});

test('tabla: compararValores maneja fechas ISO y timestamps', () => {
  assert.equal(compararValores('2026-11-01', '2026-11-15', 'fecha'), -1);
  assert.equal(compararValores('2026-11-15', '2026-11-01', 'fecha'), 1);
  assert.equal(compararValores('2026-11-10T08:00:00Z', '2026-11-10T12:00:00Z', 'fecha'), -1);
  assert.equal(compararValores('2026-11-01', '2026-11-01', 'fecha'), 0);
});

test('tabla: compararValores maneja booleanos (false < true)', () => {
  assert.equal(compararValores(false, true, 'booleano'), -1);
  assert.equal(compararValores(true, false, 'booleano'), 1);
  assert.equal(compararValores(true, true, 'booleano'), 0);
  assert.equal(compararValores(false, false, 'booleano'), 0);
});

test('tabla: compararValores sitúa nulos y vacíos siempre después', () => {
  assert.equal(compararValores(null, 'Manzana', 'texto'), 1);
  assert.equal(compararValores(undefined, 'Manzana', 'texto'), 1);
  assert.equal(compararValores('', 'Manzana', 'texto'), 1);
  assert.equal(compararValores('Manzana', null, 'texto'), -1);
  assert.equal(compararValores('Manzana', undefined, 'texto'), -1);
  assert.equal(compararValores('Manzana', '', 'texto'), -1);
  assert.equal(compararValores(null, undefined, 'texto'), 0);
  assert.equal(compararValores('', null, 'texto'), 0);
});

// --- 3. Ordenamiento de filas y estabilidad ---
test('tabla: ordenarFilas ordena en ascendente y descendente de forma estable', () => {
  const filas = [
    { id: 1, nombre: 'Carlos', total: '15.00' },
    { id: 2, nombre: 'Ana', total: '25.50' },
    { id: 3, nombre: 'Beatriz', total: '15.00' },
  ];

  // Orden ascendente por total
  const ascTotal = ordenarFilas(filas, 'total', 'asc', 'dinero');
  assert.deepEqual(ascTotal.map((f) => f.id), [1, 3, 2], 'Empate entre id 1 y id 3 conserva orden original');

  // Orden descendente por total
  const descTotal = ordenarFilas(filas, 'total', 'desc', 'dinero');
  assert.deepEqual(descTotal.map((f) => f.id), [2, 1, 3], 'En desc, id 2 es mayor y empate conserva orden relativo');

  // Orden por texto
  const ascNombre = ordenarFilas(filas, 'nombre', 'asc', 'texto');
  assert.deepEqual(ascNombre.map((f) => f.nombre), ['Ana', 'Beatriz', 'Carlos']);
});

test('tabla: ordenarFilas ubica nulos y vacíos SIEMPRE al final en asc y desc', () => {
  const filas = [
    { id: 1, monto: '50.00' },
    { id: 2, monto: null },
    { id: 3, monto: '10.00' },
    { id: 4, monto: '' },
    { id: 5, monto: '100.00' },
  ];

  // Ascendente
  const asc = ordenarFilas(filas, 'monto', 'asc', 'dinero');
  assert.deepEqual(asc.map((f) => f.id), [3, 1, 5, 2, 4], 'Nulos al final en asc');

  // Descendente
  const desc = ordenarFilas(filas, 'monto', 'desc', 'dinero');
  assert.deepEqual(desc.map((f) => f.id), [5, 1, 3, 2, 4], 'Nulos al final también en desc');
});

test('tabla: ordenarFilas admite valorOrden extractor personalizado', () => {
  const filas = [
    { id: 1, detalle: { puntuacion: 80 } },
    { id: 2, detalle: { puntuacion: 95 } },
    { id: 3, detalle: { puntuacion: 60 } },
  ];

  const ordenadas = ordenarFilas(filas, null, 'asc', 'numero', (f) => String(f.detalle.puntuacion));
  assert.deepEqual(ordenadas.map((f) => f.id), [3, 1, 2]);
});

// --- 4. Helpers de paginación ---
test('tabla: calcularPaginacion calcula páginas, límites y clamps con precisión', () => {
  // Lista con 25 elementos, 10 por página
  const p1 = calcularPaginacion({ total: 25, pagina: 1, porPagina: 10 });
  assert.equal(p1.total, 25);
  assert.equal(p1.porPagina, 10);
  assert.equal(p1.totalPaginas, 3);
  assert.equal(p1.paginaValida, 1);
  assert.equal(p1.desde, 1);
  assert.equal(p1.hasta, 10);
  assert.equal(p1.offset, 0);

  const p3 = calcularPaginacion({ total: 25, pagina: 3, porPagina: 10 });
  assert.equal(p3.paginaValida, 3);
  assert.equal(p3.desde, 21);
  assert.equal(p3.hasta, 25);
  assert.equal(p3.offset, 20);

  // Clamp cuando la página solicitada excede el total
  const pExceso = calcularPaginacion({ total: 25, pagina: 99, porPagina: 10 });
  assert.equal(pExceso.paginaValida, 3);
  assert.equal(pExceso.desde, 21);
  assert.equal(pExceso.hasta, 25);

  // Clamp cuando la página es menor a 1
  const pNegativa = calcularPaginacion({ total: 25, pagina: -2, porPagina: 10 });
  assert.equal(pNegativa.paginaValida, 1);

  // Total 0 elementos
  const pCero = calcularPaginacion({ total: 0, pagina: 1, porPagina: 10 });
  assert.equal(pCero.totalPaginas, 1);
  assert.equal(pCero.paginaValida, 1);
  assert.equal(pCero.desde, 0);
  assert.equal(pCero.hasta, 0);
  assert.equal(pCero.offset, 0);
});

test('tabla: obtenerRangoPaginas genera secuencia y ellipsis correctos', () => {
  // Con <= 7 páginas, muestra todos los números sin ellipsis
  assert.deepEqual(obtenerRangoPaginas(1, 5), [1, 2, 3, 4, 5]);
  assert.deepEqual(obtenerRangoPaginas(4, 7), [1, 2, 3, 4, 5, 6, 7]);

  // Con > 7 páginas, muestra ellipsis según la página activa
  // En página central (ej. 5 de 20)
  assert.deepEqual(obtenerRangoPaginas(5, 20, 1), [1, '...', 4, 5, 6, '...', 20]);

  // En las primeras páginas (ej. 1 de 20)
  const rangoInicio = obtenerRangoPaginas(1, 20, 1);
  assert.equal(rangoInicio[0], 1);
  assert.ok(rangoInicio.includes('...'));
  assert.equal(rangoInicio[rangoInicio.length - 1], 20);

  // En las últimas páginas (ej. 20 de 20)
  const rangoFin = obtenerRangoPaginas(20, 20, 1);
  assert.equal(rangoFin[0], 1);
  assert.ok(rangoFin.includes('...'));
  assert.equal(rangoFin[rangoFin.length - 1], 20);
});

test('tabla: obtenerIdsFilas y mismosIds detectan mutaciones en conjuntos de datos', () => {
  const loteA = [{ id: 1 }, { id: 2 }, { id: 3 }];
  const loteB = [{ id: 1 }, { id: 2 }, { id: 3 }];
  const loteModificado = [{ id: 1 }, { id: 2, nombre: 'Nuevo' }, { id: 3 }];
  const loteDistinto = [{ id: 1 }, { id: 4 }, { id: 3 }];

  assert.equal(mismosIds(loteA, loteB), true);
  assert.equal(mismosIds(loteA, loteModificado), true, 'Mismos IDs aunque cambien otras propiedades');
  assert.equal(mismosIds(loteA, loteDistinto), false, 'IDs diferentes');
  assert.equal(mismosIds(loteA, [{ id: 1 }]), false, 'Diferente longitud');
  assert.equal(mismosIds(null, loteA), false);
});

// --- 5. Pruebas de contrato de componentes UI (Table.jsx, Paginacion.jsx, index.js) ---
test('contrato Table.jsx: incluye ordenamiento accesible, aria-sort, aria-live e iconos', async () => {
  const contenido = await leer('frontend/src/components/ui/Table.jsx');

  // Accesibilidad
  assert.ok(contenido.includes('aria-sort='), 'Table.jsx debe declarar aria-sort en th ordenables');
  assert.ok(contenido.includes('aria-live="polite"'), 'Table.jsx debe incluir región aria-live="polite"');
  assert.ok(contenido.includes('focus-visible:'), 'Table.jsx debe tener estilos para foco visible');

  // Iconos de ordenamiento de lucide-react
  assert.ok(contenido.includes('ChevronsUpDown'), 'Table.jsx debe importar y usar ChevronsUpDown');
  assert.ok(contenido.includes('ArrowUp'), 'Table.jsx debe importar y usar ArrowUp');
  assert.ok(contenido.includes('ArrowDown'), 'Table.jsx debe importar y usar ArrowDown');

  // Integración de paginación
  assert.ok(contenido.includes('Paginacion'), 'Table.jsx debe integrar el componente Paginacion');
  assert.ok(contenido.includes('calcularPaginacion'), 'Table.jsx debe usar calcularPaginacion');

  // Prohibición de <select> nativo en favor de CustomSelect/Select
  assert.ok(!contenido.includes('<select'), 'Table.jsx no debe contener elementos <select> nativos');
});

test('contrato Paginacion.jsx: usa componente Select unificado y botones accesibles', async () => {
  const contenido = await leer('frontend/src/components/ui/Paginacion.jsx');

  // Uso del componente Select del design system
  assert.ok(contenido.includes("import Select from './Select.jsx'"), 'Paginacion.jsx debe importar Select');
  assert.ok(contenido.includes('<Select'), 'Paginacion.jsx debe usar <Select />');
  assert.ok(!contenido.includes('<select'), 'Paginacion.jsx no debe usar el tag <select> nativo');

  // Botones accesibles con aria-label y aria-current
  assert.ok(contenido.includes('aria-label='), 'Paginacion.jsx debe tener aria-label en botones de navegación');
  assert.ok(contenido.includes('aria-current='), 'Paginacion.jsx debe marcar página activa con aria-current');
  assert.ok(contenido.includes('type="button"'), 'Paginacion.jsx debe especificar type="button" en botones');

  // Textos y etiquetas en español
  assert.ok(contenido.includes('Filas por página:'), 'Paginacion.jsx debe mostrar "Filas por página:"');
  assert.ok(contenido.includes('Mostrando 0 de 0'), 'Paginacion.jsx debe manejar caso vacío 0 de 0');
  assert.ok(contenido.includes('Página anterior'), 'Paginacion.jsx debe tener texto de accesibilidad en español');
});

test('contrato index.js: exporta Paginacion junto a Table y componentes UI', async () => {
  const contenido = await leer('frontend/src/components/ui/index.js');
  assert.ok(contenido.includes("export { default as Paginacion } from './Paginacion.jsx'"));
  assert.ok(contenido.includes("export { default as Table } from './Table.jsx'"));
});
