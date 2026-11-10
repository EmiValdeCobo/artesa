import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { agruparPorCategoria, SIN_CATEGORIA } from '../frontend/src/modules/pos/categorias.js';
import { menu } from '../frontend/src/config/menu.js';

const leer = (archivo) => readFile(new URL(`../${archivo}`, import.meta.url), 'utf8');
const p = (id, nombre, categoria, id_categoria) => ({ id_producto: id, nombre, categoria, id_categoria, precio: 1 });

test('menú POS: agrupa por categoría ordenada por id_categoria, no por orden alfabético de productos', () => {
  const grupos = agruparPorCategoria([p(1, 'Agua', 'Reventa', 4), p(2, 'Latte', 'Bebidas calientes', 1), p(3, 'Cold Brew', 'Bebidas frías', 2), p(4, 'Sándwich', 'Alimentos', 3)]);
  assert.deepEqual(grupos.map((g) => g.nombre), ['Bebidas calientes', 'Bebidas frías', 'Alimentos', 'Reventa']);
});

test('menú POS: sin id_categoria respeta la primera aparición y "Sin categoría" va al final', () => {
  const grupos = agruparPorCategoria([p(1, 'X', undefined), p(2, 'B', 'Panadería'), p(3, 'A', 'Comida')]);
  assert.deepEqual(grupos.map((g) => g.nombre), ['Panadería', 'Comida', SIN_CATEGORIA]);
});

test('menú POS: no pierde ni altera productos (mismos objetos, nombres y precios) y ordena por nombre dentro del grupo', () => {
  const entrada = [p(1, 'Moka', 'Bebidas', 1), p(2, 'Americano', 'Bebidas', 1), p(3, 'Éclair', 'Bebidas', 1)];
  const salida = agruparPorCategoria(entrada).flatMap((g) => g.productos);
  assert.equal(salida.length, entrada.length);
  assert.deepEqual(salida.map((x) => x.nombre), ['Americano', 'Éclair', 'Moka']);
  entrada.forEach((original) => assert.ok(salida.includes(original)));
});

test('menú POS: el CCF solo se ofrece con POS_EMITIR_CCF y el menú exige INV_VER_STOCK', async () => {
  const carrito = await leer('frontend/src/modules/pos/Carrito.jsx');
  const pos = await leer('frontend/src/modules/pos/PosPage.jsx');
  assert.match(carrito, /permiso: 'POS_EMITIR_CCF'/);
  assert.match(carrito, /tiene\(t\.permiso\)/);
  assert.match(pos, /tiene\('INV_VER_STOCK'\)/);
  assert.match(pos, /puedeCCF \? tipoDocumento : 'FACTURA'/);
  assert.match(pos, /<BannerError/);
});

test('menú lateral: Inventario usa end para no resaltarse junto con Kárdex', () => {
  const secciones = menu.filter((e) => e.items).flatMap((e) => e.items);
  assert.equal(secciones.find((i) => i.ruta === '/inventario').end, true);
});

test('encabezados: las pantallas de administración usan EncabezadoPagina (sin h1 propios)', async () => {
  const paginas = ['pos/PosPage', 'seguridad/UsuariosPage', 'seguridad/RolesPermisosPage', 'inventario/InventarioPage', 'inventario/KardexPage',
    'reportes/ReportesPage', 'empresa/SucursalesPage', 'empresa/ParametrosPage', 'seguridad/BitacoraPage'];
  for (const ruta of paginas) {
    const codigo = await leer(`frontend/src/modules/${ruta}.jsx`);
    assert.match(codigo, /<EncabezadoPagina/, ruta);
    assert.doesNotMatch(codigo, /<h1/, ruta);
  }
  assert.match(await leer('frontend/src/components/display/EncabezadoPagina.jsx'), /text-primary-text/);
});
