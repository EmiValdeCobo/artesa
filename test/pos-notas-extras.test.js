// Receta visible para el barista, observaciones por línea y extras (migración 023).
// 1) Contratos estáticos, Zod y lógica pura del carrito (siempre corren).
// 2) Integración real contra PostgreSQL dentro de una transacción con ROLLBACK
//    (se omite si la BD no está disponible, sin migración 023, sin extras sembrados o sin turno ABIERTO).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { registrarVentaSchema } from '../backend/src/modules/pos/ventas/ventas.schemas.js';
import { extrasSchema, productoSchema } from '../backend/src/modules/inventario/inventario.schemas.js';
import { carritoReducer, itemsParaVenta, precioLinea, cantidadDeProducto } from '../frontend/src/modules/pos/carritoReducer.js';
import { calcularTotales } from '../frontend/src/modules/pos/impuestos.js';

const leer = (archivo) => readFile(new URL(`../${archivo}`, import.meta.url), 'utf8');

// ─── Migración ──────────────────────────────────────────────────────────────
test('migración 023: idéntica en database/init/25 (paridad)', async () => {
  const [mig, init] = await Promise.all([
    leer('database/migrations/023_pos_notas_extras.sql'),
    leer('database/init/25_pos_notas_extras.sql'),
  ]);
  assert.equal(init, mig);
});

test('migración 023: extras como productos ligados y validados en la función de venta', async () => {
  const sql = await leer('database/migrations/023_pos_notas_extras.sql');
  assert.match(sql, /ADD COLUMN IF NOT EXISTS es_extra BOOLEAN NOT NULL DEFAULT FALSE/);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS inventario\.producto_extras/);
  assert.match(sql, /pos\.orden_detalles ADD COLUMN IF NOT EXISTS id_detalle_padre/);
  assert.match(sql, /pos\.venta_detalles ADD COLUMN IF NOT EXISTS id_detalle_padre/);
  assert.match(sql, /Extras inválidos/);
  // El precio sigue saliendo de la BD y el stock se descuenta con la función existente.
  assert.match(sql, /p\.precio_venta \* i\.cantidad/);
  assert.match(sql, /inventario\.fn_descontar_stock_por_venta/);
});

