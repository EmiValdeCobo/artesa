// Cola de preparación ↔ POS ↔ turnos de caja (migración 022).
// 1) Contratos estáticos y Zod (siempre corren).
// 2) Integración real contra PostgreSQL dentro de una transacción con ROLLBACK
//    (se omite si la BD no está disponible o no hay un turno ABIERTO con productos).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { abrirTurnoSchema, MONTO_APERTURA_MAXIMO } from '../backend/src/modules/caja/caja.schemas.js';
import { anularOrdenSchema } from '../backend/src/modules/pos/preparacion/preparacion.schemas.js';
import { mascaraMoneda, montoACentavos } from '../frontend/src/utils/mascaras.js';

const leer = (archivo) => readFile(new URL(`../${archivo}`, import.meta.url), 'utf8');

// ─── Migración ──────────────────────────────────────────────────────────────
test('migración 022: idéntica en database/init/24 (paridad)', async () => {
  const [mig, init] = await Promise.all([
    leer('database/migrations/022_pos_cola_preparacion_turnos.sql'),
    leer('database/init/24_pos_cola_preparacion_turnos.sql'),
  ]);
  assert.equal(init, mig);
});

test('migración 022: la venta crea la orden solo con elaborados y no la saca de la cola al cobrar', async () => {
  const sql = await leer('database/migrations/022_pos_cola_preparacion_turnos.sql');
  assert.match(sql, /INSERT INTO pos\.ordenes\(id_turno, id_cliente, canal, etiqueta, estado\)[\s\S]*'ABIERTA'/);
  assert.match(sql, /JOIN inventario\.productos p ON p\.id_producto = i\.id_producto AND p\.es_elaborado;/);
  // Solo se marca FACTURADA una comanda ya entregada.
  assert.match(sql, /SET estado = 'FACTURADA' WHERE id_orden = p_id_orden AND estado = 'ENTREGADA'/);
  // venta y orden guardan turno, caja y sucursal (el trigger los toma del turno).
  assert.match(sql, /ALTER TABLE pos\.ventas\s+ADD COLUMN IF NOT EXISTS id_caja/);
  assert.match(sql, /ALTER TABLE pos\.ordenes ADD COLUMN IF NOT EXISTS id_sucursal/);
  assert.match(sql, /CREATE TRIGGER trg_ordenes_ubicacion BEFORE INSERT/);
  // Anular la venta anula la orden pendiente.
  assert.match(sql, /UPDATE pos\.ordenes SET estado = 'ANULADA'/);
});

// ─── Cola multi-sucursal ────────────────────────────────────────────────────
test('cola: el alcance por sucursal se impone en SQL con usuario_sucursal y no filtra por turno abierto', async () => {
  const repo = await leer('backend/src/modules/pos/preparacion/preparacion.repository.js');
  assert.match(repo, /o\.id_sucursal IN \(SELECT id_sucursal FROM seguridad\.usuario_sucursal WHERE id_usuario = \$1::uuid\)/);
  assert.doesNotMatch(repo, /t\.estado = 'ABIERTO'\s*\n\s*AND/);
  const service = await leer('backend/src/modules/pos/preparacion/preparacion.service.js');
  assert.match(service, /No tienes asignada esa sucursal/);
});