// ─── Permisos: el barista ve la receta pero no la edita ─────────────────────
test('rutas: ver receta con INV_VER_STOCK; editar receta, producto o extras exige permisos de gestión', async () => {
  const rutas = await leer('backend/src/modules/inventario/inventario.routes.js');
  assert.match(rutas, /router\.get\('\/productos\/:id\/receta', requirePermiso\('INV_VER_STOCK', 'INV_GESTIONAR_RECETAS'\)/);
  assert.match(rutas, /router\.put\('\/productos\/:id\/receta', requirePermiso\('INV_GESTIONAR_RECETAS'\)/);
  assert.match(rutas, /router\.delete\('\/productos\/:id', requirePermiso\('INV_GESTIONAR_PRODUCTOS'\)/);
  assert.match(rutas, /router\.put\('\/productos\/:id\/extras', requirePermiso\('INV_GESTIONAR_PRODUCTOS'\), validate\(extrasSchema\)/);
  const { ROLES } = await import('../backend/seeders/datos/catalogo.js');
  const barista = ROLES.find((r) => r.nombre === 'BARISTA');
  assert.ok(barista.permisos.includes('INV_VER_STOCK'));
  assert.ok(!barista.permisos.includes('INV_GESTIONAR_PRODUCTOS'));
  assert.ok(!barista.permisos.includes('INV_GESTIONAR_RECETAS'));
});

test('frontend: catálogo ofrece "Ver receta" de solo lectura y la cola de preparación abre la receta sin costos', async () => {
  const catalogo = await leer('frontend/src/modules/inventario/CatalogoProductosPage.jsx');
  assert.match(catalogo, /etiqueta=\{`Ver receta de \$\{producto\.nombre\}`\}/);
  assert.match(catalogo, /tiene\('INV_GESTIONAR_PRODUCTOS'\) && <AccionConTooltip texto=\{`Eliminar producto/);
  const cola = await leer('frontend/src/modules/pos/PreparacionPage.jsx');
  assert.match(cola, /ModalPrevisualizacionReceta/);
  assert.match(cola, /tienePermisoCostos=\{false\}/);
  assert.match(cola, /tienePermisoRecetas=\{false\}/);
  assert.match(cola, /item\.id_detalle_padre/);
});

// ─── Zod ────────────────────────────────────────────────────────────────────
test('zod: ítems aceptan nota (recortada, máx. 200) y extra_de positivo', () => {
  const base = { id_turno: '7f8c2a1e-1111-4222-8333-944455556666', tipo_comprobante: 'FCF', pagos: [{ metodo: 'EFECTIVO', monto: '4.25' }] };
  const ok = registrarVentaSchema.parse({ ...base, items: [
    { id_producto: 1, cantidad: 1, nota: '  sin mayonesa  ' },
    { id_producto: 9, cantidad: 1, extra_de: 1 },
  ] });
  assert.equal(ok.items[0].nota, 'sin mayonesa');
  assert.equal(ok.items[1].extra_de, 1);
  assert.throws(() => registrarVentaSchema.parse({ ...base, items: [{ id_producto: 1, cantidad: 1, nota: 'x'.repeat(201) }] }));
  assert.throws(() => registrarVentaSchema.parse({ ...base, items: [{ id_producto: 1, cantidad: 1, extra_de: 0 }] }));
  assert.deepEqual(extrasSchema.parse({ extras: [3, 4] }).extras, [3, 4]);
  assert.throws(() => extrasSchema.parse({ extras: [3, 3] }));
  assert.equal(productoSchema.parse({ nombre: 'Extra: queso', precio_venta: '0.50', es_extra: true }).esExtra, true);
});

// ─── Carrito ────────────────────────────────────────────────────────────────
const latte = { id_producto: 5, nombre: 'Café latte', precio: 3.5, stock: 10 };
const shot = { id_producto: 40, nombre: 'Extra: shot de espresso', precio: 0.75 };

test('carrito: líneas con nota o extras no se fusionan con la simple; personalizar igual a otra las une', () => {
  let c = carritoReducer([], { tipo: 'agregar', producto: latte });
  c = carritoReducer(c, { tipo: 'agregar', producto: latte });
  assert.equal(c.length, 1);
  assert.equal(c[0].cantidad, 2);
  c = carritoReducer(c, { tipo: 'personalizar', id: c[0].clave, nota: ' sin azúcar ', extras: [shot] });
  c = carritoReducer(c, { tipo: 'agregar', producto: latte });
  assert.equal(c.length, 2, 'el nuevo latte simple va en otra línea');
  assert.equal(c[0].nota, 'sin azúcar');
  assert.equal(cantidadDeProducto(c, 5), 3);
  c = carritoReducer(c, { tipo: 'personalizar', id: c[1].clave, nota: 'sin azúcar', extras: [shot] });
  assert.equal(c.length, 1);
  assert.equal(c[0].cantidad, 3);
});

test('carrito: precio de línea y totales incluyen extras por unidad; payload liga el extra con extra_de', () => {
  let c = carritoReducer([], { tipo: 'agregar', producto: latte });
  c = carritoReducer(c, { tipo: 'cambiarCantidad', id: c[0].clave, cantidad: 2 });
  c = carritoReducer(c, { tipo: 'personalizar', id: c[0].clave, nota: '', extras: [shot] });
  c = carritoReducer(c, { tipo: 'agregar', producto: { id_producto: 7, nombre: 'Agua', precio: 1, stock: 5 } });
  assert.equal(precioLinea(c[0]), 4.25);
  assert.equal(calcularTotales(c).total, 9.5);
  assert.deepEqual(itemsParaVenta(c), [
    { id_producto: 5, cantidad: 2, nota: null },
    { id_producto: 40, cantidad: 2, nota: null, extra_de: 1 },
    { id_producto: 7, cantidad: 1, nota: null },
  ]);
});

// ─── Integración real ───────────────────────────────────────────────────────
const bd = await (async () => {
  try {
    const { sequelize } = await import('../backend/src/config/db.js');
    await sequelize.authenticate();
    const sel = (sql, bind, transaction) => sequelize.query(sql, { bind, transaction, type: 'SELECT' });
    const [fila] = await sel(
      `SELECT t.id_turno::text, e.id_producto AS principal, e.id_extra AS extra,
              (SELECT id_producto FROM inventario.productos WHERE NOT es_elaborado AND activo AND deleted_at IS NULL ORDER BY 1 LIMIT 1) AS reventa
       FROM pos.turnos_caja t
       CROSS JOIN LATERAL (
         SELECT pe.id_producto, pe.id_extra FROM inventario.producto_extras pe
         JOIN inventario.productos p ON p.id_producto = pe.id_producto AND p.activo AND p.deleted_at IS NULL AND p.es_elaborado
         JOIN inventario.productos x ON x.id_producto = pe.id_extra AND x.activo AND x.deleted_at IS NULL
         ORDER BY 1, 2 LIMIT 1) e
       WHERE t.estado = 'ABIERTO'
       LIMIT 1`,
    );
    if (!fila) { await sequelize.close(); return null; }
    return { sequelize, sel, ...fila };
  } catch {
    return null;
  }
})();

const sinBd = !bd && 'BD local no disponible, sin migración 023, sin extras o sin turno ABIERTO';
test.after(async () => { await bd?.sequelize.close(); });

async function enRollback(fn) {
  const tx = await bd.sequelize.transaction();
  try { return await fn(tx); } finally { await tx.rollback(); }
}

async function vender(tx, items) {
  // El seed deja faltantes planificados por sucursal: se repone stock solo dentro de esta transacción (ROLLBACK).
  await bd.sel(
    `UPDATE inventario.stock_sucursal SET stock_actual = stock_actual + 100000
     WHERE id_sucursal = (SELECT c.id_sucursal FROM pos.turnos_caja t JOIN pos.cajas c USING (id_caja) WHERE t.id_turno = $1::uuid)
     RETURNING 1`,
    [bd.id_turno], tx,
  );
  const [{ total }] = await bd.sel(
    `SELECT ROUND(SUM(p.precio_venta * i.cantidad), 2)::text AS total
     FROM jsonb_to_recordset($1::jsonb) AS i(id_producto INT, cantidad INT)
     JOIN inventario.productos p ON p.id_producto = i.id_producto`,
    [JSON.stringify(items)], tx,
  );
  const [{ id_venta: idVenta }] = await bd.sel(
    'SELECT pos.fn_registrar_venta($1::uuid, $2, NULL, $3::jsonb, $4::jsonb) AS id_venta',
    [bd.id_turno, 'FCF', JSON.stringify(items), JSON.stringify([{ metodo: 'EFECTIVO', monto: total, monto_recibido: total }])],
    tx,
  );
  return { idVenta, total };
}

test('integración: nota y extra quedan en la venta y en la orden, ligados a su línea', { skip: sinBd }, async () => {
  await enRollback(async (tx) => {
    const { idVenta } = await vender(tx, [
      { id_producto: bd.principal, cantidad: 2, nota: 'sin azúcar' },
      { id_producto: bd.extra, cantidad: 2, extra_de: 1 },
    ]);
    const det = await bd.sel('SELECT id_detalle, id_producto, nota, id_detalle_padre FROM pos.venta_detalles WHERE id_venta = $1::uuid ORDER BY id_detalle', [idVenta], tx);
    assert.equal(det.length, 2);
    assert.equal(det[0].nota, 'sin azúcar');
    assert.equal(det[1].id_detalle_padre, det[0].id_detalle);
    const ord = await bd.sel(
      `SELECT d.id_detalle, d.nota, d.id_detalle_padre FROM pos.orden_detalles d
       JOIN pos.ventas v ON v.id_orden = d.id_orden WHERE v.id_venta = $1::uuid ORDER BY d.id_detalle`, [idVenta], tx);
    assert.equal(ord.length, 2, 'el extra de un elaborado también va a preparación');
    assert.equal(ord[0].nota, 'sin azúcar');
    assert.equal(ord[1].id_detalle_padre, ord[0].id_detalle);
  });
});

test('integración: un extra suelto, antes de su producto o no permitido se rechaza', { skip: sinBd }, async () => {
  const rechaza = (items) => enRollback((tx) => vender(tx, items));
  await assert.rejects(rechaza([{ id_producto: bd.extra, cantidad: 1 }]), /Extras inválidos/);
  await assert.rejects(rechaza([{ id_producto: bd.extra, cantidad: 1, extra_de: 2 }, { id_producto: bd.principal, cantidad: 1 }]), /Extras inválidos/);
  if (bd.reventa) {
    await assert.rejects(rechaza([{ id_producto: bd.reventa, cantidad: 1 }, { id_producto: bd.extra, cantidad: 1, extra_de: 1 }]), /Extras inválidos/);
  }
});