test('cola: cancelar pedido solo en Nueva, con motivo, y si se cobró exige POS_ANULAR_VENTA', async () => {
  const service = await leer('backend/src/modules/pos/preparacion/preparacion.service.js');
  assert.match(service, /orden\.estado !== 'ABIERTA'/);
  assert.match(service, /POS_ANULAR_VENTA/);
  assert.throws(() => anularOrdenSchema.parse({ motivo: 'ab' }));
  assert.equal(anularOrdenSchema.parse({ motivo: '  Cliente se retiró  ' }).motivo, 'Cliente se retiró');
  const routes = await leer('backend/src/modules/pos/preparacion/preparacion.routes.js');
  assert.match(routes, /router\.patch\('\/ordenes\/:idOrden\/anular', validate\(anularOrdenSchema\)/);
});

test('cola (frontend): "Actualizado hace…" usa el reloj y Actualizar no vacía la pantalla', async () => {
  const page = await leer('frontend/src/modules/pos/PreparacionPage.jsx');
  assert.match(page, /haceCuanto\(ultimaActualizacion, ahora\)/);
  assert.match(page, /onClick=\{\(\) => cargar\(true\)\}/);
  assert.match(page, /Todas las sucursales/);
});

// ─── Cierre bloqueado ───────────────────────────────────────────────────────
test('cierre: el servicio valida pedidos pendientes antes del cuadre y responde 409 PEDIDOS_PENDIENTES', async () => {
  const service = await leer('backend/src/modules/caja/caja.service.js');
  assert.match(service, /await validarSinPedidosPendientes\(transaction, idTurno\);\s*\n\s*await validarToleranciaDescuadre/);
  assert.match(service, /Hay 1 pedido pendiente en preparación\. Entrégalo o cancélalo antes de cerrar la caja\./);
  assert.match(service, /pedidos pendientes en preparación\. Entrégalos o cancélalos antes de cerrar la caja\./);
  assert.match(service, /409,\s*\n\s*'PEDIDOS_PENDIENTES'/);
  const errores = await leer('backend/src/middlewares/error.js');
  assert.match(errores, /codigo: err\.codigo/);
});

// ─── Monto de apertura ──────────────────────────────────────────────────────
test('apertura (backend): rechaza letras, negativos, más de 2 decimales y montos sobre el tope', () => {
  const parse = (montoApertura) => abrirTurnoSchema.safeParse({ idCaja: 1, montoApertura }).success;
  assert.equal(parse('0.00'), true);
  assert.equal(parse('50'), true);
  assert.equal(parse(MONTO_APERTURA_MAXIMO), true);
  assert.equal(parse('werw0.00'), false);
  assert.equal(parse('-5.00'), false);
  assert.equal(parse('5.555'), false);
  assert.equal(parse('10000.01'), false);
  assert.equal(parse(''), false);
});

test('apertura (frontend): la máscara de moneda limpia lo escrito o pegado y respeta el máximo', () => {
  assert.equal(mascaraMoneda('werw0.00'), '0.00');
  assert.equal(mascaraMoneda('-12.345'), '12.34');
  assert.equal(mascaraMoneda('1,5'), '1.5');
  assert.equal(mascaraMoneda('abc'), '');
  assert.equal(mascaraMoneda('10000.01', '10000.00'), null); // se rechaza la tecla
  assert.equal(montoACentavos('12.5'), 1250n);
});

// ─── Integración real: venta → cola y cierre bloqueado ──────────────────────
const bd = await (async () => {
  try {
    const { sequelize } = await import('../backend/src/config/db.js');
    await sequelize.authenticate();
    const sel = (sql, bind, transaction) => sequelize.query(sql, { bind, transaction, type: 'SELECT' });
    const [fila] = await sel(
      `SELECT t.id_turno::text, t.id_usuario::text,
              (SELECT id_producto FROM inventario.productos WHERE es_elaborado AND activo AND deleted_at IS NULL ORDER BY 1 LIMIT 1) AS elaborado,
              (SELECT id_producto FROM inventario.productos WHERE NOT es_elaborado AND activo AND deleted_at IS NULL ORDER BY 1 LIMIT 1) AS reventa
       FROM pos.turnos_caja t
       WHERE t.estado = 'ABIERTO'
         AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'pos' AND table_name = 'ordenes' AND column_name = 'id_sucursal')
       LIMIT 1`,
    );
    if (!fila?.elaborado || !fila?.reventa) {
      await sequelize.close();
      return null;
    }
    return { sequelize, sel, ...fila };
  } catch {
    return null;
  }
})();

const sinBd = !bd && 'BD local no disponible, sin migración 022 o sin turno ABIERTO';
test.after(async () => { await bd?.sequelize.close(); });

// Ejecuta fn dentro de una transacción que SIEMPRE se revierte: la prueba no deja datos.
async function enRollback(fn) {
  const tx = await bd.sequelize.transaction();
  try {
    return await fn(tx);
  } finally {
    await tx.rollback();
  }
}

async function vender(tx, items) {
  const precios = await bd.sel(
    'SELECT id_producto, precio_venta::text FROM inventario.productos WHERE id_producto = ANY($1::int[])',
    [items.map((i) => i.id_producto)],
    tx,
  );
  const [{ total }] = await bd.sel(
    `SELECT ROUND(SUM(p.precio_venta * i.cantidad), 2)::text AS total
     FROM jsonb_to_recordset($1::jsonb) AS i(id_producto INT, cantidad INT)
     JOIN inventario.productos p ON p.id_producto = i.id_producto`,
    [JSON.stringify(items)],
    tx,
  );
  assert.ok(precios.length > 0);
  const [{ id_venta: idVenta }] = await bd.sel(
    'SELECT pos.fn_registrar_venta($1::uuid, $2, NULL, $3::jsonb, $4::jsonb) AS id_venta',
    [bd.id_turno, 'FCF', JSON.stringify(items), JSON.stringify([{ metodo: 'EFECTIVO', monto: total, monto_recibido: total }])],
    tx,
  );
  const [venta] = await bd.sel(
    'SELECT id_venta::text, id_orden, id_caja, id_sucursal FROM pos.ventas WHERE id_venta = $1::uuid',
    [idVenta],
    tx,
  );
  return venta;
}

test('integración: venta con elaborado + reventa aparece en la cola como Nueva solo con el elaborado', { skip: sinBd }, async () => {
  const { listarCola } = await import('../backend/src/modules/pos/preparacion/preparacion.repository.js');
  await enRollback(async (tx) => {
    const venta = await vender(tx, [
      { id_producto: bd.elaborado, cantidad: 2 },
      { id_producto: bd.reventa, cantidad: 1 },
    ]);
    assert.ok(venta.id_orden, 'la venta debe quedar ligada a una orden de preparación');
    assert.ok(venta.id_caja && venta.id_sucursal, 'la venta guarda caja y sucursal');

    const cola = await listarCola(bd.id_usuario, {}, tx);
    const orden = cola.find((o) => o.id_orden === venta.id_orden);
    assert.ok(orden, 'la orden debe aparecer en la cola del cajero');
    assert.equal(orden.estado, 'ABIERTA');
    assert.equal(orden.pagada, true);
    assert.equal(orden.turno_abierto, true);
    assert.equal(orden.id_sucursal, venta.id_sucursal);
    assert.deepEqual(orden.items.map((i) => i.cantidad), [2]); // la reventa no va a preparación
    assert.ok(orden.minutos_espera >= 0 && orden.minutos_espera < 5);

    // Filtrar por otra sucursal no la muestra (contadores coherentes con el filtro).
    const otra = await listarCola(bd.id_usuario, { idSucursal: venta.id_sucursal + 1000 }, tx);
    assert.equal(otra.some((o) => o.id_orden === venta.id_orden), false);
  });
});

test('integración: venta solo de reventa no genera pedido de preparación', { skip: sinBd }, async () => {
  await enRollback(async (tx) => {
    const venta = await vender(tx, [{ id_producto: bd.reventa, cantidad: 1 }]);
    assert.equal(venta.id_orden, null);
  });
});

test('integración: no se puede cerrar un turno con pedidos activos', { skip: sinBd }, async () => {
  const { validarSinPedidosPendientes } = await import('../backend/src/modules/caja/caja.service.js');
  await enRollback(async (tx) => {
    await vender(tx, [{ id_producto: bd.elaborado, cantidad: 1 }]);
    await assert.rejects(
      () => validarSinPedidosPendientes(tx, bd.id_turno),
      (err) => err.status === 409 && err.codigo === 'PEDIDOS_PENDIENTES'
        && /pendientes? en preparación\. Entrégalos? o cancélalos? antes de cerrar la caja\./.test(err.message),
    );
    // Entregados todos los pedidos del turno, el cierre ya no se bloquea por la cola.
    await bd.sel(
      `UPDATE pos.ordenes SET estado = 'ENTREGADA' WHERE id_turno = $1::uuid AND estado IN ('ABIERTA','EN_PREPARACION','LISTA')`,
      [bd.id_turno],
      tx,
    );
    await validarSinPedidosPendientes(tx, bd.id_turno);
  });
});

test('integración: anular la venta saca su pedido de la cola', { skip: sinBd }, async () => {
  await enRollback(async (tx) => {
    const venta = await vender(tx, [{ id_producto: bd.elaborado, cantidad: 1 }]);
    await bd.sel('SELECT pos.fn_anular_venta($1::uuid, $2, $3::uuid)', [venta.id_venta, 'Prueba automática', bd.id_usuario], tx);
    const [orden] = await bd.sel('SELECT estado, motivo_anulacion FROM pos.ordenes WHERE id_orden = $1', [venta.id_orden], tx);
    assert.deepEqual(orden, { estado: 'ANULADA', motivo_anulacion: 'Prueba automática' });
  });
});
